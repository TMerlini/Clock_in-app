import { useState, useEffect, memo } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Clock, MapPin, FileText, Coffee, UtensilsCrossed, Calendar, Save } from 'lucide-react';
import { format } from 'date-fns';
import { formatHoursMinutes } from '../lib/utils';
import './ActiveSessionCard.css';

export const ActiveSessionCard = memo(function ActiveSessionCard({ clockInTime, sessionDetails, onDetailsChange }) {
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [includeLunchTime, setIncludeLunchTime] = useState(sessionDetails?.includeLunchTime || false);
  const [lunchHours, setLunchHours] = useState(sessionDetails?.lunchHours || 1);
  const [lunchMinutes, setLunchMinutes] = useState(sessionDetails?.lunchMinutes || 0);
  const [lunchAmount, setLunchAmount] = useState(sessionDetails?.lunchAmount || '');
  const [hadDinner, setHadDinner] = useState(sessionDetails?.hadDinner || false);
  const [dinnerAmount, setDinnerAmount] = useState(sessionDetails?.dinnerAmount || '');
  const [location, setLocation] = useState(sessionDetails?.location || '');
  const [notes, setNotes] = useState(sessionDetails?.notes || '');
  const [isWeekend, setIsWeekend] = useState(sessionDetails?.isWeekend || false);
  const [isBankHoliday, setIsBankHoliday] = useState(sessionDetails?.isBankHoliday || false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // Update elapsed time every second
  useEffect(() => {
    const updateElapsed = () => {
      const now = Date.now();
      const elapsed = now - clockInTime;
      const hours = Math.floor(elapsed / (1000 * 60 * 60));
      const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
      setElapsedTime(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [clockInTime]);

  // Check if clock-in is on weekend
  useEffect(() => {
    const clockInDate = new Date(clockInTime);
    const dayOfWeek = clockInDate.getDay();
    const weekendDay = dayOfWeek === 0 || dayOfWeek === 6;
    setIsWeekend(weekendDay);
  }, [clockInTime]);

  // Auto-save details to Firestore
  const saveDetails = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setSaving(true);
    try {
      const activeClockInRef = doc(db, 'activeClockIns', user.uid);
      await updateDoc(activeClockInRef, {
        sessionDetails: {
          includeLunchTime,
          lunchHours,
          lunchMinutes,
          lunchAmount: lunchAmount ? parseFloat(lunchAmount) : 0,
          hadDinner,
          dinnerAmount: dinnerAmount ? parseFloat(dinnerAmount) : 0,
          location,
          notes,
          isWeekend,
          isBankHoliday
        }
      });
      setLastSaved(new Date());
      
      // Notify parent of changes
      if (onDetailsChange) {
        onDetailsChange({
          includeLunchTime,
          lunchHours,
          lunchMinutes,
          lunchAmount: lunchAmount ? parseFloat(lunchAmount) : 0,
          hadDinner,
          dinnerAmount: dinnerAmount ? parseFloat(dinnerAmount) : 0,
          location,
          notes,
          isWeekend,
          isBankHoliday
        });
      }
    } catch (error) {
      console.error('Error saving session details:', error);
    } finally {
      setSaving(false);
    }
  };

  // Debounced auto-save when any field changes
  useEffect(() => {
    const timer = setTimeout(() => {
      saveDetails();
    }, 1000);

    return () => clearTimeout(timer);
  }, [includeLunchTime, lunchHours, lunchMinutes, lunchAmount, hadDinner, dinnerAmount, location, notes, isWeekend, isBankHoliday]);

  return (
    <div className="active-session-card">
      <div className="active-session-header">
        <div className="active-badge">
          <span className="pulse-dot"></span>
          IN PROGRESS
        </div>
        {saving && <span className="saving-indicator">Saving...</span>}
        {!saving && lastSaved && (
          <span className="saved-indicator">
            <Save size={12} />
            Saved
          </span>
        )}
      </div>

      <div className="active-session-times">
        <div className="time-display">
          <Clock className="time-icon" />
          <div className="time-info">
            <span className="time-label">Clock In</span>
            <span className="time-value">{format(new Date(clockInTime), 'HH:mm:ss')}</span>
          </div>
        </div>
        <div className="elapsed-display">
          <div className="elapsed-label">Elapsed Time</div>
          <div className="elapsed-value">{elapsedTime}</div>
        </div>
      </div>

      <div className="active-session-details">
        <div className="detail-section">
          <h4>Meal Details</h4>
          
          <div className="detail-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={includeLunchTime}
                onChange={(e) => setIncludeLunchTime(e.target.checked)}
                className="checkbox-input"
              />
              <Coffee size={16} />
              <span>Lunch time</span>
            </label>
            
            {includeLunchTime && (
              <div className="inline-inputs">
                <div className="mini-input-group">
                  <input
                    type="number"
                    min="0"
                    max="3"
                    value={lunchHours}
                    onChange={(e) => setLunchHours(parseInt(e.target.value) || 0)}
                    className="mini-input"
                  />
                  <span>h</span>
                </div>
                <div className="mini-input-group">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={lunchMinutes}
                    onChange={(e) => setLunchMinutes(parseInt(e.target.value) || 0)}
                    className="mini-input"
                  />
                  <span>m</span>
                </div>
                <div className="mini-input-group">
                  <span>€</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={lunchAmount}
                    onChange={(e) => setLunchAmount(e.target.value)}
                    className="mini-input amount"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="detail-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={hadDinner}
                onChange={(e) => setHadDinner(e.target.checked)}
                className="checkbox-input"
              />
              <UtensilsCrossed size={16} />
              <span>Had dinner</span>
            </label>
            
            {hadDinner && (
              <div className="inline-inputs">
                <div className="mini-input-group">
                  <span>€</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={dinnerAmount}
                    onChange={(e) => setDinnerAmount(e.target.value)}
                    className="mini-input amount"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="detail-section">
          <div className="detail-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isWeekend}
                onChange={(e) => setIsWeekend(e.target.checked)}
                className="checkbox-input"
              />
              <Calendar size={16} />
              <span>Weekend</span>
            </label>
          </div>
          
          <div className="detail-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isBankHoliday}
                onChange={(e) => setIsBankHoliday(e.target.checked)}
                className="checkbox-input"
              />
              <Calendar size={16} />
              <span>Bank Holiday</span>
            </label>
          </div>
          
          {(isWeekend || isBankHoliday) && (
            <div className="weekend-notice" style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '4px', fontSize: '0.85rem', color: '#8b5cf6' }}>
              <span>⚠️ Isenção does not apply on weekends/bank holidays. Only overwork hours will be counted.</span>
            </div>
          )}
        </div>

        <div className="detail-section">
          <div className="input-row">
            <MapPin size={16} />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location (optional)"
              className="text-input"
            />
          </div>
        </div>

        <div className="detail-section">
          <div className="input-row">
            <FileText size={16} />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="notes-input"
              rows={2}
            />
          </div>
        </div>
      </div>

      <div className="active-session-footer">
        <span className="auto-save-note">Changes save automatically</span>
      </div>
    </div>
  );
});
