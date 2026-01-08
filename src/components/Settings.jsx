import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { CalendarAuthButton } from './CalendarAuthButton';
import { Settings as SettingsIcon, Save, RotateCcw, Clock, Coffee, AlertTriangle, DollarSign, Calendar } from 'lucide-react';
import './Settings.css';

export function Settings({ googleCalendar }) {
  const [regularHoursThreshold, setRegularHoursThreshold] = useState(8);
  const [overtimeThreshold, setOvertimeThreshold] = useState(10);
  const [lunchDuration, setLunchDuration] = useState(1);
  const [lunchHours, setLunchHours] = useState(1);
  const [lunchMinutes, setLunchMinutes] = useState(0);
  const [weekStartDay, setWeekStartDay] = useState('monday');
  const [weekendDaysOff, setWeekendDaysOff] = useState(1);
  const [weekendBonus, setWeekendBonus] = useState(100);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

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
        setRegularHoursThreshold(settings.regularHoursThreshold || 8);
        setOvertimeThreshold(settings.overtimeThreshold || 10);
        const duration = settings.lunchDuration || 1;
        setLunchDuration(duration);
        // Convert decimal hours to hours and minutes
        setLunchHours(Math.floor(duration));
        setLunchMinutes(Math.round((duration - Math.floor(duration)) * 60));
        setWeekStartDay(settings.weekStartDay || 'monday');
        setWeekendDaysOff(settings.weekendDaysOff || 1);
        setWeekendBonus(settings.weekendBonus || 100);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Convert hours and minutes to decimal hours
      const lunchDurationDecimal = lunchHours + (lunchMinutes / 60);

      const settings = {
        regularHoursThreshold,
        overtimeThreshold,
        lunchDuration: lunchDurationDecimal,
        weekStartDay,
        weekendDaysOff,
        weekendBonus,
        updatedAt: Date.now()
      };

      const settingsRef = doc(db, 'userSettings', user.uid);
      await setDoc(settingsRef, settings);

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  };

  const handleReset = () => {
    setRegularHoursThreshold(8);
    setOvertimeThreshold(10);
    setLunchDuration(1);
    setLunchHours(1);
    setLunchMinutes(0);
    setWeekStartDay('monday');
    setWeekendDaysOff(1);
    setWeekendBonus(100);
  };

  if (loading) {
    return (
      <div className="settings-container">
        <div className="loading">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <div className="header-content-settings">
          <SettingsIcon />
          <div>
            <h1>Settings</h1>
            <p>Customize your time tracking preferences</p>
          </div>
        </div>
      </div>

      <div className="settings-content">
        <section className="settings-section">
          <div className="section-title">
            <Clock />
            <h2>Hour Thresholds</h2>
          </div>
          <p className="section-description">
            Configure how your working hours are categorized. These thresholds determine when regular hours end and overtime begins.
          </p>

          <div className="settings-grid">
            <div className="setting-item">
              <div className="setting-header">
                <Clock className="setting-icon regular" />
                <div>
                  <label htmlFor="regularHours">Regular Hours Threshold</label>
                  <p className="setting-description">Hours up to this value are considered regular work time</p>
                </div>
              </div>
              <div className="setting-input-group">
                <input
                  id="regularHours"
                  type="number"
                  min="1"
                  max="24"
                  step="0.1"
                  value={regularHoursThreshold}
                  onChange={(e) => setRegularHoursThreshold(parseFloat(e.target.value))}
                  className="setting-input"
                />
                <span className="input-suffix">hours</span>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-header">
                <DollarSign className="setting-icon overtime" />
                <div>
                  <label htmlFor="overtimeHours">Paid Overtime Threshold</label>
                  <p className="setting-description">Hours beyond this value are considered paid overtime</p>
                </div>
              </div>
              <div className="setting-input-group">
                <input
                  id="overtimeHours"
                  type="number"
                  min="1"
                  max="24"
                  step="0.1"
                  value={overtimeThreshold}
                  onChange={(e) => setOvertimeThreshold(parseFloat(e.target.value))}
                  className="setting-input"
                />
                <span className="input-suffix">hours</span>
              </div>
            </div>
          </div>

          <div className="info-box">
            <AlertTriangle />
            <div>
              <strong>Unpaid Extra (Isenção)</strong>
              <p>Hours between {regularHoursThreshold}h and {overtimeThreshold}h are automatically tracked as unpaid overtime.</p>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <div className="section-title">
            <Coffee />
            <h2>Break Settings</h2>
          </div>
          <p className="section-description">
            Configure default break durations. This will be the default deduction when "Include lunch time" is checked.
          </p>

          <div className="setting-item">
            <div className="setting-header">
              <Coffee className="setting-icon lunch" />
              <div>
                <label htmlFor="lunchHours">Default Lunch Duration</label>
                <p className="setting-description">Time deducted from working hours when lunch is included</p>
              </div>
            </div>
            <div className="setting-input-group lunch-duration-inputs">
              <div className="time-input-wrapper">
                <input
                  id="lunchHours"
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
                  id="lunchMinutes"
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
        </section>

        <section className="settings-section">
          <div className="section-title">
            <Calendar />
            <h2>Calendar Settings</h2>
          </div>
          <p className="section-description">
            Customize how the calendar displays and behaves.
          </p>

          <div className="setting-item">
            <div className="setting-header">
              <Calendar className="setting-icon" />
              <div>
                <label htmlFor="weekStart">Week Start Day</label>
                <p className="setting-description">First day of the week in calendar view</p>
              </div>
            </div>
            <select
              id="weekStart"
              value={weekStartDay}
              onChange={(e) => setWeekStartDay(e.target.value)}
              className="setting-select"
            >
              <option value="sunday">Sunday</option>
              <option value="monday">Monday</option>
            </select>
          </div>
        </section>

        <section className="settings-section">
          <div className="section-title">
            <DollarSign />
            <h2>Weekend Work</h2>
          </div>
          <p className="section-description">
            Configure default benefits for working on weekends (Saturday & Sunday).
          </p>

          <div className="settings-grid">
            <div className="setting-item">
              <div className="setting-header">
                <Calendar className="setting-icon" />
                <div>
                  <label htmlFor="weekendDaysOff">Days Off Per Weekend</label>
                  <p className="setting-description">Days off earned for each weekend work day</p>
                </div>
              </div>
              <div className="setting-input-group">
                <input
                  id="weekendDaysOff"
                  type="number"
                  min="0"
                  max="5"
                  step="0.5"
                  value={weekendDaysOff}
                  onChange={(e) => setWeekendDaysOff(parseFloat(e.target.value))}
                  className="setting-input"
                />
                <span className="input-suffix">days</span>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-header">
                <DollarSign className="setting-icon overtime" />
                <div>
                  <label htmlFor="weekendBonus">Weekend Bonus</label>
                  <p className="setting-description">Extra compensation per weekend work day</p>
                </div>
              </div>
              <div className="setting-input-group">
                <input
                  id="weekendBonus"
                  type="number"
                  min="0"
                  step="1"
                  value={weekendBonus}
                  onChange={(e) => setWeekendBonus(parseFloat(e.target.value))}
                  className="setting-input"
                />
                <span className="input-suffix">€</span>
              </div>
            </div>
          </div>
        </section>

        {googleCalendar && (
          <section className="settings-section">
            <div className="section-title">
              <Calendar />
              <h2>Google Calendar Integration</h2>
            </div>
            <p className="section-description">
              Enable automatic calendar sync to add work sessions to your Google Calendar when you clock out.
            </p>
            <CalendarAuthButton
              isReady={googleCalendar.isReady}
              isAuthorized={googleCalendar.isAuthorized}
              onAuthorize={googleCalendar.requestAuthorization}
              onRevoke={googleCalendar.revokeAuthorization}
            />
          </section>
        )}

        <div className="settings-actions">
          <button className="reset-button" onClick={handleReset}>
            <RotateCcw />
            Reset to Defaults
          </button>
          <button className="save-button" onClick={handleSave}>
            <Save />
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>

        {saved && (
          <div className="success-message">
            Settings saved successfully! Changes will apply to new sessions.
          </div>
        )}
      </div>
    </div>
  );
}
