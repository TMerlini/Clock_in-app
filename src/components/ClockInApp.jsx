import { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { signOut } from 'firebase/auth';
import { collection, addDoc, query, where, getDocs, orderBy, doc, setDoc, deleteDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import i18n from '../lib/i18n';
import { useTranslation } from 'react-i18next';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
import { useSubscriptionPlan } from '../hooks/useSubscriptionPlan';
import { Navigation } from './Navigation';
import { PlanGate } from './PlanGate';
import { About } from './About';
import { FAQ } from './FAQ';
import { Calendar } from './ui/calendar';
import { GoogleCalendarSync } from './GoogleCalendarSync';
import { SyncOnVisitModal } from './SyncOnVisitModal';
import { ActiveSessionCard } from './ActiveSessionCard';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { hasUnsyncedSessions, syncUnsyncedSessions } from '../lib/syncCalendarSessions';
import { EnterpriseInviteBanner } from './EnterpriseInviteBanner';
import { Loader } from './Loader';
import { ErrorBoundary } from './ErrorBoundary';
import { HomePage } from './HomePage';
import { DatePickerSection } from './DatePickerSection';
import { SessionList } from './SessionList';

// Lazy load route components for code splitting
const Analytics = lazy(() => import('./Analytics').then(module => ({ default: module.Analytics })));
const Finance = lazy(() => import('./Finance').then(module => ({ default: module.Finance })));
const Settings = lazy(() => import('./Settings').then(module => ({ default: module.Settings })));
const AIAdvisor = lazy(() => import('./AIAdvisor').then(module => ({ default: module.AIAdvisor })));
const PremiumPlus = lazy(() => import('./PremiumPlus').then(module => ({ default: module.PremiumPlus })));
const CallPackPurchase = lazy(() => import('./CallPackPurchase').then(module => ({ default: module.CallPackPurchase })));
const Admin = lazy(() => import('./Admin').then(module => ({ default: module.Admin })));
const Enterprise = lazy(() => import('./Enterprise').then(module => ({ default: module.Enterprise })));
const CalendarImport = lazy(() => import('./CalendarImport').then(module => ({ default: module.CalendarImport })));
const CalendarView = lazy(() => import('./CalendarView').then(module => ({ default: module.CalendarView })));

// Lazy load modal components (will be loaded when needed)
const SessionEditor = lazy(() => import('./SessionEditor').then(module => ({ default: module.SessionEditor })));
const SessionCreator = lazy(() => import('./SessionCreator').then(module => ({ default: module.SessionCreator })));
const DeleteConfirmation = lazy(() => import('./DeleteConfirmation').then(module => ({ default: module.DeleteConfirmation })));
import { Clock, LogOut, User, Calendar as CalendarIcon, Edit2, AlertTriangle, CheckCircle, Info, Plus, Trash2, TrendingUp, DollarSign, Coffee, UtensilsCrossed } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { formatHoursMinutes, calculateUsedIsencaoHours } from '../lib/utils';
import 'react-day-picker/style.css';
import './ClockInApp.css';

// Google Calendar Icon Component
const GoogleCalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="-11.4 -19 98.8 114" width="18" height="18">
    <path fill="#fff" d="M58 18H18v40h40z"/>
    <path fill="#ea4335" d="M58 76l18-18H58z"/>
    <path fill="#fbbc04" d="M76 18H58v40h18z"/>
    <path fill="#34a853" d="M58 58H18v18h40z"/>
    <path fill="#188038" d="M0 58v12c0 3.315 2.685 6 6 6h12V58z"/>
    <path fill="#1967d2" d="M76 18V6c0-3.315-2.685-6-6-6H58v18z"/>
    <path fill="#4285f4" d="M58 0H6C2.685 0 0 2.685 0 6v52h18V18h40z"/>
    <path fill="#4285f4" d="M26.205 49.03c-1.495-1.01-2.53-2.485-3.095-4.435l3.47-1.43c.315 1.2.865 2.13 1.65 2.79.78.66 1.73.985 2.84.985 1.135 0 2.11-.345 2.925-1.035s1.225-1.57 1.225-2.635c0-1.09-.43-1.98-1.29-2.67-.86-.69-1.94-1.035-3.23-1.035h-2.005V36.13h1.8c1.11 0 2.045-.3 2.805-.9.76-.6 1.14-1.42 1.14-2.465 0-.93-.34-1.67-1.02-2.225-.68-.555-1.54-.835-2.585-.835-1.02 0-1.83.27-2.43.815a4.784 4.784 0 00-1.31 2.005l-3.435-1.43c.455-1.29 1.29-2.43 2.515-3.415 1.225-.985 2.79-1.48 4.69-1.48 1.405 0 2.67.27 3.79.815 1.12.545 2 1.3 2.635 2.26.635.965.95 2.045.95 3.245 0 1.225-.295 2.26-.885 3.11-.59.85-1.315 1.5-2.175 1.955v.205a6.605 6.605 0 012.79 2.175c.725.975 1.09 2.14 1.09 3.5 0 1.36-.345 2.575-1.035 3.64S36.38 49.01 35.17 49.62c-1.215.61-2.58.92-4.095.92-1.755.005-3.375-.5-4.87-1.51zM47.52 31.81l-3.81 2.755-1.905-2.89 6.835-4.93h2.62V50h-3.74z"/>
  </svg>
);

export function ClockInApp({ user }) {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState('home');
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sessionsForDate, setSessionsForDate] = useState([]);
  const [datesWithSessions, setDatesWithSessions] = useState(new Map());
  const [editingSession, setEditingSession] = useState(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [deletingSession, setDeletingSession] = useState(null);
  const [syncingSession, setSyncingSession] = useState(null);
  const [activeSessionDetails, setActiveSessionDetails] = useState(null);
  const [displayName, setDisplayName] = useState(null);
  const [showSyncOnVisitModal, setShowSyncOnVisitModal] = useState(false);
  const [syncOnVisitVariant, setSyncOnVisitVariant] = useState('not_connected');

  // Google Calendar integration
  const googleCalendar = useGoogleCalendar();
  const { plan } = useSubscriptionPlan();

  const isFreePlan = !plan || plan === 'free';

  // Memoize handlers passed to child components
  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const handleDisplayNameChange = useCallback((name) => {
    setDisplayName(name);
  }, []);

  const handleSessionUpdate = useCallback(async () => {
    await loadSessionsForDate(selectedDate);
    await loadSessionDates();
  }, [selectedDate]);

  const handleCloseEditor = useCallback(() => {
    setEditingSession(null);
  }, []);

  const handleCloseCreator = useCallback(() => {
    setCreatingSession(false);
  }, []);

  const handleCloseDeleter = useCallback(() => {
    setDeletingSession(null);
  }, []);

  const handleCloseSyncer = useCallback(() => {
    setSyncingSession(null);
  }, []);

  const handleSyncOnVisitSync = useCallback(() => {
    if (syncOnVisitVariant === 'not_connected') {
      googleCalendar.requestAuthorization();
    } else {
      syncUnsyncedSessions(googleCalendar);
    }
    setShowSyncOnVisitModal(false);
  }, [syncOnVisitVariant, googleCalendar]);

  const handleSyncOnVisitContinue = useCallback(() => {
    setShowSyncOnVisitModal(false);
  }, []);

  // Listen for active clock-in state from Firestore (real-time sync across devices)
  useEffect(() => {
    if (!user) return;

    const activeClockInRef = doc(db, 'activeClockIns', user.uid);

    const unsubscribe = onSnapshot(activeClockInRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const clockInTimestamp = data.clockInTime;
        const clockInDate = new Date(clockInTimestamp);
        const now = new Date();

        console.log('Active clock-in detected from Firestore:', new Date(clockInTimestamp));

        // Check if clock-in was on a different day (past midnight)
        if (clockInDate.getDate() !== now.getDate() ||
            clockInDate.getMonth() !== now.getMonth() ||
            clockInDate.getFullYear() !== now.getFullYear()) {

          // Auto clock-out at midnight
          const midnight = new Date(clockInDate);
          midnight.setHours(23, 59, 59, 999);
          const midnightTimestamp = midnight.getTime();

          console.log('Auto-clocking out at midnight for previous day session');
          await autoClockOut(clockInTimestamp, midnightTimestamp);

        } else {
          // Same day, restore/sync clock-in state
          console.log('Syncing clock-in state from Firestore');
          setClockInTime(clockInTimestamp);
          setIsClockedIn(true);
          // Load session details if they exist
          if (data.sessionDetails) {
            setActiveSessionDetails(data.sessionDetails);
          }
        }
      } else {
        // No active clock-in in Firestore
        console.log('No active clock-in found in Firestore');
        setIsClockedIn(false);
        setClockInTime(null);
        setActiveSessionDetails(null);
      }
    }, (error) => {
      console.error('Error listening to active clock-in:', error);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    let interval;
    if (isClockedIn) {
      interval = setInterval(() => {
        const now = Date.now();
        setCurrentTime(now);

        // Check if we've crossed midnight
        const clockInDate = new Date(clockInTime);
        const currentDate = new Date(now);

        if (clockInDate.getDate() !== currentDate.getDate() ||
            clockInDate.getMonth() !== currentDate.getMonth() ||
            clockInDate.getFullYear() !== currentDate.getFullYear()) {

          // Auto clock-out at midnight
          const midnight = new Date(clockInDate);
          midnight.setHours(23, 59, 59, 999);
          const midnightTimestamp = midnight.getTime();

          console.log('Midnight crossed - auto-clocking out');
          autoClockOut(clockInTime, midnightTimestamp);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isClockedIn, clockInTime]);

  useEffect(() => {
    loadSessionDates();
  }, [user]);

  // Show sync-on-visit modal when not synced (every page load). Skip for Free users (no Calendar access).
  useEffect(() => {
    if (!googleCalendar.isReady || !user || isFreePlan) return;

    // Delay to allow token to load from Firestore before checking isAuthorized
    const timer = setTimeout(async () => {
      if (!googleCalendar.isAuthorized) {
        setSyncOnVisitVariant('not_connected');
        setShowSyncOnVisitModal(true);
        return;
      }
      const hasUnsynced = await hasUnsyncedSessions(user.uid);
      if (hasUnsynced) {
        setSyncOnVisitVariant('unsynced_sessions');
        setShowSyncOnVisitModal(true);
      } else {
        setShowSyncOnVisitModal(false);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [googleCalendar.isReady, googleCalendar.isAuthorized, user, isFreePlan]);

  // Load user display name and language from settings
  useEffect(() => {
    if (!user) return;

    const settingsRef = doc(db, 'userSettings', user.uid);
    const unsubscribe = onSnapshot(settingsRef, async (docSnap) => {
      if (docSnap.exists()) {
        const settings = docSnap.data();
        if (settings.username) {
          setDisplayName(settings.username);
        } else {
          setDisplayName(null);
        }
        
        // Load language preference
        if (settings.language && i18n.language !== settings.language) {
          await i18n.changeLanguage(settings.language);
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    // Set up real-time listener for sessions
    const sessionsRef = collection(db, 'sessions');
    const q = query(
      sessionsRef,
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('Sessions updated via real-time listener');
      loadSessionsForDate(selectedDate);
      loadSessionDates();
    });

    return () => unsubscribe();
  }, [selectedDate, user]);

  const loadSessionDates = async () => {
    try {
      const sessionsRef = collection(db, 'sessions');
      const q = query(
        sessionsRef,
        where('userId', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);

      // Group sessions by date and calculate total working hours (excluding lunch)
      const dateHoursMap = new Map();
      querySnapshot.forEach((doc) => {
        const session = doc.data();
        const sessionDate = new Date(session.clockIn);
        const dateStr = format(sessionDate, 'yyyy-MM-dd');

        // Calculate working hours (total hours - lunch duration)
        const lunchDuration = session.lunchDuration || 0;
        const workingHours = session.totalHours - lunchDuration;

        // Sum working hours for this date
        const currentHours = dateHoursMap.get(dateStr) || 0;
        dateHoursMap.set(dateStr, currentHours + workingHours);
      });

      // Categorize each date based on total working hours
      const dateTypes = new Map();
      dateHoursMap.forEach((workingHours, dateStr) => {
        if (workingHours <= 8) {
          dateTypes.set(dateStr, 'regular');
        } else if (workingHours <= 10) {
          dateTypes.set(dateStr, 'isencao');
        } else {
          dateTypes.set(dateStr, 'overwork');
        }
      });

      console.log('Dates with sessions:', Array.from(dateTypes.entries()));
      setDatesWithSessions(dateTypes);
    } catch (error) {
      console.error('Error loading session dates:', error);
      console.error('Error details:', error.message);
    }
  };

  const loadSessionsForDate = async (date) => {
    try {
      // Validate date before using it
      if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        console.error('Invalid date provided to loadSessionsForDate:', date);
        setSessionsForDate([]);
        return;
      }

      const startDate = startOfDay(date);
      const endDate = endOfDay(date);

      console.log('Loading sessions for date range:', {
        start: new Date(startDate.getTime()),
        end: new Date(endDate.getTime())
      });

      const sessionsRef = collection(db, 'sessions');
      const q = query(
        sessionsRef,
        where('userId', '==', user.uid)
      );

      const querySnapshot = await getDocs(q);
      const sessions = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Filter by date on the client side
        if (data.clockIn >= startDate.getTime() && data.clockIn <= endDate.getTime()) {
          sessions.push({ id: doc.id, ...data });
        }
      });

      // Sort by clockIn descending
      sessions.sort((a, b) => b.clockIn - a.clockIn);

      console.log('Loaded sessions for this date:', sessions);
      setSessionsForDate(sessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
      console.error('Error details:', error.message);
      setSessionsForDate([]);
    }
  };

  const autoClockOut = async (clockInTimestamp, clockOutTimestamp) => {
    const totalHours = (clockOutTimestamp - clockInTimestamp) / (1000 * 60 * 60);

    console.log('Auto-clocking out:', {
      clockIn: new Date(clockInTimestamp),
      clockOut: new Date(clockOutTimestamp),
      totalHours
    });

    const newSession = {
      userId: user.uid,
      userEmail: user.email,
      clockIn: clockInTimestamp,
      clockOut: clockOutTimestamp,
      totalHours: totalHours,
      regularHours: Math.min(totalHours, 8),
      unpaidExtraHours: totalHours > 8 ? Math.min(totalHours - 8, 2) : 0,
      paidExtraHours: totalHours > 10 ? totalHours - 10 : 0,
    };

    try {
      console.log('Saving auto-clocked session to Firebase:', newSession);
      await addDoc(collection(db, 'sessions'), newSession);
      console.log('Auto-clocked session saved successfully');

      // Delete active clock-in from Firestore (syncs across all devices)
      const activeClockInRef = doc(db, 'activeClockIns', user.uid);
      await deleteDoc(activeClockInRef);
      console.log('Active clock-in deleted from Firestore');

      // State will be updated by the Firestore listener

      // Reload sessions
      await Promise.all([
        loadSessionDates(),
        loadSessionsForDate(selectedDate)
      ]);

      alert('You were automatically clocked out at midnight (23:59:59).');
    } catch (error) {
      console.error('Error saving auto-clocked session:', error);
      alert('Failed to auto clock-out: ' + error.message);
    }
  };

  const handleClockInOut = async () => {
    if (!isClockedIn) {
      const now = Date.now();
      console.log('Clocking in at:', new Date(now));
      console.log('Google Calendar status:', { 
        isReady: googleCalendar.isReady, 
        isAuthorized: googleCalendar.isAuthorized 
      });

      try {
        let calendarEventId = null;

        // Create placeholder calendar event if authorized
        if (googleCalendar.isAuthorized) {
          try {
            // Create placeholder event with estimated end time (8 hours from now)
            const estimatedEndTime = now + (8 * 60 * 60 * 1000);
            const placeholderEvent = await googleCalendar.createCalendarEvent({
              clockIn: now,
              clockOut: estimatedEndTime,
              regularHours: 0,
              unpaidHours: 0,
              paidHours: 0,
              notes: '',
              isPlaceholder: true
            });
            calendarEventId = placeholderEvent.id;
            console.log('Placeholder calendar event created:', calendarEventId);
          } catch (calendarError) {
            console.error('Failed to create placeholder calendar event:', calendarError);
            // Continue without calendar event
          }
        }

        // Save active clock-in to Firestore (syncs across all devices)
        const activeClockInRef = doc(db, 'activeClockIns', user.uid);
        await setDoc(activeClockInRef, {
          clockInTime: now,
          userId: user.uid,
          userEmail: user.email,
          createdAt: now,
          calendarEventId: calendarEventId // Store event ID for later update
        });
        console.log('Active clock-in saved to Firestore');

        // State will be updated by the Firestore listener
      } catch (error) {
        console.error('Error saving clock-in to Firestore:', error);
        alert('Failed to clock in: ' + error.message);
      }
    } else {
      const clockOutTime = Date.now();
      const totalHours = (clockOutTime - clockInTime) / (1000 * 60 * 60);

      console.log('Clocking out:', {
        clockIn: new Date(clockInTime),
        clockOut: new Date(clockOutTime),
        totalHours
      });

      // Check if clock-in was on a weekend (Saturday=6 or Sunday=0)
      const clockInDate = new Date(clockInTime);
      const dayOfWeek = clockInDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Load settings
      let weekendDaysOff = 1;
      let weekendBonus = 100;
      let annualIsencaoLimit = 200;
      let bankHolidayApplyDaysOff = true;
      let bankHolidayApplyBonus = true;
      try {
        const settingsRef = doc(db, 'userSettings', user.uid);
        const settingsDoc = await getDoc(settingsRef);
        if (settingsDoc.exists()) {
          const settings = settingsDoc.data();
          weekendDaysOff = settings.weekendDaysOff || 1;
          weekendBonus = settings.weekendBonus || 100;
          annualIsencaoLimit = settings.annualIsencaoLimit || 200;
          bankHolidayApplyDaysOff = settings.bankHolidayApplyDaysOff !== undefined ? settings.bankHolidayApplyDaysOff : true;
          bankHolidayApplyBonus = settings.bankHolidayApplyBonus !== undefined ? settings.bankHolidayApplyBonus : true;
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }

      // Load sessions for the calendar year to calculate used Isenção hours
      let usedIsencaoHours = 0;
      try {
        const sessionsRef = collection(db, 'sessions');
        const sessionsQuery = query(sessionsRef, where('userId', '==', user.uid));
        const sessionsSnapshot = await getDocs(sessionsQuery);
        const allSessions = [];
        sessionsSnapshot.forEach((docSnap) => {
          allSessions.push({ id: docSnap.id, ...docSnap.data() });
        });
        usedIsencaoHours = calculateUsedIsencaoHours(allSessions, clockInTime);
      } catch (error) {
        console.error('Error loading sessions for Isenção calculation:', error);
      }

      // Get session details from active session card (if any were set)
      const details = activeSessionDetails || {};
      const lunchDuration = details.includeLunchTime 
        ? (details.lunchHours || 0) + (details.lunchMinutes || 0) / 60 
        : 0;
      
      // Apply weekend settings from active session if set there
      const useWeekendFromDetails = details.isWeekend !== undefined ? details.isWeekend : isWeekend;
      const isBankHoliday = details.isBankHoliday || false;
      
      // Calculate working hours (excluding lunch)
      const workingHours = lunchDuration > 0 ? totalHours - lunchDuration : totalHours;
      
      // Calculate hours based on whether it's a special day (weekend or bank holiday)
      // On special days: no Isenção, overwork starts at 8 hours
      // On normal days: Isenção 8-10h, overwork >10h
      const isSpecialDay = useWeekendFromDetails || isBankHoliday;
      let regularHours, unpaidExtraHours, paidExtraHours;
      
      if (isSpecialDay) {
        regularHours = Math.min(workingHours, 8);
        unpaidExtraHours = 0; // No Isenção on weekends/bank holidays
        paidExtraHours = workingHours > 8 ? workingHours - 8 : 0; // Overwork starts at 8h
      } else {
        regularHours = Math.min(workingHours, 8);
        const potentialIsencaoHours = workingHours > 8 ? Math.min(workingHours - 8, 2) : 0;
        const remainingIsencaoLimit = Math.max(0, annualIsencaoLimit - usedIsencaoHours);
        
        if (potentialIsencaoHours <= remainingIsencaoLimit) {
          // Within the limit, use all potential Isenção hours
          unpaidExtraHours = potentialIsencaoHours;
          paidExtraHours = workingHours > 10 ? workingHours - 10 : 0;
        } else {
          // Exceeded the limit, only use remaining limit
          unpaidExtraHours = remainingIsencaoLimit;
          paidExtraHours = workingHours > 8 ? workingHours - 8 - unpaidExtraHours : 0;
        }
      }

      const newSession = {
        userId: user.uid,
        userEmail: user.email,
        clockIn: clockInTime,
        clockOut: clockOutTime,
        totalHours: totalHours,
        regularHours: regularHours,
        unpaidExtraHours: unpaidExtraHours,
        paidExtraHours: paidExtraHours,
        isWeekend: useWeekendFromDetails,
        isBankHoliday: isBankHoliday,
        weekendDaysOff: useWeekendFromDetails ? weekendDaysOff : (isBankHoliday && bankHolidayApplyDaysOff ? weekendDaysOff : 0),
        weekendBonus: useWeekendFromDetails ? weekendBonus : (isBankHoliday && bankHolidayApplyBonus ? weekendBonus : 0),
        // Session details from ActiveSessionCard
        includeLunchTime: details.includeLunchTime || false,
        lunchDuration: lunchDuration,
        lunchAmount: details.lunchAmount || 0,
        hadDinner: details.hadDinner || false,
        dinnerAmount: details.dinnerAmount || 0,
        location: details.location || '',
        notes: details.notes || '',
        calendarEventId: null,
        calendarSyncStatus: 'not_synced',
        lastSyncAt: null
      };

      try {
        // Get the calendar event ID from active clock-in
        const activeClockInRef = doc(db, 'activeClockIns', user.uid);
        const activeClockInSnap = await getDoc(activeClockInRef);
        const storedCalendarEventId = activeClockInSnap.exists() ? activeClockInSnap.data().calendarEventId : null;
        
        console.log('Clock-out Google Calendar status:', { 
          isReady: googleCalendar.isReady, 
          isAuthorized: googleCalendar.isAuthorized,
          storedCalendarEventId 
        });

        // Update or create calendar event if authorized
        if (googleCalendar.isAuthorized) {
          try {
            if (storedCalendarEventId) {
              // Update existing placeholder event
              await googleCalendar.updateCalendarEvent(storedCalendarEventId, {
                clockIn: clockInTime,
                clockOut: clockOutTime,
                regularHours: newSession.regularHours,
                unpaidHours: newSession.unpaidExtraHours,
                paidHours: newSession.paidExtraHours,
                notes: ''
              });
              newSession.calendarEventId = storedCalendarEventId;
              newSession.calendarSyncStatus = 'synced';
              newSession.lastSyncAt = Date.now();
              console.log('Calendar event updated:', storedCalendarEventId);
            } else {
              // Create new event if placeholder wasn't created
              const calendarEvent = await googleCalendar.createCalendarEvent({
                clockIn: clockInTime,
                clockOut: clockOutTime,
                regularHours: newSession.regularHours,
                unpaidHours: newSession.unpaidExtraHours,
                paidHours: newSession.paidExtraHours,
                notes: ''
              });
              newSession.calendarEventId = calendarEvent.id;
              newSession.calendarSyncStatus = 'synced';
              newSession.lastSyncAt = Date.now();
              console.log('Calendar event created:', calendarEvent.id);
            }
          } catch (calendarError) {
            console.error('Failed to sync calendar event:', calendarError);
            newSession.calendarSyncStatus = 'failed';
            // Don't block the flow if calendar sync fails
          }
        }

        console.log('Saving session to Firebase:', newSession);
        const docRef = await addDoc(collection(db, 'sessions'), newSession);
        console.log('Session saved successfully with ID:', docRef.id);

        // Delete active clock-in from Firestore (syncs across all devices)
        await deleteDoc(activeClockInRef);
        console.log('Active clock-in deleted from Firestore');

        // State will be updated by the Firestore listener

        // Reload sessions to show the new one immediately
        console.log('Reloading sessions...');
        await Promise.all([
          loadSessionDates(),
          loadSessionsForDate(selectedDate)
        ]);
        console.log('Sessions reloaded!');
      } catch (error) {
        console.error('Error saving session:', error);
        alert('Failed to save session: ' + error.message);
      }
    }
  };

  const handleSignOut = async () => {
    try {
      // Delete active clock-in from Firestore before signing out
      const activeClockInRef = doc(db, 'activeClockIns', user.uid);
      await deleteDoc(activeClockInRef).catch(() => {
        // Ignore error if document doesn't exist
        console.log('No active clock-in to delete');
      });

      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const calculateTimeBreakdown = (totalHours) => {
    const regularHours = Math.min(totalHours, 8);
    const unpaidExtraHours = totalHours > 8 ? Math.min(totalHours - 8, 2) : 0;
    const paidExtraHours = totalHours > 10 ? totalHours - 10 : 0;
    return { regularHours, unpaidExtraHours, paidExtraHours };
  };

  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const formatHours = (hours) => {
    return hours.toFixed(2);
  };

  const getWorkingMessage = (hours) => {
    if (hours < 1) {
      return "Just getting started!";
    } else if (hours < 2) {
      return "Rome wasn't built in a day...";
    } else if (hours < 3) {
      return "You're on fire! Keep going!";
    } else if (hours < 4) {
      return "Halfway through the morning!";
    } else if (hours < 5) {
      return "Maybe time for a little break, sunshine?";
    } else if (hours < 6) {
      return "Looking good! Stay hydrated!";
    } else if (hours < 7) {
      return "The finish line is in sight!";
    } else if (hours < 8) {
      return "Almost there champion!";
    } else if (hours < 9) {
      return "Into the extended hours zone!";
    } else if (hours < 10) {
      return "You're a machine! But seriously...";
    } else {
      return "Stop it, really! It's been 10+ hours!";
    }
  };

  const currentElapsedTime = isClockedIn ? currentTime - clockInTime : 0;
  const currentTotalHours = currentElapsedTime / (1000 * 60 * 60);
  const currentBreakdown = isClockedIn ? calculateTimeBreakdown(currentTotalHours) : null;

  const modifiers = {
    regularDay: (date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return datesWithSessions.get(dateStr) === 'regular';
    },
    isencaoDay: (date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return datesWithSessions.get(dateStr) === 'isencao';
    },
    overworkDay: (date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return datesWithSessions.get(dateStr) === 'overwork';
    },
  };

  const modifiersClassNames = {
    regularDay: 'regular-day',
    isencaoDay: 'isencao-day',
    overworkDay: 'overwork-day',
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'analytics':
        if (isFreePlan) {
          return <PlanGate requiredPlan="basic" featureName={t('navigation.analytics')} onUpgrade={() => handlePageChange('premium-plus')} />;
        }
        return (
          <ErrorBoundary>
            <Suspense fallback={<Loader />}>
              <Analytics user={user} />
            </Suspense>
          </ErrorBoundary>
        );
      case 'finance':
        if (isFreePlan) {
          return <PlanGate requiredPlan="basic" featureName={t('navigation.finance')} onUpgrade={() => handlePageChange('premium-plus')} />;
        }
        return (
          <ErrorBoundary>
            <Suspense fallback={<Loader />}>
              <Finance user={user} onNavigate={handlePageChange} />
            </Suspense>
          </ErrorBoundary>
        );
      case 'ai-advisor':
        return (
          <ErrorBoundary>
            <Suspense fallback={<Loader />}>
              <AIAdvisor user={user} onNavigate={handlePageChange} />
            </Suspense>
          </ErrorBoundary>
        );
      case 'premium-plus':
        return (
          <ErrorBoundary>
            <Suspense fallback={<Loader />}>
              <PremiumPlus user={user} onNavigate={handlePageChange} />
            </Suspense>
          </ErrorBoundary>
        );
      case 'call-pack-purchase':
        return (
          <ErrorBoundary>
            <Suspense fallback={<Loader />}>
              <CallPackPurchase user={user} onNavigate={handlePageChange} />
            </Suspense>
          </ErrorBoundary>
        );
      case 'admin':
        return (
          <ErrorBoundary>
            <Suspense fallback={<Loader />}>
              <Admin user={user} onNavigate={handlePageChange} />
            </Suspense>
          </ErrorBoundary>
        );
      case 'enterprise':
        return (
          <ErrorBoundary>
            <Suspense fallback={<Loader />}>
              <Enterprise user={user} onNavigate={handlePageChange} />
            </Suspense>
          </ErrorBoundary>
        );
      case 'faq':
        return <FAQ />;
      case 'settings':
        if (isFreePlan) {
          return <PlanGate requiredPlan="basic" featureName={t('navigation.settings')} onUpgrade={() => handlePageChange('premium-plus')} />;
        }
        return (
          <ErrorBoundary>
            <Suspense fallback={<Loader />}>
              <Settings googleCalendar={googleCalendar} onUsernameChange={handleDisplayNameChange} onNavigate={handlePageChange} />
            </Suspense>
          </ErrorBoundary>
        );
      case 'calendar-import':
        if (isFreePlan) {
          return <PlanGate requiredPlan="basic" featureName={t('navigation.calendar')} onUpgrade={() => handlePageChange('premium-plus')} />;
        }
        return (
          <ErrorBoundary>
            <Suspense fallback={<Loader />}>
              <CalendarImport user={user} />
            </Suspense>
          </ErrorBoundary>
        );
      case 'calendar':
        if (isFreePlan) {
          return <PlanGate requiredPlan="basic" featureName={t('navigation.calendar')} onUpgrade={() => handlePageChange('premium-plus')} />;
        }
        return (
          <ErrorBoundary>
            <Suspense fallback={<Loader />}>
              <CalendarView user={user} />
            </Suspense>
          </ErrorBoundary>
        );
      case 'about':
        return <About />;
      case 'home':
      default:
        return (
          <>
            <HomePage
              isClockedIn={isClockedIn}
              clockInTime={clockInTime}
              currentElapsedTime={currentElapsedTime}
              currentTotalHours={currentTotalHours}
              currentBreakdown={currentBreakdown}
              sessionsForDate={sessionsForDate}
              onClockInOut={handleClockInOut}
              formatTime={formatTime}
              getWorkingMessage={getWorkingMessage}
              onNavigate={handlePageChange}
            />
            <div>
              <DatePickerSection
                selectedDate={selectedDate}
                onDateSelect={(date) => {
                  // Ensure we always have a valid date
                  if (date && date instanceof Date && !isNaN(date.getTime())) {
                    setSelectedDate(date);
                  } else if (date) {
                    // If date is not a Date object, try to convert it
                    const dateObj = date instanceof Date ? date : new Date(date);
                    if (!isNaN(dateObj.getTime())) {
                      setSelectedDate(dateObj);
                    }
                  }
                }}
                modifiers={modifiers}
                modifiersClassNames={modifiersClassNames}
              />
              <SessionList
                selectedDate={selectedDate}
                sessionsForDate={sessionsForDate}
                isClockedIn={isClockedIn}
                clockInTime={clockInTime}
                activeSessionDetails={activeSessionDetails}
                onDetailsChange={setActiveSessionDetails}
                onEditSession={setEditingSession}
                onDeleteSession={setDeletingSession}
                onSyncSession={setSyncingSession}
                onCreateSession={() => setCreatingSession(true)}
              />
            </div>
          </>
        );
    }
  };

  return (
    <div className="app-container">
      <Navigation currentPage={currentPage} onPageChange={handlePageChange} user={user} plan={plan} />

      <div className="app-header">
        <div className="header-content">
          <div className="header-left">
            <div className="header-logo-wrapper">
              <img src="/images/animated white.gif" alt="Clock In Logo" className="header-logo" />
            </div>
            <div className="header-title-wrapper">
              <h1 className="header-title">CLOCK IN</h1>
              <p className="header-subtitle">Time Manager</p>
            </div>
          </div>
          <div className="header-right">
            {!isFreePlan && <SyncStatusIndicator googleCalendar={googleCalendar} />}
            <div className="user-info" title={user.email}>
              <User />
              <span>{displayName ? `@${displayName}` : user.email}</span>
            </div>
            <button onClick={handleSignOut} className="sign-out-button">
              <LogOut />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <EnterpriseInviteBanner user={user} />

      {renderContent()}

      {editingSession && (
        <Suspense fallback={<Loader />}>
          <SessionEditor
            session={editingSession}
            onClose={handleCloseEditor}
            onUpdate={handleSessionUpdate}
          />
        </Suspense>
      )}

      {creatingSession && (
        <Suspense fallback={<Loader />}>
          <SessionCreator
            user={user}
            selectedDate={selectedDate}
            onClose={handleCloseCreator}
            onUpdate={handleSessionUpdate}
          />
        </Suspense>
      )}

      {deletingSession && (
        <Suspense fallback={<Loader />}>
          <DeleteConfirmation
            session={deletingSession}
            onClose={handleCloseDeleter}
            onUpdate={handleSessionUpdate}
          />
        </Suspense>
      )}

      {syncingSession && (
        <GoogleCalendarSync
          session={syncingSession}
          onClose={handleCloseSyncer}
        />
      )}

      {showSyncOnVisitModal && (
        <SyncOnVisitModal
          variant={syncOnVisitVariant}
          onSync={handleSyncOnVisitSync}
          onContinue={handleSyncOnVisitContinue}
        />
      )}
    </div>
  );
}
