import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Calendar } from './ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { formatHoursMinutes } from '../lib/utils';
import './CalendarView.css';
import 'react-day-picker/style.css';

export function CalendarView({ user }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [importedSessions, setImportedSessions] = useState([]);
  const [sessionsForDate, setSessionsForDate] = useState([]);
  const [datesWithImportedSessions, setDatesWithImportedSessions] = useState(new Set());

  useEffect(() => {
    if (!user) return;

    // Real-time listener for imported sessions (those with calendarEventId)
    const sessionsRef = collection(db, 'sessions');
    const q = query(sessionsRef, where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allSessions = [];
      const dateSet = new Set();

      snapshot.forEach((doc) => {
        const session = { id: doc.id, ...doc.data() };
        // Only include sessions that were imported from Google Calendar
        if (session.calendarEventId) {
          allSessions.push(session);
          const sessionDate = new Date(session.clockIn);
          const dateStr = format(sessionDate, 'yyyy-MM-dd');
          dateSet.add(dateStr);
        }
      });

      setImportedSessions(allSessions);
      setDatesWithImportedSessions(dateSet);
      loadSessionsForDate(selectedDate, allSessions);
    });

    return () => unsubscribe();
  }, [user, selectedDate]);

  const loadSessionsForDate = (date, sessions = importedSessions) => {
    const startDate = startOfDay(date);
    const endDate = endOfDay(date);

    const filtered = sessions.filter((session) => {
      const sessionDate = new Date(session.clockIn);
      return sessionDate >= startDate && sessionDate <= endDate;
    });

    // Sort by clockIn descending
    filtered.sort((a, b) => b.clockIn - a.clockIn);
    setSessionsForDate(filtered);
  };

  const handleDateSelect = (date) => {
    if (date) {
      setSelectedDate(date);
      loadSessionsForDate(date);
    }
  };

  // Create modifiers for calendar highlighting
  const modifiers = {
    hasImportedSessions: (date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return datesWithImportedSessions.has(dateStr);
    }
  };

  const modifiersClassNames = {
    hasImportedSessions: 'has-imported-sessions'
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
              <p className="card-description">View imported Google Calendar events (read-only)</p>
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
          </div>

          <div className="card" style={{ marginTop: '2rem' }}>
            <div className="card-header">
              <h2 className="card-title">Events for {format(selectedDate, 'MMMM dd, yyyy')}</h2>
            </div>
            <div className="sessions-container">
              {sessionsForDate.length === 0 ? (
                <p className="empty-sessions">
                  No imported events for this date
                </p>
              ) : (
                <div className="sessions-list">
                  {sessionsForDate.map((session, index) => (
                    <div key={session.id} className="calendar-event-card">
                      <div className="calendar-event-header">
                        <span className="event-number">Event {sessionsForDate.length - index}</span>
                        <span className="event-total">{formatHoursMinutes(session.totalHours)}</span>
                      </div>
                      <div className="calendar-event-times">
                        <div>In: {format(new Date(session.clockIn), 'HH:mm:ss')}</div>
                        <div>Out: {format(new Date(session.clockOut), 'HH:mm:ss')}</div>
                      </div>
                      <div className="calendar-event-breakdown">
                        <span className="breakdown-badge regular">
                          Regular: {formatHoursMinutes(session.regularHours)}
                        </span>
                        {session.unpaidExtraHours > 0 && (
                          <span className="breakdown-badge unpaid">
                            Unpaid: {formatHoursMinutes(session.unpaidExtraHours)}
                          </span>
                        )}
                        {session.paidExtraHours > 0 && (
                          <span className="breakdown-badge paid">
                            Paid: {formatHoursMinutes(session.paidExtraHours)}
                          </span>
                        )}
                      </div>
                      {session.location && (
                        <div className="calendar-event-location">
                          <strong>Location:</strong> {session.location}
                        </div>
                      )}
                      {session.notes && (
                        <div className="calendar-event-notes">
                          {session.notes}
                        </div>
                      )}
                      <div className="calendar-event-sync-badge">
                        <CalendarIcon size={14} />
                        <span>Imported from Google Calendar</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
