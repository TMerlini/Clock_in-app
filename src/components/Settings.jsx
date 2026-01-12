import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { CalendarAuthButton } from './CalendarAuthButton';
import { Settings as SettingsIcon, Save, RotateCcw, Clock, Coffee, AlertTriangle, DollarSign, Calendar, CheckCircle, XCircle, AlertCircle, RefreshCw, User, AtSign, Download } from 'lucide-react';
import { format } from 'date-fns';
import './Settings.css';

export function Settings({ googleCalendar, onUsernameChange, onNavigate }) {
  const [username, setUsername] = useState('');
  const [regularHoursThreshold, setRegularHoursThreshold] = useState(8);
  const [enableUnpaidExtra, setEnableUnpaidExtra] = useState(true);
  const [unpaidExtraThreshold, setUnpaidExtraThreshold] = useState(10);
  const [overtimeThreshold, setOvertimeThreshold] = useState(10);
  const [lunchDuration, setLunchDuration] = useState(1);
  const [lunchHours, setLunchHours] = useState(1);
  const [lunchMinutes, setLunchMinutes] = useState(0);
  const [weekStartDay, setWeekStartDay] = useState('monday');
  const [weekendDaysOff, setWeekendDaysOff] = useState(1);
  const [weekendBonus, setWeekendBonus] = useState(100);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showSetupInstructions, setShowSetupInstructions] = useState(false);
  const [syncStats, setSyncStats] = useState({
    totalSessions: 0,
    syncedSessions: 0,
    unsyncedSessions: 0,
    failedSessions: 0,
    lastSyncAt: null
  });

  useEffect(() => {
    loadSettings();
    if (googleCalendar?.isAuthorized) {
      loadSyncStats();
    }
  }, [googleCalendar?.isAuthorized]);

  const loadSettings = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const settingsRef = doc(db, 'userSettings', user.uid);
      const settingsDoc = await getDoc(settingsRef);

      if (settingsDoc.exists()) {
        const settings = settingsDoc.data();
        setUsername(settings.username || '');
        setRegularHoursThreshold(settings.regularHoursThreshold || 8);
        setEnableUnpaidExtra(settings.enableUnpaidExtra !== undefined ? settings.enableUnpaidExtra : true);
        setUnpaidExtraThreshold(settings.unpaidExtraThreshold || 10);
        setOvertimeThreshold(settings.overtimeThreshold || 10);
        const duration = settings.lunchDuration || 1;
        setLunchDuration(duration);
        // Convert decimal hours to hours and minutes
        setLunchHours(Math.floor(duration));
        setLunchMinutes(Math.round((duration - Math.floor(duration)) * 60));
        setWeekStartDay(settings.weekStartDay || 'monday');
        setWeekendDaysOff(settings.weekendDaysOff || 1);
        setWeekendBonus(settings.weekendBonus || 100);
        
        // Notify parent of username
        if (settings.username && onUsernameChange) {
          onUsernameChange(settings.username);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSyncStats = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const sessionsQuery = query(
        collection(db, 'sessions'),
        where('userId', '==', user.uid)
      );
      const sessionsSnapshot = await getDocs(sessionsQuery);
      
      let synced = 0;
      let unsynced = 0;
      let failed = 0;
      let latestSyncTime = null;

      sessionsSnapshot.forEach((doc) => {
        const session = doc.data();
        const status = session.calendarSyncStatus || 'not_synced';
        
        if (status === 'synced') {
          synced++;
          if (session.lastSyncAt && (!latestSyncTime || session.lastSyncAt > latestSyncTime)) {
            latestSyncTime = session.lastSyncAt;
          }
        } else if (status === 'failed') {
          failed++;
        } else {
          unsynced++;
        }
      });

      setSyncStats({
        totalSessions: sessionsSnapshot.size,
        syncedSessions: synced,
        unsyncedSessions: unsynced,
        failedSessions: failed,
        lastSyncAt: latestSyncTime
      });
    } catch (error) {
      console.error('Error loading sync stats:', error);
    }
  };

  const handleBatchSync = async () => {
    if (!googleCalendar || !googleCalendar.isAuthorized) {
      alert('Please authorize Google Calendar first');
      return;
    }

    setSyncing(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Get all unsynced and failed sessions
      const sessionsQuery = query(
        collection(db, 'sessions'),
        where('userId', '==', user.uid)
      );
      const sessionsSnapshot = await getDocs(sessionsQuery);
      
      const unsyncedSessions = [];
      sessionsSnapshot.forEach((docSnap) => {
        const session = docSnap.data();
        const status = session.calendarSyncStatus || 'not_synced';
        if (status === 'not_synced' || status === 'failed') {
          unsyncedSessions.push({ id: docSnap.id, ...session });
        }
      });

      if (unsyncedSessions.length === 0) {
        alert('All sessions are already synced!');
        setSyncing(false);
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const session of unsyncedSessions) {
        try {
          // Create calendar event
          const calendarEvent = await googleCalendar.createCalendarEvent({
            clockIn: session.clockIn,
            clockOut: session.clockOut,
            regularHours: session.regularHours,
            unpaidHours: session.unpaidExtraHours,
            paidHours: session.paidExtraHours,
            notes: session.notes || ''
          });

          // Update session with sync info
          const sessionRef = doc(db, 'sessions', session.id);
          await updateDoc(sessionRef, {
            calendarEventId: calendarEvent.id,
            calendarSyncStatus: 'synced',
            lastSyncAt: Date.now()
          });

          successCount++;
        } catch (error) {
          console.error(`Failed to sync session ${session.id}:`, error);
          
          // Mark as failed
          const sessionRef = doc(db, 'sessions', session.id);
          await updateDoc(sessionRef, {
            calendarSyncStatus: 'failed'
          });
          
          failCount++;
        }
      }

      // Reload stats
      await loadSyncStats();

      if (failCount === 0) {
        alert(`Successfully synced ${successCount} session(s)!`);
      } else {
        alert(`Synced ${successCount} session(s). ${failCount} failed.`);
      }
    } catch (error) {
      console.error('Error during batch sync:', error);
      alert('Failed to sync sessions. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Convert hours and minutes to decimal hours
      const lunchDurationDecimal = lunchHours + (lunchMinutes / 60);
      
      // Clean username - remove @ if user typed it, then we'll add it back for display
      const cleanUsername = username.replace(/^@/, '').trim();

      const settings = {
        username: cleanUsername,
        regularHoursThreshold,
        enableUnpaidExtra,
        unpaidExtraThreshold,
        overtimeThreshold: enableUnpaidExtra ? unpaidExtraThreshold : regularHoursThreshold,
        lunchDuration: lunchDurationDecimal,
        weekStartDay,
        weekendDaysOff,
        weekendBonus,
        updatedAt: Date.now()
      };

      const settingsRef = doc(db, 'userSettings', user.uid);
      await setDoc(settingsRef, settings);
      
      // Notify parent of username change
      if (onUsernameChange) {
        onUsernameChange(cleanUsername);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  };

  const handleReset = () => {
    setUsername('');
    setRegularHoursThreshold(8);
    setEnableUnpaidExtra(true);
    setUnpaidExtraThreshold(10);
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
            <User />
            <h2>Profile</h2>
          </div>
          <p className="section-description">
            Set your display name. This will be shown in the header instead of your email.
          </p>

          <div className="setting-item">
            <div className="setting-header">
              <AtSign className="setting-icon" />
              <div>
                <label htmlFor="username">Username / Alias</label>
                <p className="setting-description">Your display name (will be shown with @ prefix)</p>
              </div>
            </div>
            <div className="setting-input-group username-input-group">
              <span className="username-prefix">@</span>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/^@/, ''))}
                className="setting-input username-input"
                placeholder="yourname"
                maxLength={20}
              />
            </div>
          </div>
        </section>

        <section className="settings-section">
          <div className="section-title">
            <Clock />
            <h2>Hour Thresholds</h2>
          </div>
          <p className="section-description">
            Configure how your working hours are categorized. These thresholds determine when regular hours end and overtime begins.
          </p>

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

          <div className="setting-item checkbox-setting">
            <div className="setting-header">
              <AlertTriangle className="setting-icon unpaid" />
              <div>
                <label htmlFor="enableUnpaidExtra">Enable Unpaid Extra (Isenção)</label>
                <p className="setting-description">Track hours between regular and paid overtime as unpaid extra hours</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                id="enableUnpaidExtra"
                type="checkbox"
                checked={enableUnpaidExtra}
                onChange={(e) => setEnableUnpaidExtra(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {enableUnpaidExtra && (
            <div className="setting-item indented">
              <div className="setting-header">
                <AlertTriangle className="setting-icon unpaid" />
                <div>
                  <label htmlFor="unpaidExtraThreshold">Unpaid Extra Threshold</label>
                  <p className="setting-description">Hours beyond this value are considered paid overtime</p>
                </div>
              </div>
              <div className="setting-input-group">
                <input
                  id="unpaidExtraThreshold"
                  type="number"
                  min={regularHoursThreshold + 0.1}
                  max="24"
                  step="0.1"
                  value={unpaidExtraThreshold}
                  onChange={(e) => setUnpaidExtraThreshold(parseFloat(e.target.value))}
                  className="setting-input"
                />
                <span className="input-suffix">hours</span>
              </div>
            </div>
          )}

          <div className="info-box">
            <AlertTriangle />
            <div>
              {enableUnpaidExtra ? (
                <>
                  <strong>Hour Categories</strong>
                  <p>
                    • Regular: 0h - {regularHoursThreshold}h<br />
                    • Unpaid Extra (Isenção): {regularHoursThreshold}h - {unpaidExtraThreshold}h<br />
                    • Paid Overtime: {unpaidExtraThreshold}h+
                  </p>
                </>
              ) : (
                <>
                  <strong>Hour Categories</strong>
                  <p>
                    • Regular: 0h - {regularHoursThreshold}h<br />
                    • Paid Overtime: {regularHoursThreshold}h+
                  </p>
                </>
              )}
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

            {googleCalendar.isAuthorized && (
              <div className="sync-status-container">
                <h3 className="sync-status-title">Sync Status</h3>
                <div className="sync-stats-grid">
                  <div className="sync-stat-card synced">
                    <CheckCircle className="stat-icon" />
                    <div className="stat-content">
                      <div className="stat-value">{syncStats.syncedSessions}</div>
                      <div className="stat-label">Synced</div>
                    </div>
                  </div>
                  <div className="sync-stat-card unsynced">
                    <AlertCircle className="stat-icon" />
                    <div className="stat-content">
                      <div className="stat-value">{syncStats.unsyncedSessions}</div>
                      <div className="stat-label">Pending</div>
                    </div>
                  </div>
                  <div className="sync-stat-card failed">
                    <XCircle className="stat-icon" />
                    <div className="stat-content">
                      <div className="stat-value">{syncStats.failedSessions}</div>
                      <div className="stat-label">Failed</div>
                    </div>
                  </div>
                </div>
                {syncStats.lastSyncAt && (
                  <div className="last-sync-info">
                    <Clock className="last-sync-icon" />
                    <span>Last synced: {format(new Date(syncStats.lastSyncAt), 'MMM dd, yyyy HH:mm')}</span>
                  </div>
                )}
                {(syncStats.unsyncedSessions > 0 || syncStats.failedSessions > 0) && (
                  <button 
                    className="batch-sync-button" 
                    onClick={handleBatchSync}
                    disabled={syncing}
                  >
                    <RefreshCw className={syncing ? 'spinning' : ''} />
                    {syncing ? 'Syncing...' : `Sync ${syncStats.unsyncedSessions + syncStats.failedSessions} Session(s)`}
                  </button>
                )}
                
                {googleCalendar.isAuthorized && (
                  <button
                    className="import-calendar-button"
                    onClick={() => onNavigate && onNavigate('calendar-import')}
                  >
                    <Download />
                    Import from Calendar
                  </button>
                )}
              </div>
            )}
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
