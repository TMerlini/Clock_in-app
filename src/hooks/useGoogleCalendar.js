import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { GOOGLE_CLIENT_ID, CALENDAR_SCOPES, GOOGLE_API_KEY } from '../lib/googleConfig';
import { formatHoursMinutes } from '../lib/utils';

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

export function useGoogleCalendar() {
  const [gapiInited, setGapiInited] = useState(false);
  const [gisInited, setGisInited] = useState(false);
  const [tokenClient, setTokenClient] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [tokenExpiry, setTokenExpiry] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        setAccessToken(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Load the Google API library
    const loadGapi = () => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      script.onload = initializeGapiClient;
      document.body.appendChild(script);
    };

    // Load the Google Identity Services library
    const loadGis = () => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGisClient;
      document.body.appendChild(script);
    };

    loadGapi();
    loadGis();
  }, []);

  // Set up real-time listener for token changes (syncs across devices)
  useEffect(() => {
    if (!gapiInited || !gisInited || !currentUser) return;

    const tokenRef = doc(db, 'calendarTokens', currentUser.uid);
    
    // Real-time listener for token changes
    const unsubscribe = onSnapshot(tokenRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const storedToken = data.accessToken;
        const expiry = data.expiresAt;
        
        // Check if token is expired
        if (expiry && Date.now() > expiry) {
          console.log('Token expired, clearing...');
          setAccessToken(null);
          setTokenExpiry(null);
          if (window.gapi?.client) {
            window.gapi.client.setToken(null);
          }
          return;
        }
        
        setAccessToken(storedToken);
        setTokenExpiry(expiry);
        // Also set the token on gapi client immediately
        if (window.gapi?.client) {
          window.gapi.client.setToken({ access_token: storedToken });
        }
        console.log('Token synced from Firestore (real-time), expires:', expiry ? new Date(expiry).toLocaleTimeString() : 'unknown');
      } else {
        // Token was deleted (user disconnected on another device)
        setAccessToken(null);
        setTokenExpiry(null);
        if (window.gapi?.client) {
          window.gapi.client.setToken(null);
        }
        console.log('Token removed (disconnected on another device)');
      }
    }, (error) => {
      console.error('Error listening to token changes:', error);
    });

    return () => unsubscribe();
  }, [gapiInited, gisInited, currentUser]);

  const initializeGapiClient = async () => {
    try {
      await new Promise((resolve) => window.gapi.load('client', resolve));
      
      // Only include API key if it's set (not the placeholder)
      const initConfig = {
        discoveryDocs: [DISCOVERY_DOC],
      };
      
      if (GOOGLE_API_KEY && !GOOGLE_API_KEY.includes('YOUR_GOOGLE_API_KEY')) {
        initConfig.apiKey = GOOGLE_API_KEY;
      }
      
      await window.gapi.client.init(initConfig);
      setGapiInited(true);
      console.log('GAPI client initialized');
    } catch (error) {
      console.error('Error initializing GAPI client:', error);
    }
  };

  const initializeGisClient = () => {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: CALENDAR_SCOPES,
        callback: async (response) => {
          if (response.access_token) {
            // Calculate expiry time (Google tokens expire in 3600 seconds = 1 hour)
            const expiresIn = response.expires_in || 3600;
            const expiresAt = Date.now() + (expiresIn * 1000);
            
            setAccessToken(response.access_token);
            setTokenExpiry(expiresAt);
            
            // Set the token on gapi client immediately
            if (window.gapi?.client) {
              window.gapi.client.setToken({ access_token: response.access_token });
            }
            
            // Store token in Firestore for cross-device sync
            const user = auth.currentUser;
            if (user) {
              try {
                const tokenRef = doc(db, 'calendarTokens', user.uid);
                await setDoc(tokenRef, {
                  accessToken: response.access_token,
                  expiresAt: expiresAt,
                  updatedAt: Date.now()
                });
                console.log('Access token saved to Firestore, expires at:', new Date(expiresAt).toLocaleTimeString());
              } catch (error) {
                console.error('Error saving token to Firestore:', error);
              }
            }
            console.log('Access token received and set on gapi client');
          }
        },
      });
      setTokenClient(client);
      setGisInited(true);
      console.log('GIS client initialized');
    } catch (error) {
      console.error('Error initializing GIS client:', error);
    }
  };

  const requestAuthorization = () => {
    if (tokenClient) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    }
  };

  const revokeAuthorization = async () => {
    if (accessToken) {
      window.google.accounts.oauth2.revoke(accessToken);
      setAccessToken(null);
      
      // Remove token from Firestore
      const user = auth.currentUser;
      if (user) {
        try {
          const tokenRef = doc(db, 'calendarTokens', user.uid);
          await deleteDoc(tokenRef);
          console.log('Token removed from Firestore');
        } catch (error) {
          console.error('Error removing token from Firestore:', error);
        }
      }
    }
  };

  const createCalendarEvent = async (eventDetails) => {
    console.log('createCalendarEvent called:', { gapiInited, hasToken: !!accessToken });
    
    if (!gapiInited) {
      throw new Error('Calendar API not initialized');
    }
    if (!accessToken) {
      throw new Error('Not authorized - please enable Google Calendar sync in Settings');
    }

    try {
      // Set the access token for this request
      window.gapi.client.setToken({ access_token: accessToken });
      console.log('Token set on gapi client, creating event...');
      
      const { clockIn, clockOut, regularHours, unpaidHours, paidHours, notes, isPlaceholder } = eventDetails;

      const event = {
        summary: isPlaceholder ? 'Work Session (In Progress)' : 'Work Session',
        description: isPlaceholder 
          ? 'Clock-in recorded. Session in progress...'
          : `Regular Hours: ${formatHoursMinutes(regularHours)}
Unpaid Extra (Isenção): ${formatHoursMinutes(unpaidHours)}
Paid Overtime: ${formatHoursMinutes(paidHours)}${notes ? '\n\nNotes: ' + notes : ''}`,
        start: {
          dateTime: new Date(clockIn).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: new Date(clockOut).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        colorId: isPlaceholder ? '11' : '9', // Red for in-progress, Blue for completed
      };

      const response = await window.gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });

      console.log('Event created:', response.result);
      return response.result;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  };

  const updateCalendarEvent = async (eventId, eventDetails) => {
    console.log('updateCalendarEvent called:', { gapiInited, hasToken: !!accessToken, eventId });
    
    if (!gapiInited) {
      throw new Error('Calendar API not initialized');
    }
    if (!accessToken) {
      throw new Error('Not authorized - please enable Google Calendar sync in Settings');
    }

    try {
      // Set the access token for this request
      window.gapi.client.setToken({ access_token: accessToken });
      console.log('Token set on gapi client, updating event...');
      
      const { clockIn, clockOut, regularHours, unpaidHours, paidHours, notes } = eventDetails;

      const event = {
        summary: 'Work Session',
        description: `Regular Hours: ${formatHoursMinutes(regularHours)}
Unpaid Extra (Isenção): ${formatHoursMinutes(unpaidHours)}
Paid Overtime: ${formatHoursMinutes(paidHours)}${notes ? '\n\nNotes: ' + notes : ''}`,
        start: {
          dateTime: new Date(clockIn).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: new Date(clockOut).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        colorId: '9', // Blue color for completed work events
      };

      const response = await window.gapi.client.calendar.events.patch({
        calendarId: 'primary',
        eventId: eventId,
        resource: event,
      });

      console.log('Event updated:', response.result);
      return response.result;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  };

  const listCalendarEvents = async (timeMin, timeMax, maxResults = 250, calendarIds = ['primary']) => {
    if (!gapiInited) {
      throw new Error('Calendar API not initialized');
    }
    if (!accessToken) {
      throw new Error('Not authorized - please enable Google Calendar sync in Settings');
    }

    try {
      window.gapi.client.setToken({ access_token: accessToken });
      
      // If multiple calendarIds, fetch from all and merge
      if (calendarIds.length > 1) {
        const eventPromises = calendarIds.map(calendarId =>
          window.gapi.client.calendar.events.list({
            calendarId: calendarId,
            timeMin: timeMin,
            timeMax: timeMax,
            maxResults: maxResults,
            singleEvents: true,
            orderBy: 'startTime',
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }).then(response => ({
            calendarId,
            events: response.result.items || []
          })).catch(error => {
            console.warn(`Error fetching events from calendar ${calendarId}:`, error);
            return { calendarId, events: [] };
          })
        );
        
        const results = await Promise.all(eventPromises);
        const allEvents = [];
        results.forEach(({ calendarId, events }) => {
          events.forEach(event => {
            allEvents.push({ ...event, sourceCalendarId: calendarId });
          });
        });
        
        // Sort by start time
        allEvents.sort((a, b) => {
          const timeA = new Date(a.start?.dateTime || a.start?.date || 0).getTime();
          const timeB = new Date(b.start?.dateTime || b.start?.date || 0).getTime();
          return timeA - timeB;
        });
        
        console.log(`Calendar events listed from ${calendarIds.length} calendar(s):`, allEvents.length);
        return allEvents;
      } else {
        // Single calendar (backward compatible)
        const calendarId = calendarIds[0] || 'primary';
        const response = await window.gapi.client.calendar.events.list({
          calendarId: calendarId,
          timeMin: timeMin,
          timeMax: timeMax,
          maxResults: maxResults,
          singleEvents: true,
          orderBy: 'startTime',
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });

        const events = response.result.items || [];
        events.forEach(event => {
          event.sourceCalendarId = calendarId;
        });

        console.log('Calendar events listed:', events.length);
        return events;
      }
    } catch (error) {
      console.error('Error listing calendar events:', error);
      throw error;
    }
  };

  const getCalendarEvent = async (eventId, calendarId = 'primary') => {
    if (!gapiInited) {
      throw new Error('Calendar API not initialized');
    }
    if (!accessToken) {
      throw new Error('Not authorized - please enable Google Calendar sync in Settings');
    }

    try {
      window.gapi.client.setToken({ access_token: accessToken });
      
      const response = await window.gapi.client.calendar.events.get({
        calendarId: calendarId,
        eventId: eventId,
      });

      console.log('Calendar event retrieved:', response.result);
      return response.result;
    } catch (error) {
      console.error('Error getting calendar event:', error);
      throw error;
    }
  };

  /**
   * Find orphan placeholder events: "Work Session (In Progress)" with end in the future.
   * These occur when activeClockIns was deleted but the calendar was never updated.
   * @returns {Promise<Array>} Array of orphan event objects { id, start, end, ... }
   */
  const findOrphanPlaceholderEvents = async () => {
    if (!gapiInited || !accessToken) return [];

    try {
      window.gapi.client.setToken({ access_token: accessToken });
      const now = Date.now();
      const timeMin = new Date(now - 24 * 60 * 60 * 1000).toISOString(); // 24h ago
      const timeMax = new Date(now + 2 * 60 * 60 * 1000).toISOString();  // 2h from now

      const response = await window.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin,
        timeMax,
        maxResults: 50,
        singleEvents: true,
        orderBy: 'startTime',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      const events = response.result.items || [];
      const orphans = events.filter((e) => {
        const summary = (e.summary || '').trim();
        const endTime = e.end?.dateTime ? new Date(e.end.dateTime).getTime() : 0;
        return summary === 'Work Session (In Progress)' && endTime > now;
      });

      return orphans;
    } catch (error) {
      console.error('Error finding orphan placeholders:', error);
      return [];
    }
  };

  const listCalendars = async () => {
    if (!gapiInited) {
      throw new Error('Calendar API not initialized');
    }
    if (!accessToken) {
      throw new Error('Not authorized - please enable Google Calendar sync in Settings');
    }

    try {
      window.gapi.client.setToken({ access_token: accessToken });
      
      const response = await window.gapi.client.calendar.calendarList.list({
        minAccessRole: 'reader',
      });

      console.log('Calendars listed:', response.result.items?.length || 0);
      return response.result.items || [];
    } catch (error) {
      console.error('Error listing calendars:', error);
      throw error;
    }
  };

  const isTokenExpired = () => {
    if (!tokenExpiry) return false;
    // Consider token expired 5 minutes before actual expiry for safety
    return Date.now() > (tokenExpiry - 5 * 60 * 1000);
  };

  const isAuthorized = () => {
    return gapiInited && gisInited && accessToken !== null && !isTokenExpired();
  };

  const refreshToken = () => {
    // For implicit grant flow, we need to re-request authorization
    // Using prompt: '' for silent refresh if possible
    if (tokenClient) {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  };

  // Get time until token expires (in minutes)
  const getTokenExpiryMinutes = () => {
    if (!tokenExpiry) return null;
    const remaining = tokenExpiry - Date.now();
    if (remaining <= 0) return 0;
    return Math.round(remaining / (60 * 1000));
  };

  return {
    isReady: gapiInited && gisInited,
    isAuthorized: isAuthorized(),
    isTokenExpired: isTokenExpired(),
    tokenExpiryMinutes: getTokenExpiryMinutes(),
    requestAuthorization,
    revokeAuthorization,
    refreshToken,
    createCalendarEvent,
    updateCalendarEvent,
    listCalendarEvents,
    getCalendarEvent,
    listCalendars,
    findOrphanPlaceholderEvents,
  };
}
