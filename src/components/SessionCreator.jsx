import { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { X, Save, AlertCircle, Plus } from 'lucide-react';
import { format } from 'date-fns';
import './SessionEditor.css';

export function SessionCreator({ user, selectedDate, onClose, onUpdate }) {
  const defaultDate = format(selectedDate, 'yyyy-MM-dd');
  const [clockInTime, setClockInTime] = useState(`${defaultDate}T09:00`);
  const [clockOutTime, setClockOutTime] = useState(`${defaultDate}T17:00`);
  const [includeLunchTime, setIncludeLunchTime] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    const newClockIn = new Date(clockInTime).getTime();
    const newClockOut = new Date(clockOutTime).getTime();

    if (newClockOut <= newClockIn) {
      setError('Clock out time must be after clock in time');
      return;
    }

    const totalHours = (newClockOut - newClockIn) / (1000 * 60 * 60);
    const workingHours = includeLunchTime ? totalHours - 1 : totalHours;

    const newSession = {
      userId: user.uid,
      userEmail: user.email,
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
      await addDoc(collection(db, 'sessions'), newSession);
      onUpdate();
      onClose();
    } catch (err) {
      console.error('Error creating session:', err);
      setError('Failed to create session. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Manual Session</h2>
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

          <div className="info-message">
            <Plus />
            <span>Creating session for {format(selectedDate, 'MMM dd, yyyy')}</span>
          </div>

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
            onClick={handleCreate}
            disabled={saving}
          >
            <Save />
            {saving ? 'Creating...' : 'Create Session'}
          </button>
        </div>
      </div>
    </div>
  );
}
