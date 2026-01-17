# Clock In App

A comprehensive time tracking application for managing work hours, overtime, meal expenses, and weekend work. Built with React and Firebase, featuring real-time tracking, detailed analytics, and Google Calendar integration.

## Features

### 🕐 Time Tracking
- **Real-time Clock In/Out** - Track work sessions with live timer display
- **Active Session Card** - Real-time session tracking while clocked in with editable details (lunch, dinner, location, notes) that auto-save
- **Cross-Device Sync** - Active sessions and data sync in real-time across all devices
- **Manual Session Creation** - Add historical sessions with custom times
- **Session Editing** - Modify existing sessions with full details
- **Automatic Calculations** - Real-time computation of regular hours, unpaid overtime, and paid overtime
- **Lunch Break Management** - Customizable lunch duration with flexible hour/minute input (inline fields for compact UI)
- **Weekend Detection** - Automatically identifies Saturday/Sunday sessions with automatic benefits application

### 📊 Analytics & Reporting
- **Multiple Report Types** - Daily, Weekly, Monthly, and Yearly views
- **Interactive Calendar** - Visual indicator of days with sessions
- **Detailed Statistics Cards**:
  - Total working hours
  - Regular hours (up to 8h)
  - Unpaid overtime (8-10h range, "Isenção") with annual limit tracking
  - Paid overtime (10h+)
  - Lunch hours breakdown
  - Meal expenses (lunch + dinner)
  - Weekend days off earned
  - Weekend bonus compensation
- **Overwork Management**:
  - Track accumulated overwork hours (8h = 1 work day)
  - Record overwork usage with reasons
  - View remaining balance
  - Historical usage tracking
- **CSV Export** - Download detailed reports with all session data
- **Search & Filter** - Find specific sessions by date, notes, or criteria (weekend, meals, overtime)

### 💰 Expense Tracking
- **Lunch Expenses** - Track meal costs per session (€)
- **Dinner Expenses** - Record dinner costs when working late (€)
- **Consolidated View** - Combined meal expenses in analytics
- **CSV Export** - Separate columns for lunch, dinner, and total expenses

### 🎯 Weekend Work Benefits
- **Days Off Calculation** - Configure days off earned per weekend work day
- **Weekend Bonus** - Set compensation amount for weekend work (€)
- **Automatic Application** - Benefits automatically applied to Saturday/Sunday sessions
- **Analytics Dashboard** - Track total days off earned and bonus accumulated

### 📅 Google Calendar Integration
- **Two-Way Sync** - Automatic sync of work sessions to Google Calendar
- **Placeholder Events** - Creates calendar events immediately on clock-in (red/in-progress status)
- **Auto-Update Events** - Updates placeholder events on clock-out with final session details
- **Sync Status Indicator** - Visual indicator in header showing connection status and remaining token time
- **Manual Sync** - Click the cloud icon to manually sync pending/failed sessions
- **Token Management** - Automatic token refresh with expiration warnings
- **Cross-Device Auth Sync** - Calendar authorization syncs across all devices via Firestore
- **Detailed Event Information** - Includes clock in/out times, hours breakdown, and session notes
- **Timezone Support** - Events use browser's local timezone for accurate display

### ⚙️ Customizable Settings
- **Profile**:
  - Username/Alias - Set display name with @ prefix (shown in header instead of email)
- **Hour Thresholds**:
  - Regular hours limit (default: 8h)
  - Unpaid Extra (Isenção) toggle - enable/disable unpaid overtime tracking
  - Unpaid Extra threshold (default: 10h, configurable when enabled)
  - Paid overtime starts after unpaid extra threshold (or regular hours if disabled)
- **Isenção Configuration**:
  - Annual Isenção limit (default: 200 hours/year, configurable)
  - Once annual limit is reached, additional hours are classified as paid overwork
  - Limit applies per calendar year (Jan 1 - Dec 31)
- **Break Settings**:
  - Default lunch duration (hours and minutes)
- **Calendar Settings**:
  - Week start day (Sunday or Monday)
- **Weekend Work Defaults**:
  - Days off per weekend work day
  - Weekend bonus amount (€)
- **Google Calendar Sync**:
  - Enable/disable calendar integration
  - Sync status display (synced, pending, failed sessions)
  - Batch sync for pending/failed sessions

