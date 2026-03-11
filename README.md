# Clock In App

A comprehensive time tracking application for managing work hours, overtime, meal expenses, GPS location tracking, and weekend work. Built with React and Firebase, featuring real-time tracking, interactive mini-maps, detailed analytics, cumulative finance charts, AI-powered compliance analysis, enterprise team management, and Google Calendar integration.

## Features

### 🕐 Time Tracking
- **Real-time Clock In/Out** - Track work sessions with live timer display
- **Active Session Card** - Real-time session tracking while clocked in with editable details (lunch, dinner, location, notes) that auto-save
- **GPS Location Tracking** - Auto-capture GPS coordinates on clock-in/out with reverse geocoding to street addresses
- **Interactive Mini-Maps** - Leaflet/OpenStreetMap maps showing clock-in (green marker) and clock-out (red marker) locations in session details, session list, and active session card
- **Manual GPS Capture** - "Use my location" button in session creator and active session card for on-demand position capture
- **Cross-Device Sync** - Active sessions and data sync in real-time across all devices
- **Resume Past Midnight** - Tap "Resume" on an ongoing session to continue past midnight without auto clock-out
- **Manual Session Creation** - Add historical sessions with custom times and GPS locations
- **Session Editing** - Modify existing sessions with full details and location maps
- **Automatic Calculations** - Real-time computation of regular hours, unpaid overtime, and paid overtime
- **Lunch Break Management** - Customizable lunch duration with flexible hour/minute input (inline fields for compact UI)
- **Weekend Detection** - Automatically identifies Saturday/Sunday sessions with automatic benefits application

### 📊 Analytics & Reporting *(Basic plan or higher)*
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
  - Record overwork usage with reasons and custom usage dates
  - Edit existing usage entries (reason and date) inline
  - View remaining balance
  - Historical usage tracking sorted by usage date
- **CSV Export** - Download detailed reports with all session data
- **Search & Filter** - Find specific sessions by date, notes, or criteria (weekend, meals, overtime)

### 💰 Expense Tracking
- **Lunch Expenses** - Track meal costs per session (€)
- **Dinner Expenses** - Record dinner costs when working late (€)
- **Consolidated View** - Combined meal expenses in analytics
- **CSV Export** - Separate columns for lunch, dinner, and total expenses

### 💵 Finance & Tax Calculator *(Basic plan or higher)*
- **Income Calculations** - Gross income, net income, and tax calculations based on work sessions
- **Customizable Rates** - Configure hourly rate, IHT, overtime multipliers, meal subsidies, and bonuses
- **Tax Support** - IRS, Social Security, and custom tax rates with separate rates for base salary, IHT, and overtime
- **Cumulative Year-to-Date Charts** - Interactive line charts showing gross income, net income, and taxes with monthly granularity
- **Multiple Report Types** - Daily, weekly, monthly, and yearly financial summaries
- **Portuguese Tax System** - Built for Portuguese labor law with proper IRS and Social Security calculation rules

### 🎯 Weekend Work Benefits
- **Days Off Calculation** - Configure days off earned per weekend work day
- **Weekend Bonus** - Set compensation amount for weekend work (€)
- **Automatic Application** - Benefits automatically applied to Saturday/Sunday sessions
- **Analytics Dashboard** - Track total days off earned and bonus accumulated

### 📅 Google Calendar Integration *(Basic plan or higher)*
- **Two-Way Sync** - Automatic sync of work sessions to Google Calendar
- **Placeholder Events** - Creates calendar events immediately on clock-in (red/in-progress status)
- **Auto-Update Events** - Updates placeholder events on clock-out with final session details
- **Sync Status Indicator** - Visual indicator in header showing connection status and remaining token time
- **Manual Sync** - Click the cloud icon to manually sync pending/failed sessions
- **Token Management** - Automatic token refresh with expiration warnings
- **Cross-Device Auth Sync** - Calendar authorization syncs across all devices via Firestore
- **Detailed Event Information** - Includes clock in/out times, hours breakdown, and session notes
- **Timezone Support** - Events use browser's local timezone for accurate display

