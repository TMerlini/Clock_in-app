import { useState } from 'react';
import { Calendar as CalendarIcon, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { formatHoursMinutes } from '../lib/utils';
import './GoogleCalendarSync.css';

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
                <CalendarIcon className="calendar-icon-large" />
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
