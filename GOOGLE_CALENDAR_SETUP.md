# Google Calendar Auto-Sync Setup Guide

This guide will help you set up automatic Google Calendar synchronization for the Clock In App.

## Overview

Once configured, the app will automatically create Google Calendar events whenever you clock out, eliminating the need to manually sync sessions.

## Prerequisites

- A Google account
- Access to Google Cloud Console

## Step-by-Step Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "Clock In App")
5. Click "Create"

### 2. Enable Google Calendar API

1. In your new project, go to "APIs & Services" > "Library"
2. Search for "Google Calendar API"
3. Click on it and press "Enable"

### 3. Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" (unless you have a Google Workspace account)
3. Click "Create"
4. Fill in the required fields:
   - **App name**: Clock In App
   - **User support email**: Your email
   - **Developer contact email**: Your email
5. Click "Save and Continue"
6. On the "Scopes" page, click "Save and Continue" (we'll add scopes via code)
7. On the "Test users" page, add your email address (while the app is in testing mode)
8. Click "Save and Continue"

### 4. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application"
4. Enter a name (e.g., "Clock In App Web Client")
5. Under "Authorized JavaScript origins", add:
   - `http://localhost:5177` (for development)
   - Your production URL (e.g., `https://your-app.com`)
6. Under "Authorized redirect URIs", add:
   - `http://localhost:5177` (for development)
   - Your production URL (e.g., `https://your-app.com`)
7. Click "Create"
8. **IMPORTANT**: Copy the "Client ID" that appears - you'll need this!

### 5. (Optional) Create an API Key

1. Still in "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API key"
3. Copy the API key
4. (Recommended) Click "Restrict Key" and:
   - Under "API restrictions", select "Restrict key"
   - Select only "Google Calendar API"
   - Save

### 6. Update the App Configuration

1. Open the file: `src/lib/googleConfig.js`
2. Replace `YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com` with your actual Client ID
3. (Optional) Replace `YOUR_GOOGLE_API_KEY_HERE` with your API key
4. Save the file

Example:
```javascript
export const GOOGLE_CLIENT_ID = '123456789-abc123def456.apps.googleusercontent.com';
export const GOOGLE_API_KEY = 'AIzaSyABC123DEF456GHI789';
```

### 7. Restart the Development Server

1. Stop the current dev server (Ctrl+C)
2. Run `npm run dev` again
3. Open the app in your browser

### 8. Authorize Calendar Access

1. Go to Settings page in the app
2. Scroll to "Google Calendar Integration"
3. Click "Enable Calendar Auto-Sync"
4. A Google sign-in popup will appear
5. Select your Google account
6. Review and allow the requested permissions
7. You should see "Auto-sync enabled" ✓

## How It Works

Once authorized:
- Every time you clock out, a calendar event is automatically created
- The event includes:
  - Work session duration
  - Regular hours, Isenção (unpaid), and Overwork (paid) breakdown
  - Any notes you added to the session
- Events appear in your primary Google Calendar
- If calendar sync fails, it won't affect your time tracking (sessions are still saved)

## Publishing Your App (Optional)

If you want to move beyond "Testing" mode:

1. In OAuth consent screen, click "Publish App"
2. Submit for verification (required if you want other users)
3. This process can take several days/weeks

For personal use, "Testing" mode is sufficient (you can add up to 100 test users).

## Troubleshooting

### "Invalid Client ID" Error
- Double-check the Client ID in `googleConfig.js`
- Make sure there are no extra spaces or quotes
- Verify the Client ID matches exactly what's in Google Cloud Console

### "Redirect URI Mismatch" Error
- Make sure `http://localhost:5177` is in "Authorized redirect URIs"
- The URL must match exactly (including http vs https, port number, etc.)

### Calendar Events Not Creating
- Check browser console for errors (F12 > Console tab)
- Verify you clicked "Enable Calendar Auto-Sync" in Settings
- Try disconnecting and reconnecting

### "Access Blocked" Error
- Make sure you added your email as a test user in OAuth consent screen
- The app must be in "Testing" mode or published

## Security Notes

- Never commit your `googleConfig.js` file with real credentials to a public repository
- For production, use environment variables instead of hardcoded values
- The access token is stored in browser localStorage (consider moving to more secure storage for production)

## Need Help?

If you encounter issues:
1. Check the browser console for detailed error messages
2. Verify all steps were completed exactly as described
3. Try clearing browser cache and localStorage
4. Make sure pop-ups are not blocked by your browser