### ⚙️ Customizable Settings *(Basic plan or higher)*
- **Profile**:
  - Username/Alias - Set display name with @ prefix (shown in header instead of email)
  - Profile Picture - Upload avatar (JPEG, PNG, GIF, WebP, max 2MB) displayed in header with rotating purple border
- **GPS Location**:
  - Auto-capture GPS toggle - Enable/disable automatic location capture on clock-in/out
  - Location data stored securely with each session
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

### 🏢 Enterprise Plan (€199/month)
- **Team Management** - Create organization, invite members by email, manage roles (admin/member)
- **Premium AI for Members** - Up to 10 team members automatically get Premium AI access (75 AI calls/month each)
- **225 AI Calls/Month** - Enterprise admins get 150 additional AI calls (225 total)
- **Centralized Dashboard** - Monitor all members' sessions, analytics, and finance from a single view
- **Team Warnings System** - Automatic alerts for Isenção limits (90%), weekly hours (35h+), and annual overtime caps
- **Overwork Details** - Visual bar charts comparing each member's overtime and Isenção hours
- **Per-Member Analytics & Finance** - Detailed reports and CSV exports per team member
- **Member Finance Settings (Read-Only)** - View each member's Segurança Social, IRS/IHT rates, and other finance options; warns when settings look incorrect
- **Member Overwork Usage Cards** - Total accumulated, used, days off earned, and remaining balance per member (matches Analytics view)
- **GPS Location Tracking** - View member clock-in/out locations on interactive maps per session
- **Google Calendar Events** - Collapsible calendar section with daily/weekly/monthly event views
- **Member Profile Pictures** - Team member avatars displayed in member list and detail views
- **In-App Invite Flow** - Seamless invitation and acceptance workflow

### 💎 Subscription Plans
- **Free** – Clock in/out from the Home page (session history + FAQ/About + Premium+). Calendar, Analytics, Finance, Settings, and Google Calendar sync require an upgrade.
- **Basic (€0.99/month)** – Unlock Calendar view/import, Analytics dashboards with CSV exports, Finance calculators, and full Settings (including Google Calendar integration).
- **Pro (€4.99/month)** – Includes everything in Basic, plus priority support, custom date ranges, and the ability to purchase AI call packs for ad-hoc AI Advisor access.
- **Premium AI (€9.99/month)** – All Pro features + AI Advisor with Portuguese labor law expertise:
  - 75 AI calls/month base allocation
  - Portuguese labor law compliance analysis
  - Legal limit calculations (overtime, Isenção, vacation)
  - HR best practices & work-life balance guidance
  - Compliance monitoring & proactive alerts
  - Buy additional call packs as needed (+50 calls for €4.99, never expire)

### 🔄 Plan Switching & Billing
- **Stripe Webhook Fulfillment** - When a user completes payment via Stripe Payment Links, a webhook (`checkout.session.completed`) automatically updates Firestore:
  - **Plans (Basic, Pro, Premium AI, Enterprise)** - `userSettings.subscriptionPlan` is set immediately after purchase
  - **Call Packs** - Purchased packs are added to `aiUsage.callPacks` server-side
- Each Payment Link must have metadata configured in Stripe Dashboard (`plan: basic|pro|premium_ai|enterprise` or `type: call_pack`)
- Switching plans automatically cancels the previous Stripe subscription (handled by server-side Stripe webhooks) to prevent double billing
- If you use customer-managed plan changes (Stripe Customer Portal), the same cancellation workflow keeps Stripe and Firestore in sync

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
- **Profile Pictures** - Upload and display avatar in header with animated purple border
- **Real-time Profile Sync** - Username and profile picture sync across all devices
- **Dynamic Login Page** - Admin-managed background image slideshow with scroll animations and clickable links

## Technology Stack

### Frontend
- **React 18** - UI library with hooks and modern performance optimizations
- **Vite** - Fast build tool and dev server with code splitting
- **CSS3** - Custom styling with CSS variables for theming
- **react-i18next** - Internationalization framework for multi-language support
- **i18next** - Core internationalization library with language detection
- **date-fns** - Date manipulation and formatting with locale support
- **Recharts** - Composable charting library for finance and analytics charts
- **Leaflet & React-Leaflet** - Interactive maps for GPS location display with OpenStreetMap tiles
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
- **Firebase Storage** - Profile picture and login image storage
- **Real-time Sync** - Live data updates across devices

