import { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { collection, addDoc, query, where, getDocs, orderBy, doc, setDoc, deleteDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
import { Navigation } from './Navigation';
import { Analytics } from './Analytics';
import { Settings } from './Settings';
import { About } from './About';
import { FAQ } from './FAQ';
import { Calendar } from './ui/calendar';
import { SessionEditor } from './SessionEditor';
import { SessionCreator } from './SessionCreator';
import { DeleteConfirmation } from './DeleteConfirmation';
import { GoogleCalendarSync } from './GoogleCalendarSync';
import { Clock, LogOut, User, Calendar as CalendarIcon, Edit2, AlertTriangle, CheckCircle, Info, Plus, Trash2, TrendingUp, DollarSign, Coffee, UtensilsCrossed } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { formatHoursMinutes } from '../lib/utils';
import 'react-day-picker/style.css';
import './ClockInApp.css';

// Google Calendar Icon Component
const GoogleCalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="-11.4 -19 98.8 114" width="18" height="18">
    <path fill="#fff" d="M58 18H18v40h40z"/>
    <path fill="#ea4335" d="M58 76l18-18H58z"/>
    <path fill="#fbbc04" d="M76 18H58v40h18z"/>
    <path fill="#34a853" d="M58 58H18v18h40z"/>
    <path fill="#188038" d="M0 58v12c0 3.315 2.685 6 6 6h12V58z"/>
    <path fill="#1967d2" d="M76 18V6c0-3.315-2.685-6-6-6H58v18z"/>
    <path fill="#4285f4" d="M58 0H6C2.685 0 0 2.685 0 6v52h18V18h40z"/>
    <path fill="#4285f4" d="M26.205 49.03c-1.495-1.01-2.53-2.485-3.095-4.435l3.47-1.43c.315 1.2.865 2.13 1.65 2.79.78.66 1.73.985 2.84.985 1.135 0 2.11-.345 2.925-1.035s1.225-1.57 1.225-2.635c0-1.09-.43-1.98-1.29-2.67-.86-.69-1.94-1.035-3.23-1.035h-2.005V36.13h1.8c1.11 0 2.045-.3 2.805-.9.76-.6 1.14-1.42 1.14-2.465 0-.93-.34-1.67-1.02-2.225-.68-.555-1.54-.835-2.585-.835-1.02 0-1.83.27-2.43.815a4.784 4.784 0 00-1.31 2.005l-3.435-1.43c.455-1.29 1.29-2.43 2.515-3.415 1.225-.985 2.79-1.48 4.69-1.48 1.405 0 2.67.27 3.79.815 1.12.545 2 1.3 2.635 2.26.635.965.95 2.045.95 3.245 0 1.225-.295 2.26-.885 3.11-.59.85-1.315 1.5-2.175 1.955v.205a6.605 6.605 0 012.79 2.175c.725.975 1.09 2.14 1.09 3.5 0 1.36-.345 2.575-1.035 3.64S36.38 49.01 35.17 49.62c-1.215.61-2.58.92-4.095.92-1.755.005-3.375-.5-4.87-1.51zM47.52 31.81l-3.81 2.755-1.905-2.89 6.835-4.93h2.62V50h-3.74z"/>
  </svg>
);

export function ClockInApp({ user }) {
  const [currentPage, setCurrentPage] = useState('home');
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sessionsForDate, setSessionsForDate] = useState([]);
  const [datesWithSessions, setDatesWithSessions] = useState(new Map());
  const [editingSession, setEditingSession] = useState(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [deletingSession, setDeletingSession] = useState(null);
  const [syncingSession, setSyncingSession] = useState(null);

  // Google Calendar integration
  const googleCalendar = useGoogleCalendar();

  // Listen for active clock-in state from Firestore (real-time sync across devices)
  useEffect(() => {
    if (!user) return;

    const activeClockInRef = doc(db, 'activeClockIns', user.uid);

    const unsubscribe = onSnapshot(activeClockInRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const clockInTimestamp = data.clockInTime;
        const clockInDate = new Date(clockInTimestamp);
        const now = new Date();

        console.log('Active clock-in detected from Firestore:', new Date(clockInTimestamp));

        // Check if clock-in was on a different day (past midnight)
        if (clockInDate.getDate() !== now.getDate() ||
            clockInDate.getMonth() !== now.getMonth() ||
            clockInDate.getFullYear() !== now.getFullYear()) {

          // Auto clock-out at midnight
          const midnight = new Date(clockInDate);
          midnight.setHours(23, 59, 59, 999);
          const midnightTimestamp = midnight.getTime();

          console.log('Auto-clocking out at midnight for previous day session');
          await autoClockOut(clockInTimestamp, midnightTimestamp);

        } else {
          // Same day, restore/sync clock-in state
          console.log('Syncing clock-in state from Firestore');
          setClockInTime(clockInTimestamp);
          setIsClockedIn(true);
        }
      } else {
        // No active clock-in in Firestore
        console.log('No active clock-in found in Firestore');
        setIsClockedIn(false);
        setClockInTime(null);
      }
    }, (error) => {
      console.error('Error listening to active clock-in:', error);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    let interval;
    if (isClockedIn) {
      interval = setInterval(() => {
        const now = Date.now();
        setCurrentTime(now);

        // Check if we've crossed midnight
        const clockInDate = new Date(clockInTime);
        const currentDate = new Date(now);

        if (clockInDate.getDate() !== currentDate.getDate() ||
            clockInDate.getMonth() !== currentDate.getMonth() ||
            clockInDate.getFullYear() !== currentDate.getFullYear()) {

          // Auto clock-out at midnight
          const midnight = new Date(clockInDate);
          midnight.setHours(23, 59, 59, 999);
          const midnightTimestamp = midnight.getTime();

          console.log('Midnight crossed - auto-clocking out');
          autoClockOut(clockInTime, midnightTimestamp);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isClockedIn, clockInTime]);

  useEffect(() => {
    loadSessionDates();
  }, [user]);

  useEffect(() => {
    loadSessionsForDate(selectedDate);
  }, [selectedDate, user]);

  const loadSessionDates = async () => {
    try {
      const sessionsRef = collection(db, 'sessions');
      const q = query(
        sessionsRef,
        where('userId', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);

      // Group sessions by date and calculate total working hours (excluding lunch)
      const dateHoursMap = new Map();
      querySnapshot.forEach((doc) => {
        const session = doc.data();
        const sessionDate = new Date(session.clockIn);
        const dateStr = format(sessionDate, 'yyyy-MM-dd');

        // Calculate working hours (total hours - lunch duration)
        const lunchDuration = session.lunchDuration || 0;
        const workingHours = session.totalHours - lunchDuration;

        // Sum working hours for this date
        const currentHours = dateHoursMap.get(dateStr) || 0;
        dateHoursMap.set(dateStr, currentHours + workingHours);
      });

      // Categorize each date based on total working hours
      const dateTypes = new Map();
      dateHoursMap.forEach((workingHours, dateStr) => {
        if (workingHours <= 8) {
          dateTypes.set(dateStr, 'regular');
        } else if (workingHours <= 10) {
          dateTypes.set(dateStr, 'isencao');
        } else {
          dateTypes.set(dateStr, 'overwork');
        }
      });

      console.log('Dates with sessions:', Array.from(dateTypes.entries()));
      setDatesWithSessions(dateTypes);
    } catch (error) {
      console.error('Error loading session dates:', error);
      console.error('Error details:', error.message);
    }
  };

  const loadSessionsForDate = async (date) => {
    try {
      const startDate = startOfDay(date);
      const endDate = endOfDay(date);

      console.log('Loading sessions for date range:', {
        start: new Date(startDate.getTime()),
        end: new Date(endDate.getTime())
      });

      const sessionsRef = collection(db, 'sessions');
      const q = query(
        sessionsRef,
        where('userId', '==', user.uid)
      );

      const querySnapshot = await getDocs(q);
      const sessions = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Filter by date on the client side
        if (data.clockIn >= startDate.getTime() && data.clockIn <= endDate.getTime()) {
          sessions.push({ id: doc.id, ...data });
        }
      });

      // Sort by clockIn descending
      sessions.sort((a, b) => b.clockIn - a.clockIn);

      console.log('Loaded sessions for this date:', sessions);
      setSessionsForDate(sessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
      console.error('Error details:', error.message);
      setSessionsForDate([]);
    }
  };

  const autoClockOut = async (clockInTimestamp, clockOutTimestamp) => {
    const totalHours = (clockOutTimestamp - clockInTimestamp) / (1000 * 60 * 60);

    console.log('Auto-clocking out:', {
      clockIn: new Date(clockInTimestamp),
      clockOut: new Date(clockOutTimestamp),
      totalHours
    });

    const newSession = {
      userId: user.uid,
      userEmail: user.email,
      clockIn: clockInTimestamp,
      clockOut: clockOutTimestamp,
      totalHours: totalHours,
      regularHours: Math.min(totalHours, 8),
      unpaidExtraHours: totalHours > 8 ? Math.min(totalHours - 8, 2) : 0,
      paidExtraHours: totalHours > 10 ? totalHours - 10 : 0,
    };

    try {
      console.log('Saving auto-clocked session to Firebase:', newSession);
      await addDoc(collection(db, 'sessions'), newSession);
      console.log('Auto-clocked session saved successfully');

      // Delete active clock-in from Firestore (syncs across all devices)
      const activeClockInRef = doc(db, 'activeClockIns', user.uid);
      await deleteDoc(activeClockInRef);
      console.log('Active clock-in deleted from Firestore');

      // State will be updated by the Firestore listener

      // Reload sessions
      await Promise.all([
        loadSessionDates(),
        loadSessionsForDate(selectedDate)
      ]);

      alert('You were automatically clocked out at midnight (23:59:59).');
    } catch (error) {
      console.error('Error saving auto-clocked session:', error);
      alert('Failed to auto clock-out: ' + error.message);
    }
  };

  const handleClockInOut = async () => {
    if (!isClockedIn) {
      const now = Date.now();
      console.log('Clocking in at:', new Date(now));

      try {
        let calendarEventId = null;

        // Create placeholder calendar event if authorized
        if (googleCalendar.isAuthorized) {
          try {
            // Create placeholder event with estimated end time (8 hours from now)
            const estimatedEndTime = now + (8 * 60 * 60 * 1000);
            const placeholderEvent = await googleCalendar.createCalendarEvent({
              clockIn: now,
              clockOut: estimatedEndTime,
              regularHours: 0,
              unpaidHours: 0,
              paidHours: 0,
              notes: '',
              isPlaceholder: true
            });
            calendarEventId = placeholderEvent.id;
            console.log('Placeholder calendar event created:', calendarEventId);
          } catch (calendarError) {
            console.error('Failed to create placeholder calendar event:', calendarError);
            // Continue without calendar event
          }
        }

        // Save active clock-in to Firestore (syncs across all devices)
        const activeClockInRef = doc(db, 'activeClockIns', user.uid);
        await setDoc(activeClockInRef, {
          clockInTime: now,
          userId: user.uid,
          userEmail: user.email,
          createdAt: now,
          calendarEventId: calendarEventId // Store event ID for later update
        });
        console.log('Active clock-in saved to Firestore');

        // State will be updated by the Firestore listener
      } catch (error) {
        console.error('Error saving clock-in to Firestore:', error);
        alert('Failed to clock in: ' + error.message);
      }
    } else {
      const clockOutTime = Date.now();
      const totalHours = (clockOutTime - clockInTime) / (1000 * 60 * 60);

      console.log('Clocking out:', {
        clockIn: new Date(clockInTime),
        clockOut: new Date(clockOutTime),
        totalHours
      });

      const newSession = {
        userId: user.uid,
        userEmail: user.email,
        clockIn: clockInTime,
        clockOut: clockOutTime,
        totalHours: totalHours,
        regularHours: Math.min(totalHours, 8),
        unpaidExtraHours: totalHours > 8 ? Math.min(totalHours - 8, 2) : 0,
        paidExtraHours: totalHours > 10 ? totalHours - 10 : 0,
        calendarEventId: null,
        calendarSyncStatus: 'not_synced',
        lastSyncAt: null
      };

      try {
        // Get the calendar event ID from active clock-in
        const activeClockInRef = doc(db, 'activeClockIns', user.uid);
        const activeClockInSnap = await getDoc(activeClockInRef);
        const storedCalendarEventId = activeClockInSnap.exists() ? activeClockInSnap.data().calendarEventId : null;

        // Update or create calendar event if authorized
        if (googleCalendar.isAuthorized) {
          try {
            if (storedCalendarEventId) {
              // Update existing placeholder event
              await googleCalendar.updateCalendarEvent(storedCalendarEventId, {
                clockIn: clockInTime,
                clockOut: clockOutTime,
                regularHours: newSession.regularHours,
                unpaidHours: newSession.unpaidExtraHours,
                paidHours: newSession.paidExtraHours,
                notes: ''
              });
              newSession.calendarEventId = storedCalendarEventId;
              newSession.calendarSyncStatus = 'synced';
              newSession.lastSyncAt = Date.now();
              console.log('Calendar event updated:', storedCalendarEventId);
            } else {
              // Create new event if placeholder wasn't created
              const calendarEvent = await googleCalendar.createCalendarEvent({
                clockIn: clockInTime,
                clockOut: clockOutTime,
                regularHours: newSession.regularHours,
                unpaidHours: newSession.unpaidExtraHours,
                paidHours: newSession.paidExtraHours,
                notes: ''
              });
              newSession.calendarEventId = calendarEvent.id;
              newSession.calendarSyncStatus = 'synced';
              newSession.lastSyncAt = Date.now();
              console.log('Calendar event created:', calendarEvent.id);
            }
          } catch (calendarError) {
            console.error('Failed to sync calendar event:', calendarError);
            newSession.calendarSyncStatus = 'failed';
            // Don't block the flow if calendar sync fails
          }
        }

        console.log('Saving session to Firebase:', newSession);
        const docRef = await addDoc(collection(db, 'sessions'), newSession);
        console.log('Session saved successfully with ID:', docRef.id);

        // Delete active clock-in from Firestore (syncs across all devices)
        await deleteDoc(activeClockInRef);
        console.log('Active clock-in deleted from Firestore');

        // State will be updated by the Firestore listener

        // Reload sessions to show the new one immediately
        console.log('Reloading sessions...');
        await Promise.all([
          loadSessionDates(),
          loadSessionsForDate(selectedDate)
        ]);
        console.log('Sessions reloaded!');
      } catch (error) {
        console.error('Error saving session:', error);
        alert('Failed to save session: ' + error.message);
      }
    }
  };

  const handleSignOut = async () => {
    try {
      // Delete active clock-in from Firestore before signing out
      const activeClockInRef = doc(db, 'activeClockIns', user.uid);
      await deleteDoc(activeClockInRef).catch(() => {
        // Ignore error if document doesn't exist
        console.log('No active clock-in to delete');
      });

      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const calculateTimeBreakdown = (totalHours) => {
    const regularHours = Math.min(totalHours, 8);
    const unpaidExtraHours = totalHours > 8 ? Math.min(totalHours - 8, 2) : 0;
    const paidExtraHours = totalHours > 10 ? totalHours - 10 : 0;
    return { regularHours, unpaidExtraHours, paidExtraHours };
  };

  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const formatHours = (hours) => {
    return hours.toFixed(2);
  };

  const getWorkingMessage = (hours) => {
    if (hours < 1) {
      return "Just getting started!";
    } else if (hours < 2) {
      return "Rome wasn't built in a day...";
    } else if (hours < 3) {
      return "You're on fire! Keep going!";
    } else if (hours < 4) {
      return "Halfway through the morning!";
    } else if (hours < 5) {
      return "Maybe time for a little break, sunshine?";
    } else if (hours < 6) {
      return "Looking good! Stay hydrated!";
    } else if (hours < 7) {
      return "The finish line is in sight!";
    } else if (hours < 8) {
      return "Almost there champion!";
    } else if (hours < 9) {
      return "Into the extended hours zone!";
    } else if (hours < 10) {
      return "You're a machine! But seriously...";
    } else {
      return "Stop it, really! It's been 10+ hours!";
    }
  };

  const currentElapsedTime = isClockedIn ? currentTime - clockInTime : 0;
  const currentTotalHours = currentElapsedTime / (1000 * 60 * 60);
  const currentBreakdown = isClockedIn ? calculateTimeBreakdown(currentTotalHours) : null;

  const modifiers = {
    regularDay: (date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return datesWithSessions.get(dateStr) === 'regular';
    },
    isencaoDay: (date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return datesWithSessions.get(dateStr) === 'isencao';
    },
    overworkDay: (date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return datesWithSessions.get(dateStr) === 'overwork';
    },
  };

  const modifiersClassNames = {
    regularDay: 'regular-day',
    isencaoDay: 'isencao-day',
    overworkDay: 'overwork-day',
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'analytics':
        return <Analytics user={user} />;
      case 'faq':
        return <FAQ />;
      case 'settings':
        return <Settings googleCalendar={googleCalendar} />;
      case 'about':
        return <About />;
      case 'calendar':
      case 'home':
      default:
        return (
          <>
            <div className="main-content">
              <div>
                <div className="card">
                  <div className="card-header">
                    <h2 className="card-title">Time Tracker</h2>
                  </div>
                  <div className="card-content">
                    <button
                      onClick={handleClockInOut}
                      className={`clock-button ${isClockedIn ? 'clocked-in' : 'clocked-out'}`}
                    >
                      <span>{isClockedIn ? 'Clock Out' : 'Clock In'}</span>
                    </button>

                    {isClockedIn && (
                      <div className="timer-section">
                        <p className="timer-title">Elapsed Time</p>
                        <div className="elapsed-time">
                          {formatTime(currentElapsedTime)}
                        </div>

                        <div className="working-message">
                          {getWorkingMessage(currentTotalHours)}
                        </div>

                        <div className="time-breakdown">
                          <div className="time-category regular">
                            <span className="time-category-label">Regular Hours (0-8h)</span>
                            <span className="time-category-value">{formatHoursMinutes(currentBreakdown.regularHours)}</span>
                          </div>

                          {currentTotalHours > 8 && (
                            <div className="time-category unpaid">
                              <span className="time-category-label">Unpaid Extra (8-10h)</span>
                              <span className="time-category-value">{formatHoursMinutes(currentBreakdown.unpaidExtraHours)}</span>
                            </div>
                          )}

                          {currentTotalHours > 10 && (
                            <div className="time-category paid">
                              <span className="time-category-label">Paid Extra (10h+)</span>
                              <span className="time-category-value">{formatHoursMinutes(currentBreakdown.paidExtraHours)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Daily Stats Cards */}
                <div className="daily-stats-grid">
                  {(() => {
                    const totalDayHours = sessionsForDate.reduce((sum, s) => sum + s.totalHours, 0);
                    const totalUnpaid = sessionsForDate.reduce((sum, s) => sum + s.unpaidExtraHours, 0);
                    const totalPaid = sessionsForDate.reduce((sum, s) => sum + s.paidExtraHours, 0);
                    const totalLunchTime = sessionsForDate.reduce((sum, s) => sum + (s.lunchDuration || 0), 0);
                    const totalExpenses = sessionsForDate.reduce((sum, s) => sum + (s.lunchAmount || 0) + (s.dinnerAmount || 0), 0);
                    const firstSession = sessionsForDate.length > 0 ? sessionsForDate[sessionsForDate.length - 1] : null;
                    const lastSession = sessionsForDate.length > 0 ? sessionsForDate[0] : null;

                    return (
                      <>
                        <div className="daily-stat-card">
                          <div className="daily-stat-icon hours">
                            <Clock />
                          </div>
                          <div className="daily-stat-content">
                            <div className="daily-stat-label">Hours Day</div>
                            <div className="daily-stat-value">{formatHoursMinutes(totalDayHours)}</div>
                          </div>
                        </div>

                        <div className="daily-stat-card">
                          <div className="daily-stat-icon isencao">
                            <AlertTriangle />
                          </div>
                          <div className="daily-stat-content">
                            <div className="daily-stat-label">Isenção</div>
                            <div className="daily-stat-value">{formatHoursMinutes(totalUnpaid)}</div>
                          </div>
                        </div>

                        <div className="daily-stat-card">
                          <div className="daily-stat-icon overwork">
                            <TrendingUp />
                          </div>
                          <div className="daily-stat-content">
                            <div className="daily-stat-label">Overwork</div>
                            <div className="daily-stat-value">{formatHoursMinutes(totalPaid)}</div>
                          </div>
                        </div>

                        <div className="daily-stat-card">
                          <div className="daily-stat-icon lunch">
                            <Coffee />
                          </div>
                          <div className="daily-stat-content">
                            <div className="daily-stat-label">Lunch Time</div>
                            <div className="daily-stat-value">{formatHoursMinutes(totalLunchTime)}</div>
                          </div>
                        </div>

                        <div className="daily-stat-card">
                          <div className="daily-stat-icon expenses">
                            <UtensilsCrossed />
                          </div>
                          <div className="daily-stat-content">
                            <div className="daily-stat-label">Expenses</div>
                            <div className="daily-stat-value">€{totalExpenses.toFixed(2)}</div>
                          </div>
                        </div>

                        <div className="daily-stat-card">
                          <div className="daily-stat-icon clock-times">
                            <Clock />
                          </div>
                          <div className="daily-stat-content">
                            <div className="daily-stat-label">Clock In/Out</div>
                            <div className="daily-stat-value clock-io-times">
                              {firstSession ? (
                                <>
                                  <span className="clock-in-time">{format(new Date(firstSession.clockIn), 'HH:mm')}</span>
                                  <span className="clock-separator">→</span>
                                  <span className="clock-out-time">{format(new Date(lastSession.clockOut), 'HH:mm')}</span>
                                </>
                              ) : (
                                <span className="no-data">--:--</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div>
                <div className="card">
                  <div className="card-header">
                    <h2 className="card-title">
                      <CalendarIcon style={{ display: 'inline', width: '20px', height: '20px', marginRight: '8px' }} />
                      Select Date
                    </h2>
                    <p className="card-description">View your sessions for any date</p>
                  </div>
                  <div className="calendar-wrapper">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      modifiers={modifiers}
                      modifiersClassNames={modifiersClassNames}
                    />
                  </div>
                </div>

                <div className="card" style={{ marginTop: '2rem' }}>
                  <div className="card-header">
                    <div>
                      <h2 className="card-title">
                        Sessions for {format(selectedDate, 'MMM dd, yyyy')}
                      </h2>
                      <p className="card-description">
                        {sessionsForDate.length} session{sessionsForDate.length !== 1 ? 's' : ''} found
                      </p>
                    </div>
                    {sessionsForDate.length === 0 ? (
                      <button
                        className="add-session-button"
                        onClick={() => setCreatingSession(true)}
                        title="Add manual session"
                      >
                        <Plus />
                        Add Session
                      </button>
                    ) : (
                      <button
                        className="add-session-button"
                        onClick={() => setEditingSession(sessionsForDate[0])}
                        title="Edit first session"
                      >
                        <Edit2 />
                        Edit Session
                      </button>
                    )}
                  </div>

                  {sessionsForDate.length > 0 && (() => {
                    const totalDayHours = sessionsForDate.reduce((sum, s) => sum + s.totalHours, 0);
                    const totalLunchTime = sessionsForDate.reduce((sum, s) => sum + (s.lunchDuration || 0), 0);
                    const totalWorkingHours = totalDayHours - totalLunchTime;
                    const totalRegular = sessionsForDate.reduce((sum, s) => sum + s.regularHours, 0);
                    const totalUnpaid = sessionsForDate.reduce((sum, s) => sum + s.unpaidExtraHours, 0);
                    const totalPaid = sessionsForDate.reduce((sum, s) => sum + s.paidExtraHours, 0);

                    let notificationType = 'normal';
                    let notificationIcon = <CheckCircle />;
                    let notificationText = 'Regular work day';

                    if (totalWorkingHours > 10) {
                      notificationType = 'overtime';
                      notificationIcon = <AlertTriangle />;
                      notificationText = 'Overtime day - Extra paid hours accumulated';
                    } else if (totalWorkingHours > 8) {
                      notificationType = 'unpaid';
                      notificationIcon = <Info />;
                      notificationText = 'Extended hours - Unpaid overtime period';
                    } else if (totalWorkingHours < 8) {
                      notificationType = 'short';
                      notificationIcon = <Info />;
                      notificationText = 'Under 8 hours worked';
                    }

                    return (
                      <div className={`daily-summary ${notificationType}`}>
                        <div className="summary-icon">{notificationIcon}</div>
                        <div className="summary-content">
                          <div className="summary-text">{notificationText}</div>
                          <div className="summary-stats">
                            <span className="stat-item">Working: <strong>{formatHoursMinutes(totalWorkingHours)}</strong></span>
                            {totalRegular > 0 && <span className="stat-item regular">Regular: {formatHoursMinutes(totalRegular)}</span>}
                            {totalUnpaid > 0 && <span className="stat-item unpaid">Unpaid: {formatHoursMinutes(totalUnpaid)}</span>}
                            {totalPaid > 0 && <span className="stat-item paid">Paid OT: {formatHoursMinutes(totalPaid)}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="sessions-container">
                    {sessionsForDate.length === 0 ? (
                      <p className="empty-sessions">
                        No sessions recorded for this date
                      </p>
                    ) : (
                      <div className="sessions-list">
                        {sessionsForDate.map((session, index) => (
                          <div key={session.id} className="session-card">
                            <div className="session-header">
                              <span className="session-number">Session {sessionsForDate.length - index}</span>
                              <div className="session-actions">
                                <span className="session-total">{formatHoursMinutes(session.totalHours)}</span>
                                <button
                                  className="sync-session-button"
                                  onClick={() => setSyncingSession(session)}
                                  title="Sync to Google Calendar"
                                >
                                  <GoogleCalendarIcon />
                                </button>
                                <button
                                  className="edit-session-button"
                                  onClick={() => setEditingSession(session)}
                                  title="Edit session"
                                >
                                  <Edit2 />
                                </button>
                                <button
                                  className="delete-session-button"
                                  onClick={() => setDeletingSession(session)}
                                  title="Delete session"
                                >
                                  <Trash2 />
                                </button>
                              </div>
                            </div>
                            <div className="session-times">
                              <div>In: {format(new Date(session.clockIn), 'HH:mm:ss')}</div>
                              <div>Out: {format(new Date(session.clockOut), 'HH:mm:ss')}</div>
                            </div>
                            <div className="session-breakdown">
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
                            {session.notes && (
                              <div className="session-notes">
                                {session.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="app-container">
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />

      <div className="app-header">
        <div className="header-content">
          <div className="header-left">
            <div className="header-logo-wrapper">
              <img src="/images/animated white.gif" alt="Clock In Logo" className="header-logo" />
            </div>
            <div className="header-title-wrapper">
              <h1 className="header-title">CLOCK IN</h1>
              <p className="header-subtitle">Time Manager</p>
            </div>
          </div>
          <div className="header-right">
            <div className="user-info">
              <User />
              <span>{user.email}</span>
            </div>
            <button onClick={handleSignOut} className="sign-out-button">
              <LogOut />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {renderContent()}

      {editingSession && (
        <SessionEditor
          session={editingSession}
          onClose={() => setEditingSession(null)}
          onUpdate={async () => {
            await loadSessionsForDate(selectedDate);
            await loadSessionDates();
          }}
        />
      )}

      {creatingSession && (
        <SessionCreator
          user={user}
          selectedDate={selectedDate}
          onClose={() => setCreatingSession(false)}
          onUpdate={async () => {
            await loadSessionsForDate(selectedDate);
            await loadSessionDates();
          }}
        />
      )}

      {deletingSession && (
        <DeleteConfirmation
          session={deletingSession}
          onClose={() => setDeletingSession(null)}
          onUpdate={async () => {
            await loadSessionsForDate(selectedDate);
            await loadSessionDates();
          }}
        />
      )}

      {syncingSession && (
        <GoogleCalendarSync
          session={syncingSession}
          onClose={() => setSyncingSession(null)}
        />
      )}
    </div>
  );
}
