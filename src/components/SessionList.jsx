import { memo } from 'react';
import { format } from 'date-fns';
import { Edit2, Trash2, Plus, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { formatHoursMinutes } from '../lib/utils';
import { ActiveSessionCard } from './ActiveSessionCard';
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

export const SessionList = memo(function SessionList({
  selectedDate,
  sessionsForDate,
  isClockedIn,
  clockInTime,
  activeSessionDetails,
  onDetailsChange,
  onEditSession,
  onDeleteSession,
  onSyncSession,
  onCreateSession
}) {
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
            onClick={onCreateSession}
            title="Add manual session"
          >
            <Plus />
            Add Session
          </button>
        ) : (
          <button
            className="add-session-button"
            onClick={() => onEditSession(sessionsForDate[0])}
            title="Edit first session"
          >
            <Edit2 />
            Edit Session
          </button>
        )}
      </div>

      {sessionsForDate.length > 0 && (
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
      )}

      <div className="sessions-container">
        {/* Show ActiveSessionCard when clocked in and viewing today */}
        {isClockedIn && clockInTime && 
          selectedDate.toDateString() === new Date().toDateString() && (
            <ActiveSessionCard
              clockInTime={clockInTime}
              sessionDetails={activeSessionDetails}
              onDetailsChange={onDetailsChange}
            />
          )}
        
        {sessionsForDate.length === 0 && !(isClockedIn && selectedDate.toDateString() === new Date().toDateString()) ? (
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
                      onClick={() => onSyncSession(session)}
                      title="Sync to Google Calendar"
                    >
                      <GoogleCalendarIcon />
                    </button>
                    <button
                      className="edit-session-button"
                      onClick={() => onEditSession(session)}
                      title="Edit session"
                    >
                      <Edit2 />
                    </button>
                    <button
                      className="delete-session-button"
                      onClick={() => onDeleteSession(session)}
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
  );
});
