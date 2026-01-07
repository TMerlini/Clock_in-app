# Clock In App - Setup Instructions

## Firebase Setup

Before you can use the app, you need to configure Firebase:

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter your project name (e.g., "clock-in-app")
4. Follow the setup wizard (you can disable Google Analytics if you want)

### 2. Enable Google Authentication

1. In your Firebase project, go to **Authentication** in the left sidebar
2. Click on the **Sign-in method** tab
3. Click on **Google** in the providers list
4. Toggle **Enable**
5. Enter a support email (your email)
6. Click **Save**

### 3. Create Firestore Database

1. In your Firebase project, go to **Firestore Database** in the left sidebar
2. Click **Create database**
3. Select **Start in test mode** (for development)
4. Choose your preferred location
5. Click **Enable**

**Important:** For production, you'll need to update the Firestore Security Rules. Here are recommended rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sessions/{sessionId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

### 4. Get Your Firebase Config

1. In your Firebase project, click the **gear icon** (⚙️) next to "Project Overview"
2. Select **Project settings**
3. Scroll down to **Your apps** section
4. Click on the **Web** icon (`</>`) to add a web app
5. Register your app with a nickname (e.g., "Clock In Web App")
6. Copy the `firebaseConfig` object that appears

### 5. Update Your App Configuration

1. Open `src/lib/firebase.js` in your code editor
2. Replace the placeholder config with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "YOUR_ACTUAL_AUTH_DOMAIN",
  projectId: "YOUR_ACTUAL_PROJECT_ID",
  storageBucket: "YOUR_ACTUAL_STORAGE_BUCKET",
  messagingSenderId: "YOUR_ACTUAL_MESSAGING_SENDER_ID",
  appId: "YOUR_ACTUAL_APP_ID"
};
```

### 6. Run the App

The development server should already be running. If not, run:

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:5173`

## Features

- **Google Sign-In**: Secure authentication with Google accounts
- **Dark Theme**: Modern shadcn-inspired dark UI
- **Large Clock Button**: Easy-to-use 264px circular button for clocking in/out
- **Real-time Timer**: Live timer showing elapsed time
- **Time Categorization**:
  - 0-8 hours: Regular working hours (green)
  - 8-10 hours: Extra unpaid time (orange)
  - 10+ hours: Extra paid overtime (blue)
- **Calendar View**: Select any date to view sessions
- **Session History**: All sessions are stored per user in Firebase
- **Highlighted Dates**: Calendar shows which dates have recorded sessions

## Troubleshooting

### "Firebase configuration not found" error
Make sure you've updated `src/lib/firebase.js` with your actual Firebase config.

### Google Sign-In doesn't work
1. Make sure Google authentication is enabled in Firebase Console
2. Check that your Firebase config is correct
3. Ensure you're accessing the app via `localhost` (not 127.0.0.1)

### Sessions not saving
1. Make sure Firestore is created and enabled
2. Check browser console for errors
3. Verify Firestore security rules allow writes for authenticated users

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   │   ├── button.jsx
│   │   ├── card.jsx
│   │   └── calendar.jsx
│   ├── Login.jsx        # Login page with Google sign-in
│   └── ClockInApp.jsx   # Main app component
├── lib/
│   ├── firebase.js      # Firebase configuration
│   └── utils.js         # Utility functions
├── App.jsx              # Root component with auth state
└── index.css            # Global styles with Tailwind
```

## Technologies Used

- **React 18** - UI framework
- **Vite** - Build tool
- **Firebase** - Authentication & database
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **react-day-picker** - Calendar component
- **date-fns** - Date utilities
- **lucide-react** - Icons
