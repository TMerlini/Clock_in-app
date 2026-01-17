import { useState, useEffect, memo, useMemo } from 'react';
import { collection, query, where, getDocs, addDoc, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getCachedQuery, invalidateCache } from '../lib/queryCache';
import { Download, TrendingUp, Clock, AlertTriangle, DollarSign, Coffee, Calendar as CalendarIcon, MinusCircle, UtensilsCrossed, CalendarDays, Trash2, Search, Filter, ArrowUp, ArrowDown } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval } from 'date-fns';
import { formatHoursMinutes, calculateUsedIsencaoHours } from '../lib/utils';
import './Analytics.css';

export const Analytics = memo(function Analytics({ user }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('monthly');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [overworkDeductions, setOverworkDeductions] = useState([]);
  const [deductionDays, setDeductionDays] = useState('');
  const [deductionHours, setDeductionHours] = useState('');
  const [deductionReason, setDeductionReason] = useState('');
  const [showDeductionForm, setShowDeductionForm] = useState(false);
  const [lunchDuration, setLunchDuration] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateSortOrder, setDateSortOrder] = useState('desc'); // 'asc' or 'desc'
  const [sessionLimit, setSessionLimit] = useState(30); // Number of sessions to display, or null for all
  const [annualIsencaoLimit, setAnnualIsencaoLimit] = useState(200);

  useEffect(() => {
    if (!user) return;

    // Parallelize all data loading operations
    const loadAllData = async () => {
      setLoading(true);
      try {
        // Load all data in parallel using Promise.all with caching
        const [sessionsResult, deductionsResult, settingsResult] = await Promise.all([
          // Load sessions with caching
          getCachedQuery('sessions', { userId: user.uid }, async () => {
            const sessionsRef = collection(db, 'sessions');
            const q = query(sessionsRef, where('userId', '==', user.uid));
            const querySnapshot = await getDocs(q);
            const allSessions = [];
            querySnapshot.forEach((doc) => {
              allSessions.push({ id: doc.id, ...doc.data() });
            });
            return allSessions;
          }),
          // Load overwork deductions with caching
          getCachedQuery('overworkDeductions', { userId: user.uid }, async () => {
            const deductionsRef = collection(db, 'overworkDeductions');
            const q = query(deductionsRef, where('userId', '==', user.uid));
            const querySnapshot = await getDocs(q);
            const deductions = [];
            querySnapshot.forEach((doc) => {
              deductions.push({ id: doc.id, ...doc.data() });
            });
            // Sort by date descending (newest first)
            deductions.sort((a, b) => b.timestamp - a.timestamp);
            return deductions;
          }),
          // Load settings with caching
          getCachedQuery('userSettings', { userId: user.uid }, async () => {
            const settingsRef = doc(db, 'userSettings', user.uid);
            const settingsDoc = await getDoc(settingsRef);
            if (settingsDoc.exists()) {
              return settingsDoc.data();
            }
            return {};
          })
        ]);

        // Update state with all results
        setSessions(sessionsResult);
        setOverworkDeductions(deductionsResult);
        
        // Apply settings
        if (settingsResult) {
          setLunchDuration(settingsResult.lunchDuration || 1);
          setAnnualIsencaoLimit(settingsResult.annualIsencaoLimit || 200);
        }
      } catch (error) {
        console.error('Error loading analytics data:', error);
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

  // Memoize filtered sessions by date range
  const filteredSessions = useMemo(() => {
    return sessions.filter(s =>
      s.clockIn >= dateRange.start.getTime() && s.clockIn <= dateRange.end.getTime()
    );
  }, [sessions, dateRange]);

  // Memoize search and filter operations
  const searchAndFilteredSessions = useMemo(() => {
    let filtered = filteredSessions;

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(s => {
        const date = format(new Date(s.clockIn), 'MMM dd, yyyy').toLowerCase();
        const notes = (s.notes || '').toLowerCase();
        return date.includes(search) || notes.includes(search);
      });
    }

    // Apply dropdown filter
    switch (filterType) {
      case 'weekend':
        filtered = filtered.filter(s => s.isWeekend);
        break;
      case 'lunch':
        filtered = filtered.filter(s => s.lunchDuration && s.lunchDuration > 0);
        break;
      case 'meals':
        filtered = filtered.filter(s =>
          (s.lunchAmount && s.lunchAmount > 0) || (s.dinnerAmount && s.dinnerAmount > 0)
        );
        break;
      case 'overtime':
        filtered = filtered.filter(s => s.paidExtraHours > 0);
        break;
      case 'all':
      default:
        // No additional filtering
        break;
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = a.clockIn;
      const dateB = b.clockIn;
      if (dateSortOrder === 'asc') {
        return dateA - dateB;
      } else {
        return dateB - dateA;
      }
    });

    // Apply session limit if set
    if (sessionLimit && sessionLimit > 0) {
      return filtered.slice(0, sessionLimit);
    }

    return filtered;
  }, [filteredSessions, searchTerm, filterType, dateSortOrder, sessionLimit]);

  // Memoize stats calculation
  const stats = useMemo(() => {
    const filtered = filteredSessions;

    const totalHours = filtered.reduce((sum, s) => sum + s.totalHours, 0);
    const regularHours = filtered.reduce((sum, s) => sum + s.regularHours, 0);
    const unpaidHours = filtered.reduce((sum, s) => sum + s.unpaidExtraHours, 0);
    const paidOvertimeHours = filtered.reduce((sum, s) => sum + s.paidExtraHours, 0);
    const lunchHours = filtered.reduce((sum, s) => sum + (s.lunchDuration || 0), 0);
    const totalLunchExpenses = filtered.reduce((sum, s) => sum + (s.lunchAmount || 0), 0);
    const totalDinnerExpenses = filtered.reduce((sum, s) => sum + (s.dinnerAmount || 0), 0);
    const totalMealExpenses = totalLunchExpenses + totalDinnerExpenses;
    const totalWeekendDaysOff = filtered.reduce((sum, s) => sum + (s.weekendDaysOff || 0), 0);
    const totalWeekendBonus = filtered.reduce((sum, s) => sum + (s.weekendBonus || 0), 0);
    const totalDays = filtered.length > 0 ? new Set(filtered.map(s => format(new Date(s.clockIn), 'yyyy-MM-dd'))).size : 0;
    const sessionsWithLunch = filtered.filter(s => s.includeLunchTime).length;
    const sessionsWithDinner = filtered.filter(s => s.hadDinner).length;
    const weekendSessions = filtered.filter(s => s.isWeekend).length;
    // Count bank holidays that have benefits (days off or bonus)
    const bankHolidaySessions = filtered.filter(s => s.isBankHoliday && ((s.weekendDaysOff && s.weekendDaysOff > 0) || (s.weekendBonus && s.weekendBonus > 0))).length;
    const totalBenefitSessions = weekendSessions + bankHolidaySessions;

    return {
      totalHours,
      regularHours,
      unpaidHours,
      paidOvertimeHours,
      lunchHours,
      sessionsWithLunch,
      totalLunchExpenses,
      totalDinnerExpenses,
      totalMealExpenses,
      sessionsWithDinner,
      totalWeekendDaysOff,
      totalWeekendBonus,
      weekendSessions,
      bankHolidaySessions,
      totalBenefitSessions,
      totalDays,
      avgHoursPerDay: totalDays > 0 ? totalHours / totalDays : 0
    };
  }, [filteredSessions]);

  // Memoize annual Isenção usage calculation
  const annualIsencaoUsage = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearStart = startOfYear(new Date(currentYear, 0, 1)).getTime();
    const yearEnd = endOfYear(new Date(currentYear, 11, 31)).getTime();
    
    const yearSessions = sessions.filter(s => 
      s.clockIn >= yearStart && s.clockIn <= yearEnd
    );
    
    const usedHours = yearSessions.reduce((sum, s) => sum + (s.unpaidExtraHours || 0), 0);
    const remainingHours = Math.max(0, annualIsencaoLimit - usedHours);
    
    return {
      used: usedHours,
      limit: annualIsencaoLimit,
      remaining: remainingHours,
      percentage: annualIsencaoLimit > 0 ? (usedHours / annualIsencaoLimit) * 100 : 0
    };
  }, [sessions, annualIsencaoLimit]);

  // Memoize overwork stats calculation
  const overworkStats = useMemo(() => {
    // Calculate total overwork hours from ALL sessions (from paidExtraHours)
    // Round to 4 decimal places to avoid floating point precision issues
    const totalOverworkHours = Math.round(sessions.reduce((sum, s) => sum + (s.paidExtraHours || 0), 0) * 10000) / 10000;

    // Calculate total days off earned from weekend and bank holiday sessions
    // Round to 4 decimal places to avoid floating point precision issues
    const totalWeekendDaysOff = Math.round(sessions.reduce((sum, s) => sum + (s.weekendDaysOff || 0), 0) * 10000) / 10000;
    
    // Convert days off to hours (1 day = 8 hours)
    const totalDaysOffHours = totalWeekendDaysOff * 8;
    
    // Combined pool: overwork hours + days off earned (converted to hours)
    const totalAvailableHours = totalOverworkHours + totalDaysOffHours;

    // Calculate total deducted from each pool separately
    // For backward compatibility: if old deductions don't have daysOffUsed/overworkHoursUsed,
    // assume they were deducted from overwork hours only
    let totalDeductedDaysOff = 0;
    let totalDeductedOverworkHours = 0;
    
    overworkDeductions.forEach((d) => {
      if (d.daysOffUsed !== undefined && d.overworkHoursUsed !== undefined) {
        // New format: has separate tracking
        totalDeductedDaysOff += d.daysOffUsed || 0;
        totalDeductedOverworkHours += d.overworkHoursUsed || 0;
      } else {
        // Old format: assume all from overwork hours
        totalDeductedOverworkHours += d.hours || 0;
      }
    });
    
    // Round to 4 decimal places to avoid floating point precision issues
    totalDeductedDaysOff = Math.round(totalDeductedDaysOff * 10000) / 10000;
    totalDeductedOverworkHours = Math.round(totalDeductedOverworkHours * 10000) / 10000;
    const totalDeductedHours = totalDeductedDaysOff * 8 + totalDeductedOverworkHours;

    // Calculate remaining from each pool separately
    const remainingDaysOff = Math.round((totalWeekendDaysOff - totalDeductedDaysOff) * 10000) / 10000;
    const remainingOverworkHours = Math.round((totalOverworkHours - totalDeductedOverworkHours) * 10000) / 10000;
    
    // Combined remaining hours
    const remainingAvailableHours = Math.round((remainingDaysOff * 8 + remainingOverworkHours) * 10000) / 10000;

    // Calculate work days (8 hours = 1 day)
    const totalOverworkDays = totalOverworkHours / 8;
    const totalDaysOffDays = totalWeekendDaysOff;
    const totalAvailableDays = (totalAvailableHours / 8);
    const deductedDays = totalDeductedHours / 8;
    const remainingDays = remainingAvailableHours / 8;

    return {
      totalOverworkHours,
      totalWeekendDaysOff,
      totalDaysOffHours,
      totalAvailableHours,
      totalDeductedHours,
      totalDeductedDaysOff,
      totalDeductedOverworkHours,
      remainingOverworkHours,
      remainingDaysOff,
      remainingAvailableHours,
      totalOverworkDays,
      totalDaysOffDays,
      totalAvailableDays,
      deductedDays,
      remainingDays
    };
  }, [sessions, overworkDeductions]);

  const handleAddDeduction = async () => {
    // Parse days and hours, handling empty strings and invalid values
    const daysStr = String(deductionDays || '').trim();
    const hoursStr = String(deductionHours || '').trim();
    
    const daysValue = daysStr === '' ? 0 : parseFloat(daysStr);
    const hoursValue = hoursStr === '' ? 0 : parseFloat(hoursStr);
    
    const days = isNaN(daysValue) || daysValue < 0 ? 0 : daysValue;
    const hours = isNaN(hoursValue) || hoursValue < 0 ? 0 : hoursValue;

    if (days <= 0 && hours <= 0) {
      alert('Please enter valid days or hours');
      return;
    }

    // Convert days to hours (1 day = 8 hours) and add to hours
    // Round to 4 decimal places to avoid floating point precision issues
    const totalHours = Math.round(((days * 8) + hours) * 10000) / 10000;
    
    // Calculate how much to deduct from each pool
    // Strategy: 
    // - Full days (from days input) should come from days off earned first
    // - Partial hours (from hours input) should come from overwork hours
    // - If not enough days off, use overwork hours for remaining days
    
    // Use full days from days off earned (only the days input, not converted hours)
    const daysOffToUse = Math.min(days, overworkStats.remainingDaysOff);
    const remainingDaysNeeded = days - daysOffToUse;
    
    // Convert remaining days to hours and add to the hours input
    // All hours (from hours input + remaining days converted to hours) come from overwork
    const overworkHoursToUse = Math.round(((remainingDaysNeeded * 8) + hours) * 10000) / 10000;
    
    // Verify we have enough in both pools combined
    const totalAvailable = (overworkStats.remainingDaysOff * 8) + overworkStats.remainingOverworkHours;
    const epsilon = 0.1;
    
    if (totalHours > (totalAvailable + epsilon)) {
      alert(`You cannot deduct more hours than available.\n\nRemaining: ${formatHoursMinutes(totalAvailable)} (${overworkStats.remainingDays.toFixed(2)} days)\n  - Days Off: ${overworkStats.remainingDaysOff.toFixed(2)} days\n  - Overwork: ${formatHoursMinutes(overworkStats.remainingOverworkHours)}\nTrying to deduct: ${formatHoursMinutes(totalHours)} (${(totalHours / 8).toFixed(2)} days)`);
      return;
    }
    
    // Debug logging
    console.log('Deduction calculation:', {
      daysEntered: days,
      hoursEntered: hours,
      totalHoursNeeded: totalHours,
      daysOffToUse: daysOffToUse,
      overworkHoursToUse: overworkHoursToUse,
      remainingDaysOff: overworkStats.remainingDaysOff,
      remainingOverworkHours: overworkStats.remainingOverworkHours
    });

    try {
      const deductionsRef = collection(db, 'overworkDeductions');
      await addDoc(deductionsRef, {
        userId: user.uid,
        hours: totalHours,
        daysOffUsed: daysOffToUse,
        overworkHoursUsed: overworkHoursToUse,
        reason: deductionReason || 'No reason provided',
        timestamp: Date.now(),
        createdAt: new Date().toISOString()
      });

      // Reset form
      setDeductionDays('');
      setDeductionHours('');
      setDeductionReason('');
      setShowDeductionForm(false);

      // Reload deductions
      await loadOverworkDeductions();
    } catch (error) {
      console.error('Error adding deduction:', error);
      alert('Failed to add deduction. Please try again.');
    }
  };

  const handleDeleteDeduction = async (deductionId) => {
    if (!confirm('Are you sure you want to delete this overwork usage entry?')) {
      return;
    }

    try {
      const deductionRef = doc(db, 'overworkDeductions', deductionId);
      await deleteDoc(deductionRef);

      // Reload deductions
      await loadOverworkDeductions();
    } catch (error) {
      console.error('Error deleting deduction:', error);
      alert('Failed to delete entry. Please try again.');
    }
  };

  const exportToCSV = () => {
    const filtered = filteredSessions;
    const { start, end } = dateRange;

    // Helper function to escape CSV values
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value).trim();
      // Always wrap in quotes for consistency and to handle special characters
      return `"${stringValue.replace(/"/g, '""')}"`;
    };

    // Helper function to create CSV row with proper formatting
    const csvRow = (values) => {
      // Ensure all values are present (pad with empty strings if needed)
      const paddedValues = values.map(v => v !== undefined && v !== null ? v : '');
      return paddedValues.map(escapeCSV).join(',');
    };

    // Build CSV content with proper formatting
    const lines = [];

    // Header Section
    lines.push(csvRow(['CLOCK IN APP - TIME TRACKING REPORT']));
    lines.push(csvRow([]));
    lines.push(csvRow(['Period:', `${format(start, 'MMM dd, yyyy')} - ${format(end, 'MMM dd, yyyy')}`]));
    lines.push(csvRow(['Report Type:', reportType.charAt(0).toUpperCase() + reportType.slice(1)]));
    lines.push(csvRow(['Generated:', format(new Date(), 'MMM dd, yyyy HH:mm:ss')]));
    lines.push(csvRow([]));

    // Summary Section
    lines.push(csvRow(['SUMMARY STATISTICS']));
    lines.push(csvRow(['Metric', 'Value']));
    lines.push(csvRow(['Total Sessions', filtered.length]));
    lines.push(csvRow(['Total Days Worked', new Set(filtered.map(s => format(new Date(s.clockIn), 'yyyy-MM-dd'))).size]));
    lines.push(csvRow(['Weekend Sessions', stats.weekendSessions]));
    lines.push(csvRow(['Bank Holiday Sessions', stats.bankHolidaySessions]));
    lines.push(csvRow(['Total Hours', `${stats.totalHours.toFixed(2)} hours`]));
    lines.push(csvRow(['Regular Hours', `${stats.regularHours.toFixed(2)} hours`]));
    lines.push(csvRow(['Isenção Hours (Unpaid)', `${stats.unpaidHours.toFixed(2)} hours`]));
    lines.push(csvRow(['Overwork Hours (Paid)', `${stats.paidOvertimeHours.toFixed(2)} hours`]));
    lines.push(csvRow(['Lunch Hours', `${stats.lunchHours.toFixed(2)} hours`]));
    lines.push(csvRow(['Total Lunch Expenses', `€${stats.totalLunchExpenses.toFixed(2)}`]));
    lines.push(csvRow(['Total Dinner Expenses', `€${stats.totalDinnerExpenses.toFixed(2)}`]));
    lines.push(csvRow(['Total Meal Expenses', `€${stats.totalMealExpenses.toFixed(2)}`]));
    lines.push(csvRow(['Total Days Off Earned', `${stats.totalWeekendDaysOff.toFixed(1)} days`]));
    lines.push(csvRow(['Total Weekend + Bank Holiday Bonus', `€${stats.totalWeekendBonus.toFixed(2)}`]));
    lines.push(csvRow([]));

    // Detailed Sessions Section
    lines.push(csvRow(['DETAILED SESSIONS']));
    lines.push(csvRow([]));
    
    // Column headers - ensure consistent order
    const headers = [
      'Date',
      'Clock In',
      'Clock Out',
      'Total Hours',
      'Lunch Time (h)',
      'Lunch Amount (€)',
      'Dinner Amount (€)',
      'Meals Total (€)',
      'Weekend',
      'Bank Holiday',
      'Days Off',
      'Bonus (€)',
      'Regular Hours',
      'Isenção (Unpaid)',
      'Overwork (Paid)',
      'Location',
      'Notes'
    ];
    lines.push(csvRow(headers));

    // Session rows - ensure all columns are in the same order as headers
    filtered.forEach(s => {
      const clockInDate = new Date(s.clockIn);
      const clockOutDate = new Date(s.clockOut);
      
      // Format notes - replace newlines with spaces for CSV readability
      const formattedNotes = (s.notes || '').replace(/\n/g, ' ').replace(/\r/g, '').trim();
      
      const row = [
        format(clockInDate, 'yyyy-MM-dd'),
        format(clockInDate, 'HH:mm:ss'),
        format(clockOutDate, 'HH:mm:ss'),
        s.totalHours.toFixed(2),
        s.lunchDuration ? s.lunchDuration.toFixed(2) : '0.00',
        s.lunchAmount ? s.lunchAmount.toFixed(2) : '0.00',
        s.dinnerAmount ? s.dinnerAmount.toFixed(2) : '0.00',
        ((s.lunchAmount || 0) + (s.dinnerAmount || 0)).toFixed(2),
        s.isWeekend ? 'Yes' : 'No',
        s.isBankHoliday ? 'Yes' : 'No',
        (s.weekendDaysOff || 0).toFixed(1),
        (s.weekendBonus || 0).toFixed(2),
        s.regularHours.toFixed(2),
        s.unpaidExtraHours.toFixed(2),
        s.paidExtraHours.toFixed(2),
        s.location || '',
        formattedNotes
      ];
      
      lines.push(csvRow(row));
    });

    lines.push(csvRow([]));
    lines.push(csvRow(['--- End of Report ---']));

    const csvContent = lines.join('\n');
    const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clock-report-${reportType}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const { start, end } = dateRange;

  if (loading) {
    return (
      <div className="analytics-container">
        <div className="loading">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h1>Analytics & Reports</h1>
      </div>

      <div className="report-controls">
        <div className="report-type-selector">
          <button
            className={`type-btn ${reportType === 'daily' ? 'active' : ''}`}
            onClick={() => setReportType('daily')}
          >
            Daily
          </button>
          <button
            className={`type-btn ${reportType === 'weekly' ? 'active' : ''}`}
            onClick={() => setReportType('weekly')}
          >
            Weekly
          </button>
          <button
            className={`type-btn ${reportType === 'monthly' ? 'active' : ''}`}
            onClick={() => setReportType('monthly')}
          >
            Monthly
          </button>
          <button
            className={`type-btn ${reportType === 'yearly' ? 'active' : ''}`}
            onClick={() => setReportType('yearly')}
          >
            Yearly
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
        <span className="period-label">Period:</span>
        <span className="period-value">
          {format(start, 'MMM dd, yyyy')} - {format(end, 'MMM dd, yyyy')}
        </span>
      </div>

      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-icon">
            <Clock />
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Hours</div>
            <div className="stat-value">{formatHoursMinutes(stats.totalHours)}</div>
            <div className="stat-sublabel">{stats.totalDays} days worked</div>
          </div>
        </div>

        <div className="stat-card regular">
          <div className="stat-icon">
            <TrendingUp />
          </div>
          <div className="stat-content">
            <div className="stat-label">Regular Hours</div>
            <div className="stat-value">{formatHoursMinutes(stats.regularHours)}</div>
            <div className="stat-sublabel">Standard work time</div>
          </div>
        </div>

        <div className="stat-card unpaid">
          <div className="stat-icon">
            <AlertTriangle />
          </div>
          <div className="stat-content">
            <div className="stat-label">Isenção (Unpaid)</div>
            <div className="stat-value">{formatHoursMinutes(stats.unpaidHours)}</div>
            <div className="stat-sublabel">
              {`${formatHoursMinutes(annualIsencaoUsage.used)} / ${annualIsencaoUsage.limit}h (${formatHoursMinutes(annualIsencaoUsage.remaining)} remaining)`}
            </div>
          </div>
        </div>

        <div className="stat-card overtime">
          <div className="stat-icon">
            <DollarSign />
          </div>
          <div className="stat-content">
            <div className="stat-label">Overwork (Paid)</div>
            <div className="stat-value">{formatHoursMinutes(stats.paidOvertimeHours)}</div>
            <div className="stat-sublabel">Over 10 hours</div>
          </div>
        </div>

        <div className="stat-card lunch">
          <div className="stat-icon">
            <Coffee />
          </div>
          <div className="stat-content">
            <div className="stat-label">Lunch Time</div>
            <div className="stat-value">{formatHoursMinutes(stats.lunchHours)}</div>
            <div className="stat-sublabel">{stats.sessionsWithLunch} sessions</div>
          </div>
        </div>

        <div className="stat-card meals">
          <div className="stat-icon">
            <UtensilsCrossed />
          </div>
          <div className="stat-content">
            <div className="stat-label">Meal Expenses</div>
            <div className="stat-value">€{stats.totalMealExpenses.toFixed(2)}</div>
            <div className="stat-sublabel">Lunch + Dinner</div>
          </div>
        </div>

        <div className="stat-card weekend-days">
          <div className="stat-icon">
            <CalendarDays />
          </div>
          <div className="stat-content">
            <div className="stat-label">Days Off</div>
            <div className="stat-value">{stats.totalWeekendDaysOff.toFixed(1)}</div>
            <div className="stat-sublabel">
              {stats.totalBenefitSessions > 0 
                ? `${stats.weekendSessions} weekend${stats.bankHolidaySessions > 0 ? ` + ${stats.bankHolidaySessions} bank holiday` : ''} session${stats.totalBenefitSessions > 1 ? 's' : ''}`
                : '0 sessions'}
            </div>
          </div>
        </div>

        <div className="stat-card weekend-bonus">
          <div className="stat-icon">
            <DollarSign />
          </div>
          <div className="stat-content">
            <div className="stat-label">Weekend +</div>
            <div className="stat-value">€{stats.totalWeekendBonus.toFixed(2)}</div>
            <div className="stat-sublabel">
              {stats.totalBenefitSessions > 0 
                ? `${stats.weekendSessions} weekend${stats.bankHolidaySessions > 0 ? ` + ${stats.bankHolidaySessions} bank holiday` : ''} session${stats.totalBenefitSessions > 1 ? 's' : ''}`
                : '0 sessions'}
            </div>
          </div>
        </div>
      </div>

      {/* Overwork Details Section */}
      <div className="overwork-details-section">
        <div className="section-header">
          <div className="header-left">
            <CalendarIcon className="section-icon" />
            <div>
              <h2>Overwork Details</h2>
              <p className="section-subtitle">Track your accumulated overwork hours and usage</p>
            </div>
          </div>
        </div>

        <div className="overwork-stats-grid">
          <>
                <div className="overwork-stat-card total-accumulated">
                  <div className="overwork-stat-header">
                    <Clock className="overwork-stat-icon" />
                    <span className="overwork-stat-label">Total Accumulated</span>
                  </div>
                  <div className="overwork-stat-value">
                    {overworkStats.totalAvailableDays.toFixed(1)} days
                  </div>
                  <div className="overwork-stat-sublabel">
                    {formatHoursMinutes(overworkStats.totalAvailableHours)}
                    <br />
                    <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                      ({overworkStats.totalOverworkDays.toFixed(1)} overwork + {overworkStats.totalDaysOffDays.toFixed(1)} days off)
                    </span>
                  </div>
                </div>

                <div className="overwork-stat-card total-used">
                  <div className="overwork-stat-header">
                    <MinusCircle className="overwork-stat-icon" />
                    <span className="overwork-stat-label">Total Used</span>
                  </div>
                  <div className="overwork-stat-value">{formatHoursMinutes(overworkStats.totalDeductedHours)}</div>
                  <div className="overwork-stat-sublabel">
                    {overworkStats.deductedDays.toFixed(2)} work days
                  </div>
                </div>

                <div className="overwork-stat-card days-off">
                  <div className="overwork-stat-header">
                    <CalendarDays className="overwork-stat-icon" />
                    <span className="overwork-stat-label">Days Off Earned</span>
                  </div>
                  <div className="overwork-stat-value">{overworkStats.remainingDaysOff.toFixed(1)}</div>
                  <div className="overwork-stat-sublabel">
                    {overworkStats.totalWeekendDaysOff.toFixed(1)} total - {overworkStats.totalDeductedDaysOff.toFixed(1)} used
                    <br />
                    <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                      {stats.totalBenefitSessions > 0 
                        ? `${stats.weekendSessions} weekend${stats.bankHolidaySessions > 0 ? ` + ${stats.bankHolidaySessions} bank holiday` : ''} session${stats.totalBenefitSessions > 1 ? 's' : ''}`
                        : '0 sessions'}
                    </span>
                  </div>
                </div>

                <div className="overwork-stat-card remaining">
                  <div className="overwork-stat-header">
                    <DollarSign className="overwork-stat-icon" />
                    <span className="overwork-stat-label">Remaining Available</span>
                  </div>
                  <div className="overwork-stat-value highlight">{formatHoursMinutes(overworkStats.remainingAvailableHours)}</div>
                  <div className="overwork-stat-sublabel">
                    {overworkStats.remainingDays.toFixed(1)} days available
                    <br />
                    <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                      ({overworkStats.remainingDaysOff.toFixed(1)} days off + {formatHoursMinutes(overworkStats.remainingOverworkHours)} overwork)
                    </span>
                  </div>
                </div>
              </>
        </div>

        {/* Deduction Management Section */}
        <div className="deduction-management">
          <div className="deduction-header">
            <h3>Use Overwork Hours</h3>
            <button
              className="toggle-form-button"
              onClick={() => setShowDeductionForm(!showDeductionForm)}
            >
              {showDeductionForm ? 'Cancel' : '+ Add Usage'}
            </button>
          </div>

          {showDeductionForm && (
            <div className="deduction-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="deductionDays">Days to Use</label>
                  <input
                    id="deductionDays"
                    type="number"
                    min="0"
                    step="0.5"
                    value={deductionDays}
                    onChange={(e) => setDeductionDays(e.target.value)}
                    placeholder="0"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="deductionHours">Hours to Use</label>
                  <input
                    id="deductionHours"
                    type="number"
                    min="0"
                    step="0.25"
                    value={deductionHours}
                    onChange={(e) => setDeductionHours(e.target.value)}
                    placeholder="0.00"
                    className="form-input"
                  />
                </div>

                <div className="form-group reason-group">
                  <label htmlFor="deductionReason">Reason (optional)</label>
                  <input
                    id="deductionReason"
                    type="text"
                    value={deductionReason}
                    onChange={(e) => setDeductionReason(e.target.value)}
                    placeholder="e.g., Personal time off, Late arrival compensation"
                    className="form-input"
                  />
                </div>

                <button className="submit-deduction-button" onClick={handleAddDeduction}>
                  Submit
                </button>
              </div>
            </div>
          )}

          {/* Deduction History */}
          <div className="deduction-history">
            <h4>Usage History</h4>
            {overworkDeductions.length === 0 ? (
              <p className="no-deductions">No overwork hours used yet</p>
            ) : (
              <div className="deductions-list">
                {overworkDeductions.map((deduction) => (
                  <div key={deduction.id} className="deduction-item">
                    <div className="deduction-info">
                      <div className="deduction-date">
                        {format(new Date(deduction.timestamp), 'MMM dd, yyyy HH:mm')}
                      </div>
                      <div className="deduction-reason">{deduction.reason}</div>
                    </div>
                    <div className="deduction-hours">
                      -{formatHoursMinutes(deduction.hours)}
                      <span className="deduction-days">({(deduction.hours / 8).toFixed(2)} days)</span>
                    </div>
                    <button
                      className="delete-deduction-button"
                      onClick={() => handleDeleteDeduction(deduction.id)}
                      title="Delete this entry"
                    >
                      <Trash2 />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="detailed-table">
        <div className="table-header">
          <h2>Detailed Sessions</h2>
          <div className="search-filter-container">
            <div className="search-box">
              <Search />
              <input
                type="text"
                placeholder="Search by date or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-dropdown">
              <Filter />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Sessions</option>
                <option value="weekend">Weekend Only</option>
                <option value="lunch">With Lunch</option>
                <option value="meals">With Meals</option>
                <option value="overtime">Paid Overtime</option>
              </select>
            </div>
            <div className="filter-dropdown">
              <select
                value={sessionLimit || 'all'}
                onChange={(e) => setSessionLimit(e.target.value === 'all' ? null : parseInt(e.target.value))}
                className="filter-select"
                title="Limit number of sessions displayed"
              >
                <option value="10">Last 10</option>
                <option value="30">Last 30</option>
                <option value="60">Last 60</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>
        </div>
        {searchAndFilteredSessions.length === 0 ? (
          <p className="no-data">No sessions found matching your search and filters</p>
        ) : (
          <>
            {(() => {
              // Calculate total count before limit is applied
              let filtered = filteredSessions;

              // Apply search filter
              if (searchTerm) {
                const search = searchTerm.toLowerCase();
                filtered = filtered.filter(s => {
                  const date = format(new Date(s.clockIn), 'MMM dd, yyyy').toLowerCase();
                  const notes = (s.notes || '').toLowerCase();
                  return date.includes(search) || notes.includes(search);
                });
              }

              // Apply dropdown filter
              switch (filterType) {
                case 'weekend':
                  filtered = filtered.filter(s => s.isWeekend);
                  break;
                case 'lunch':
                  filtered = filtered.filter(s => s.lunchDuration && s.lunchDuration > 0);
                  break;
                case 'meals':
                  filtered = filtered.filter(s =>
                    (s.lunchAmount && s.lunchAmount > 0) || (s.dinnerAmount && s.dinnerAmount > 0)
                  );
                  break;
                case 'overtime':
                  filtered = filtered.filter(s => s.paidExtraHours > 0);
                  break;
              }

              const totalCount = filtered.length;
              const displayedCount = searchAndFilteredSessions.length;
              
              return totalCount > displayedCount && (
                <p className="sessions-count-info" style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>
                  Showing {displayedCount} of {totalCount} sessions
                </p>
              );
            })()}
            <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th 
                    className="sortable-header"
                    onClick={() => setDateSortOrder(dateSortOrder === 'asc' ? 'desc' : 'asc')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      Date
                      {dateSortOrder === 'asc' ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      )}
                    </span>
                  </th>
                  <th>Clock In</th>
                  <th>Clock Out</th>
                  <th>Total</th>
                  <th>Lunch</th>
                  <th>Meals €</th>
                  <th>Regular</th>
                  <th>Isenção</th>
                  <th>Overwork</th>
                </tr>
              </thead>
              {searchAndFilteredSessions.length > 0 ? (
                <tbody>
                  {searchAndFilteredSessions.map((session) => (
                    <tr key={session.id}>
                      <td>{format(new Date(session.clockIn), 'MMM dd, yyyy')}</td>
                      <td>{format(new Date(session.clockIn), 'HH:mm')}</td>
                      <td>{format(new Date(session.clockOut), 'HH:mm')}</td>
                      <td className="bold">{formatHoursMinutes(session.totalHours)}</td>
                      <td className="lunch-cell">{session.lunchDuration ? formatHoursMinutes(session.lunchDuration) : '-'}</td>
                      <td className="meals-cell">{((session.lunchAmount || 0) + (session.dinnerAmount || 0)) > 0 ? `€${((session.lunchAmount || 0) + (session.dinnerAmount || 0)).toFixed(2)}` : '-'}</td>
                      <td className="regular-cell">{formatHoursMinutes(session.regularHours)}</td>
                      <td className="unpaid-cell">{formatHoursMinutes(session.unpaidExtraHours)}</td>
                      <td className="overtime-cell">{formatHoursMinutes(session.paidExtraHours)}</td>
                    </tr>
                  ))}
                </tbody>
              ) : (
                <tbody>
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>
                      No sessions found
                    </td>
                  </tr>
                </tbody>
              )}
            </table>
          </div>
          </>
        )}
        <div className="table-footer">
          <button className="export-button" onClick={exportToCSV}>
            <Download />
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );
});