### Integrations
- **Google Calendar API** - Calendar event creation and sync
- **Google Identity Services** - OAuth 2.0 authentication
- **OpenRouter API** - Multi-model AI routing for AI Advisor (powered by OpenRouter)
- **OpenStreetMap Nominatim** - Reverse geocoding for GPS coordinates to street addresses
- **Stripe** - Payment processing for subscription plans and call packs

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
   - GPS location is auto-captured (if enabled in Settings)
   - Active Session Card appears in sessions list (orange/amber themed)
   - Add session details while working (lunch, dinner, location, notes) - auto-saves
   - Mini-map shows your clock-in location
   - Current time breakdown displays in real-time

3. **Clock Out**
   - Click the "CLOCK OUT" button when finished
   - GPS location is auto-captured for clock-out
   - All details from Active Session Card are automatically included
   - Session is saved with all previously entered details and GPS coordinates
   - Mini-map updates to show both clock-in and clock-out markers
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
5. Upload a profile picture (JPEG, PNG, GIF, WebP, max 2MB) - displayed in header with animated purple border

#### Configure GPS Location
1. In "GPS Location" section, toggle auto-capture on/off
2. When enabled, GPS coordinates are automatically captured on clock-in and clock-out
3. Use the "Use my location" button in session creator or active session for manual capture
4. GPS data includes coordinates and a reverse-geocoded street address

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
- **Enable GPS** - Keep auto-capture on for automatic location records
- **Use Notes** - Add project/client info for better tracking
- **Weekly Reviews** - Check analytics weekly to monitor hours
- **Export Regularly** - Download CSV reports for records
- **Weekend Planning** - Review earned days off before scheduling
- **Lunch Customization** - Adjust duration per session as needed
- **Overwork Management** - Track and use accumulated hours strategically
- **Profile Picture** - Upload a photo for easy identification in Enterprise teams

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
- `clockInCoords`: object (optional, GPS location on clock-in)
  - `lat`: number
  - `lng`: number
  - `address`: string (reverse geocoded)
- `clockOutCoords`: object (optional, GPS location on clock-out)
  - `lat`: number
  - `lng`: number
  - `address`: string (reverse geocoded)
- `calendarEventId`: string (optional, Google Calendar event ID)
- `calendarSyncStatus`: string ('synced' | 'not_synced' | 'failed')
- `lastSyncAt`: timestamp (optional)

**activeClockIns** - Active clock-in sessions
- `userId`: string
- `userEmail`: string
- `clockInTime`: timestamp (UTC)
- `clockInCoords`: object (optional, GPS location on clock-in)
  - `lat`: number
  - `lng`: number
  - `address`: string
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
- `profilePicture`: string (optional, URL to profile picture in Firebase Storage)
- `gpsAutoCapture`: boolean (default: true, auto-capture GPS on clock-in/out)
- `subscriptionPlan`: string ('free' | 'basic' | 'pro' | 'premium_ai' | 'enterprise')
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
- `enterpriseId`: string (optional, null) - Enterprise org id when user is in an organization
- `enterpriseRole`: string ('admin' | 'member') - Role within the enterprise (admin = creator)
- `financeSettings`: object (optional, Finance calculation settings)
  - `hourlyRate`: number - Base hourly rate (€)
  - `isencaoRate`: number - Isenção rate as percentage of hourly rate (%), e.g., 25 for 25% (used when calculationMethod is 'percentage')
  - `isencaoCalculationMethod`: string - 'percentage' | 'fixed' (default: 'percentage') - Method for calculating IHT
  - `isencaoFixedAmount`: number - Fixed monthly IHT amount (€) when calculationMethod is 'fixed'
  - `taxDeductionType`: string - 'irs', 'social_security', 'custom', 'both'
  - `irsRate`: number - IRS percentage (0-100) - Legacy: single rate used if separate rates are not set
  - `irsBaseSalaryRate`: number - IRS percentage on base salary only (0-100)
  - `irsIhtRate`: number - IRS percentage on IHT earnings only (0-100)
  - `irsOvertimeRate`: number - IRS percentage on overtime earnings only (0-100)
  - `socialSecurityRate`: number - Social Security percentage (typically 11%)
  - `customTaxRate`: number - Custom tax percentage (0-100)
  - `mealAllowanceIncluded`: boolean - Include meal allowances in calculations
  - `overtimeFirstHourRate`: number - Overtime first hour multiplier (default: 1.25 = 125%)
  - `overtimeSubsequentRate`: number - Overtime subsequent hours multiplier (default: 1.50 = 150%)
  - `weekendOvertimeRate`: number - Weekend overtime multiplier (default: 1.50 = 150%)
  - `holidayOvertimeRate`: number - Holiday overtime multiplier (default: 2.00 = 200%)
  - `fixedBonus`: number - Fixed monthly/periodic bonus amount (€), also known as "Ajudas de Custo"
  - `dailyMealSubsidy`: number - Fixed daily meal subsidy amount (€), "Subsídio de Alimentação" for contracted workers
  - `mealCardDeduction`: number - Meal card deduction amount (€) - deducted from gross salary (typically offsets meal subsidy)
  
  **Important Tax Calculation Notes:**
  - Social Security is calculated on **Base Salary + IHT only** (excludes meal subsidy, bonus, overtime)
  - IRS can have separate rates for base salary, IHT, and overtime (more accurate to Portuguese tax system)
  - If separate IRS rates are not set, the legacy `irsRate` is used as a single rate on total gross
  - Meal card deduction is subtracted from gross salary separately (does not affect Social Security base)