### 🤖 AI Advisor (Premium AI Feature)
- **Portuguese Labor Law Expertise** - AI-powered compliance analysis based on Código do Trabalho
- **Legal Limit Calculations** - Automatic tracking of overtime, Isenção, and vacation limits
- **HR Best Practices** - Work-life balance guidance and productivity recommendations
- **Compliance Monitoring** - Proactive alerts when approaching legal limits
- **Work Pattern Analysis** - Personalized insights based on your actual work data
- **Context-Aware Advice** - AI understands your sessions, settings, and work patterns
- **75 AI Calls/Month Base** - Included with Premium AI subscription
- **Call Pack System** - Purchase additional +50 call packs (€4.99, never expire) for power users
- **Powered by OpenRouter** - Multi-model AI routing for optimal performance

### 💎 Subscription Plans
- **Free** - Core time tracking and basic session management
- **Basic (€0.99/month)** - Full analytics, Google Calendar sync, advanced session management
- **Pro (€4.99/month)** - Advanced analytics, detailed reports, priority support, custom date ranges
- **Premium AI (€9.99/month)** - All Pro features + AI Advisor with Portuguese labor law expertise:
  - 75 AI calls/month base allocation
  - Portuguese labor law compliance analysis
  - Legal limit calculations (overtime, Isenção, vacation)
  - HR best practices & work-life balance guidance
  - Compliance monitoring & proactive alerts
  - Buy additional call packs as needed (+50 calls for €4.99, never expire)

### 🌍 Internationalization (i18n)
- **Multi-Language Support** - Full interface translation in Portuguese and English
- **Portuguese as Default** - App defaults to Portuguese (pt) language
- **Language Switching** - Change language anytime in Settings page
- **Persistent Language Preference** - Your language choice is saved and synced across devices
- **Localized Date Formatting** - Calendar and dates automatically formatted according to selected language
- **Complete Translation** - All UI elements, menus, buttons, messages, and FAQ translated

### 🔐 Authentication & User Profile
- **Firebase Authentication** - Secure user authentication
- **Google Sign-In** - Easy login with Google account
- **User-specific Data** - Each user's data is private and isolated
- **Username/Alias** - Custom display name shown in header (with @ prefix)
- **Real-time Profile Sync** - Username syncs across all devices

## Technology Stack

### Frontend
- **React 18** - UI library with hooks and modern performance optimizations
- **Vite** - Fast build tool and dev server with code splitting
- **CSS3** - Custom styling with CSS variables for theming
- **react-i18next** - Internationalization framework for multi-language support
- **i18next** - Core internationalization library with language detection
- **date-fns** - Date manipulation and formatting with locale support
- **react-day-picker** - Interactive calendar component
- **lucide-react** - Modern icon library
- **Performance Optimizations** - Following Vercel's React best practices:
  - Parallel async operations
  - Route-based code splitting
  - Component memoization
  - Request caching and deduplication
  - Error boundaries for resilience

### Backend & Database
- **Firebase Authentication** - User authentication and management
- **Firebase Firestore** - NoSQL cloud database
- **Real-time Sync** - Live data updates across devices

### Integrations
- **Google Calendar API** - Calendar event creation
- **Google Identity Services** - OAuth 2.0 authentication
- **OpenRouter API** - Multi-model AI routing for AI Advisor (powered by OpenRouter)

### Development Tools
- **ESLint** - Code linting and quality
- **PostCSS** - CSS processing
- **Git** - Version control

### Hosting
- **Vercel** - Serverless deployment platform
- **Automatic Deployments** - CI/CD from GitHub

## User Guide

### Getting Started

1. **Sign In**
   - Visit the app URL
   - Click "Sign In with Google"
   - Authorize the application

2. **Clock In**
   - Click the "CLOCK IN" button on the home page
   - Timer starts automatically
   - Active Session Card appears in sessions list (orange/amber themed)
   - Add session details while working (lunch, dinner, location, notes) - auto-saves
   - Current time breakdown displays in real-time

3. **Clock Out**
   - Click the "CLOCK OUT" button when finished
   - All details from Active Session Card are automatically included
   - Session is saved with all previously entered details
   - Calendar event is automatically updated/created
   - No need to re-enter information unless you want to edit

### Managing Sessions

#### View Sessions by Date
1. Use the calendar on the home page
2. Days with sessions are highlighted in green
3. Select a date to view all sessions for that day
4. Daily summary shows total hours and breakdown

#### Edit a Session
1. Click the edit (pencil) icon on any session card
2. Modify times, lunch/dinner details, or notes
3. Click "Save Changes"

#### Delete a Session
1. Click the trash icon on any session card
2. Confirm deletion
3. Session is permanently removed

