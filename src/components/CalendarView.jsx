import { useState, useEffect, memo } from 'react';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
import { Calendar } from './ui/calendar';
import { Calendar as CalendarIcon, RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, addDays, addWeeks, subWeeks } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { getDateFnsLocale } from '../lib/i18n';
import './CalendarView.css';
import 'react-day-picker/style.css';

export const CalendarView = memo(function CalendarView({ user }) {
  void user;
  const { t } = useTranslation();
  const googleCalendar = useGoogleCalendar();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('daily');
  const [viewingWeekStart, setViewingWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [viewingMonth, setViewingMonth] = useState(() => startOfMonth(new Date()));
  const [events, setEvents] = useState([]);
  const [eventsForDate, setEventsForDate] = useState([]);
  const [eventsForWeek, setEventsForWeek] = useState([]);
  const [eventsForMonth, setEventsForMonth] = useState([]);
  const [datesWithEvents, setDatesWithEvents] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [dateRange] = useState({ daysBack: 90, daysForward: 30 });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, events]);

  useEffect(() => {
    if (viewMode !== 'weekly') return;
    loadEventsForWeek(viewingWeekStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingWeekStart, events, viewMode]);

  useEffect(() => {
    if (viewMode !== 'monthly') return;
    loadEventsForMonth(viewingMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingMonth, events, viewMode]);

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
      loadEventsForWeek(viewingWeekStart, calendarEvents);
      loadEventsForMonth(viewingMonth, calendarEvents);
    } catch (error) {
      console.error('Error loading calendar events:', error);
      
      const isAuthError = error.status === 401 || 
        (error.result && error.result.error && error.result.error.code === 401) ||
        (error.message && error.message.includes('401'));
      
      if (isAuthError) {
        alert(t('calendar.tokenExpired'));
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

    filtered.sort((a, b) => {
      const aStart = new Date(a.start.dateTime || a.start.date).getTime();
      const bStart = new Date(b.start.dateTime || b.start.date).getTime();
      return bStart - aStart;
    });
    setEventsForDate(filtered);
  };

  const loadEventsForWeek = (weekStart, eventsList = events) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const start = startOfDay(weekStart);
    const end = endOfDay(weekEnd);
    const filtered = eventsList.filter((event) => {
      const eventStart = new Date(event.start.dateTime || event.start.date);
      return eventStart >= start && eventStart <= end;
    });
    filtered.sort((a, b) => {
      const aStart = new Date(a.start.dateTime || a.start.date).getTime();
      const bStart = new Date(b.start.dateTime || b.start.date).getTime();
      return bStart - aStart;
    });
    setEventsForWeek(filtered);
  };

  const loadEventsForMonth = (monthStart, eventsList = events) => {
    const start = startOfMonth(monthStart);
    const end = endOfMonth(monthStart);
    const filtered = eventsList.filter((event) => {
      const eventStart = new Date(event.start.dateTime || event.start.date);
      return eventStart >= start && eventStart <= end;
    });
    filtered.sort((a, b) => {
      const aStart = new Date(a.start.dateTime || a.start.date).getTime();
      const bStart = new Date(b.start.dateTime || b.start.date).getTime();
      return bStart - aStart;
    });
    setEventsForMonth(filtered);
  };

  const handleDateSelect = (date) => {
    if (date) {
      setSelectedDate(date);
      loadEventsForDate(date);
    }
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (mode === 'weekly') {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      setViewingWeekStart(weekStart);
    } else if (mode === 'monthly') {
      setViewingMonth(startOfMonth(selectedDate));
    }
  };

  const goPrevWeek = () => {
    const prev = subWeeks(viewingWeekStart, 1);
    setViewingWeekStart(prev);
    setSelectedDate(prev);
  };
  const goNextWeek = () => {
    const next = addWeeks(viewingWeekStart, 1);
    setViewingWeekStart(next);
    setSelectedDate(next);
  };

  // Color mapping for different calendars
  const getCalendarColor = (calendarName) => {
    if (!calendarName) return { bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6', dot: '#8b5cf6' };
    
    const name = calendarName.toLowerCase();
    // Default purple
    if (name.includes('eventos') || name.includes('event')) {
      return { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', dot: '#3b82f6' }; // Blue
    } else if (name.includes('merloproductions') || name.includes('merlo')) {
      return { bg: 'rgba(236, 72, 153, 0.1)', border: 'rgba(236, 72, 153, 0.2)', color: '#ec4899', dot: '#ec4899' }; // Pink
    } else if (name.includes('primary')) {
      return { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', dot: '#22c55e' }; // Green
    }
    // Default purple for other calendars
    return { bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6', dot: '#8b5cf6' };
  };

  // Create modifiers for calendar highlighting with colors
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
                {t('calendar.title')}
              </h2>
              <p className="card-description">{t('calendar.description')}</p>
            </div>
            <div className="calendar-view-selector">
              <button
                type="button"
                className={`calendar-view-tab ${viewMode === 'daily' ? 'active' : ''}`}
                onClick={() => handleViewModeChange('daily')}
              >
                {t('calendar.viewDaily')}
              </button>
              <button
                type="button"
                className={`calendar-view-tab ${viewMode === 'weekly' ? 'active' : ''}`}
                onClick={() => handleViewModeChange('weekly')}
              >
                {t('calendar.viewWeekly')}
              </button>
              <button
                type="button"
                className={`calendar-view-tab ${viewMode === 'monthly' ? 'active' : ''}`}
                onClick={() => handleViewModeChange('monthly')}
              >
                {t('calendar.viewMonthly')}
              </button>
            </div>
            {viewMode === 'weekly' ? (
              <div className="calendar-week-nav">
                <button type="button" className="calendar-nav-btn" onClick={goPrevWeek} aria-label={t('calendar.prevWeek')}>
                  <ChevronLeft size={20} />
                </button>
                <span className="calendar-week-range">
                  {format(viewingWeekStart, 'd MMM', { locale: getDateFnsLocale() })} – {format(endOfWeek(viewingWeekStart, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: getDateFnsLocale() })}
                </span>
                <button type="button" className="calendar-nav-btn" onClick={goNextWeek} aria-label={t('calendar.nextWeek')}>
                  <ChevronRight size={20} />
                </button>
              </div>
            ) : null}
            {viewMode === 'weekly' ? (
              <div className="calendar-week-grid" role="grid" aria-label={t('calendar.weekView')}>
                {Array.from({ length: 7 }, (_, i) => {
                  const d = addDays(viewingWeekStart, i);
                  const dateStr = format(d, 'yyyy-MM-dd');
                  const hasEvents = datesWithEvents.has(dateStr);
                  const isToday = format(d, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      className={`calendar-week-day ${hasEvents ? 'has-events' : ''} ${isToday ? 'today' : ''}`}
                      onClick={() => { setSelectedDate(d); setViewMode('daily'); }}
                      aria-label={format(d, 'EEEE d MMMM', { locale: getDateFnsLocale() })}
                    >
                      <span className="calendar-week-dayname">{format(d, 'EEE', { locale: getDateFnsLocale() })}</span>
                      <span className="calendar-week-daynum">{format(d, 'd')}</span>
                      {hasEvents && <span className="calendar-week-dot" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="calendar-wrapper">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  month={viewMode === 'monthly' ? viewingMonth : undefined}
                  onMonthChange={viewMode === 'monthly' ? (m) => setViewingMonth(m) : undefined}
                  modifiers={modifiers}
                  modifiersClassNames={modifiersClassNames}
                  locale={getDateFnsLocale()}
                />
              </div>
            )}
            {googleCalendar.isAuthorized && (
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
                <button
                  className="refresh-calendar-button"
                  onClick={loadCalendarEvents}
                  disabled={loading}
                >
                  <RefreshCw className={loading ? 'spinning' : ''} size={16} />
                  {t('calendar.refreshEvents')}
                </button>
              </div>
            )}
          </div>

          <div className="card" style={{ marginTop: '2rem' }}>
            <div className="card-header">
              <h2 className="card-title">
                {viewMode === 'daily' && `${t('calendar.eventsFor')} ${format(selectedDate, 'MMMM dd, yyyy', { locale: getDateFnsLocale() })}`}
                {viewMode === 'weekly' && t('calendar.eventsForWeek', {
                  start: format(viewingWeekStart, 'd MMM', { locale: getDateFnsLocale() }),
                  end: format(endOfWeek(viewingWeekStart, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: getDateFnsLocale() })
                })}
                {viewMode === 'monthly' && t('calendar.eventsForMonth', { monthYear: format(viewingMonth, 'MMMM yyyy', { locale: getDateFnsLocale() }) })}
              </h2>
            </div>
            <div className="sessions-container">
              {!googleCalendar.isAuthorized ? (
                <div className="import-placeholder">
                  <AlertCircle size={48} />
                  <h2>{t('calendar.calendarNotConnected')}</h2>
                  <p>{t('calendar.authorizeInSettings')}</p>
                </div>
              ) : loading && events.length === 0 ? (
                <div className="loading-state">
                  <RefreshCw className="spinning" size={48} />
                  <p>{t('calendar.loadingEvents')}</p>
                </div>
              ) : (() => {
                const periodEvents = viewMode === 'daily' ? eventsForDate : viewMode === 'weekly' ? eventsForWeek : eventsForMonth;
                return periodEvents.length === 0 ? (
                  <p className="empty-sessions">
                    {t('calendar.noEvents')}
                  </p>
                ) : (
                <div className="sessions-list">
                  {periodEvents.map((event) => {
                    const { notes: parsedNotes } = parseEventDescription(event);
                    const sourceCalendar = calendars.find(cal => cal.id === event.sourceCalendarId);
                    
                    return (
                      <div key={event.id} className="calendar-event-card">
                        <div className="calendar-event-header">
                          {event.summary && (
                            <div className="event-title">{event.summary}</div>
                          )}
                        </div>
                        {sourceCalendar && (() => {
                          const calendarColor = getCalendarColor(sourceCalendar.summary);
                          return (
                            <div 
                              className="calendar-source-badge-inline"
                              style={{
                                background: calendarColor.bg,
                                borderColor: calendarColor.border,
                                color: calendarColor.color
                              }}
                            >
                              <CalendarIcon size={12} />
                              <span>{sourceCalendar.summary}</span>
                            </div>
                          );
                        })()}
                        {event.location && (
                          <div className="calendar-event-location">
                            <strong>{t('calendar.location')}:</strong> {event.location}
                          </div>
                        )}
                        {(parsedNotes || event.description) && (
                          <div className="calendar-event-notes">
                            <div 
                              className="notes-content"
                              dangerouslySetInnerHTML={{ 
                                __html: (() => {
                                  const content = parsedNotes || event.description || '';
                                  // Convert newlines to <br> tags
                                  // This works for both plain text and HTML content
                                  return content.replace(/\r\n/g, '\n').replace(/\n/g, '<br>');
                                })()
                              }}
                            />
                          </div>
                        )}
                        <div className="calendar-event-sync-badge">
                          <CalendarIcon size={14} />
                          <span>{t('calendar.fromGoogleCalendar')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
