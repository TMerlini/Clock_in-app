import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { X, Save, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import './SessionEditor.css';

export function SessionEditor({ session, onClose, onUpdate }) {
  const [clockInTime, setClockInTime] = useState(
    format(new Date(session.clockIn), "yyyy-MM-dd'T'HH:mm")
  );
  const [clockOutTime, setClockOutTime] = useState(
    format(new Date(session.clockOut), "yyyy-MM-dd'T'HH:mm")
  );
  const [includeLunchTime, setIncludeLunchTime] = useState(session.includeLunchTime || false);
  const [notes, setNotes] = useState(session.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    const newClockIn = new Date(clockInTime).getTime();
    const newClockOut = new Date(clockOutTime).getTime();

    if (newClockOut <= newClockIn) {
      setError('Clock out time must be after clock in time');
      return;
    }

    const totalHours = (newClockOut - newClockIn) / (1000 * 60 * 60);
    const workingHours = includeLunchTime ? totalHours - 1 : totalHours;

    const updatedSession = {
      clockIn: newClockIn,
      clockOut: newClockOut,
      totalHours: totalHours,
      includeLunchTime: includeLunchTime,
      notes: notes,
      regularHours: Math.min(workingHours, 8),
      unpaidExtraHours: workingHours > 8 ? Math.min(workingHours - 8, 2) : 0,
      paidExtraHours: workingHours > 10 ? workingHours - 10 : 0,
    };

    setSaving(true);
    setError('');

    try {
      const sessionRef = doc(db, 'sessions', session.id);
      await updateDoc(sessionRef, updatedSession);
      onUpdate();
      onClose();
    } catch (err) {
      console.error('Error updating session:', err);
      setError('Failed to update session. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Session</h2>
          <button className="close-button" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-message">
              <AlertCircle />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label>Clock In Time</label>
            <input
              type="datetime-local"
              value={clockInTime}
              onChange={(e) => setClockInTime(e.target.value)}
              className="time-input"
            />
          </div>

          <div className="form-group">
            <label>Clock Out Time</label>
            <input
              type="datetime-local"
              value={clockOutTime}
              onChange={(e) => setClockOutTime(e.target.value)}
              className="time-input"
            />
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={includeLunchTime}
                onChange={(e) => setIncludeLunchTime(e.target.checked)}
                className="checkbox-input"
              />
              <span>Include lunch time (deduct 1 hour from work time)</span>
            </label>
          </div>

          <div className="form-group">
            <label>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="notes-input"
              placeholder="Add notes about this session (project, tasks, client, etc.)"
              rows="3"
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="save-button"
            onClick={handleSave}
            disabled={saving}
          >
            <Save />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