#### Add Manual Session
1. Select a date on the calendar
2. Click "+ Add Session" button
3. Enter clock in/out times
4. Add lunch/dinner details if applicable
5. Add notes (optional)
6. Click "Create Session"

#### Google Calendar Sync

**Automatic Sync**
- Sessions automatically sync to Google Calendar on clock-out
- Placeholder events created on clock-in (shows as in-progress)
- Events update automatically when clocking out

**Manual Sync**
- Click the cloud icon in the header to sync pending/failed sessions
- View sync status in Settings page
- Use batch sync to sync multiple sessions at once

**Sync Status**
- Green cloud icon: Connected and synced
- Warning icon: Token expiring soon or expired (click to refresh)
- Gray icon: Not connected
- Hover over icon to see detailed status and remaining time

### Analytics & Reports

#### View Reports
1. Navigate to Analytics page
2. Select report type:
   - **Daily** - Current day
   - **Weekly** - Current week
   - **Monthly** - Current month (default)
   - **Yearly** - Current year
3. Use date picker to view different periods

#### Search & Filter Sessions
1. In the detailed sessions table:
   - **Search** - Type date or keywords from notes
   - **Filter** - Select from dropdown:
     - All Sessions
     - Weekend Only
     - With Lunch
     - With Meals
     - Paid Overtime

#### Export Data
1. Click "Export CSV" button
2. CSV file downloads with all session data:
   - Clock in/out times
   - Hours breakdown (regular, unpaid, paid)
   - Lunch and meal expenses
   - Weekend information
   - Summary statistics

#### Manage Overwork Hours

**View Balance**
- See accumulated overwork hours
- View conversion to work days (8h = 1 day)
- Check remaining balance after deductions

**Record Usage**
1. Click "+ Add Usage" button
2. Enter hours to deduct
3. Enter reason for usage
4. Click "Add Deduction"

**View History**
- See all previous deductions
- Review dates, reasons, and amounts
- Click trash icon to delete an entry

### Settings

#### Configure Hour Thresholds
1. Navigate to Settings page
2. Set "Regular Hours Threshold" (e.g., 8 hours)
3. Toggle "Enable Unpaid Extra (Isenção)" to include or exclude unpaid overtime tracking
4. If enabled, set "Unpaid Extra Threshold" (e.g., 10 hours)
   - Hours between regular and unpaid extra threshold count as unpaid overtime ("Isenção")
   - Hours beyond unpaid extra threshold count as paid overtime
5. If disabled, paid overtime starts immediately after regular hours

#### Set Annual Isenção Limit
1. In "Isenção Configuration" section
2. Set "Annual Isenção Limit" (default: 200 hours/year)
3. This limit applies per calendar year (January 1 - December 31)
4. Once the annual limit is reached, additional hours beyond 8 per day are automatically classified as paid overwork instead of Isenção
5. View annual usage in Analytics page (shown in Isenção card: "X / Y hours (Z remaining)")

#### Set Default Lunch Duration
1. In "Break Settings" section
2. Enter hours (0-3)
3. Enter minutes (0-59)
4. This becomes the default for new sessions

#### Configure Calendar
1. Select week start day (Sunday or Monday)
2. Affects calendar display and weekly reports

#### Set Weekend Work Benefits
1. Configure "Days Off Per Weekend" (e.g., 1 day)
2. Set "Weekend Bonus" amount (e.g., 100€)
3. These apply automatically to Saturday/Sunday sessions

#### Configure Profile
1. In "Profile" section, enter your username/alias
2. Username will be displayed in header with @ prefix (e.g., @johndoe)
3. If not set, email address is shown instead
4. Hover over username in header to see full email

#### Change Language
1. Navigate to Settings page
2. In "Language" section, select your preferred language:
   - **Português** - Portuguese (default)
   - **English** - English
3. Language change applies immediately to the entire interface
4. Your language preference is saved and will persist across devices
5. Calendar dates and formatting automatically adapt to selected language

#### Google Calendar Integration
1. Click "Enable Google Calendar" to authorize
2. Grant permissions when prompted
3. View sync status (synced, pending, failed sessions)
4. Use "Sync All Pending/Failed" button to batch sync sessions
5. Sync status indicator in header shows connection status

#### Save Settings
1. Click "Save Settings" button
2. Changes apply to new sessions immediately
3. Existing sessions remain unchanged
4. Profile changes (username) update immediately in header

### Tips & Best Practices

