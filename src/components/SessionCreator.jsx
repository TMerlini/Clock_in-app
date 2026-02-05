import { useState, useEffect } from 'react';
import { addDoc, collection, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { X, Save, AlertCircle, Plus, MapPin } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { formatHoursMinutes, calculateUsedIsencaoHours } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import './SessionEditor.css';

export function SessionCreator({ user, selectedDate, onClose, onUpdate }) {
  const { t, i18n } = useTranslation();
  const defaultDate = format(selectedDate, 'yyyy-MM-dd');
  const [clockInTime, setClockInTime] = useState(`${defaultDate}T09:00`);
  const [clockOutTime, setClockOutTime] = useState(`${defaultDate}T17:00`);
  const [includeLunchTime, setIncludeLunchTime] = useState(false);
  const [lunchAmount, setLunchAmount] = useState('');
  const [hadDinner, setHadDinner] = useState(false);
  const [dinnerAmount, setDinnerAmount] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [lunchDuration, setLunchDuration] = useState(1);
  const [defaultLunchDuration, setDefaultLunchDuration] = useState(1);
  const [lunchHours, setLunchHours] = useState(1);
  const [lunchMinutes, setLunchMinutes] = useState(0);
  const [weekendDaysOff, setWeekendDaysOff] = useState(1);
  const [weekendBonus, setWeekendBonus] = useState(100);
  const [bankHolidayApplyDaysOff, setBankHolidayApplyDaysOff] = useState(true);
  const [bankHolidayApplyBonus, setBankHolidayApplyBonus] = useState(true);
  const [isWeekend, setIsWeekend] = useState(false);
  const [isBankHoliday, setIsBankHoliday] = useState(false);

  useEffect(() => {
    loadSettings();
    checkIfWeekend();
  }, []);

  useEffect(() => {
    checkIfWeekend();
  }, [selectedDate]);

  const checkIfWeekend = () => {
    const dayOfWeek = selectedDate.getDay();
    // 0 = Sunday, 6 = Saturday
    setIsWeekend(dayOfWeek === 0 || dayOfWeek === 6);
  };

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
        // Set initial hours and minutes from default
        setLunchHours(Math.floor(duration));
        setLunchMinutes(Math.round((duration - Math.floor(duration)) * 60));
        setWeekendDaysOff(settings.weekendDaysOff || 1);
        setWeekendBonus(settings.weekendBonus || 100);
        setBankHolidayApplyDaysOff(settings.bankHolidayApplyDaysOff !== undefined ? settings.bankHolidayApplyDaysOff : true);
        setBankHolidayApplyBonus(settings.bankHolidayApplyBonus !== undefined ? settings.bankHolidayApplyBonus : true);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleCreate = async () => {
    const newClockIn = new Date(clockInTime).getTime();
    const newClockOut = new Date(clockOutTime).getTime();

    if (newClockOut <= newClockIn) {
      setError(t('sessionCreator.clockOutMustBeAfter'));
      return;
    }

    // Overlap detection: check existing sessions for the selected date
    try {
      const dayStart = startOfDay(selectedDate).getTime();
      const dayEnd = endOfDay(selectedDate).getTime();
      const sessionsRef = collection(db, 'sessions');
      const sessionsQuery = query(
        sessionsRef,
        where('userId', '==', user.uid),
        where('clockIn', '>=', dayStart),
        where('clockIn', '<=', dayEnd)
      );
      const snap = await getDocs(sessionsQuery);
      const existingSessions = [];
      snap.forEach((d) => existingSessions.push({ ...d.data(), id: d.id }));

      const overlaps = existingSessions.filter((s) => {
        const startA = newClockIn;
        const endA = newClockOut;
        const startB = s.clockIn;
        const endB = s.clockOut || s.clockIn;
        return startA < endB && startB < endA;
      });

      if (overlaps.length > 0) {
        const confirmed = window.confirm(t('sessionCreator.overlapConfirm'));
        if (!confirmed) return;
      }
    } catch (err) {
      console.error('Error checking session overlap:', err);
    }

    const totalHours = (newClockOut - newClockIn) / (1000 * 60 * 60);
    const actualLunchDuration = includeLunchTime ? (lunchHours + (lunchMinutes / 60)) : 0;
    const workingHours = includeLunchTime ? totalHours - actualLunchDuration : totalHours;

    // Load settings for annual Isenção limit
    let annualIsencaoLimit = 200;
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const settingsRef = doc(db, 'userSettings', currentUser.uid);
        const settingsDoc = await getDoc(settingsRef);
        if (settingsDoc.exists()) {
          const settings = settingsDoc.data();
          annualIsencaoLimit = settings.annualIsencaoLimit || 200;
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }

    // Load sessions for the calendar year to calculate used Isenção hours
    let usedIsencaoHours = 0;
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const sessionsRef = collection(db, 'sessions');
        const sessionsQuery = query(sessionsRef, where('userId', '==', currentUser.uid));
        const sessionsSnapshot = await getDocs(sessionsQuery);
        const allSessions = [];
        sessionsSnapshot.forEach((docSnap) => {
          allSessions.push({ id: docSnap.id, ...docSnap.data() });
        });
        usedIsencaoHours = calculateUsedIsencaoHours(allSessions, newClockIn);
      }
    } catch (error) {
      console.error('Error loading sessions for Isenção calculation:', error);
    }

    // Calculate hours based on whether it's a special day (weekend or bank holiday)
    // On special days: no Isenção, overwork starts at 8 hours
    // On normal days: Isenção 8-10h, overwork >10h
    const isSpecialDay = isWeekend || isBankHoliday;
    let regularHours, unpaidExtraHours, paidExtraHours;
    
    if (isSpecialDay) {
      regularHours = Math.min(workingHours, 8);
      unpaidExtraHours = 0; // No Isenção on weekends/bank holidays
      paidExtraHours = workingHours > 8 ? workingHours - 8 : 0; // Overwork starts at 8h
    } else {
      regularHours = Math.min(workingHours, 8);
      const potentialIsencaoHours = workingHours > 8 ? Math.min(workingHours - 8, 2) : 0;
      const remainingIsencaoLimit = Math.max(0, annualIsencaoLimit - usedIsencaoHours);
      
      if (potentialIsencaoHours <= remainingIsencaoLimit) {
        // Within the limit, use all potential Isenção hours
        unpaidExtraHours = potentialIsencaoHours;
        paidExtraHours = workingHours > 10 ? workingHours - 10 : 0;
      } else {
        // Exceeded the limit, only use remaining limit
        unpaidExtraHours = remainingIsencaoLimit;
        paidExtraHours = workingHours > 8 ? workingHours - 8 - unpaidExtraHours : 0;
      }
    }

    const newSession = {
      userId: user.uid,
      userEmail: user.email,
      clockIn: newClockIn,
      clockOut: newClockOut,
      totalHours: totalHours,
      includeLunchTime: includeLunchTime,
      lunchDuration: actualLunchDuration,
      lunchAmount: includeLunchTime && lunchAmount ? parseFloat(lunchAmount) : 0,
      hadDinner: hadDinner,
      dinnerAmount: hadDinner && dinnerAmount ? parseFloat(dinnerAmount) : 0,
      isWeekend: isWeekend,
      isBankHoliday: isBankHoliday,
      weekendDaysOff: isWeekend ? weekendDaysOff : (isBankHoliday && bankHolidayApplyDaysOff ? weekendDaysOff : 0),
      weekendBonus: isWeekend ? weekendBonus : (isBankHoliday && bankHolidayApplyBonus ? weekendBonus : 0),
      location: location,
      notes: notes,
      regularHours: regularHours,
      unpaidExtraHours: unpaidExtraHours,
      paidExtraHours: paidExtraHours,
    };

    setSaving(true);
    setError('');

    try {
      await addDoc(collection(db, 'sessions'), newSession);
      onUpdate();
      onClose();
    } catch (err) {
      console.error('Error creating session:', err);
      setError(t('sessionCreator.failedCreate'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('sessionCreator.title')}</h2>
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
            <span>{t('sessionCreator.creatingFor', { date: selectedDate.toLocaleDateString(i18n.language === 'pt' ? 'pt-PT' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) })}</span>
          </div>

          <div className="form-group">
            <label>{t('sessionCreator.clockInTime')}</label>
            <input
              type="datetime-local"
              value={clockInTime}
              onChange={(e) => setClockInTime(e.target.value)}
              className="time-input"
            />
          </div>

          <div className="form-group">
            <label>{t('sessionCreator.clockOutTime')}</label>
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
              <span>{t('sessionCreator.lunchTime', { duration: formatHoursMinutes(defaultLunchDuration) })}</span>
            </label>
          </div>

          {includeLunchTime && (
            <div className="form-group form-group-inline">
              <div className="inline-field">
                <label>{t('sessionCreator.lunchDuration')}</label>
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

              <div className="inline-field">
                <label htmlFor="lunchAmount">{t('sessionCreator.lunchAmount')}</label>
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
            </div>
          )}

          <div className="form-group form-group-inline">
            <div className="inline-field checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={hadDinner}
                  onChange={(e) => setHadDinner(e.target.checked)}
                  className="checkbox-input"
                />
                <span>{t('sessionCreator.hadDinner')}</span>
              </label>
            </div>

            {hadDinner && (
              <div className="inline-field">
                <label htmlFor="dinnerAmount">{t('sessionCreator.dinnerAmount')}</label>
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
          </div>

          <div className="form-group">
            <label>
              <MapPin className="label-icon" />
              {t('sessionCreator.locationOptional')}
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="time-input"
              placeholder={t('sessionCreator.locationPlaceholder')}
            />
          </div>

          <div className="form-group form-group-inline">
            <div className="inline-field checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isWeekend}
                  onChange={(e) => setIsWeekend(e.target.checked)}
                  className="checkbox-input"
                />
                <span>{t('sessionCreator.weekend')}</span>
              </label>
            </div>

            <div className="inline-field checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isBankHoliday}
                  onChange={(e) => setIsBankHoliday(e.target.checked)}
                  className="checkbox-input"
                />
                <span>{t('sessionCreator.bankHoliday')}</span>
              </label>
            </div>
          </div>

          {(isWeekend || isBankHoliday) && (
            <div className="info-message" style={{ marginBottom: '1rem' }}>
              <AlertCircle />
              <span>{t('sessionCreator.isencaoNoWeekendInfo')}</span>
            </div>
          )}

          <div className="form-group">
            <label>{t('sessionCreator.notesOptional')}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="notes-input"
              placeholder={t('sessionCreator.notesPlaceholder')}
              rows="3"
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose}>
            {t('sessionCreator.cancel')}
          </button>
          <button
            className="save-button"
            onClick={handleCreate}
            disabled={saving}
          >
            <Save />
            {saving ? t('sessionCreator.creating') : t('sessionCreator.createSession')}
          </button>
        </div>
      </div>
    </div>
  );
}
