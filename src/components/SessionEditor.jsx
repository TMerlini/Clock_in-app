import { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { X, Save, AlertCircle, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { formatHoursMinutes } from '../lib/utils';
import './SessionEditor.css';

export function SessionEditor({ session, onClose, onUpdate }) {
  const [clockInTime, setClockInTime] = useState(
    format(new Date(session.clockIn), "yyyy-MM-dd'T'HH:mm")
  );
  const [clockOutTime, setClockOutTime] = useState(
    format(new Date(session.clockOut), "yyyy-MM-dd'T'HH:mm")
  );
  const [includeLunchTime, setIncludeLunchTime] = useState(session.includeLunchTime || false);
  const [lunchAmount, setLunchAmount] = useState(session.lunchAmount ? session.lunchAmount.toString() : '');
  const [hadDinner, setHadDinner] = useState(session.hadDinner || false);
  const [dinnerAmount, setDinnerAmount] = useState(session.dinnerAmount ? session.dinnerAmount.toString() : '');
  const [location, setLocation] = useState(session.location || '');
  const [notes, setNotes] = useState(session.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [lunchDuration, setLunchDuration] = useState(1);
  const [defaultLunchDuration, setDefaultLunchDuration] = useState(1);
  const [lunchHours, setLunchHours] = useState(
    session.lunchDuration ? Math.floor(session.lunchDuration) : 1
  );
  const [lunchMinutes, setLunchMinutes] = useState(
    session.lunchDuration ? Math.round((session.lunchDuration - Math.floor(session.lunchDuration)) * 60) : 0
  );
  const [weekendDaysOff, setWeekendDaysOff] = useState(1);
  const [weekendBonus, setWeekendBonus] = useState(100);
  const [isWeekend, setIsWeekend] = useState(session.isWeekend || false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const settingsRef = doc(db, 'userSettings', user.uid);
      const settingsDoc = await getDoc(settingsRef);

      if (settingsDoc.exists()) {
        const settings = settingsDoc.data();
        const duration = settings.lunchDuration || 1;
        setDefaultLunchDuration(duration);
        setLunchDuration(duration);
        setWeekendDaysOff(settings.weekendDaysOff || 1);
        setWeekendBonus(settings.weekendBonus || 100);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSave = async () => {
    const newClockIn = new Date(clockInTime).getTime();
    const newClockOut = new Date(clockOutTime).getTime();

    if (newClockOut <= newClockIn) {
      setError('Clock out time must be after clock in time');
      return;
    }

    const totalHours = (newClockOut - newClockIn) / (1000 * 60 * 60);
    const actualLunchDuration = includeLunchTime ? (lunchHours + (lunchMinutes / 60)) : 0;
    const workingHours = includeLunchTime ? totalHours - actualLunchDuration : totalHours;

    const updatedSession = {
      clockIn: newClockIn,
      clockOut: newClockOut,
      totalHours: totalHours,
      includeLunchTime: includeLunchTime,
      lunchDuration: actualLunchDuration,
      lunchAmount: includeLunchTime && lunchAmount ? parseFloat(lunchAmount) : 0,
      hadDinner: hadDinner,
      dinnerAmount: hadDinner && dinnerAmount ? parseFloat(dinnerAmount) : 0,
      isWeekend: isWeekend,
      weekendDaysOff: isWeekend ? weekendDaysOff : 0,
      weekendBonus: isWeekend ? weekendBonus : 0,
      location: location,
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
              <span>Lunch time ({formatHoursMinutes(defaultLunchDuration)})</span>
            </label>
          </div>

          {includeLunchTime && (
            <>
              <div className="form-group">
                <label>Lunch Duration</label>
                <div className="lunch-duration-inputs">
                  <div className="time-input-wrapper">
                    <input
                      type="number"
                      min="0"
                      max="3"
                      step="1"
                      value={lunchHours}
                      onChange={(e) => setLunchHours(parseInt(e.target.value) || 0)}
                      className="setting-input time-input"
                    />
                    <span className="input-suffix">h</span>
                  </div>
                  <div className="time-input-wrapper">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      step="1"
                      value={lunchMinutes}
                      onChange={(e) => setLunchMinutes(parseInt(e.target.value) || 0)}
                      className="setting-input time-input"
                    />
                    <span className="input-suffix">m</span>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="lunchAmount">Lunch Amount (€)</label>
                <input
                  id="lunchAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={lunchAmount}
                  onChange={(e) => setLunchAmount(e.target.value)}
                  className="time-input"
                  placeholder="0.00"
                />
              </div>
            </>
          )}

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={hadDinner}
                onChange={(e) => setHadDinner(e.target.checked)}
                className="checkbox-input"
              />
              <span>Had dinner</span>
            </label>
          </div>

          {hadDinner && (
            <div className="form-group">
              <label htmlFor="dinnerAmount">Dinner Amount (€)</label>
              <input
                id="dinnerAmount"
                type="number"
                min="0"
                step="0.01"
                value={dinnerAmount}
                onChange={(e) => setDinnerAmount(e.target.value)}
                className="time-input"
                placeholder="0.00"
              />
            </div>
          )}

          <div className="form-group">
            <label>
              <MapPin className="label-icon" />
              Location (optional)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="time-input"
              placeholder="Add location (e.g., Office, Home, Client site, etc.)"
            />
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