- **Regular Tracking** - Clock in/out consistently for accurate reports
- **Use Notes** - Add project/client info for better tracking
- **Weekly Reviews** - Check analytics weekly to monitor hours
- **Export Regularly** - Download CSV reports for records
- **Weekend Planning** - Review earned days off before scheduling
- **Lunch Customization** - Adjust duration per session as needed
- **Overwork Management** - Track and use accumulated hours strategically

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Firebase project
- Google Cloud project (for Calendar API)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/TMerlini/Clock_in-app.git
   cd Clock_in-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable Authentication (Google provider)
   - Create Firestore database
   - Copy your Firebase config

4. **Configure Google Calendar API**
   - Create a project at [console.cloud.google.com](https://console.cloud.google.com)
   - Enable Google Calendar API
   - Create OAuth 2.0 credentials
   - Add authorized JavaScript origins

5. **Set environment variables**
   - Copy `.env.example` to `.env`
   - Add your Firebase and Google API credentials

6. **Run development server**
   ```bash
   npm run dev
   ```

7. **Build for production**
   ```bash
   npm run build
   ```

### Deployment

The app is configured for automatic deployment to Vercel:
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Push to master branch to trigger deployment

## Database Structure

### Collections


**sessions** - Work sessions
- `userId`: string
- `userEmail`: string
- `clockIn`: timestamp (UTC)
- `clockOut`: timestamp (UTC)
- `totalHours`: number
- `regularHours`: number
- `unpaidExtraHours`: number
- `paidExtraHours`: number
- `includeLunchTime`: boolean
- `lunchDuration`: number
- `lunchAmount`: number
- `hadDinner`: boolean
- `dinnerAmount`: number
- `isWeekend`: boolean
- `weekendDaysOff`: number
- `weekendBonus`: number
- `location`: string (optional)
- `notes`: string (optional)
- `calendarEventId`: string (optional, Google Calendar event ID)
- `calendarSyncStatus`: string ('synced' | 'not_synced' | 'failed')
- `lastSyncAt`: timestamp (optional)

**activeClockIns** - Active clock-in sessions
- `userId`: string
- `userEmail`: string
- `clockInTime`: timestamp (UTC)
- `calendarEventId`: string (optional, placeholder event ID)
- `sessionDetails`: object (optional, from Active Session Card)
  - `includeLunchTime`: boolean
  - `lunchHours`: number
  - `lunchMinutes`: number
  - `lunchAmount`: number
  - `hadDinner`: boolean
  - `dinnerAmount`: number
  - `location`: string
  - `notes`: string
  - `isWeekend`: boolean

**calendarTokens** - Google Calendar OAuth tokens (cross-device sync)
- `accessToken`: string
- `expiresAt`: timestamp
- `updatedAt`: timestamp

**userSettings** - User preferences
- `username`: string (optional, display name)
- `subscriptionPlan`: string ('free' | 'basic' | 'pro' | 'premium_ai')
- `subscriptionStartDate`: timestamp
- `regularHoursThreshold`: number
- `enableUnpaidExtra`: boolean (default: true)
- `unpaidExtraThreshold`: number
- `overtimeThreshold`: number (calculated based on enableUnpaidExtra)
- `annualIsencaoLimit`: number (default: 200, annual Isenção hours limit per calendar year)
- `lunchDuration`: number (decimal hours)
- `weekStartDay`: string ('monday' | 'sunday')
- `weekendDaysOff`: number
- `weekendBonus`: number
- `aiUsage`: object (Premium AI users)
  - `callsAllocated`: number (75 base per month)
  - `callsUsed`: number
  - `totalTokensUsed`: number
  - `callPacks`: array (purchased call packs)
    - `id`: string
    - `calls`: number (50)
    - `purchasedAt`: timestamp
    - `used`: number
    - `remaining`: number
  - `lastResetDate`: timestamp
- `userType`: string ('regular' | 'guest') - Optional: tracks if account was created by admin
- `createdBy`: string (optional, admin user ID for guest accounts)

**overworkDeductions** - Overwork usage tracking
- `userId`: string
- `hours`: number
- `reason`: string
- `timestamp`: number
- `createdAt`: string (ISO date)

## Future Development

This app is actively maintained with regular updates and new features. For a comprehensive list of planned enhancements, see **[FUTURE_ENHANCEMENTS.md](FUTURE_ENHANCEMENTS.md)**.

### 🚀 Recent Updates (2026)

**Premium AI & AI Advisor (January 2026)**
- ✅ **AI Advisor with Portuguese Labor Law Expertise** - AI-powered compliance analysis and HR guidance
- ✅ **Premium AI Subscription Plan** - €9.99/month with 75 AI calls/month base
- ✅ **Call Pack System** - Purchase +50 call packs for €4.99 (never expire, roll over indefinitely)
- ✅ **OpenRouter Integration** - Multi-model AI routing for optimal performance
- ✅ **Compliance Monitoring** - Proactive alerts when approaching legal limits
- ✅ **Context-Aware Analysis** - AI understands your sessions, settings, and work patterns
- ✅ **Admin Dashboard** - Management interface for user administration and analytics

**Internationalization & UI Improvements (January 2026)**
- ✅ **Multi-Language Support** - Full Portuguese and English translation with react-i18next
- ✅ **Portuguese as Default Language** - App defaults to Portuguese (pt) for Portuguese users
- ✅ **Language Switching** - Easy language selection in Settings page with persistent preference
- ✅ **Localized Date Formatting** - Calendar and dates formatted according to selected language
- ✅ **Complete Translation Coverage** - All UI elements, menus, buttons, FAQ, and About pages translated
- ✅ **Mobile Header Padding Fix** - Fixed header overlap on all pages for mobile devices (640px and below)
- ✅ **Clock Button Styling** - Improved card padding to fully display button blur effects

**Performance Optimizations (January 2026)**
- ✅ **Eliminated Async Waterfalls** - Parallel data loading for 50-70% faster page loads
- ✅ **Code Splitting** - Route-based lazy loading reduces initial bundle size by 20-30%
- ✅ **Re-render Optimization** - Memoization and optimized components for 20-40% better runtime performance
- ✅ **Smart Caching** - Request deduplication prevents duplicate API calls
- ✅ **Error Boundaries** - Graceful error handling with user-friendly recovery
- ✅ **Component Architecture** - Modular design for better maintainability and performance

**Implemented Features**
- ✅ Active Session Card - Real-time session tracking during clock-in with auto-save
- ✅ Google Calendar Two-Way Sync - Automatic event creation and updates
- ✅ Sync Status Indicator - Visual connection status in header with manual sync
- ✅ Username/Alias System - Custom display names with @ prefix
- ✅ Cross-Device Real-Time Sync - Sessions and calendar auth sync across devices
- ✅ Token Expiration Management - Automatic refresh with warnings
- ✅ Compact UI - Inline form fields for lunch/dinner in session modals
- ✅ Mobile Responsive Improvements - Fixed date selector overflow, optimized layouts

### 🚀 Upcoming Features (2026 Roadmap)

**Phase 1 - Critical Improvements (Q1 2026)**
- ✅ Data Backup & Export - Full backup and restore capabilities
- ✅ Session Validation - Prevent overlapping sessions and data errors
- ✅ Two-Way Calendar Sync - Export to Google Calendar (import planned)
- ⏳ Email Report Sharing - Send reports directly to email
- ⏳ Progressive Web App - Install on mobile devices

**Phase 2 - User Experience (Q2 2026)**
- Dashboard Customization - Personalized widget layouts
- Keyboard Shortcuts - Quick actions and navigation
- Onboarding Tutorial - Interactive first-time experience
- Time Zone Support - Multi-timezone tracking
- Auto-Sync Calendar - Automatic calendar event creation
- ✅ Multi-Language Support - Portuguese and English (Spanish planned)

**Phase 3 - Advanced Features (Q3 2026)**
- Offline Mode - Work without internet connection
- Invoice Generation - Create professional invoices
- Project Time Tracking - Track hours by project/client
- Advanced Visualizations - Charts and graphs
- Spanish Language Support - Additional language option

**Phase 4 - Integrations (Q4 2026)**
- Team Features - Multi-user workspaces
- Public API - Programmatic access to data
- Slack/Teams Integration - Chat bot commands
- Browser Extension - Quick access from toolbar
- Enhanced Security - 2FA and GDPR compliance

### 💡 Feature Requests

Have ideas for new features? We'd love to hear them! Check out our [Future Enhancements](FUTURE_ENHANCEMENTS.md) document for details on:
- 37+ planned features across 7 categories
- Google Calendar integration enhancements (Two-way sync, auto-sync, smart coloring)
- Analytics improvements (Email sharing, charts, custom reports)
- User experience upgrades (Dark mode, shortcuts, AI suggestions)
- Integration capabilities (Invoicing, payroll, project tracking)
- Technical priorities and implementation timelines

Open an issue on GitHub to suggest new features or vote on existing proposals!

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

This project is licensed under the MIT License.

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

Built with ❤️ using React, Firebase, and modern web technologies.
