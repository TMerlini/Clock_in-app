# Clock In App

A comprehensive time tracking application for managing work hours, overtime, meal expenses, and weekend work. Built with React and Firebase, featuring real-time tracking, detailed analytics, and Google Calendar integration.

## Features

### 🕐 Time Tracking
- **Real-time Clock In/Out** - Track work sessions with live timer display
- **Manual Session Creation** - Add historical sessions with custom times
- **Session Editing** - Modify existing sessions with full details
- **Automatic Calculations** - Real-time computation of regular hours, unpaid overtime, and paid overtime
- **Lunch Break Management** - Customizable lunch duration with flexible hour/minute input
- **Weekend Detection** - Automatically identifies Saturday/Sunday sessions

### 📊 Analytics & Reporting
- **Multiple Report Types** - Daily, Weekly, Monthly, and Yearly views
- **Interactive Calendar** - Visual indicator of days with sessions
- **Detailed Statistics Cards**:
  - Total working hours
  - Regular hours (up to 8h)
  - Unpaid overtime (8-10h range, "Isenção")
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
- **One-Click Sync** - Export work sessions to Google Calendar
- **Detailed Event Information** - Includes clock in/out times, hours breakdown
- **Location Support** - Add location when creating calendar events (done in Google Calendar)

### ⚙️ Customizable Settings
- **Hour Thresholds**:
  - Regular hours limit (default: 8h)
  - Paid overtime threshold (default: 10h)
- **Break Settings**:
  - Default lunch duration (hours and minutes)
- **Calendar Settings**:
  - Week start day (Sunday or Monday)
- **Weekend Work Defaults**:
  - Days off per weekend work day
  - Weekend bonus amount (€)

### 🔐 Authentication
- **Firebase Authentication** - Secure user authentication
- **Google Sign-In** - Easy login with Google account
- **User-specific Data** - Each user's data is private and isolated

## Technology Stack

### Frontend
- **React 18** - UI library with hooks
- **Vite** - Fast build tool and dev server
- **CSS3** - Custom styling with CSS variables for theming
- **date-fns** - Date manipulation and formatting
- **react-day-picker** - Interactive calendar component
- **lucide-react** - Modern icon library

### Backend & Database
- **Firebase Authentication** - User authentication and management
- **Firebase Firestore** - NoSQL cloud database
- **Real-time Sync** - Live data updates across devices

### Integrations
- **Google Calendar API** - Calendar event creation
- **Google Identity Services** - OAuth 2.0 authentication

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
   - Current time breakdown displays in real-time

3. **Clock Out**
   - Click the "CLOCK OUT" button when finished
   - Select lunch options if applicable:
     - Check "Lunch time" checkbox
     - Enter custom duration (hours and minutes)
     - Add lunch expense amount (€)
   - Select dinner options if applicable:
     - Check "Had dinner" checkbox
     - Add dinner expense amount (€)
   - Add optional notes about the session
   - Click "Clock Out" to save

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

#### Sync to Google Calendar
1. Click the Google Calendar icon on any session
2. Review session details in the modal
3. Click "Open Google Calendar"
4. Add location and save the event in Google Calendar

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
3. Set "Paid Overtime Threshold" (e.g., 10 hours)
4. Hours between these values count as unpaid overtime ("Isenção")

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

#### Save Settings
1. Click "Save Settings" button
2. Changes apply to new sessions immediately
3. Existing sessions remain unchanged

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

**userSettings** - User preferences
- `regularHoursThreshold`: number
- `overtimeThreshold`: number
- `lunchDuration`: number (decimal hours)
- `weekStartDay`: string ('monday' | 'sunday')
- `weekendDaysOff`: number
- `weekendBonus`: number

**sessions** - Work sessions
- `userId`: string
- `userEmail`: string
- `clockIn`: timestamp
- `clockOut`: timestamp
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
- `notes`: string (optional)

**overworkDeductions** - Overwork usage tracking
- `userId`: string
- `hours`: number
- `reason`: string
- `timestamp`: number
- `createdAt`: string (ISO date)

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

This project is licensed under the MIT License.

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

Built with ❤️ using React, Firebase, and modern web technologies.
