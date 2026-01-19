import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { CalendarAuthButton } from './CalendarAuthButton';
import { Settings as SettingsIcon, Save, RotateCcw, Clock, Coffee, AlertTriangle, DollarSign, Calendar, CheckCircle, XCircle, AlertCircle, RefreshCw, User, AtSign, Download, Crown, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import i18n from '../lib/i18n';
import './Settings.css';

export function Settings({ googleCalendar, onUsernameChange, onNavigate }) {
  const { t } = useTranslation();
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
  const [annualIsencaoLimit, setAnnualIsencaoLimit] = useState(200);
  const [bankHolidayApplyDaysOff, setBankHolidayApplyDaysOff] = useState(true);
  const [bankHolidayApplyBonus, setBankHolidayApplyBonus] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [language, setLanguage] = useState('en');
  // Finance settings
  const [hourlyRate, setHourlyRate] = useState(0);
  const [isencaoRate, setIsencaoRate] = useState(0);
  const [isencaoCalculationMethod, setIsencaoCalculationMethod] = useState('percentage');
  const [isencaoFixedAmount, setIsencaoFixedAmount] = useState(0);
  const [taxDeductionType, setTaxDeductionType] = useState('both');
  const [irsRate, setIrsRate] = useState(0); // Legacy: single IRS rate
  const [irsBaseSalaryRate, setIrsBaseSalaryRate] = useState(0);
  const [irsIhtRate, setIrsIhtRate] = useState(0);
  const [irsOvertimeRate, setIrsOvertimeRate] = useState(0);
  const [socialSecurityRate, setSocialSecurityRate] = useState(11);
  const [customTaxRate, setCustomTaxRate] = useState(0);
  const [mealAllowanceIncluded, setMealAllowanceIncluded] = useState(false);
  const [overtimeFirstHourRate, setOvertimeFirstHourRate] = useState(1.25);
  const [overtimeSubsequentRate, setOvertimeSubsequentRate] = useState(1.50);
  const [weekendOvertimeRate, setWeekendOvertimeRate] = useState(1.50);
  const [holidayOvertimeRate, setHolidayOvertimeRate] = useState(2.00);
  const [fixedBonus, setFixedBonus] = useState(0);
  const [dailyMealSubsidy, setDailyMealSubsidy] = useState(0);
  const [mealCardDeduction, setMealCardDeduction] = useState(0);
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
    const loadData = async () => {
      // Load settings and sync stats in parallel if calendar is authorized
      if (googleCalendar?.isAuthorized) {
        await Promise.all([loadSettings(), loadSyncStats()]);
      } else {
        await loadSettings();
      }
    };
    loadData();
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
        setAnnualIsencaoLimit(settings.annualIsencaoLimit || 200);
        setBankHolidayApplyDaysOff(settings.bankHolidayApplyDaysOff !== undefined ? settings.bankHolidayApplyDaysOff : true);
        setBankHolidayApplyBonus(settings.bankHolidayApplyBonus !== undefined ? settings.bankHolidayApplyBonus : true);
        setIsPremium(settings.isPremium || false);
        setLanguage(settings.language || 'en');
        
        // Load finance settings
        const financeSettings = settings.financeSettings || {};
        setHourlyRate(financeSettings.hourlyRate || 0);
        setIsencaoRate(financeSettings.isencaoRate || 0);
        setIsencaoCalculationMethod(financeSettings.isencaoCalculationMethod || 'percentage');
        setIsencaoFixedAmount(financeSettings.isencaoFixedAmount || 0);
        setTaxDeductionType(financeSettings.taxDeductionType || 'both');
        setIrsRate(financeSettings.irsRate || 0); // Legacy
        setIrsBaseSalaryRate(financeSettings.irsBaseSalaryRate || 0);
        setIrsIhtRate(financeSettings.irsIhtRate || 0);
        setIrsOvertimeRate(financeSettings.irsOvertimeRate || 0);
        setSocialSecurityRate(financeSettings.socialSecurityRate !== undefined ? financeSettings.socialSecurityRate : 11);
        setCustomTaxRate(financeSettings.customTaxRate || 0);
        setMealAllowanceIncluded(financeSettings.mealAllowanceIncluded !== undefined ? financeSettings.mealAllowanceIncluded : false);
        setOvertimeFirstHourRate(financeSettings.overtimeFirstHourRate !== undefined ? financeSettings.overtimeFirstHourRate : 1.25);
        setOvertimeSubsequentRate(financeSettings.overtimeSubsequentRate !== undefined ? financeSettings.overtimeSubsequentRate : 1.50);
        setWeekendOvertimeRate(financeSettings.weekendOvertimeRate !== undefined ? financeSettings.weekendOvertimeRate : 1.50);
        setHolidayOvertimeRate(financeSettings.holidayOvertimeRate !== undefined ? financeSettings.holidayOvertimeRate : 2.00);
        setFixedBonus(financeSettings.fixedBonus || 0);
        setDailyMealSubsidy(financeSettings.dailyMealSubsidy || 0);
        setMealCardDeduction(financeSettings.mealCardDeduction || 0);
        
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

      // Process sync operations in parallel with concurrency limit
      const CONCURRENCY_LIMIT = 5;
      let successCount = 0;
      let failCount = 0;

      // Process sessions in batches to avoid rate limits
      for (let i = 0; i < unsyncedSessions.length; i += CONCURRENCY_LIMIT) {
        const batch = unsyncedSessions.slice(i, i + CONCURRENCY_LIMIT);
        
        const results = await Promise.allSettled(
          batch.map(async (session) => {
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

              return { success: true, sessionId: session.id };
            } catch (error) {
              console.error(`Failed to sync session ${session.id}:`, error);
              
              // Mark as failed
              const sessionRef = doc(db, 'sessions', session.id);
              await updateDoc(sessionRef, {
                calendarSyncStatus: 'failed'
              });
              
              return { success: false, sessionId: session.id, error };
            }
          })
        );

        // Count successes and failures
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.success) {
            successCount++;
          } else {
            failCount++;
          }
        });
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
        annualIsencaoLimit,
        bankHolidayApplyDaysOff,
        bankHolidayApplyBonus,
        isPremium,
        language,
        financeSettings: {
          hourlyRate,
          isencaoRate,
          isencaoCalculationMethod,
          isencaoFixedAmount,
          taxDeductionType,
          irsRate, // Legacy: single IRS rate
          irsBaseSalaryRate,
          irsIhtRate,
          irsOvertimeRate,
          socialSecurityRate,
          customTaxRate,
          mealAllowanceIncluded,
          overtimeFirstHourRate,
          overtimeSubsequentRate,
          weekendOvertimeRate,
          holidayOvertimeRate,
          fixedBonus,
          dailyMealSubsidy,
          mealCardDeduction
        },
        updatedAt: Date.now()
      };
      
      // Update i18n language if changed
      if (i18n.language !== language) {
        await i18n.changeLanguage(language);
      }

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
    setAnnualIsencaoLimit(200);
    setBankHolidayApplyDaysOff(true);
    setBankHolidayApplyBonus(true);
    setIsPremium(false);
    setLanguage('en');
    // Reset finance settings
    setHourlyRate(0);
    setIsencaoRate(0);
    setIsencaoCalculationMethod('percentage');
    setIsencaoFixedAmount(0);
    setTaxDeductionType('both');
    setIrsRate(0); // Legacy
    setIrsBaseSalaryRate(0);
    setIrsIhtRate(0);
    setIrsOvertimeRate(0);
    setSocialSecurityRate(11);
    setCustomTaxRate(0);
    setMealAllowanceIncluded(false);
    setOvertimeFirstHourRate(1.25);
    setOvertimeSubsequentRate(1.50);
    setWeekendOvertimeRate(1.50);
    setHolidayOvertimeRate(2.00);
    setFixedBonus(0);
    setDailyMealSubsidy(0);
    setMealCardDeduction(0);
  };

  const handleLanguageChange = async (newLanguage) => {
    setLanguage(newLanguage);
    // Update i18n immediately for instant UI update
    await i18n.changeLanguage(newLanguage);
  };

  if (loading) {
    return (
      <div className="settings-container">
        <div className="loading">{t('settings.actions.loadingSettings')}</div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <div className="header-content-settings">
          <SettingsIcon />
          <div>
            <h1>{t('settings.title')}</h1>
            <p>{t('settings.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="settings-content">
        <section className="settings-section">
          <div className="section-title">
            <User />
            <h2>{t('settings.profile.title')}</h2>
          </div>
          <p className="section-description">
            {t('settings.profile.description')}
          </p>

          <div className="setting-item">
            <div className="setting-header">
              <AtSign className="setting-icon" />
              <div>
                <label htmlFor="username">{t('settings.profile.username')}</label>
                <p className="setting-description">{t('settings.profile.usernameDescription')}</p>
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
                placeholder={t('settings.profile.usernamePlaceholder')}
                maxLength={20}
              />
            </div>
          </div>
        </section>

        <section className="settings-section">
          <div className="section-title">
            <Crown />
            <h2>{t('settings.premium.title')}</h2>
          </div>
          <p className="section-description">
            {t('settings.premium.description')}
          </p>

          <div className="setting-item checkbox-setting">
            <div className="setting-header">
              <Crown className="setting-icon premium" />
              <div>
                <label htmlFor="isPremium">{t('settings.premium.premiumStatus')}</label>
                <p className="setting-description">{t('settings.premium.premiumDescription')}</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                id="isPremium"
                type="checkbox"
                checked={isPremium}
                onChange={(e) => setIsPremium(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </section>

        <section className="settings-section">
          <div className="section-title">
            <Globe />
            <h2>{t('settings.language.title')}</h2>
          </div>
          <p className="section-description">
            {t('settings.language.description')}
          </p>

          <div className="setting-item">
            <div className="setting-header">
              <Globe className="setting-icon" />
              <div>
                <label htmlFor="language">{t('settings.language.selectLanguage')}</label>
                <p className="setting-description">{t('settings.language.description')}</p>
              </div>
            </div>
            <select
              id="language"
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="setting-select"
            >
              <option value="en">{t('settings.language.english')}</option>
              <option value="pt">{t('settings.language.portuguese')}</option>
            </select>
          </div>
        </section>

        <section className="settings-section">
          <div className="section-title">
            <DollarSign />
            <h2>{t('settings.finance.title')}</h2>
          </div>
          <p className="section-description">
            {t('settings.finance.description')}
          </p>

          <div className="setting-item">
            <div className="setting-header">
              <DollarSign className="setting-icon" />
              <div>
                <label htmlFor="hourlyRate">{t('settings.finance.hourlyRate')}</label>
                <p className="setting-description">{t('settings.finance.hourlyRateDescription')}</p>
              </div>
            </div>
            <div className="setting-input-group">
              <input
                id="hourlyRate"
                type="number"
                min="0"
                step="0.01"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                className="setting-input"
              />
              <span className="input-suffix">€</span>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-header">
              <AlertTriangle className="setting-icon unpaid" />
              <div>
                <label htmlFor="isencaoCalculationMethod">{t('settings.finance.isencaoCalculationMethod')}</label>
                <p className="setting-description">{t('settings.finance.isencaoCalculationMethodDescription')}</p>
              </div>
            </div>
            <select
              id="isencaoCalculationMethod"
              value={isencaoCalculationMethod}
              onChange={(e) => setIsencaoCalculationMethod(e.target.value)}
              className="setting-select"
            >
              <option value="percentage">{t('settings.finance.isencaoCalculationMethodPercentage')}</option>
              <option value="fixed">{t('settings.finance.isencaoCalculationMethodFixed')}</option>
            </select>
          </div>

          {isencaoCalculationMethod === 'percentage' && (
            <div className="setting-item indented">
              <div className="setting-header">
                <AlertTriangle className="setting-icon unpaid" />
                <div>
                  <label htmlFor="isencaoRate">{t('settings.finance.isencaoRate')}</label>
                  <p className="setting-description">{t('settings.finance.isencaoRateDescription')}</p>
                </div>
              </div>
              <div className="setting-input-group">
                <input
                  id="isencaoRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={isencaoRate}
                  onChange={(e) => setIsencaoRate(parseFloat(e.target.value) || 0)}
                  className="setting-input"
                />
                <span className="input-suffix">%</span>
              </div>
            </div>
          )}

          {isencaoCalculationMethod === 'fixed' && (
            <div className="setting-item indented">
              <div className="setting-header">
                <AlertTriangle className="setting-icon unpaid" />
                <div>
                  <label htmlFor="isencaoFixedAmount">{t('settings.finance.isencaoFixedAmount')}</label>
                  <p className="setting-description">{t('settings.finance.isencaoFixedAmountDescription')}</p>
                </div>
              </div>
              <div className="setting-input-group">
                <input
                  id="isencaoFixedAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={isencaoFixedAmount}
                  onChange={(e) => setIsencaoFixedAmount(parseFloat(e.target.value) || 0)}
                  className="setting-input"
                />
                <span className="input-suffix">€</span>
              </div>
            </div>
          )}

          <div className="setting-item">
            <div className="setting-header">
              <DollarSign className="setting-icon" />
              <div>
                <label htmlFor="taxDeductionType">{t('settings.finance.taxDeductionType')}</label>
                <p className="setting-description">{t('settings.finance.taxDeductionTypeDescription')}</p>
              </div>
            </div>
            <select
              id="taxDeductionType"
              value={taxDeductionType}
              onChange={(e) => setTaxDeductionType(e.target.value)}
              className="setting-select"
            >
              <option value="irs">{t('settings.finance.taxTypeIrs')}</option>
              <option value="social_security">{t('settings.finance.taxTypeSocialSecurity')}</option>
              <option value="custom">{t('settings.finance.taxTypeCustom')}</option>
              <option value="both">{t('settings.finance.taxTypeBoth')}</option>
            </select>
          </div>

          {(taxDeductionType === 'irs' || taxDeductionType === 'both') && (
            <>
              <div className="setting-item indented">
                <div className="setting-header">
                  <DollarSign className="setting-icon" />
                  <div>
                    <label htmlFor="irsBaseSalaryRate">{t('settings.finance.irsBaseSalaryRate')}</label>
                    <p className="setting-description">{t('settings.finance.irsBaseSalaryRateDescription')}</p>
                  </div>
                </div>
                <div className="setting-input-group">
                  <input
                    id="irsBaseSalaryRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={irsBaseSalaryRate}
                    onChange={(e) => setIrsBaseSalaryRate(parseFloat(e.target.value) || 0)}
                    className="setting-input"
                  />
                  <span className="input-suffix">%</span>
                </div>
              </div>

              <div className="setting-item indented">
                <div className="setting-header">
                  <DollarSign className="setting-icon" />
                  <div>
                    <label htmlFor="irsIhtRate">{t('settings.finance.irsIhtRate')}</label>
                    <p className="setting-description">{t('settings.finance.irsIhtRateDescription')}</p>
                  </div>
                </div>
                <div className="setting-input-group">
                  <input
                    id="irsIhtRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={irsIhtRate}
                    onChange={(e) => setIrsIhtRate(parseFloat(e.target.value) || 0)}
                    className="setting-input"
                  />
                  <span className="input-suffix">%</span>
                </div>
              </div>

              <div className="setting-item indented">
                <div className="setting-header">
                  <DollarSign className="setting-icon" />
                  <div>
                    <label htmlFor="irsOvertimeRate">{t('settings.finance.irsOvertimeRate')}</label>
                    <p className="setting-description">{t('settings.finance.irsOvertimeRateDescription')}</p>
                  </div>
                </div>
                <div className="setting-input-group">
                  <input
                    id="irsOvertimeRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={irsOvertimeRate}
                    onChange={(e) => setIrsOvertimeRate(parseFloat(e.target.value) || 0)}
                    className="setting-input"
                  />
                  <span className="input-suffix">%</span>
                </div>
              </div>

              {/* Legacy: Single IRS rate (fallback if separate rates are not set) */}
              <div className="setting-item indented" style={{ opacity: 0.6, marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <div className="setting-header">
                  <DollarSign className="setting-icon" />
                  <div>
                    <label htmlFor="irsRate">{t('settings.finance.irsRate')} ({t('settings.finance.legacy')})</label>
                    <p className="setting-description">{t('settings.finance.irsRateDescription')}</p>
                  </div>
                </div>
                <div className="setting-input-group">
                  <input
                    id="irsRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={irsRate}
                    onChange={(e) => setIrsRate(parseFloat(e.target.value) || 0)}
                    className="setting-input"
                  />
                  <span className="input-suffix">%</span>
                </div>
              </div>
            </>
          )}

          {(taxDeductionType === 'social_security' || taxDeductionType === 'both') && (
            <div className="setting-item indented">
              <div className="setting-header">
                <DollarSign className="setting-icon" />
                <div>
                  <label htmlFor="socialSecurityRate">{t('settings.finance.socialSecurityRate')}</label>
                  <p className="setting-description">{t('settings.finance.socialSecurityRateDescription')}</p>
                </div>
              </div>
              <div className="setting-input-group">
                <input
                  id="socialSecurityRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={socialSecurityRate}
                  onChange={(e) => setSocialSecurityRate(parseFloat(e.target.value) || 0)}
                  className="setting-input"
                />
                <span className="input-suffix">%</span>
              </div>
            </div>
          )}

          {taxDeductionType === 'custom' && (
            <div className="setting-item indented">
              <div className="setting-header">
                <DollarSign className="setting-icon" />
                <div>
                  <label htmlFor="customTaxRate">{t('settings.finance.customTaxRate')}</label>
                  <p className="setting-description">{t('settings.finance.customTaxRateDescription')}</p>
                </div>
              </div>
              <div className="setting-input-group">
                <input
                  id="customTaxRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={customTaxRate}
                  onChange={(e) => setCustomTaxRate(parseFloat(e.target.value) || 0)}
                  className="setting-input"
                />
                <span className="input-suffix">%</span>
              </div>
            </div>
          )}

          <div className="setting-item checkbox-setting">
            <div className="setting-header">
              <Coffee className="setting-icon" />
              <div>
                <label htmlFor="mealAllowanceIncluded">{t('settings.finance.mealAllowanceIncluded')}</label>
                <p className="setting-description">{t('settings.finance.mealAllowanceIncludedDescription')}</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                id="mealAllowanceIncluded"
                type="checkbox"
                checked={mealAllowanceIncluded}
                onChange={(e) => setMealAllowanceIncluded(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-header">
              <DollarSign className="setting-icon" />
              <div>
                <label htmlFor="fixedBonus">{t('settings.finance.fixedBonus')}</label>
                <p className="setting-description">{t('settings.finance.fixedBonusDescription')}</p>
              </div>
            </div>
            <div className="setting-input-group">
              <input
                id="fixedBonus"
                type="number"
                min="0"
                step="0.01"
                value={fixedBonus}
                onChange={(e) => setFixedBonus(parseFloat(e.target.value) || 0)}
                className="setting-input"
              />
              <span className="input-suffix">€</span>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-header">
              <Coffee className="setting-icon" />
              <div>
                <label htmlFor="dailyMealSubsidy">{t('settings.finance.dailyMealSubsidy')}</label>
                <p className="setting-description">{t('settings.finance.dailyMealSubsidyDescription')}</p>
              </div>
            </div>
            <div className="setting-input-group">
              <input
                id="dailyMealSubsidy"
                type="number"
                min="0"
                step="0.01"
                value={dailyMealSubsidy}
                onChange={(e) => setDailyMealSubsidy(parseFloat(e.target.value) || 0)}
                className="setting-input"
              />
              <span className="input-suffix">€</span>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-header">
              <Coffee className="setting-icon" />
              <div>
                <label htmlFor="mealCardDeduction">{t('settings.finance.mealCardDeduction')}</label>
                <p className="setting-description">{t('settings.finance.mealCardDeductionDescription')}</p>
              </div>
            </div>
            <div className="setting-input-group">
              <input
                id="mealCardDeduction"
                type="number"
                min="0"
                step="0.01"
                value={mealCardDeduction}
                onChange={(e) => setMealCardDeduction(parseFloat(e.target.value) || 0)}
                className="setting-input"
              />
              <span className="input-suffix">€</span>
            </div>
          </div>

          <div className="info-box">
            <DollarSign />
            <div>
              <strong>{t('settings.finance.overtimeRates')}</strong>
              <p>{t('settings.finance.overtimeRatesDescription')}</p>
              <div style={{ marginTop: '1rem' }}>
                <div className="setting-item">
                  <div className="setting-header">
                    <Clock className="setting-icon" />
                    <div>
                      <label htmlFor="overtimeFirstHourRate">{t('settings.finance.overtimeFirstHourRate')}</label>
                      <p className="setting-description">{t('settings.finance.overtimeFirstHourRateDescription')}</p>
                    </div>
                  </div>
                  <div className="setting-input-group">
                    <input
                      id="overtimeFirstHourRate"
                      type="number"
                      min="1"
                      max="5"
                      step="0.01"
                      value={overtimeFirstHourRate}
                      onChange={(e) => setOvertimeFirstHourRate(parseFloat(e.target.value) || 1.25)}
                      className="setting-input"
                    />
                    <span className="input-suffix">×</span>
                  </div>
                </div>

                <div className="setting-item">
                  <div className="setting-header">
                    <Clock className="setting-icon" />
                    <div>
                      <label htmlFor="overtimeSubsequentRate">{t('settings.finance.overtimeSubsequentRate')}</label>
                      <p className="setting-description">{t('settings.finance.overtimeSubsequentRateDescription')}</p>
                    </div>
                  </div>
                  <div className="setting-input-group">
                    <input
                      id="overtimeSubsequentRate"
                      type="number"
                      min="1"
                      max="5"
                      step="0.01"
                      value={overtimeSubsequentRate}
                      onChange={(e) => setOvertimeSubsequentRate(parseFloat(e.target.value) || 1.50)}
                      className="setting-input"
                    />
                    <span className="input-suffix">×</span>
                  </div>
                </div>

                <div className="setting-item">
                  <div className="setting-header">
                    <Calendar className="setting-icon" />
                    <div>
                      <label htmlFor="weekendOvertimeRate">{t('settings.finance.weekendOvertimeRate')}</label>
                      <p className="setting-description">{t('settings.finance.weekendOvertimeRateDescription')}</p>
                    </div>
                  </div>
                  <div className="setting-input-group">
                    <input
                      id="weekendOvertimeRate"
                      type="number"
                      min="1"
                      max="5"
                      step="0.01"
                      value={weekendOvertimeRate}
                      onChange={(e) => setWeekendOvertimeRate(parseFloat(e.target.value) || 1.50)}
                      className="setting-input"
                    />
                    <span className="input-suffix">×</span>
                  </div>
                </div>

                <div className="setting-item">
                  <div className="setting-header">
                    <Calendar className="setting-icon" />
                    <div>
                      <label htmlFor="holidayOvertimeRate">{t('settings.finance.holidayOvertimeRate')}</label>
                      <p className="setting-description">{t('settings.finance.holidayOvertimeRateDescription')}</p>
                    </div>
                  </div>
                  <div className="setting-input-group">
                    <input
                      id="holidayOvertimeRate"
                      type="number"
                      min="1"
                      max="5"
                      step="0.01"
                      value={holidayOvertimeRate}
                      onChange={(e) => setHolidayOvertimeRate(parseFloat(e.target.value) || 2.00)}
                      className="setting-input"
                    />
                    <span className="input-suffix">×</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <div className="section-title">
            <Clock />
            <h2>{t('settings.hourThresholds.title')}</h2>
          </div>
          <p className="section-description">
            {t('settings.hourThresholds.description')}
          </p>

          <div className="setting-item">
            <div className="setting-header">
              <Clock className="setting-icon regular" />
              <div>
                <label htmlFor="regularHours">{t('settings.hourThresholds.regularHours')}</label>
                <p className="setting-description">{t('settings.hourThresholds.regularHoursDescription')}</p>
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
              <span className="input-suffix">{t('settings.units.hours')}</span>
            </div>
          </div>

          <div className="setting-item checkbox-setting">
            <div className="setting-header">
              <AlertTriangle className="setting-icon unpaid" />
              <div>
                <label htmlFor="enableUnpaidExtra">{t('settings.hourThresholds.enableUnpaidExtra')}</label>
                <p className="setting-description">{t('settings.hourThresholds.enableUnpaidExtraDescription')}</p>
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
                  <label htmlFor="unpaidExtraThreshold">{t('settings.hourThresholds.unpaidExtraThreshold')}</label>
                  <p className="setting-description">{t('settings.hourThresholds.unpaidExtraThresholdDescription')}</p>
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
                <span className="input-suffix">{t('settings.units.hours')}</span>
              </div>
            </div>
          )}

          <div className="info-box">
            <AlertTriangle />
            <div>
              {enableUnpaidExtra ? (
                <>
                  <strong>{t('settings.hourThresholds.hourCategories')}</strong>
                  <p>
                    • {t('settings.hourThresholds.regular')}: 0h - {regularHoursThreshold}h<br />
                    • {t('settings.hourThresholds.unpaidExtra')}: {regularHoursThreshold}h - {unpaidExtraThreshold}h<br />
                    • {t('settings.hourThresholds.paidOvertime')}: {unpaidExtraThreshold}h+
                  </p>
                </>
              ) : (
                <>
                  <strong>{t('settings.hourThresholds.hourCategories')}</strong>
                  <p>
                    • {t('settings.hourThresholds.regular')}: 0h - {regularHoursThreshold}h<br />
                    • {t('settings.hourThresholds.paidOvertime')}: {regularHoursThreshold}h+
                  </p>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="settings-section">
          <div className="section-title">
            <AlertTriangle className="unpaid" />
            <h2>{t('settings.isencao.title')}</h2>
          </div>
          <p className="section-description">
            {t('settings.isencao.description')}
          </p>

          <div className="setting-item">
            <div className="setting-header">
              <AlertTriangle className="setting-icon unpaid" />
              <div>
                <label htmlFor="annualIsencaoLimit">{t('settings.isencao.annualLimit')}</label>
                <p className="setting-description">{t('settings.isencao.annualLimitDescription')}</p>
              </div>
            </div>
            <div className="setting-input-group">
              <input
                id="annualIsencaoLimit"
                type="number"
                min="0"
                step="1"
                value={annualIsencaoLimit}
                onChange={(e) => setAnnualIsencaoLimit(parseInt(e.target.value) || 0)}
                className="setting-input"
              />
              <span className="input-suffix">{t('settings.units.hoursPerYear')}</span>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <div className="section-title">
            <Coffee />
            <h2>{t('settings.breaks.title')}</h2>
          </div>
          <p className="section-description">
            {t('settings.breaks.description')}
          </p>

          <div className="setting-item">
            <div className="setting-header">
              <Coffee className="setting-icon lunch" />
              <div>
                <label htmlFor="lunchHours">{t('settings.breaks.lunchDuration')}</label>
                <p className="setting-description">{t('settings.breaks.lunchDurationDescription')}</p>
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
            <h2>{t('settings.calendar.title')}</h2>
          </div>
          <p className="section-description">
            {t('settings.calendar.description')}
          </p>

          <div className="setting-item">
            <div className="setting-header">
              <Calendar className="setting-icon" />
              <div>
                <label htmlFor="weekStart">{t('settings.calendar.weekStart')}</label>
                <p className="setting-description">{t('settings.calendar.weekStartDescription')}</p>
              </div>
            </div>
            <select
              id="weekStart"
              value={weekStartDay}
              onChange={(e) => setWeekStartDay(e.target.value)}
              className="setting-select"
            >
              <option value="sunday">{t('settings.units.sunday')}</option>
              <option value="monday">{t('settings.units.monday')}</option>
            </select>
          </div>
        </section>

        <section className="settings-section">
          <div className="section-title">
            <DollarSign />
            <h2>{t('settings.weekendWork.title')}</h2>
          </div>
          <p className="section-description">
            {t('settings.weekendWork.description')}
          </p>

          <div className="settings-grid">
            <div className="setting-item">
              <div className="setting-header">
                <Calendar className="setting-icon" />
                <div>
                  <label htmlFor="weekendDaysOff">{t('settings.weekendWork.daysOff')}</label>
                  <p className="setting-description">{t('settings.weekendWork.daysOffDescription')}</p>
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
                <span className="input-suffix">{t('settings.units.days')}</span>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-header">
                <DollarSign className="setting-icon overtime" />
                <div>
                  <label htmlFor="weekendBonus">{t('settings.weekendWork.bonus')}</label>
                  <p className="setting-description">{t('settings.weekendWork.bonusDescription')}</p>
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

        <section className="settings-section">
          <div className="section-title">
            <Calendar />
            <h2>{t('settings.bankHolidays.title')}</h2>
          </div>
          <p className="section-description">
            {t('settings.bankHolidays.description')}
          </p>

          <div className="settings-grid">
            <div className="setting-item">
              <div className="setting-header">
                <Calendar className="setting-icon" />
                <div>
                  <label htmlFor="bankHolidayApplyDaysOff">{t('settings.bankHolidays.applyDaysOff')}</label>
                  <p className="setting-description">{t('settings.bankHolidays.applyDaysOffDescription')}</p>
                </div>
              </div>
              <div className="setting-input-group">
                <label className="toggle-switch">
                  <input
                    id="bankHolidayApplyDaysOff"
                    type="checkbox"
                    checked={bankHolidayApplyDaysOff}
                    onChange={(e) => setBankHolidayApplyDaysOff(e.target.checked)}
                    className="toggle-input"
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-label">
                  {bankHolidayApplyDaysOff ? t('settings.bankHolidays.enabled') : t('settings.bankHolidays.disabled')}
                </span>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-header">
                <DollarSign className="setting-icon overtime" />
                <div>
                  <label htmlFor="bankHolidayApplyBonus">{t('settings.bankHolidays.applyBonus')}</label>
                  <p className="setting-description">{t('settings.bankHolidays.applyBonusDescription')}</p>
                </div>
              </div>
              <div className="setting-input-group">
                <label className="toggle-switch">
                  <input
                    id="bankHolidayApplyBonus"
                    type="checkbox"
                    checked={bankHolidayApplyBonus}
                    onChange={(e) => setBankHolidayApplyBonus(e.target.checked)}
                    className="toggle-input"
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-label">
                  {bankHolidayApplyBonus ? t('settings.bankHolidays.enabled') : t('settings.bankHolidays.disabled')}
                </span>
              </div>
            </div>
          </div>
        </section>

        {googleCalendar && (
          <section className="settings-section">
            <div className="section-title">
              <Calendar />
              <h2>{t('settings.googleCalendar.title')}</h2>
            </div>
            <p className="section-description">
              {t('settings.googleCalendar.description')}
            </p>
            <CalendarAuthButton
              isReady={googleCalendar.isReady}
              isAuthorized={googleCalendar.isAuthorized}
              onAuthorize={googleCalendar.requestAuthorization}
              onRevoke={googleCalendar.revokeAuthorization}
            />

            {googleCalendar.isAuthorized && (
              <div className="sync-status-container">
                <h3 className="sync-status-title">{t('settings.googleCalendar.syncStatus')}</h3>
                <div className="sync-stats-grid">
                  <div className="sync-stat-card synced">
                    <CheckCircle className="stat-icon" />
                    <div className="stat-content">
                      <div className="stat-value">{syncStats.syncedSessions}</div>
                      <div className="stat-label">{t('settings.googleCalendar.synced')}</div>
                    </div>
                  </div>
                  <div className="sync-stat-card unsynced">
                    <AlertCircle className="stat-icon" />
                    <div className="stat-content">
                      <div className="stat-value">{syncStats.unsyncedSessions}</div>
                      <div className="stat-label">{t('settings.googleCalendar.pending')}</div>
                    </div>
                  </div>
                  <div className="sync-stat-card failed">
                    <XCircle className="stat-icon" />
                    <div className="stat-content">
                      <div className="stat-value">{syncStats.failedSessions}</div>
                      <div className="stat-label">{t('settings.googleCalendar.failed')}</div>
                    </div>
                  </div>
                </div>
                {syncStats.lastSyncAt && (
                  <div className="last-sync-info">
                    <Clock className="last-sync-icon" />
                    <span>{t('settings.googleCalendar.lastSynced')}: {format(new Date(syncStats.lastSyncAt), 'MMM dd, yyyy HH:mm')}</span>
                  </div>
                )}
                {(syncStats.unsyncedSessions > 0 || syncStats.failedSessions > 0) && (
                  <button 
                    className="batch-sync-button" 
                    onClick={handleBatchSync}
                    disabled={syncing}
                  >
                    <RefreshCw className={syncing ? 'spinning' : ''} />
                    {syncing ? t('settings.googleCalendar.syncing') : `${t('settings.googleCalendar.syncSessions')} ${syncStats.unsyncedSessions + syncStats.failedSessions}`}
                  </button>
                )}
                
                {googleCalendar.isAuthorized && (
                  <button
                    className="import-calendar-button"
                    onClick={() => onNavigate && onNavigate('calendar-import')}
                  >
                    <Download />
                    {t('settings.googleCalendar.importFromCalendar')}
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        <div className="settings-actions">
          <button className="reset-button" onClick={handleReset}>
            <RotateCcw />
            {t('settings.actions.resetToDefaults')}
          </button>
          <button className="save-button" onClick={handleSave}>
            <Save />
            {saved ? t('common.saved') : t('settings.actions.saveSettings')}
          </button>
        </div>

        {saved && (
          <div className="success-message">
            {t('settings.actions.settingsSaved')}
          </div>
        )}
      </div>
    </div>
  );
}
