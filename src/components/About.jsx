import { Clock, Coffee, AlertTriangle, DollarSign, TrendingUp, Calendar, BarChart3, Info, UtensilsCrossed, MapPin, Globe, Bot, Crown } from 'lucide-react';
import './About.css';

export function About() {
  return (
    <div className="about-container">
      <div className="about-header">
        <img src="/images/Clock in Logo White.webp" alt="Clock In Logo" className="about-logo-img" />
        <h1>Clock In</h1>
        <p className="about-subtitle">Intelligent Time Manager</p>
      </div>

      <div className="about-content">
        <section className="about-section">
          <div className="section-header">
            <Info />
            <h2>About This App</h2>
          </div>
          <p>
            Clock In is a comprehensive time tracking solution designed to help professionals
            manage their work hours with precision and intelligence. Whether you're a freelancer,
            contractor, remote worker, or full-time employee, Clock In provides powerful tools
            to track time, analyze patterns, manage expenses, and optimize your productivity.
          </p>
          <p>
            Built with modern web technologies and designed for real-world use, Clock In adapts
            to your workflow and provides actionable insights into how you spend your time.
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
                <h3>Regular Hours</h3>
                <p>Your standard work time up to your configured threshold (default: 8 hours). These hours form the foundation of your daily work schedule.</p>
              </div>
            </div>

            <div className="category-card unpaid">
              <div className="category-icon">
                <AlertTriangle />
              </div>
              <div className="category-content">
                <h3>Isenção - Unpaid Extra (Optional)</h3>
                <p>Configure unpaid overtime tracking for hours beyond regular time. Can be enabled/disabled in Settings with custom thresholds. Annual limit (default: 200 hours/year) ensures compliance - once reached, additional hours are classified as paid overwork.</p>
              </div>
            </div>

            <div className="category-card overtime">
              <div className="category-icon">
                <DollarSign />
              </div>
              <div className="category-content">
                <h3>Overwork - Paid Overtime</h3>
                <p>Hours beyond your overtime threshold that are compensated. Accumulated overwork can be tracked and converted to days off (8h = 1 day).</p>
              </div>
            </div>

            <div className="category-card lunch">
              <div className="category-icon">
                <Coffee />
              </div>
              <div className="category-content">
                <h3>Lunch & Break Time</h3>
                <p>Track lunch duration with customizable hours and minutes. Set your default lunch time in Settings for quick session creation.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="about-section">
          <div className="section-header">
            <Calendar />
            <h2>Key Features</h2>
          </div>
          <div className="features-grid">
            <div className="feature-item">
              <Clock />
              <div>
                <strong>Real-Time Tracking</strong>
                <p>Live timer with automatic hour categorization as you work</p>
              </div>
            </div>
            <div className="feature-item">
              <Calendar />
              <div>
                <strong>Interactive Calendar</strong>
                <p>Visual session indicators and quick date navigation</p>
              </div>
            </div>
            <div className="feature-item">
              <BarChart3 />
              <div>
                <strong>Advanced Analytics</strong>
                <p>Daily, weekly, monthly, and yearly reports with detailed breakdowns</p>
              </div>
            </div>
            <div className="feature-item">
              <Globe />
              <div>
                <strong>Google Calendar Integration</strong>
                <p>One-click sync of work sessions to your calendar</p>
              </div>
            </div>
            <div className="feature-item">
              <Coffee />
              <div>
                <strong>Flexible Lunch Tracking</strong>
                <p>Customizable lunch duration with hours and minutes</p>
              </div>
            </div>
            <div className="feature-item">
              <UtensilsCrossed />
              <div>
                <strong>Expense Management</strong>
                <p>Track lunch and dinner expenses per session</p>
              </div>
            </div>
            <div className="feature-item">
              <MapPin />
              <div>
                <strong>Location Notes</strong>
                <p>Add work location to sessions (office, home, client site, etc.)</p>
              </div>
            </div>
            <div className="feature-item">
              <DollarSign />
              <div>
                <strong>Weekend Work Benefits</strong>
                <p>Configure days off earned and bonus compensation for weekend work</p>
              </div>
            </div>
            <div className="feature-item">
              <TrendingUp />
              <div>
                <strong>Overwork Management</strong>
                <p>Track accumulated overtime and usage history (8h = 1 day off)</p>
              </div>
            </div>
            <div className="feature-item">
              <AlertTriangle />
              <div>
                <strong>Customizable Thresholds</strong>
                <p>Configure regular hours, unpaid extra, and paid overtime limits</p>
              </div>
            </div>
            <div className="feature-item">
              <Bot />
              <div>
                <strong>AI Advisor (Premium AI)</strong>
                <p>AI-powered compliance analysis with Portuguese labor law expertise and HR guidance</p>
              </div>
            </div>
            <div className="feature-item">
              <Crown />
              <div>
                <strong>Premium Plans</strong>
                <p>Choose from Basic, Pro, or Premium AI plans with advanced features and AI assistance</p>
              </div>
            </div>
          </div>
        </section>

        <section className="about-section">
          <div className="section-header">
            <Bot />
            <h2>AI Advisor - Premium AI Feature</h2>
          </div>
          <p>
            Premium AI subscribers get access to an intelligent AI Advisor powered by OpenRouter with expertise
            in Portuguese labor law and HR best practices.
          </p>
          <div className="analytics-features">
            <div className="analytics-item">
              <h4>🇵🇹 Portuguese Labor Law Expertise</h4>
              <p>AI understands Código do Trabalho and provides compliance analysis based on actual Portuguese labor law</p>
            </div>
            <div className="analytics-item">
              <h4>⚖️ Legal Limit Calculations</h4>
              <p>Automatic tracking and calculations for overtime limits, Isenção usage, vacation rights, and compliance percentages</p>
            </div>
            <div className="analytics-item">
              <h4>👥 HR Best Practices</h4>
              <p>Work-life balance guidance, burnout prevention tips, and productivity optimization recommendations</p>
            </div>
            <div className="analytics-item">
              <h4>🔔 Proactive Alerts</h4>
              <p>Early warnings when approaching legal limits, helping you stay compliant before issues arise</p>
            </div>
            <div className="analytics-item">
              <h4>📊 Context-Aware Analysis</h4>
              <p>AI has access to your sessions, settings, and work patterns for personalized, relevant advice</p>
            </div>
            <div className="analytics-item">
              <h4>📦 Call Pack System</h4>
              <p>75 calls/month included, with option to purchase +50 call packs (€4.99, never expire) for power users</p>
            </div>
          </div>
          <p style={{ marginTop: '1rem', fontStyle: 'italic', color: 'var(--muted-foreground)' }}>
            <strong>Powered by OpenRouter</strong> - Multi-model AI routing ensures optimal performance and reliability.
          </p>
        </section>

        <section className="about-section">
          <div className="section-header">
            <BarChart3 />
            <h2>Analytics & Reports</h2>
          </div>
          <p>
            Gain deep insights into your work patterns with comprehensive analytics dashboards:
          </p>
          <div className="analytics-features">
            <div className="analytics-item">
              <h4>📊 Multiple Report Views</h4>
              <p>Daily, weekly, monthly, and yearly time period analysis</p>
            </div>
            <div className="analytics-item">
              <h4>🔍 Search & Filter</h4>
              <p>Find sessions by date, notes, weekend work, meals, or overtime</p>
            </div>
            <div className="analytics-item">
              <h4>📈 Visual Stats Cards</h4>
              <p>Total hours, regular time, isenção, overwork, lunch time, and expenses</p>
            </div>
            <div className="analytics-item">
              <h4>💾 CSV Export</h4>
              <p>Download detailed reports for spreadsheets, payroll, or accounting systems</p>
            </div>
            <div className="analytics-item">
              <h4>⏱️ Overwork Tracker</h4>
              <p>Monitor accumulated overtime with conversion to days off and usage history</p>
            </div>
            <div className="analytics-item">
              <h4>💰 Expense Reports</h4>
              <p>Track meal costs with separate lunch and dinner expense totals</p>
            </div>
          </div>
        </section>

        <section className="about-section">
          <div className="section-header">
            <Info />
            <h2>Technology Stack</h2>
          </div>
          <p>
            Built with modern, reliable technologies to ensure a fast, secure, and scalable experience:
          </p>
          <ul className="tech-list">
            <li><strong>React 18</strong> - Modern UI framework with hooks and performance optimizations</li>
            <li><strong>Firebase</strong> - Real-time database and authentication</li>
            <li><strong>Google Calendar API</strong> - Seamless calendar integration</li>
            <li><strong>OpenRouter API</strong> - Multi-model AI routing for AI Advisor (powered by OpenRouter)</li>
            <li><strong>Vite</strong> - Lightning-fast build tool with code splitting</li>
            <li><strong>Vercel</strong> - Global edge network deployment</li>
          </ul>
          <p style={{ marginTop: '1rem', fontStyle: 'italic', color: 'var(--muted-foreground)' }}>
            Optimized following Vercel's React best practices for maximum performance and user experience.
          </p>
        </section>

        <section className="about-section">
          <div className="section-header">
            <TrendingUp />
            <h2>Performance & Reliability</h2>
          </div>
          <p>
            Clock In is built with performance and reliability as top priorities:
          </p>
          <div className="analytics-features">
            <div className="analytics-item">
              <h4>⚡ Fast Loading</h4>
              <p>Code splitting and lazy loading reduce initial load time by 30-50%</p>
            </div>
            <div className="analytics-item">
              <h4>🔄 Parallel Operations</h4>
              <p>Data loading happens in parallel, making pages load 50-70% faster</p>
            </div>
            <div className="analytics-item">
              <h4>💾 Smart Caching</h4>
              <p>Intelligent request caching prevents duplicate API calls</p>
            </div>
            <div className="analytics-item">
              <h4>🛡️ Error Recovery</h4>
              <p>Error boundaries ensure graceful handling of unexpected issues</p>
            </div>
            <div className="analytics-item">
              <h4>🎯 Optimized Rendering</h4>
              <p>Memoization and component optimization for smooth interactions</p>
            </div>
            <div className="analytics-item">
              <h4>📦 Smaller Bundles</h4>
              <p>Route-based code splitting reduces bundle size by 20-30%</p>
            </div>
          </div>
        </section>

        <section className="about-section footer-section">
          <p className="version">Version 2.2.0 - January 2026</p>
          <p className="copyright">© 2026 Clock In - Intelligent Time Manager. Built for professionals who value their time.</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>
            Latest update: AI Advisor with Portuguese labor law expertise, Premium AI plans, and call pack system
          </p>
        </section>
      </div>
    </div>
  );
}
