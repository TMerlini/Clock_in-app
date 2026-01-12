import { useState, useEffect } from 'react';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
import { Calendar } from './ui/calendar';
import { Calendar as CalendarIcon, RefreshCw, AlertCircle } from 'lucide-react';
import { format, startOfDay, endOfDay, subDays, addDays } from 'date-fns';
import { formatHoursMinutes } from '../lib/utils';
import './CalendarView.css';
import 'react-day-picker/style.css';

export function CalendarView({ user }) {
  const googleCalendar = useGoogleCalendar();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [eventsForDate, setEventsForDate] = useState([]);
  const [datesWithEvents, setDatesWithEvents] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({ daysBack: 90, daysForward: 30 }); // Wider range by default
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendars, setSelectedCalendars] = useState(new Set(['primary']));

  useEffect(() => {
    if (googleCalendar.isAuthorized) {
      loadCalendars();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleCalendar.isAuthorized]);

  useEffect(() => {
    if (googleCalendar.isAuthorized && calendars.length > 0) {
      loadCalendarEvents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, selectedCalendars, calendars.length, googleCalendar.isAuthorized]);

  useEffect(() => {
    loadEventsForDate(selectedDate);
  }, [selectedDate, events]);

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
      setSelectedCalendars(new Set(['primary']));
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

      setEvents(calendarEvents);
      
      // Build date set for calendar highlighting
      const dateSet = new Set();
      calendarEvents.forEach((event) => {
        const eventStart = new Date(event.start.dateTime || event.start.date);
        const dateStr = format(eventStart, 'yyyy-MM-dd');
        dateSet.add(dateStr);
      });
      setDatesWithEvents(dateSet);
      
      loadEventsForDate(selectedDate, calendarEvents);
    } catch (error) {
      console.error('Error loading calendar events:', error);
      
      const isAuthError = error.status === 401 || 
        (error.result && error.result.error && error.result.error.code === 401) ||
        (error.message && error.message.includes('401'));
      
      if (isAuthError) {
        alert('Your Google Calendar token has expired. Please click the cloud icon (⚠️) in the header to refresh it, or go to Settings and re-authorize Google Calendar.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadEventsForDate = (date, eventsList = events) => {
    const startDate = startOfDay(date);
    const endDate = endOfDay(date);

    const filtered = eventsList.filter((event) => {
      const eventStart = new Date(event.start.dateTime || event.start.date);
      return eventStart >= startDate && eventStart <= endDate;
    });

    // Sort by start time descending
    filtered.sort((a, b) => {
      const aStart = new Date(a.start.dateTime || a.start.date).getTime();
      const bStart = new Date(b.start.dateTime || b.start.date).getTime();
      return bStart - aStart;
    });
    
    setEventsForDate(filtered);
  };

  const handleDateSelect = (date) => {
    if (date) {
      setSelectedDate(date);
      loadEventsForDate(date);
    }
  };

  // Create modifiers for calendar highlighting
  const modifiers = {
    hasEvents: (date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return datesWithEvents.has(dateStr);
    }
  };

  const modifiersClassNames = {
    hasEvents: 'has-imported-sessions'
  };

  const parseEventDescription = (event) => {
    let regularHours = 0;
    let unpaidExtraHours = 0;
    let paidExtraHours = 0;
    let notes = '';

    if (event.description) {
      const desc = event.description;
      const regularMatch = desc.match(/Regular Hours:\s*(\d+):(\d+)/);
      const unpaidMatch = desc.match(/Unpaid Extra.*?:\s*(\d+):(\d+)/);
      const paidMatch = desc.match(/Paid Overtime:\s*(\d+):(\d+)/);
      const notesMatch = desc.match(/Notes:\s*(.+)/);

      if (regularMatch) {
        regularHours = parseInt(regularMatch[1]) + parseInt(regularMatch[2]) / 60;
      }
      if (unpaidMatch) {
        unpaidExtraHours = parseInt(unpaidMatch[1]) + parseInt(unpaidMatch[2]) / 60;
      }
      if (paidMatch) {
        paidExtraHours = parseInt(paidMatch[1]) + parseInt(paidMatch[2]) / 60;
      }
      if (notesMatch) {
        notes = notesMatch[1].trim();
      }
    }

    // If no parsed hours, calculate from duration
    if (regularHours === 0 && unpaidExtraHours === 0 && paidExtraHours === 0) {
      const eventStart = new Date(event.start.dateTime || event.start.date);
      const eventEnd = new Date(event.end.dateTime || event.end.date);
      const durationMs = eventEnd.getTime() - eventStart.getTime();
      const totalHours = durationMs / (1000 * 60 * 60);
      regularHours = Math.min(totalHours, 8);
      unpaidExtraHours = totalHours > 8 ? Math.min(totalHours - 8, 2) : 0;
      paidExtraHours = totalHours > 10 ? totalHours - 10 : 0;
    }

    return { regularHours, unpaidExtraHours, paidExtraHours, notes };
  };

  return (
    <div className="calendar-view-container">
      <div className="main-content">
        <div>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <CalendarIcon style={{ display: 'inline', width: '20px', height: '20px', marginRight: '8px' }} />
                Google Calendar Events
              </h2>
              <p className="card-description">View all events from your Google Calendar (read-only)</p>
            </div>
            <div className="calendar-wrapper">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                modifiers={modifiers}
                modifiersClassNames={modifiersClassNames}
              />
            </div>
            {googleCalendar.isAuthorized && (
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
                <button
                  className="refresh-calendar-button"
                  onClick={loadCalendarEvents}
                  disabled={loading}
                >
                  <RefreshCw className={loading ? 'spinning' : ''} size={16} />
                  Refresh Events
                </button>
              </div>
            )}
          </div>

          <div className="card" style={{ marginTop: '2rem' }}>
            <div className="card-header">
              <h2 className="card-title">Events for {format(selectedDate, 'MMMM dd, yyyy')}</h2>
            </div>
            <div className="sessions-container">
              {!googleCalendar.isAuthorized ? (
                <div className="import-placeholder">
                  <AlertCircle size={48} />
                  <h2>Calendar Not Connected</h2>
                  <p>Please authorize Google Calendar in Settings to view events.</p>
                </div>
              ) : loading && events.length === 0 ? (
                <div className="loading-state">
                  <RefreshCw className="spinning" size={48} />
                  <p>Loading calendar events...</p>
                </div>
              ) : eventsForDate.length === 0 ? (
                <p className="empty-sessions">
                  No events for this date
                </p>
              ) : (
                <div className="sessions-list">
                  {eventsForDate.map((event, index) => {
                    const eventStart = new Date(event.start.dateTime || event.start.date);
                    const eventEnd = new Date(event.end.dateTime || event.end.date);
                    const durationMs = eventEnd.getTime() - eventStart.getTime();
                    const totalHours = durationMs / (1000 * 60 * 60);
                    const { regularHours, unpaidExtraHours, paidExtraHours, notes: parsedNotes } = parseEventDescription(event);
                    const sourceCalendar = calendars.find(cal => cal.id === event.sourceCalendarId);
                    
                    return (
                      <div key={event.id} className="calendar-event-card">
                        <div className="calendar-event-header">
                          <div>
                            <span className="event-number">Event {eventsForDate.length - index}</span>
                            {event.summary && (
                              <div className="event-title">{event.summary}</div>
                            )}
                          </div>
                          <span className="event-total">{formatHoursMinutes(totalHours)}</span>
                        </div>
                        {sourceCalendar && (
                          <div className="calendar-source-badge-inline">
                            <CalendarIcon size={12} />
                            <span>{sourceCalendar.summary}</span>
                          </div>
                        )}
                        <div className="calendar-event-times">
                          <div>Start: {format(eventStart, 'HH:mm:ss')}</div>
                          <div>End: {format(eventEnd, 'HH:mm:ss')}</div>
                        </div>
                        {event.location && (
                          <div className="calendar-event-location">
                            <strong>Location:</strong> {event.location}
                          </div>
                        )}
                        {(parsedNotes || event.description) && (
                          <div className="calendar-event-notes">
                            {parsedNotes || event.description}
                          </div>
                        )}
                        <div className="calendar-event-sync-badge">
                          <CalendarIcon size={14} />
                          <span>From Google Calendar</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
