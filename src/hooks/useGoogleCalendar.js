import { useState, useEffect } from 'react';
import { GOOGLE_CLIENT_ID, CALENDAR_SCOPES, GOOGLE_API_KEY } from '../lib/googleConfig';

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

export function useGoogleCalendar() {
  const [gapiInited, setGapiInited] = useState(false);
  const [gisInited, setGisInited] = useState(false);
  const [tokenClient, setTokenClient] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

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

  const initializeGapiClient = async () => {
    try {
      await new Promise((resolve) => window.gapi.load('client', resolve));
      await window.gapi.client.init({
        apiKey: GOOGLE_API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
      });
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
        callback: (response) => {
          if (response.access_token) {
            setAccessToken(response.access_token);
            localStorage.setItem('googleCalendarToken', response.access_token);
            console.log('Access token received');
          }
        },
      });
      setTokenClient(client);
      setGisInited(true);
      console.log('GIS client initialized');

      // Check if we have a stored token
      const storedToken = localStorage.getItem('googleCalendarToken');
      if (storedToken) {
        setAccessToken(storedToken);
      }
    } catch (error) {
      console.error('Error initializing GIS client:', error);
    }
  };

  const requestAuthorization = () => {
    if (tokenClient) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    }
  };

  const revokeAuthorization = () => {
    if (accessToken) {
      window.google.accounts.oauth2.revoke(accessToken);
      setAccessToken(null);
      localStorage.removeItem('googleCalendarToken');
    }
  };

  const createCalendarEvent = async (eventDetails) => {
    if (!gapiInited || !accessToken) {
      throw new Error('Calendar API not initialized or not authorized');
    }

    try {
      const { clockIn, clockOut, regularHours, unpaidHours, paidHours, notes } = eventDetails;

      const event = {
        summary: 'Work Session',
        description: `Regular Hours: ${regularHours.toFixed(2)}h
Unpaid Extra (Isenção): ${unpaidHours.toFixed(2)}h
Paid Overtime: ${paidHours.toFixed(2)}h${notes ? '\n\nNotes: ' + notes : ''}`,
        start: {
          dateTime: new Date(clockIn).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: new Date(clockOut).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        colorId: '9', // Blue color for work events
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

  const isAuthorized = () => {
    return gapiInited && gisInited && accessToken !== null;
  };

  return {
    isReady: gapiInited && gisInited,
    isAuthorized: isAuthorized(),
    requestAuthorization,
    revokeAuthorization,
    createCalendarEvent,
  };
}