**overworkDeductions** - Overwork usage tracking
- `userId`: string
- `hours`: number
- `reason`: string
- `usageDate`: string (yyyy-MM-dd, user-specified date of usage)
- `timestamp`: number
- `createdAt`: string (ISO date)

**enterprises** - Enterprise organizations (Enterprise plan)
- `id`: string (document id)
- `name`: string
- `createdAt`: timestamp
- `createdBy`: string (admin user id)

**enterpriseInvites** - Pending/accepted/declined invites
- `enterpriseId`: string
- `email`: string (lowercase)
- `invitedBy`: string (admin user id)
- `invitedAt`: timestamp
- `status`: 'pending' | 'accepted' | 'declined'

**loginImages** - Admin-managed background images for login page
- `fileName`: string
- `url`: string (Firebase Storage download URL)
- `order`: number (display order)
- `linkUrl`: string (optional, clickable URL)
- `createdAt`: timestamp

**planConfig** - Admin-configurable subscription settings
- `basic`, `pro`, `premium_ai`, `enterprise`: objects
  - `price`: number
  - `paymentLink`: string (Stripe payment link URL)
  - `features`: array of strings
- `callPack`: object
  - `paymentLink`: string
  - `packSize`: number (default: 50)

**Firestore indexes for Enterprise:** `enterpriseInvites` composite (email + status, enterpriseId + status). See [firestore.indexes.json](firestore.indexes.json). `userSettings.enterpriseId` is single-field; use **Indexes → Single field** only if Firebase prompts for it.

**Firestore security rules:** See [firestore.rules](firestore.rules) for Enterprise-aware rules. **Deploy rules and indexes:** follow **[DEPLOY_FIRESTORE.md](DEPLOY_FIRESTORE.md)** (Firebase Console or Firebase CLI).

## Future Development

This app is actively maintained with regular updates and new features. For a comprehensive list of planned enhancements, see **[FUTURE_ENHANCEMENTS.md](FUTURE_ENHANCEMENTS.md)**.

### 🚀 Recent Updates (2026)

**Enterprise & Clock-In Improvements (February 2026)**
- ✅ **Member Finance Settings (Read-Only)** - Enterprise managers see each member's financial options (Segurança Social, IHT, IRS rates) with misconfiguration warnings
- ✅ **Member Overwork Usage Cards** - Enterprise member Overwork tab now shows accumulated, used, days off, and remaining (Analytics-style cards)
- ✅ **Resume Session Past Midnight** - When you tap "Resume" on an ongoing session to continue past midnight, the app no longer auto-clocks you out
- ✅ **Plan Features Translation** - Admin-editable plan features use translation keys for EN/PT support; "Reset to defaults" in Admin Subscriptions

