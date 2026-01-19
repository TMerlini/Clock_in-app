import { useState, useEffect, memo, useMemo } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getCachedQuery } from '../lib/queryCache';
import { Download, DollarSign, TrendingUp, Clock, AlertTriangle, Coffee, Calendar as CalendarIcon, Settings as SettingsIcon, ArrowUp, ArrowDown } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { getDateFnsLocale } from '../lib/i18n';
import { calculatePeriodFinance, aggregateFinanceByPeriod } from '../lib/financeCalculator';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Finance.css';

export const Finance = memo(function Finance({ user, onNavigate }) {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('monthly');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateSortOrder, setDateSortOrder] = useState('desc');
  const [chartScale, setChartScale] = useState('linear');

  useEffect(() => {
    if (!user) return;

    const loadAllData = async () => {
      setLoading(true);
      try {
        const [sessionsResult, settingsResult] = await Promise.all([
          getCachedQuery('sessions', { userId: user.uid }, async () => {
            const sessionsRef = collection(db, 'sessions');
            const q = query(sessionsRef, where('userId', '==', user.uid));
            const querySnapshot = await getDocs(q);
            const allSessions = [];
            querySnapshot.forEach((doc) => {
              const data = doc.data();
              allSessions.push({ 
                id: doc.id, 
                ...data,
                clockIn: data.clockIn?.toDate ? data.clockIn.toDate() : new Date(data.clockIn)
              });
            });
            return allSessions;
          }),
          getCachedQuery('userSettings', { userId: user.uid }, async () => {
            const settingsRef = doc(db, 'userSettings', user.uid);
            const settingsDoc = await getDoc(settingsRef);
            if (settingsDoc.exists()) {
              return settingsDoc.data();
            }
            return {};
          })
        ]);

        setSessions(sessionsResult);
        setSettings(settingsResult);
      } catch (error) {
        console.error('Error loading finance data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [user]);

  // Memoize date range calculation
  const dateRange = useMemo(() => {
    switch (reportType) {
      case 'daily':
        const dailyDate = new Date(selectedDate);
        return {
          start: new Date(dailyDate.setHours(0, 0, 0, 0)),
          end: new Date(new Date(selectedDate).setHours(23, 59, 59, 999))
        };
      case 'weekly':
        return {
          start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
          end: endOfWeek(selectedDate, { weekStartsOn: 1 })
        };
      case 'monthly':
        return {
          start: startOfMonth(selectedDate),
          end: endOfMonth(selectedDate)
        };
      case 'yearly':
        return {
          start: startOfYear(selectedDate),
          end: endOfYear(selectedDate)
        };
      default:
        return { start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) };
    }
  }, [reportType, selectedDate]);

  // Get finance settings with defaults
  const financeSettings = useMemo(() => {
    if (!settings || !settings.financeSettings) {
      return {
        hourlyRate: 0,
        isencaoRate: 0,
        isencaoCalculationMethod: 'percentage',
        isencaoFixedAmount: 0,
        taxDeductionType: 'both',
        irsRate: 0,
        irsBaseSalaryRate: 0,
        irsIhtRate: 0,
        irsOvertimeRate: 0,
        socialSecurityRate: 11,
        customTaxRate: 0,
        mealAllowanceIncluded: false,
        overtimeFirstHourRate: 1.25,
        overtimeSubsequentRate: 1.50,
        weekendOvertimeRate: 1.50,
        holidayOvertimeRate: 2.00,
        fixedBonus: 0,
        dailyMealSubsidy: 0,
        mealCardDeduction: 0
      };
    }
    return settings.financeSettings;
  }, [settings]);

  // Calculate finance for the period
  const financeData = useMemo(() => {
    if (!sessions.length || !settings) return null;

    try {
      return calculatePeriodFinance(sessions, dateRange, financeSettings);
    } catch (error) {
      console.error('Error calculating finance:', error);
      return null;
    }
  }, [sessions, dateRange, financeSettings, settings]);

  // Sort sessions by date
  const sortedSessions = useMemo(() => {
    if (!financeData) return [];
    
    const sorted = [...financeData.sessions];
    sorted.sort((a, b) => {
      const dateA = a.date.getTime();
      const dateB = b.date.getTime();
      return dateSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
    return sorted;
  }, [financeData, dateSortOrder]);

  // Calculate chart data
  const chartData = useMemo(() => {
    if (!sessions.length || !settings) {
      console.log('Chart data: No sessions or settings', { sessionsLength: sessions.length, hasSettings: !!settings });
      return [];
    }
    
    try {
      const data = aggregateFinanceByPeriod(sessions, dateRange, reportType, financeSettings, getDateFnsLocale());
      console.log('Chart data calculated:', { 
        dataPoints: data.length, 
        reportType, 
        dateRange: { start: dateRange.start, end: dateRange.end },
        sampleData: data[0] 
      });
      return data;
    } catch (error) {
      console.error('Error calculating chart data:', error);
      return [];
    }
  }, [sessions, dateRange, reportType, financeSettings, settings]);

  const handleExportCSV = () => {
    if (!financeData) return;

    const csvRows = [];
    
    // Header
    const headerRow = [
      t('finance.csv.date'),
      t('finance.csv.regularHours'),
      t('finance.csv.isencaoHours'),
      t('finance.csv.overtimeHours'),
      t('finance.csv.baseEarnings'),
      t('finance.csv.isencaoEarnings'),
      t('finance.csv.overtimeEarnings'),
      t('finance.csv.weekendBonus'),
      t('finance.csv.meals')
    ];
    if (financeData.earnings.fixedBonus > 0) {
      headerRow.push(t('finance.csv.fixedBonus'));
    }
    if (financeData.earnings.mealSubsidy > 0) {
      headerRow.push(t('finance.csv.mealSubsidy'));
    }
    if (financeData.deductions.mealCardDeduction > 0) {
      headerRow.push(t('finance.csv.mealCardDeduction'));
    }
    headerRow.push(t('finance.csv.totalEarnings'));
    csvRows.push(headerRow.join(','));

    // Calculate meal subsidy per day
    const mealSubsidyPerDay = financeSettings.dailyMealSubsidy || 0;
    const datesProcessedForSubsidy = new Set();
    let bonusAdded = false;

    // Session rows
    sortedSessions.forEach(s => {
      const dateKey = format(s.date, 'yyyy-MM-dd');
      const sessionRow = [
        dateKey,
        s.regularHours.toFixed(2),
        s.isencaoHours.toFixed(2),
        s.paidExtraHours.toFixed(2),
        s.baseEarnings.toFixed(2),
        s.isencaoEarnings.toFixed(2),
        s.overtimeEarnings.toFixed(2),
        s.weekendBonus.toFixed(2),
        s.mealEarnings.toFixed(2)
      ];
      
      // Add fixed bonus only once (for first session)
      if (financeData.earnings.fixedBonus > 0) {
        if (!bonusAdded) {
          sessionRow.push(financeData.earnings.fixedBonus.toFixed(2));
          bonusAdded = true;
        } else {
          sessionRow.push('0.00');
        }
      }
      
      // Add meal subsidy once per day
      if (financeData.earnings.mealSubsidy > 0) {
        if (!datesProcessedForSubsidy.has(dateKey)) {
          sessionRow.push(mealSubsidyPerDay.toFixed(2));
          datesProcessedForSubsidy.add(dateKey);
        } else {
          sessionRow.push('0.00');
        }
      }
      
      // Add meal card deduction only once (for first session)
      if (financeData.deductions.mealCardDeduction > 0) {
        if (!bonusAdded) {
          sessionRow.push(financeData.deductions.mealCardDeduction.toFixed(2));
        } else {
          sessionRow.push('0.00');
        }
      }
      
      sessionRow.push(s.totalEarnings.toFixed(2));
      csvRows.push(sessionRow.join(','));
    });

    // Summary row
    csvRows.push([]);
    csvRows.push([t('finance.csv.summary')].join(','));
    const summaryRow = [
      t('finance.csv.total'),
      financeData.hours.regular.toFixed(2),
      financeData.hours.isencao.toFixed(2),
      financeData.hours.paidExtra.toFixed(2),
      financeData.earnings.baseSalary.toFixed(2),
      financeData.earnings.isencaoSalary.toFixed(2),
      financeData.earnings.overtimeSalary.toFixed(2),
      financeData.earnings.weekendBonus.toFixed(2),
      financeData.earnings.mealAllowances.toFixed(2)
    ];
    if (financeData.earnings.fixedBonus > 0) {
      summaryRow.push(financeData.earnings.fixedBonus.toFixed(2));
    }
    if (financeData.earnings.mealSubsidy > 0) {
      summaryRow.push(financeData.earnings.mealSubsidy.toFixed(2));
    }
    if (financeData.deductions.mealCardDeduction > 0) {
      summaryRow.push(financeData.deductions.mealCardDeduction.toFixed(2));
    }
    summaryRow.push(financeData.earnings.grossSalary.toFixed(2));
    csvRows.push(summaryRow.join(','));
    
    // Deductions
    csvRows.push([]);
    csvRows.push([t('finance.csv.deductions')].join(','));
    if (financeSettings.taxDeductionType === 'irs' || financeSettings.taxDeductionType === 'both') {
      // Show separate IRS deductions if available
      if (financeData.deductions.irsBaseSalary > 0 || financeData.deductions.irsIht > 0 || financeData.deductions.irsOvertime > 0) {
        if (financeData.deductions.irsBaseSalary > 0) {
          csvRows.push([t('finance.csv.irsBaseSalary'), financeData.deductions.irsBaseSalary.toFixed(2)].join(','));
        }
        if (financeData.deductions.irsIht > 0) {
          csvRows.push([t('finance.csv.irsIht'), financeData.deductions.irsIht.toFixed(2)].join(','));
        }
        if (financeData.deductions.irsOvertime > 0) {
          csvRows.push([t('finance.csv.irsOvertime'), financeData.deductions.irsOvertime.toFixed(2)].join(','));
        }
      } else {
        csvRows.push([t('finance.csv.irs'), financeData.deductions.irs.toFixed(2)].join(','));
      }
    }
    if (financeSettings.taxDeductionType === 'social_security' || financeSettings.taxDeductionType === 'both') {
      csvRows.push([t('finance.csv.socialSecurity'), financeData.deductions.socialSecurity.toFixed(2)].join(','));
    }
    if (financeSettings.taxDeductionType === 'custom' || (financeSettings.taxDeductionType === 'both' && financeSettings.customTaxRate > 0)) {
      csvRows.push([t('finance.csv.customTax'), financeData.deductions.custom.toFixed(2)].join(','));
    }
    if (financeData.deductions.mealCardDeduction > 0) {
      csvRows.push([t('finance.csv.mealCardDeduction'), financeData.deductions.mealCardDeduction.toFixed(2)].join(','));
    }
    csvRows.push([t('finance.csv.totalDeductions'), (financeData.deductions.total + (financeData.deductions.mealCardDeduction || 0)).toFixed(2)].join(','));
    
    // Net
    csvRows.push([]);
    csvRows.push([t('finance.csv.netSalary'), financeData.netSalary.toFixed(2)].join(','));

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `finance-${reportType}-${format(selectedDate, 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (amount) => {
    return `€${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="finance-container">
        <div className="loading">{t('finance.loading')}</div>
      </div>
    );
  }

  // Check if finance settings are configured
  if (!financeSettings || financeSettings.hourlyRate === 0) {
    return (
      <div className="finance-container">
        <div className="finance-header">
          <h1>{t('finance.title')}</h1>
        </div>
        <div className="finance-settings-prompt">
          <SettingsIcon className="settings-icon" />
          <h2>{t('finance.settingsRequired')}</h2>
          <p>{t('finance.settingsRequiredDescription')}</p>
          <button 
            className="settings-button"
            onClick={() => onNavigate && onNavigate('settings')}
          >
            <SettingsIcon />
            {t('finance.goToSettings')}
          </button>
        </div>
      </div>
    );
  }

  if (!financeData) {
    return (
      <div className="finance-container">
        <div className="finance-header">
          <h1>{t('finance.title')}</h1>
        </div>
        <div className="no-data">{t('finance.noData')}</div>
      </div>
    );
  }

  return (
    <div className="finance-container">
      <div className="finance-header">
        <h1>{t('finance.title')}</h1>
        <div className="header-actions">
          <button 
            className="settings-link-button"
            onClick={() => onNavigate && onNavigate('settings')}
            title={t('finance.editSettings')}
          >
            <SettingsIcon />
            {t('finance.editSettings')}
          </button>
          <button className="export-button" onClick={handleExportCSV}>
            <Download />
            {t('finance.exportCSV')}
          </button>
        </div>
      </div>

      <div className="report-controls">
        <div className="report-type-selector">
          <button
            className={`type-btn ${reportType === 'daily' ? 'active' : ''}`}
            onClick={() => setReportType('daily')}
          >
            {t('finance.daily')}
          </button>
          <button
            className={`type-btn ${reportType === 'weekly' ? 'active' : ''}`}
            onClick={() => setReportType('weekly')}
          >
            {t('finance.weekly')}
          </button>
          <button
            className={`type-btn ${reportType === 'monthly' ? 'active' : ''}`}
            onClick={() => setReportType('monthly')}
          >
            {t('finance.monthly')}
          </button>
          <button
            className={`type-btn ${reportType === 'yearly' ? 'active' : ''}`}
            onClick={() => setReportType('yearly')}
          >
            {t('finance.yearly')}
          </button>
        </div>

        <input
          type="date"
          value={format(selectedDate, 'yyyy-MM-dd')}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
          className="date-picker"
        />
      </div>

      <div className="period-display">
        <span className="period-label">{t('finance.period')}:</span>
        <span className="period-value">
          {format(dateRange.start, 'MMM dd, yyyy', { locale: getDateFnsLocale() })} - {format(dateRange.end, 'MMM dd, yyyy', { locale: getDateFnsLocale() })}
        </span>
      </div>

      <div className="finance-cards-grid">
        <div className="finance-card base-salary">
          <div className="finance-card-icon">
            <Clock />
          </div>
          <div className="finance-card-content">
            <div className="finance-card-label">{t('finance.baseSalary')}</div>
            <div className="finance-card-value">{formatCurrency(financeData.earnings.baseSalary)}</div>
            <div className="finance-card-sublabel">
              {financeData.hours.regular.toFixed(2)}h × {formatCurrency(financeSettings.hourlyRate)}
            </div>
          </div>
        </div>

        {(financeSettings.isencaoRate > 0 || financeSettings.isencaoFixedAmount > 0) && (
          <div className="finance-card isencao-salary">
            <div className="finance-card-icon">
              <AlertTriangle />
            </div>
            <div className="finance-card-content">
              <div className="finance-card-label">{t('finance.isencaoEarnings')} (IHT)</div>
              <div className="finance-card-value">{formatCurrency(financeData.earnings.isencaoSalary)}</div>
              <div className="finance-card-sublabel">
                {financeSettings.isencaoCalculationMethod === 'fixed' ? (
                  t('finance.isencaoFixedAmount', {
                    amount: formatCurrency(financeSettings.isencaoFixedAmount || 0)
                  })
                ) : financeData.workingDays > 0 ? (
                  t('finance.isencaoCalculation', {
                    days: financeData.workingDays,
                    percentage: financeSettings.isencaoRate,
                    hourlyRate: formatCurrency(financeSettings.hourlyRate || 0)
                  })
                ) : (
                  t('finance.isencaoNoWorkingDays', {
                    percentage: financeSettings.isencaoRate,
                    hourlyRate: formatCurrency(financeSettings.hourlyRate || 0)
                  })
                )}
              </div>
            </div>
          </div>
        )}

        <div className="finance-card overtime-salary">
          <div className="finance-card-icon">
            <TrendingUp />
          </div>
          <div className="finance-card-content">
            <div className="finance-card-label">{t('finance.overtimeEarnings')}</div>
            <div className="finance-card-value">{formatCurrency(financeData.earnings.overtimeSalary)}</div>
            <div className="finance-card-sublabel">
              {financeData.hours.paidExtra.toFixed(2)}h {t('finance.overtime')}
            </div>
          </div>
        </div>

        {financeData.earnings.weekendBonus > 0 && (
          <div className="finance-card weekend-bonus">
            <div className="finance-card-icon">
              <CalendarIcon />
            </div>
            <div className="finance-card-content">
              <div className="finance-card-label">{t('finance.weekendBonus')}</div>
              <div className="finance-card-value">{formatCurrency(financeData.earnings.weekendBonus)}</div>
              <div className="finance-card-sublabel">{t('finance.weekendWork')}</div>
            </div>
          </div>
        )}

        {financeSettings.mealAllowanceIncluded && financeData.earnings.mealAllowances > 0 && (
          <div className="finance-card meal-allowances">
            <div className="finance-card-icon">
              <Coffee />
            </div>
            <div className="finance-card-content">
              <div className="finance-card-label">{t('finance.mealAllowances')}</div>
              <div className="finance-card-value">{formatCurrency(financeData.earnings.mealAllowances)}</div>
              <div className="finance-card-sublabel">{t('finance.lunchDinner')}</div>
            </div>
          </div>
        )}

        {financeData.earnings.fixedBonus > 0 && (
          <div className="finance-card fixed-bonus">
            <div className="finance-card-icon">
              <DollarSign />
            </div>
            <div className="finance-card-content">
              <div className="finance-card-label">{t('finance.fixedBonus')}</div>
              <div className="finance-card-value">{formatCurrency(financeData.earnings.fixedBonus)}</div>
              <div className="finance-card-sublabel">{t('finance.fixedBonusDescription')}</div>
            </div>
          </div>
        )}

        {financeData.earnings.mealSubsidy > 0 && (
          <div className="finance-card meal-subsidy">
            <div className="finance-card-icon">
              <Coffee />
            </div>
            <div className="finance-card-content">
              <div className="finance-card-label">{t('finance.mealSubsidy')}</div>
              <div className="finance-card-value">{formatCurrency(financeData.earnings.mealSubsidy)}</div>
              <div className="finance-card-sublabel">
                {t('finance.mealSubsidyDescription', { 
                  days: financeData.workingDays,
                  daily: formatCurrency(financeSettings.dailyMealSubsidy || 0)
                })}
              </div>
            </div>
          </div>
        )}

        <div className="finance-card gross-salary">
          <div className="finance-card-icon">
            <DollarSign />
          </div>
          <div className="finance-card-content">
            <div className="finance-card-label">{t('finance.grossSalary')}</div>
            <div className="finance-card-value highlight">{formatCurrency(financeData.earnings.grossSalary)}</div>
            <div className="finance-card-sublabel">{t('finance.totalEarnings')}</div>
          </div>
        </div>

        {(financeData.deductions.total > 0 || financeData.deductions.mealCardDeduction > 0) && (
          <>
            {financeData.deductions.irs > 0 && (
              <>
                {/* Show separate IRS deductions if separate rates are configured */}
                {(financeData.deductions.irsBaseSalary > 0 || financeData.deductions.irsIht > 0 || financeData.deductions.irsOvertime > 0) ? (
                  <>
                    {financeData.deductions.irsBaseSalary > 0 && (
                      <div className="finance-card deduction irs">
                        <div className="finance-card-icon">
                          <ArrowDown />
                        </div>
                        <div className="finance-card-content">
                          <div className="finance-card-label">{t('finance.irsBaseSalaryDeduction')}</div>
                          <div className="finance-card-value">-{formatCurrency(financeData.deductions.irsBaseSalary)}</div>
                          <div className="finance-card-sublabel">
                            {financeSettings.irsBaseSalaryRate}% {t('finance.ofBaseSalary')}
                          </div>
                        </div>
                      </div>
                    )}
                    {financeData.deductions.irsIht > 0 && (
                      <div className="finance-card deduction irs">
                        <div className="finance-card-icon">
                          <ArrowDown />
                        </div>
                        <div className="finance-card-content">
                          <div className="finance-card-label">{t('finance.irsIhtDeduction')}</div>
                          <div className="finance-card-value">-{formatCurrency(financeData.deductions.irsIht)}</div>
                          <div className="finance-card-sublabel">
                            {financeSettings.irsIhtRate}% {t('finance.ofIht')}
                          </div>
                        </div>
                      </div>
                    )}
                    {financeData.deductions.irsOvertime > 0 && (
                      <div className="finance-card deduction irs">
                        <div className="finance-card-icon">
                          <ArrowDown />
                        </div>
                        <div className="finance-card-content">
                          <div className="finance-card-label">{t('finance.irsOvertimeDeduction')}</div>
                          <div className="finance-card-value">-{formatCurrency(financeData.deductions.irsOvertime)}</div>
                          <div className="finance-card-sublabel">
                            {financeSettings.irsOvertimeRate}% {t('finance.ofOvertime')}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="finance-card deduction irs">
                    <div className="finance-card-icon">
                      <ArrowDown />
                    </div>
                    <div className="finance-card-content">
                      <div className="finance-card-label">{t('finance.irsDeduction')}</div>
                      <div className="finance-card-value">-{formatCurrency(financeData.deductions.irs)}</div>
                      <div className="finance-card-sublabel">
                        {financeSettings.irsRate || 0}% {t('finance.ofGross')}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {financeData.deductions.socialSecurity > 0 && (
              <div className="finance-card deduction social-security">
                <div className="finance-card-icon">
                  <ArrowDown />
                </div>
                <div className="finance-card-content">
                  <div className="finance-card-label">{t('finance.socialSecurityDeduction')}</div>
                  <div className="finance-card-value">-{formatCurrency(financeData.deductions.socialSecurity)}</div>
                  <div className="finance-card-sublabel">
                    {financeSettings.socialSecurityRate}% {t('finance.ofBaseSalaryIht')}
                  </div>
                </div>
              </div>
            )}

            {financeData.deductions.custom > 0 && (
              <div className="finance-card deduction custom">
                <div className="finance-card-icon">
                  <ArrowDown />
                </div>
                <div className="finance-card-content">
                  <div className="finance-card-label">{t('finance.customTaxDeduction')}</div>
                  <div className="finance-card-value">-{formatCurrency(financeData.deductions.custom)}</div>
                  <div className="finance-card-sublabel">
                    {financeSettings.customTaxRate}% {t('finance.ofGross')}
                  </div>
                </div>
              </div>
            )}

            {financeData.deductions.mealCardDeduction > 0 && (
              <div className="finance-card deduction meal-card">
                <div className="finance-card-icon">
                  <ArrowDown />
                </div>
                <div className="finance-card-content">
                  <div className="finance-card-label">{t('finance.mealCardDeduction')}</div>
                  <div className="finance-card-value">-{formatCurrency(financeData.deductions.mealCardDeduction)}</div>
                  <div className="finance-card-sublabel">{t('finance.mealCardDeductionDescription')}</div>
                </div>
              </div>
            )}

            <div className="finance-card deduction total">
              <div className="finance-card-icon">
                <ArrowDown />
              </div>
              <div className="finance-card-content">
                <div className="finance-card-label">{t('finance.totalDeductions')}</div>
                <div className="finance-card-value">-{formatCurrency(financeData.deductions.total + (financeData.deductions.mealCardDeduction || 0))}</div>
                <div className="finance-card-sublabel">{t('finance.allTaxesAndDeductions')}</div>
              </div>
            </div>
          </>
        )}

        <div className="finance-card net-salary">
          <div className="finance-card-icon">
            <DollarSign />
          </div>
          <div className="finance-card-content">
            <div className="finance-card-label">{t('finance.netSalary')}</div>
            <div className="finance-card-value highlight net">{formatCurrency(financeData.netSalary)}</div>
            <div className="finance-card-sublabel">{t('finance.afterDeductions')}</div>
          </div>
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="finance-chart-section">
          <div className="chart-header">
            <div className="chart-title-section">
              <TrendingUp className="chart-icon" />
              <div>
                <h2>{t('finance.chart.title')}</h2>
                <p className="chart-subtitle">{t('finance.chart.subtitle')}</p>
              </div>
            </div>
            <div className="chart-controls">
              <button
                className={`scale-toggle ${chartScale === 'linear' ? 'active' : ''}`}
                onClick={() => setChartScale('linear')}
              >
                {t('finance.chart.scaleLinear')}
              </button>
              <button
                className={`scale-toggle ${chartScale === 'log' ? 'active' : ''}`}
                onClick={() => setChartScale('log')}
              >
                {t('finance.chart.scaleLog')}
              </button>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="date" 
                  stroke="var(--muted-foreground)"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  scale={chartScale === 'log' ? 'log' : 'linear'}
                  domain={chartScale === 'log' ? ['auto', 'auto'] : [0, 'auto']}
                  allowDataOverflow={false}
                  stroke="var(--muted-foreground)"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => {
                    if (value <= 0) return '€0';
                    return `€${value.toFixed(0)}`;
                  }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--foreground)'
                  }}
                  formatter={(value) => `€${value.toFixed(2)}`}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="grossIncome" 
                  stroke="var(--primary)" 
                  strokeWidth={2}
                  name={t('finance.chart.grossIncome')}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="netIncome" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name={t('finance.chart.netIncome')}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="taxes" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name={t('finance.chart.taxes')}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : financeData && (
        <div className="finance-chart-section">
          <div className="chart-header">
            <div className="chart-title-section">
              <TrendingUp className="chart-icon" />
              <div>
                <h2>{t('finance.chart.title')}</h2>
                <p className="chart-subtitle">{t('finance.chart.noData')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {sortedSessions.length > 0 && (
        <div className="finance-sessions-section">
          <div className="section-header">
            <div className="header-left">
              <CalendarIcon className="section-icon" />
              <div>
                <h2>{t('finance.sessionsBreakdown')}</h2>
                <p className="section-subtitle">{t('finance.sessionsBreakdownDescription')}</p>
              </div>
            </div>
            <button
              className="sort-button"
              onClick={() => setDateSortOrder(dateSortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {dateSortOrder === 'asc' ? <ArrowUp /> : <ArrowDown />}
              {t('finance.sortByDate')}
            </button>
          </div>

          <div className="finance-sessions-table">
            <table>
              <thead>
                <tr>
                  <th>{t('finance.date')}</th>
                  <th>{t('finance.regularHours')}</th>
                  <th>{t('finance.isencaoHours')}</th>
                  <th>{t('finance.overtimeHours')}</th>
                  <th>{t('finance.baseEarnings')}</th>
                  {(financeSettings.isencaoRate > 0 || financeSettings.isencaoFixedAmount > 0) && <th>{t('finance.isencaoEarnings')}</th>}
                  <th>{t('finance.overtimeEarnings')}</th>
                  <th>{t('finance.weekendBonus')}</th>
                  {financeSettings.mealAllowanceIncluded && <th>{t('finance.meals')}</th>}
                  <th className="total-column">{t('finance.total')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedSessions.map((s) => (
                  <tr key={s.id}>
                    <td>{format(s.date, 'MMM dd, yyyy', { locale: getDateFnsLocale() })}</td>
                    <td>{s.regularHours.toFixed(2)}h</td>
                    <td>{s.isencaoHours.toFixed(2)}h</td>
                    <td>{s.paidExtraHours.toFixed(2)}h</td>
                    <td>{formatCurrency(s.baseEarnings)}</td>
                    {(financeSettings.isencaoRate > 0 || financeSettings.isencaoFixedAmount > 0) && <td>{formatCurrency(s.isencaoEarnings)}</td>}
                    <td>{formatCurrency(s.overtimeEarnings)}</td>
                    <td>{formatCurrency(s.weekendBonus)}</td>
                    {financeSettings.mealAllowanceIncluded && <td>{formatCurrency(s.mealEarnings)}</td>}
                    <td className="total-column">{formatCurrency(s.totalEarnings)}</td>
                  </tr>
                ))}
                <tr className="summary-row">
                  <td><strong>{t('finance.total')}</strong></td>
                  <td><strong>{financeData.hours.regular.toFixed(2)}h</strong></td>
                  <td><strong>{financeData.hours.isencao.toFixed(2)}h</strong></td>
                  <td><strong>{financeData.hours.paidExtra.toFixed(2)}h</strong></td>
                  <td><strong>{formatCurrency(financeData.earnings.baseSalary)}</strong></td>
                  {(financeSettings.isencaoRate > 0 || financeSettings.isencaoFixedAmount > 0) && <td><strong>{formatCurrency(financeData.earnings.isencaoSalary)}</strong></td>}
                  <td><strong>{formatCurrency(financeData.earnings.overtimeSalary)}</strong></td>
                  <td><strong>{formatCurrency(financeData.earnings.weekendBonus)}</strong></td>
                  {financeSettings.mealAllowanceIncluded && <td><strong>{formatCurrency(financeData.earnings.mealAllowances)}</strong></td>}
                  <td className="total-column"><strong>{formatCurrency(financeData.earnings.grossSalary)}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
});
