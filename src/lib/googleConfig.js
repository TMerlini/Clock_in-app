// Google OAuth Configuration
// You need to set up a Google Cloud Project and get these credentials
// See GOOGLE_CALENDAR_SETUP.md for detailed instructions

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com';

// Scopes required for calendar access
// calendar.events - Read/write access to calendar events
// calendar.calendarlist.readonly - Read-only access to calendar list (for shared calendars)
export const CALENDAR_SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.calendarlist.readonly';

// API Key (optional, but recommended for better performance)
export const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || 'YOUR_GOOGLE_API_KEY_HERE';
