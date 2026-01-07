import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Download, TrendingUp, Clock, AlertTriangle, DollarSign, Coffee } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval } from 'date-fns';
import './Analytics.css';

export function Analytics({ user }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('monthly');
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    loadAllSessions();
  }, [user]);

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

  const calculateStats = () => {
    const filtered = getFilteredSessions();

    const totalHours = filtered.reduce((sum, s) => sum + s.totalHours, 0);
    const regularHours = filtered.reduce((sum, s) => sum + s.regularHours, 0);
    const unpaidHours = filtered.reduce((sum, s) => sum + s.unpaidExtraHours, 0);
    const paidOvertimeHours = filtered.reduce((sum, s) => sum + s.paidExtraHours, 0);
    const lunchHours = filtered.reduce((sum, s) => sum + (s.includeLunchTime ? 1 : 0), 0);
    const totalDays = filtered.length > 0 ? new Set(filtered.map(s => format(new Date(s.clockIn), 'yyyy-MM-dd'))).size : 0;
    const sessionsWithLunch = filtered.filter(s => s.includeLunchTime).length;

    return {
      totalHours,
      regularHours,
      unpaidHours,
      paidOvertimeHours,
      lunchHours,
      sessionsWithLunch,
      totalDays,
      avgHoursPerDay: totalDays > 0 ? totalHours / totalDays : 0
    };
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
      ['Date', 'Clock In', 'Clock Out', 'Total Hours', 'Lunch Time', 'Regular Hours', 'Isenção (Unpaid)', 'Overwork (Paid)'],
      ...filtered.map(s => [
        format(new Date(s.clockIn), 'yyyy-MM-dd'),
        format(new Date(s.clockIn), 'HH:mm:ss'),
        format(new Date(s.clockOut), 'HH:mm:ss'),
        s.totalHours.toFixed(2),
        s.includeLunchTime ? '1.00' : '0.00',
        s.regularHours.toFixed(2),
        s.unpaidExtraHours.toFixed(2),
        s.paidExtraHours.toFixed(2)
      ]),
      [''],
      ['Summary'],
      ['Total Sessions', filtered.length],
      ['Total Days Worked', new Set(filtered.map(s => format(new Date(s.clockIn), 'yyyy-MM-dd'))).size],
      ['Total Hours', calculateStats().totalHours.toFixed(2)],
      ['Lunch Hours', calculateStats().lunchHours.toFixed(2)],
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
            <div className="stat-value">{stats.totalHours.toFixed(2)}h</div>
            <div className="stat-sublabel">{stats.totalDays} days worked</div>
          </div>
        </div>

        <div className="stat-card regular">
          <div className="stat-icon">
            <TrendingUp />
          </div>
          <div className="stat-content">
            <div className="stat-label">Regular Hours</div>
            <div className="stat-value">{stats.regularHours.toFixed(2)}h</div>
            <div className="stat-sublabel">Standard work time</div>
          </div>
        </div>

        <div className="stat-card unpaid">
          <div className="stat-icon">
            <AlertTriangle />
          </div>
          <div className="stat-content">
            <div className="stat-label">Isenção (Unpaid)</div>
            <div className="stat-value">{stats.unpaidHours.toFixed(2)}h</div>
            <div className="stat-sublabel">8-10 hour range</div>
          </div>
        </div>

        <div className="stat-card overtime">
          <div className="stat-icon">
            <DollarSign />
          </div>
          <div className="stat-content">
            <div className="stat-label">Overwork (Paid)</div>
            <div className="stat-value">{stats.paidOvertimeHours.toFixed(2)}h</div>
            <div className="stat-sublabel">Over 10 hours</div>
          </div>
        </div>

        <div className="stat-card lunch">
          <div className="stat-icon">
            <Coffee />
          </div>
          <div className="stat-content">
            <div className="stat-label">Lunch Time</div>
            <div className="stat-value">{stats.lunchHours.toFixed(2)}h</div>
            <div className="stat-sublabel">{stats.sessionsWithLunch} sessions</div>
          </div>
        </div>
      </div>

      <div className="detailed-table">
        <h2>Detailed Sessions</h2>
        {getFilteredSessions().length === 0 ? (
          <p className="no-data">No sessions found for this period</p>
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
                  <th>Regular</th>
                  <th>Isenção</th>
                  <th>Overwork</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredSessions().map((session) => (
                  <tr key={session.id}>
                    <td>{format(new Date(session.clockIn), 'MMM dd, yyyy')}</td>
                    <td>{format(new Date(session.clockIn), 'HH:mm')}</td>
                    <td>{format(new Date(session.clockOut), 'HH:mm')}</td>
                    <td className="bold">{session.totalHours.toFixed(2)}h</td>
                    <td className="lunch-cell">{session.includeLunchTime ? '1h' : '-'}</td>
                    <td className="regular-cell">{session.regularHours.toFixed(2)}h</td>
                    <td className="unpaid-cell">{session.unpaidExtraHours.toFixed(2)}h</td>
                    <td className="overtime-cell">{session.paidExtraHours.toFixed(2)}h</td>
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
