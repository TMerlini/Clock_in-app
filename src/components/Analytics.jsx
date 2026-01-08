import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Download, TrendingUp, Clock, AlertTriangle, DollarSign, Coffee, Calendar as CalendarIcon, MinusCircle, UtensilsCrossed, CalendarDays, Trash2, Search, Filter } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval } from 'date-fns';
import { formatHoursMinutes } from '../lib/utils';
import './Analytics.css';

export function Analytics({ user }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('monthly');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [overworkDeductions, setOverworkDeductions] = useState([]);
  const [deductionHours, setDeductionHours] = useState('');
  const [deductionReason, setDeductionReason] = useState('');
  const [showDeductionForm, setShowDeductionForm] = useState(false);
  const [lunchDuration, setLunchDuration] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWeekend, setFilterWeekend] = useState(false);
  const [filterLunch, setFilterLunch] = useState(false);
  const [filterMeals, setFilterMeals] = useState(false);
  const [filterOvertime, setFilterOvertime] = useState(false);

  useEffect(() => {
    loadAllSessions();
    loadOverworkDeductions();
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    try {
      const settingsRef = doc(db, 'userSettings', user.uid);
      const settingsDoc = await getDoc(settingsRef);

      if (settingsDoc.exists()) {
        const settings = settingsDoc.data();
        setLunchDuration(settings.lunchDuration || 1);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadAllSessions = async () => {
    try {
      const sessionsRef = collection(db, 'sessions');
      const q = query(sessionsRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      const allSessions = [];
      querySnapshot.forEach((doc) => {
        allSessions.push({ id: doc.id, ...doc.data() });
      });

      setSessions(allSessions);
      setLoading(false);
    } catch (error) {
      console.error('Error loading sessions:', error);
      setLoading(false);
    }
  };

  const loadOverworkDeductions = async () => {
    try {
      const deductionsRef = collection(db, 'overworkDeductions');
      const q = query(deductionsRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      const deductions = [];
      querySnapshot.forEach((doc) => {
        deductions.push({ id: doc.id, ...doc.data() });
      });

      // Sort by date descending (newest first)
      deductions.sort((a, b) => b.timestamp - a.timestamp);
      setOverworkDeductions(deductions);
    } catch (error) {
      console.error('Error loading overwork deductions:', error);
    }
  };

  const getDateRange = () => {
    switch (reportType) {
      case 'daily':
        return {
          start: new Date(selectedDate.setHours(0, 0, 0, 0)),
          end: new Date(selectedDate.setHours(23, 59, 59, 999))
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
  };

  const getFilteredSessions = () => {
    const { start, end } = getDateRange();
    return sessions.filter(s =>
      s.clockIn >= start.getTime() && s.clockIn <= end.getTime()
    );
  };

  const getSearchAndFilteredSessions = () => {
    let filtered = getFilteredSessions();

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(s => {
        const date = format(new Date(s.clockIn), 'MMM dd, yyyy').toLowerCase();
        const notes = (s.notes || '').toLowerCase();
        return date.includes(search) || notes.includes(search);
      });
    }

    // Apply checkbox filters
    if (filterWeekend) {
      filtered = filtered.filter(s => s.isWeekend);
    }

    if (filterLunch) {
      filtered = filtered.filter(s => s.lunchDuration && s.lunchDuration > 0);
    }

    if (filterMeals) {
      filtered = filtered.filter(s =>
        (s.lunchAmount && s.lunchAmount > 0) || (s.dinnerAmount && s.dinnerAmount > 0)
      );
    }

    if (filterOvertime) {
      filtered = filtered.filter(s => s.paidExtraHours > 0);
    }

    return filtered;
  };

  const calculateStats = () => {
    const filtered = getFilteredSessions();

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
      totalDays,
      avgHoursPerDay: totalDays > 0 ? totalHours / totalDays : 0
    };
  };

  const calculateOverworkStats = () => {
    // Calculate total overwork hours from ALL sessions
    const totalOverworkHours = sessions.reduce((sum, s) => sum + s.paidExtraHours, 0);

    // Calculate total deducted hours
    const totalDeductedHours = overworkDeductions.reduce((sum, d) => sum + d.hours, 0);

    // Calculate remaining overwork
    const remainingOverworkHours = totalOverworkHours - totalDeductedHours;

    // Calculate work days (8 hours = 1 day)
    const totalOverworkDays = totalOverworkHours / 8;
    const deductedDays = totalDeductedHours / 8;
    const remainingDays = remainingOverworkHours / 8;

    return {
      totalOverworkHours,
      totalDeductedHours,
      remainingOverworkHours,
      totalOverworkDays,
      deductedDays,
      remainingDays
    };
  };

  const handleAddDeduction = async () => {
    if (!deductionHours || parseFloat(deductionHours) <= 0) {
      alert('Please enter a valid number of hours');
      return;
    }

    const hours = parseFloat(deductionHours);
    const overworkStats = calculateOverworkStats();

    if (hours > overworkStats.remainingOverworkHours) {
      alert(`You cannot deduct more hours than available. Remaining: ${formatHoursMinutes(overworkStats.remainingOverworkHours)}`);
      return;
    }

    try {
      const deductionsRef = collection(db, 'overworkDeductions');
      await addDoc(deductionsRef, {
        userId: user.uid,
        hours: hours,
        reason: deductionReason || 'No reason provided',
        timestamp: Date.now(),
        createdAt: new Date().toISOString()
      });

      // Reset form
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
    const filtered = getFilteredSessions();
    const { start, end } = getDateRange();

    const csvContent = [
      ['Clock In App - Time Report'],
      [`Period: ${format(start, 'MMM dd, yyyy')} - ${format(end, 'MMM dd, yyyy')}`],
      [`Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`],
      [`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm:ss')}`],
      [''],
      ['Date', 'Clock In', 'Clock Out', 'Total Hours', 'Lunch Time', 'Lunch (€)', 'Dinner (€)', 'Meals Total (€)', 'Weekend', 'Days Off', 'Weekend Bonus (€)', 'Regular Hours', 'Isenção (Unpaid)', 'Overwork (Paid)'],
      ...filtered.map(s => [
        format(new Date(s.clockIn), 'yyyy-MM-dd'),
        format(new Date(s.clockIn), 'HH:mm:ss'),
        format(new Date(s.clockOut), 'HH:mm:ss'),
        s.totalHours.toFixed(2),
        (s.lunchDuration || 0).toFixed(2),
        (s.lunchAmount || 0).toFixed(2),
        (s.dinnerAmount || 0).toFixed(2),
        ((s.lunchAmount || 0) + (s.dinnerAmount || 0)).toFixed(2),
        s.isWeekend ? 'Yes' : 'No',
        (s.weekendDaysOff || 0).toFixed(1),
        (s.weekendBonus || 0).toFixed(2),
        s.regularHours.toFixed(2),
        s.unpaidExtraHours.toFixed(2),
        s.paidExtraHours.toFixed(2)
      ]),
      [''],
      ['Summary'],
      ['Total Sessions', filtered.length],
      ['Total Days Worked', new Set(filtered.map(s => format(new Date(s.clockIn), 'yyyy-MM-dd'))).size],
      ['Weekend Sessions', calculateStats().weekendSessions],
      ['Total Hours', calculateStats().totalHours.toFixed(2)],
      ['Lunch Hours', calculateStats().lunchHours.toFixed(2)],
      ['Total Lunch Expenses', calculateStats().totalLunchExpenses.toFixed(2)],
      ['Total Dinner Expenses', calculateStats().totalDinnerExpenses.toFixed(2)],
      ['Total Meal Expenses', calculateStats().totalMealExpenses.toFixed(2)],
      ['Total Days Off Earned', calculateStats().totalWeekendDaysOff.toFixed(1)],
      ['Total Weekend Bonus', calculateStats().totalWeekendBonus.toFixed(2)],
      ['Regular Hours', calculateStats().regularHours.toFixed(2)],
      ['Isenção Hours (Unpaid)', calculateStats().unpaidHours.toFixed(2)],
      ['Overwork Hours (Paid)', calculateStats().paidOvertimeHours.toFixed(2)]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clock-report-${reportType}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const stats = calculateStats();
  const { start, end } = getDateRange();

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
        <button className="export-button" onClick={exportToCSV}>
          <Download />
          Export CSV
        </button>
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
            <div className="stat-sublabel">8-10 hour range</div>
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
            <div className="stat-sublabel">{stats.weekendSessions} weekend sessions</div>
          </div>
        </div>

        <div className="stat-card weekend-bonus">
          <div className="stat-icon">
            <DollarSign />
          </div>
          <div className="stat-content">
            <div className="stat-label">Weekend +</div>
            <div className="stat-value">€{stats.totalWeekendBonus.toFixed(2)}</div>
            <div className="stat-sublabel">{stats.weekendSessions} weekend sessions</div>
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
          {(() => {
            const overworkStats = calculateOverworkStats();
            return (
              <>
                <div className="overwork-stat-card total-accumulated">
                  <div className="overwork-stat-header">
                    <Clock className="overwork-stat-icon" />
                    <span className="overwork-stat-label">Total Accumulated</span>
                  </div>
                  <div className="overwork-stat-value">{formatHoursMinutes(overworkStats.totalOverworkHours)}</div>
                  <div className="overwork-stat-sublabel">
                    {overworkStats.totalOverworkDays.toFixed(2)} work days
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

                <div className="overwork-stat-card remaining">
                  <div className="overwork-stat-header">
                    <DollarSign className="overwork-stat-icon" />
                    <span className="overwork-stat-label">Remaining Balance</span>
                  </div>
                  <div className="overwork-stat-value highlight">{formatHoursMinutes(overworkStats.remainingOverworkHours)}</div>
                  <div className="overwork-stat-sublabel">
                    {overworkStats.remainingDays.toFixed(2)} work days available
                  </div>
                </div>
              </>
            );
          })()}
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
                  <label htmlFor="deductionHours">Hours to Use</label>
                  <input
                    id="deductionHours"
                    type="number"
                    min="0.25"
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
            <div className="filter-options">
              <Filter />
              <label className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={filterWeekend}
                  onChange={(e) => setFilterWeekend(e.target.checked)}
                />
                <span>Weekend</span>
              </label>
              <label className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={filterLunch}
                  onChange={(e) => setFilterLunch(e.target.checked)}
                />
                <span>With Lunch</span>
              </label>
              <label className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={filterMeals}
                  onChange={(e) => setFilterMeals(e.target.checked)}
                />
                <span>With Meals</span>
              </label>
              <label className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={filterOvertime}
                  onChange={(e) => setFilterOvertime(e.target.checked)}
                />
                <span>Paid Overtime</span>
              </label>
            </div>
          </div>
        </div>
        {getSearchAndFilteredSessions().length === 0 ? (
          <p className="no-data">No sessions found matching your search and filters</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
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
              <tbody>
                {getSearchAndFilteredSessions().map((session) => (
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
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
