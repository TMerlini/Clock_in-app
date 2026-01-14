import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
import { ImportEventCard } from './ImportEventCard';
import { Calendar, RefreshCw, Download, AlertCircle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { format, subDays, addDays } from 'date-fns';
import { calculateUsedIsencaoHours } from '../lib/utils';
import './CalendarImport.css';

export function CalendarImport({ user }) {
  const googleCalendar = useGoogleCalendar();
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({ daysBack: 30, daysForward: 0 }); // Default: last 30 days
  const [filterMode, setFilterMode] = useState('work-session-only'); // 'work-session-only' | 'all-events'
  const [selectedEvents, setSelectedEvents] = useState(new Set());
  const [existingSessions, setExistingSessions] = useState([]);
  const [importResults, setImportResults] = useState(null);
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendars, setSelectedCalendars] = useState(new Set(['primary'])); // Default: primary calendar
  const [showCalendarSelector, setShowCalendarSelector] = useState(false);

  useEffect(() => {
    if (googleCalendar.isAuthorized) {
      loadCalendars();
      loadExistingSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleCalendar.isAuthorized]);

  useEffect(() => {
    if (googleCalendar.isAuthorized && calendars.length > 0) {
      loadCalendarEvents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, filterMode, selectedCalendars, calendars.length]);

  const loadCalendars = async () => {
    if (!googleCalendar.isAuthorized) return;

    try {
      const calendarList = await googleCalendar.listCalendars();
      setCalendars(calendarList);
      
      // Select all calendars by default
      const allCalendarIds = calendarList.map(cal => cal.id);
      setSelectedCalendars(new Set(allCalendarIds));
    } catch (error) {
      console.error('Error loading calendars:', error);
      // Fallback to primary calendar only
      setSelectedCalendars(new Set(['primary']));
    }
  };

  const loadExistingSessions = async () => {
    try {
      const sessionsRef = collection(db, 'sessions');
      const q = query(sessionsRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      const sessions = [];
      querySnapshot.forEach((doc) => {
        sessions.push({ id: doc.id, ...doc.data() });
      });

      setExistingSessions(sessions);
    } catch (error) {
      console.error('Error loading existing sessions:', error);
    }
  };

  const loadCalendarEvents = async () => {
    if (!googleCalendar.isAuthorized || selectedCalendars.size === 0) return;

    setLoading(true);
    try {
      const now = new Date();
      const timeMin = subDays(now, dateRange.daysBack);
      const timeMax = addDays(now, dateRange.daysForward);

      const calendarIds = Array.from(selectedCalendars);
      const calendarEvents = await googleCalendar.listCalendarEvents(
        timeMin.toISOString(),
        timeMax.toISOString(),
        250,
        calendarIds
      );

      // Filter events based on filter mode
      let filtered;
      if (filterMode === 'work-session-only') {
        // Filter for "Work Session" events only
        filtered = calendarEvents.filter(event => {
          const title = event.summary || '';
          return title.toLowerCase().includes('work session');
        });
      } else {
        // Show all events
        filtered = calendarEvents;
      }

      setEvents(filtered);
      setFilteredEvents(filtered);
      setSelectedEvents(new Set());
    } catch (error) {
      console.error('Error loading calendar events:', error);
      
      // Check if it's an authentication error
      const isAuthError = error.status === 401 || 
        (error.result && error.result.error && error.result.error.code === 401) ||
        (error.message && error.message.includes('401'));
      
      if (isAuthError) {
        alert('Your Google Calendar token has expired. Please click the cloud icon (⚠️) in the header to refresh it, or go to Settings and re-authorize Google Calendar.');
      } else {
        alert('Failed to load calendar events: ' + (error.message || (error.result?.error?.message) || 'Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const checkConflict = (event) => {
    const eventStart = new Date(event.start.dateTime || event.start.date).getTime();
    const eventEnd = new Date(event.end.dateTime || event.end.date).getTime();

    // Check for overlapping sessions (with 5 minute buffer)
    const buffer = 5 * 60 * 1000; // 5 minutes
    return existingSessions.find(session => {
      const sessionStart = session.clockIn;
      const sessionEnd = session.clockOut;
      
      // Check if events overlap
      return (eventStart < sessionEnd + buffer && eventEnd > sessionStart - buffer);
    });
  };

  const handleSelectEvent = (eventId) => {
    const newSelected = new Set(selectedEvents);
    if (newSelected.has(eventId)) {
      newSelected.delete(eventId);
    } else {
      newSelected.add(eventId);
    }
    setSelectedEvents(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedEvents.size === filteredEvents.length) {
      setSelectedEvents(new Set());
    } else {
      setSelectedEvents(new Set(filteredEvents.map(e => e.id)));
    }
  };

  const handleImport = async (eventToImport = null) => {
    if (!googleCalendar.isAuthorized) {
      alert('Please authorize Google Calendar first');
      return;
    }

    const eventsToImport = eventToImport ? [eventToImport] : filteredEvents.filter(e => selectedEvents.has(e.id));
    
    if (eventsToImport.length === 0) {
      alert('Please select at least one event to import');
      return;
    }

    setLoading(true);
    let successCount = 0;
    let conflictCount = 0;
    let errorCount = 0;

    try {
      for (const event of eventsToImport) {
        try {
          const conflict = checkConflict(event);
          if (conflict) {
            conflictCount++;
            continue;
          }

          // Parse event data
          const eventStart = new Date(event.start.dateTime || event.start.date);
          const eventEnd = new Date(event.end.dateTime || event.end.date);
          const durationMs = eventEnd.getTime() - eventStart.getTime();
          const totalHours = durationMs / (1000 * 60 * 60);

          // Check if weekend
          const dayOfWeek = eventStart.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const isBankHoliday = false; // Bank holidays can't be auto-detected from calendar, user can edit later

          // Parse description for hours breakdown (if available)
          let notes = '';
          let parsedRegularHours = null;
          let parsedUnpaidHours = null;
          let parsedPaidHours = null;

          if (event.description) {
            // Try to parse description
            const desc = event.description;
            const regularMatch = desc.match(/Regular Hours:\s*(\d+):(\d+)/);
            const unpaidMatch = desc.match(/Unpaid Extra.*?:\s*(\d+):(\d+)/);
            const paidMatch = desc.match(/Paid Overtime:\s*(\d+):(\d+)/);
            const notesMatch = desc.match(/Notes:\s*(.+)/);

            if (regularMatch) {
              parsedRegularHours = parseInt(regularMatch[1]) + parseInt(regularMatch[2]) / 60;
            }
            if (unpaidMatch) {
              parsedUnpaidHours = parseInt(unpaidMatch[1]) + parseInt(unpaidMatch[2]) / 60;
            }
            if (paidMatch) {
              parsedPaidHours = parseInt(paidMatch[1]) + parseInt(paidMatch[2]) / 60;
            }
            if (notesMatch) {
              notes = notesMatch[1].trim();
            }
          }

          // Load settings for annual Isenção limit and weekend settings
          let weekendDaysOff = 1;
          let weekendBonus = 100;
          let annualIsencaoLimit = 200;
          try {
            const settingsRef = doc(db, 'userSettings', user.uid);
            const settingsDoc = await getDoc(settingsRef);
            if (settingsDoc.exists()) {
              const settings = settingsDoc.data();
              weekendDaysOff = settings.weekendDaysOff || 1;
              weekendBonus = settings.weekendBonus || 100;
              annualIsencaoLimit = settings.annualIsencaoLimit || 200;
            }
          } catch (error) {
            console.error('Error loading settings:', error);
          }

          // Load sessions for the calendar year to calculate used Isenção hours
          let usedIsencaoHours = 0;
          try {
            const sessionsRef = collection(db, 'sessions');
            const sessionsQuery = query(sessionsRef, where('userId', '==', user.uid));
            const sessionsSnapshot = await getDocs(sessionsQuery);
            const allSessions = [];
            sessionsSnapshot.forEach((docSnap) => {
              allSessions.push({ id: docSnap.id, ...docSnap.data() });
            });
            usedIsencaoHours = calculateUsedIsencaoHours(allSessions, eventStart.getTime());
          } catch (error) {
            console.error('Error loading sessions for Isenção calculation:', error);
          }

          // Calculate hours based on whether it's a special day (weekend or bank holiday)
          // If parsed from description, use those values; otherwise calculate
          let regularHours, unpaidExtraHours, paidExtraHours;
          
          if (parsedRegularHours !== null && parsedUnpaidHours !== null && parsedPaidHours !== null) {
            // Use parsed values from description
            regularHours = parsedRegularHours;
            unpaidExtraHours = parsedUnpaidHours;
            paidExtraHours = parsedPaidHours;
          } else {
            // Calculate based on special day logic with annual limit
            const isSpecialDay = isWeekend || isBankHoliday;
            if (isSpecialDay) {
              regularHours = Math.min(totalHours, 8);
              unpaidExtraHours = 0; // No Isenção on weekends/bank holidays
              paidExtraHours = totalHours > 8 ? totalHours - 8 : 0; // Overwork starts at 8h
            } else {
              regularHours = Math.min(totalHours, 8);
              const potentialIsencaoHours = totalHours > 8 ? Math.min(totalHours - 8, 2) : 0;
              const remainingIsencaoLimit = Math.max(0, annualIsencaoLimit - usedIsencaoHours);
              
              if (potentialIsencaoHours <= remainingIsencaoLimit) {
                // Within the limit, use all potential Isenção hours
                unpaidExtraHours = potentialIsencaoHours;
                paidExtraHours = totalHours > 10 ? totalHours - 10 : 0;
              } else {
                // Exceeded the limit, only use remaining limit
                unpaidExtraHours = remainingIsencaoLimit;
                paidExtraHours = totalHours > 8 ? totalHours - 8 - unpaidExtraHours : 0;
              }
            }
          }

          // Create session
          const newSession = {
            userId: user.uid,
            userEmail: user.email,
            clockIn: eventStart.getTime(),
            clockOut: eventEnd.getTime(),
            totalHours: totalHours,
            regularHours: regularHours,
            unpaidExtraHours: unpaidExtraHours,
            paidExtraHours: paidExtraHours,
            isWeekend: isWeekend,
            isBankHoliday: isBankHoliday,
            weekendDaysOff: isWeekend ? weekendDaysOff : 0,
            weekendBonus: isWeekend ? weekendBonus : 0,
            location: event.location || '',
            notes: notes,
            calendarEventId: event.id,
            calendarSyncStatus: 'synced',
            lastSyncAt: Date.now(),
          };

          // Save to Firestore
          const sessionsRef = collection(db, 'sessions');
          await addDoc(sessionsRef, newSession);
          successCount++;
        } catch (error) {
          console.error('Error importing event:', error);
          errorCount++;
        }
      }

      setImportResults({
        success: successCount,
        conflicts: conflictCount,
        errors: errorCount,
      });

      // Reload sessions and events
      await loadExistingSessions();
      await loadCalendarEvents();

      // Show results
      if (conflictCount > 0 || errorCount > 0) {
        alert(`Imported ${successCount} session(s). ${conflictCount} conflict(s) skipped. ${errorCount} error(s).`);
      } else {
        alert(`Successfully imported ${successCount} session(s)!`);
      }
    } catch (error) {
      console.error('Error during import:', error);
      alert('Failed to import sessions: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedCount = selectedEvents.size;
  const allSelected = filteredEvents.length > 0 && selectedEvents.size === filteredEvents.length;

  return (
    <div className="calendar-import-container">
      <div className="calendar-import-header">
        <div className="header-content-import">
          <Calendar />
          <div>
            <h1>Import from Google Calendar</h1>
            <p>Import work sessions from your Google Calendar</p>
          </div>
        </div>
      </div>

      <div className="calendar-import-content">
        {!googleCalendar.isAuthorized ? (
          <div className="import-placeholder">
            <AlertCircle size={48} />
            <h2>Calendar Not Connected</h2>
            <p>Please authorize Google Calendar in Settings to import events.</p>
          </div>
        ) : (
          <>
            <div className="import-controls">
              <div className="date-range-selector">
                <label>Date Range:</label>
                <div className="date-range-inputs">
                  <select
                    value={dateRange.daysBack}
                    onChange={(e) => setDateRange({ ...dateRange, daysBack: parseInt(e.target.value) })}
                    disabled={loading}
                  >
                    <option value={7}>7 days back</option>
                    <option value={30}>30 days back</option>
                    <option value={60}>60 days back</option>
                    <option value={90}>90 days back</option>
                    <option value={180}>180 days back</option>
                    <option value={365}>1 year back</option>
                  </select>
                  <span className="date-range-separator">to</span>
                  <select
                    value={dateRange.daysForward}
                    onChange={(e) => setDateRange({ ...dateRange, daysForward: parseInt(e.target.value) })}
                    disabled={loading}
                  >
                    <option value={0}>Today</option>
                    <option value={7}>7 days forward</option>
                    <option value={30}>30 days forward</option>
                    <option value={60}>60 days forward</option>
                    <option value={90}>90 days forward</option>
                    <option value={180}>180 days forward</option>
                    <option value={365}>1 year forward</option>
                  </select>
                </div>
              </div>

              <div className="filter-mode-selector">
                <label>Event Filter:</label>
                <div className="filter-radio-group">
                  <label className="filter-radio-label">
                    <input
                      type="radio"
                      name="filterMode"
                      value="work-session-only"
                      checked={filterMode === 'work-session-only'}
                      onChange={(e) => setFilterMode(e.target.value)}
                      disabled={loading}
                    />
                    <span>Work Session Only</span>
                  </label>
                  <label className="filter-radio-label">
                    <input
                      type="radio"
                      name="filterMode"
                      value="all-events"
                      checked={filterMode === 'all-events'}
                      onChange={(e) => setFilterMode(e.target.value)}
                      disabled={loading}
                    />
                    <span>All Events</span>
                  </label>
                </div>
                <p className="filter-helper-text">
                  {filterMode === 'work-session-only' 
                    ? 'Only shows events with "Work Session" in the title'
                    : 'Shows all calendar events in the selected date range'}
                </p>
              </div>

              <button
                className="refresh-button"
                onClick={loadCalendarEvents}
                disabled={loading}
              >
                <RefreshCw className={loading ? 'spinning' : ''} />
                Refresh
              </button>

              {filteredEvents.length > 0 && (
                <div className="bulk-actions">
                  <button
                    className="select-all-button"
                    onClick={handleSelectAll}
                  >
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </button>
                  <button
                    className="import-selected-button"
                    onClick={() => handleImport()}
                    disabled={loading || selectedCount === 0}
                  >
                    <Download />
                    Import Selected ({selectedCount})
                  </button>
                </div>
              )}
            </div>

            {loading && events.length === 0 ? (
              <div className="loading-state">
                <RefreshCw className="spinning" size={48} />
                <p>Loading calendar events...</p>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="empty-state">
                <Calendar size={48} />
                <h2>No Events Found</h2>
                <p>
                  {filterMode === 'work-session-only' 
                    ? 'No "Work Session" events found in the selected date range.'
                    : 'No calendar events found in the selected date range.'}
                </p>
              </div>
            ) : (
              <>
                <div className="events-count-badge">
                  Found {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
                  {filterMode === 'work-session-only' && (
                    <span className="filter-badge">Work Session Only</span>
                  )}
                </div>
                <div className="import-events-list">
                  {filteredEvents.map((event) => {
                    const conflict = checkConflict(event);
                    const sourceCalendar = calendars.find(cal => cal.id === event.sourceCalendarId);
                    return (
                      <ImportEventCard
                        key={event.id}
                        event={event}
                        conflict={conflict}
                        isSelected={selectedEvents.has(event.id)}
                        onSelect={() => handleSelectEvent(event.id)}
                        onImport={() => handleImport(event)}
                        loading={loading}
                        calendarName={sourceCalendar?.summary || event.sourceCalendarId || 'Unknown Calendar'}
                      />
                    );
                  })}
                </div>
              </>
            )}

            {importResults && (
              <div className={`import-results ${importResults.errors > 0 || importResults.conflicts > 0 ? 'warning' : 'success'}`}>
                <CheckCircle />
                <div>
                  <strong>Import Complete</strong>
                  <p>
                    {importResults.success} imported, {importResults.conflicts} conflicts, {importResults.errors} errors
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
