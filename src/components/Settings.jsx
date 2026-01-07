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
  const [weekStartDay, setWeekStartDay] = useState('monday');
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
        setLunchDuration(settings.lunchDuration || 1);
        setWeekStartDay(settings.weekStartDay || 'monday');
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

      const settings = {
        regularHoursThreshold,
        overtimeThreshold,
        lunchDuration,
        weekStartDay,
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
    setWeekStartDay('monday');
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
                  step="0.5"
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
                  step="0.5"
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
                <label htmlFor="lunchDuration">Default Lunch Duration</label>
                <p className="setting-description">Time deducted from working hours when lunch is included</p>
              </div>
            </div>
            <div className="setting-input-group">
              <input
                id="lunchDuration"
                type="number"
                min="0.25"
                max="3"
                step="0.25"
                value={lunchDuration}
                onChange={(e) => setLunchDuration(parseFloat(e.target.value))}
                className="setting-input"
              />
              <span className="input-suffix">hours</span>
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
