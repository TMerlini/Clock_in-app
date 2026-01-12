import { Clock, Calendar, AlertTriangle, CheckCircle, Download } from 'lucide-react';
import { format } from 'date-fns';
import { formatHoursMinutes } from '../lib/utils';
import './ImportEventCard.css';

export function ImportEventCard({ event, conflict, isSelected, onSelect, onImport, loading, calendarName }) {
  const eventStart = new Date(event.start.dateTime || event.start.date);
  const eventEnd = new Date(event.end.dateTime || event.end.date);
  const durationMs = eventEnd.getTime() - eventStart.getTime();
  const totalHours = durationMs / (1000 * 60 * 60);

  // Parse description for hours breakdown
  let regularHours = Math.min(totalHours, 8);
  let unpaidExtraHours = totalHours > 8 ? Math.min(totalHours - 8, 2) : 0;
  let paidExtraHours = totalHours > 10 ? totalHours - 10 : 0;
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

  const getStatusClass = () => {
    if (conflict) return 'conflict';
    return 'ready';
  };

  const statusClass = getStatusClass();

  return (
    <div className={`import-event-card ${statusClass} ${isSelected ? 'selected' : ''}`}>
      <div className="import-card-header">
        <div className="import-card-checkbox">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            disabled={conflict || loading}
          />
          {conflict ? (
            <AlertTriangle className="status-icon conflict-icon" size={20} />
          ) : (
            <CheckCircle className="status-icon ready-icon" size={20} />
          )}
        </div>
        <div className="import-card-title">
          <h3>{event.summary || 'Work Session'}</h3>
          {conflict && (
            <span className="conflict-badge">
              <AlertTriangle size={14} />
              Conflict: Session already exists
            </span>
          )}
        </div>
      </div>

      <div className="import-card-content">
        <div className="import-card-times">
          <div className="time-item">
            <Clock size={16} />
            <div>
              <span className="time-label">Start</span>
              <span className="time-value">{format(eventStart, 'MMM dd, yyyy HH:mm')}</span>
            </div>
          </div>
          <div className="time-item">
            <Clock size={16} />
            <div>
              <span className="time-label">End</span>
              <span className="time-value">{format(eventEnd, 'MMM dd, yyyy HH:mm')}</span>
            </div>
          </div>
          <div className="time-item">
            <Calendar size={16} />
            <div>
              <span className="time-label">Duration</span>
              <span className="time-value">{formatHoursMinutes(totalHours)}</span>
            </div>
          </div>
        </div>

        <div className="import-card-breakdown">
          <span className="breakdown-badge regular">
            Regular: {formatHoursMinutes(regularHours)}
          </span>
          {unpaidExtraHours > 0 && (
            <span className="breakdown-badge unpaid">
              Unpaid: {formatHoursMinutes(unpaidExtraHours)}
            </span>
          )}
          {paidExtraHours > 0 && (
            <span className="breakdown-badge paid">
              Paid: {formatHoursMinutes(paidExtraHours)}
            </span>
          )}
        </div>

        {notes && (
          <div className="import-card-notes">
            <strong>Notes:</strong> {notes}
          </div>
        )}

        {event.location && (
          <div className="import-card-location">
            <strong>Location:</strong> {event.location}
          </div>
        )}

        {event.description && (
          <details className="import-card-description">
            <summary>View Description</summary>
            <pre>{event.description}</pre>
          </details>
        )}
      </div>

      <div className="import-card-actions">
        <button
          className="import-button"
          onClick={onImport}
          disabled={conflict || loading}
          title={conflict ? 'Cannot import - conflict detected' : 'Import this event'}
        >
          <Download size={16} />
          Import
        </button>
      </div>
    </div>
  );
}