**GPS Location Tracking & Mini-Maps (February 2026)**
- ✅ **Auto-Capture GPS on Clock-In/Out** - Automatic position recording with configurable toggle in Settings
- ✅ **Interactive Leaflet Mini-Maps** - Clock-in (green) and clock-out (red) markers displayed in session details, session list, active session card, and Enterprise member sessions
- ✅ **Reverse Geocoding** - GPS coordinates automatically converted to readable street addresses via OpenStreetMap Nominatim
- ✅ **Manual Location Capture** - "Use my location" button in session creator and active session card
- ✅ **Enterprise GPS Oversight** - Per-session map toggle in Enterprise member sessions table for team location verification

**Profile Pictures & UI Enhancements (February 2026)**
- ✅ **Profile Picture Upload** - Upload avatar in Settings with display in header (rotating purple border) and Enterprise team views
- ✅ **Dynamic Login Page** - Admin-managed background image slideshow with scroll-driven animations and clickable links
- ✅ **Dark-Themed Scrollbars** - Global dark grey scrollbar styling matching the app theme
- ✅ **Login Image Management** - Admin interface for uploading, reordering, deleting, and linking background images

**Enterprise Enhancements (February 2026)**
- ✅ **GPS Location Maps** - Toggle interactive maps per session in member sessions table
- ✅ **Google Calendar Events Section** - Collapsible calendar events with daily/weekly/monthly views and navigation
- ✅ **Member Profile Pictures** - Team member avatars in members list and detail header
- ✅ **Team Finance Charts** - Wage cost summaries and analytics per member

**Finance & Analytics Improvements (February 2026)**
- ✅ **Cumulative Finance Charts** - Year-to-date income, net pay, and tax trends with monthly granularity
- ✅ **Overwork Usage Dates** - Specify custom usage dates when recording overwork deductions
- ✅ **Inline Overwork Editing** - Edit reason and date of existing overwork usage entries
- ✅ **Admin Subscriptions** - Configurable payment links and call pack settings in admin dashboard
- ✅ **SEO & Indexing** - Canonical tags, robots.txt, sitemap.xml, and Vercel routing fixes

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

**Performance Optimizations (January 2026)**
- ✅ **Eliminated Async Waterfalls** - Parallel data loading for 50-70% faster page loads
- ✅ **Code Splitting** - Route-based lazy loading reduces initial bundle size by 20-30%
- ✅ **Re-render Optimization** - Memoization and optimized components for 20-40% better runtime performance
- ✅ **Smart Caching** - Request deduplication prevents duplicate API calls
- ✅ **Error Boundaries** - Graceful error handling with user-friendly recovery

### 🚀 Upcoming Features (2026 Roadmap)

**Phase 1 - Critical Improvements (Q1 2026)**
- ✅ Data Backup & Export - Full backup and restore capabilities
- ✅ Session Validation - Prevent overlapping sessions and data errors
- ✅ Two-Way Calendar Sync - Export to Google Calendar (import planned)
- ✅ GPS Location Tracking - Auto-capture with interactive mini-maps
- ✅ Profile Pictures - Upload and display across the app
- ✅ Enterprise GPS & Calendar - Team location oversight and calendar events
- ⏳ Email Report Sharing - Send reports directly to email
- ⏳ Progressive Web App - Install on mobile devices

**Phase 2 - User Experience (Q2 2026)**
- Dashboard Customization - Personalized widget layouts
- Keyboard Shortcuts - Quick actions and navigation
- Onboarding Tutorial - Interactive first-time experience
- Time Zone Support - Multi-timezone tracking
- ✅ Auto-Sync Calendar - Automatic calendar event creation
- ✅ Multi-Language Support - Portuguese and English (Spanish planned)
- ✅ Advanced Visualizations - Cumulative finance charts and analytics

**Phase 3 - Advanced Features (Q3 2026)**
- Offline Mode - Work without internet connection
- Invoice Generation - Create professional invoices
- Project Time Tracking - Track hours by project/client
- Spanish Language Support - Additional language option

**Phase 4 - Integrations (Q4 2026)**
- ✅ Team Features - Enterprise plan with multi-user management
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

For issues, questions, or feature requests, please open an issue on GitHub or contact us at contacto@clock-in.pt.

---

Built with ❤️ using React, Firebase, Leaflet, and modern web technologies.
