import { useState } from 'react';
import { ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { formatHoursMinutes } from '../lib/utils';
import './GoogleCalendarSync.css';

// Google Calendar Icon Component
const GoogleCalendarIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="-11.4 -19 98.8 114" className={className}>
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

export function GoogleCalendarSync({ session, onClose }) {
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState(false);

  const createGoogleCalendarEvent = () => {
    setCreating(true);

    const startDate = new Date(session.clockIn);
    const endDate = new Date(session.clockOut);

    // Format dates for Google Calendar (yyyyMMddTHHmmss)
    const formatGoogleDate = (date) => {
      return format(date, "yyyyMMdd'T'HHmmss");
    };

    const eventTitle = `Work Session`;
    const eventDescription = `Clock In: ${format(startDate, 'HH:mm:ss')}\\nClock Out: ${format(endDate, 'HH:mm:ss')}\\n\\nTotal Hours: ${formatHoursMinutes(session.totalHours)}\\nRegular: ${formatHoursMinutes(session.regularHours)}${session.unpaidExtraHours > 0 ? `\\nUnpaid Extra: ${formatHoursMinutes(session.unpaidExtraHours)}` : ''}${session.paidExtraHours > 0 ? `\\nPaid Extra: ${formatHoursMinutes(session.paidExtraHours)}` : ''}`;

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}&details=${encodeURIComponent(eventDescription)}&location=&sf=true&output=xml`;

    // Open in new window
    window.open(googleCalendarUrl, '_blank');

    setTimeout(() => {
      setCreating(false);
      setSuccess(true);
    }, 1000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content google-cal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Sync to Google Calendar</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {!success ? (
            <>
              <div className="calendar-info">
                <GoogleCalendarIcon className="calendar-icon-large" />
                <p className="info-text">
                  Export this work session to your Google Calendar
                </p>
              </div>

              <div className="session-preview">
                <h3>Session Details</h3>
                <div className="preview-item">
                  <strong>Date:</strong> {format(new Date(session.clockIn), 'MMM dd, yyyy')}
                </div>
                <div className="preview-item">
                  <strong>Clock In:</strong> {format(new Date(session.clockIn), 'HH:mm:ss')}
                </div>
                <div className="preview-item">
                  <strong>Clock Out:</strong> {format(new Date(session.clockOut), 'HH:mm:ss')}
                </div>
                <div className="preview-item">
                  <strong>Total:</strong> {formatHoursMinutes(session.totalHours)}
                </div>
              </div>
            </>
          ) : (
            <div className="success-message-container">
              <CheckCircle className="success-icon" />
              <p className="success-text">Google Calendar opened in new tab!</p>
              <p className="success-subtext">Review and save the event in your calendar</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {!success ? (
            <>
              <button className="cancel-button" onClick={onClose}>
                Cancel
              </button>
              <button
                className="google-calendar-button"
                onClick={createGoogleCalendarEvent}
                disabled={creating}
              >
                <ExternalLink />
                {creating ? 'Opening...' : 'Open in Google Calendar'}
              </button>
            </>
          ) : (
            <button className="save-button" onClick={onClose}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
