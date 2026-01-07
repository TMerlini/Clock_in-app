import { Clock, Coffee, AlertTriangle, DollarSign, TrendingUp, Calendar, BarChart3, Info } from 'lucide-react';
import './About.css';

export function About() {
  return (
    <div className="about-container">
      <div className="about-header">
        <Clock className="about-logo" />
        <h1>Clock In App</h1>
        <p className="about-subtitle">Your personal time tracking solution</p>
      </div>

      <div className="about-content">
        <section className="about-section">
          <div className="section-header">
            <Info />
            <h2>About This App</h2>
          </div>
          <p>
            Clock In App is designed to help you track your work hours efficiently.
            Whether you're a freelancer, contractor, or employee, this app makes it easy
            to monitor your time and understand how your work hours are categorized.
          </p>
        </section>

        <section className="about-section">
          <div className="section-header">
            <Clock />
            <h2>How It Works</h2>
          </div>
          <div className="how-it-works">
            <div className="work-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Clock In</h3>
                <p>Click the large button on the home page to start tracking your time.</p>
              </div>
            </div>
            <div className="work-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Work</h3>
                <p>The timer runs automatically, showing you real-time breakdowns of your hours.</p>
              </div>
            </div>
            <div className="work-step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Clock Out</h3>
                <p>Click the button again to stop tracking. Your session is saved automatically.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="about-section">
          <div className="section-header">
            <TrendingUp />
            <h2>Hour Categories</h2>
          </div>
          <div className="categories">
            <div className="category-card regular">
              <div className="category-icon">
                <TrendingUp />
              </div>
              <div className="category-content">
                <h3>Regular Hours (0-8h)</h3>
                <p>Your standard work time. These are the first 8 hours of any work session.</p>
              </div>
            </div>

            <div className="category-card unpaid">
              <div className="category-icon">
                <AlertTriangle />
              </div>
              <div className="category-content">
                <h3>Isenção - Unpaid Extra (8-10h)</h3>
                <p>Hours between 8 and 10 hours. These are tracked separately as unpaid overtime.</p>
              </div>
            </div>

            <div className="category-card overtime">
              <div className="category-icon">
                <DollarSign />
              </div>
              <div className="category-content">
                <h3>Overwork - Paid Overtime (10h+)</h3>
                <p>Any hours beyond 10 hours are considered paid overtime and compensated accordingly.</p>
              </div>
            </div>

            <div className="category-card lunch">
              <div className="category-icon">
                <Coffee />
              </div>
              <div className="category-content">
                <h3>Lunch Time</h3>
                <p>When editing sessions, you can mark lunch time to deduct 1 hour from working hours. This hour doesn't count towards the 8-hour regular time.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="about-section">
          <div className="section-header">
            <Calendar />
            <h2>Features</h2>
          </div>
          <ul className="features-list">
            <li>
              <strong>Real-time tracking:</strong> See your hours update live as you work
            </li>
            <li>
              <strong>Calendar view:</strong> Browse past sessions by date with visual indicators
            </li>
            <li>
              <strong>Manual sessions:</strong> Add or edit sessions for days you forgot to clock in
            </li>
            <li>
              <strong>Lunch time tracking:</strong> Deduct lunch breaks from your working hours
            </li>
            <li>
              <strong>Google Calendar sync:</strong> Export your sessions to Google Calendar
            </li>
            <li>
              <strong>Analytics dashboard:</strong> View detailed reports by day, week, month, or year
            </li>
            <li>
              <strong>CSV export:</strong> Download your time reports for external use
            </li>
            <li>
              <strong>Multiple sessions:</strong> Track multiple work sessions per day
            </li>
          </ul>
        </section>

        <section className="about-section">
          <div className="section-header">
            <BarChart3 />
            <h2>Analytics & Reports</h2>
          </div>
          <p>
            The Analytics page provides comprehensive insights into your work patterns.
            You can filter by daily, weekly, monthly, or yearly periods to understand:
          </p>
          <ul className="features-list">
            <li>Total hours worked</li>
            <li>Regular vs. overtime breakdown</li>
            <li>Unpaid extra hours (Isenção)</li>
            <li>Paid overtime hours</li>
            <li>Lunch time taken</li>
            <li>Detailed session logs with all timestamps</li>
          </ul>
          <p>
            All data can be exported to CSV format for use in spreadsheets or payroll systems.
          </p>
        </section>

        <section className="about-section footer-section">
          <p className="version">Version 1.0.0</p>
          <p className="copyright">© 2026 Clock In App. Built for tracking your time efficiently.</p>
        </section>
      </div>
    </div>
  );
}
