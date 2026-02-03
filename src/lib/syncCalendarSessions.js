import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

const CONCURRENCY_LIMIT = 5;

/**
 * Syncs unsynced and failed sessions to Google Calendar.
 * @param {Object} googleCalendar - The useGoogleCalendar hook return value
 * @returns {Promise<void>}
 */
export async function syncUnsyncedSessions(googleCalendar) {
  if (!googleCalendar?.isAuthorized) return;

  const user = auth.currentUser;
  if (!user) return;

  const sessionsQuery = query(
    collection(db, 'sessions'),
    where('userId', '==', user.uid)
  );
  const sessionsSnapshot = await getDocs(sessionsQuery);

  const unsyncedSessions = [];
  sessionsSnapshot.forEach((docSnap) => {
    const session = docSnap.data();
    const status = session.calendarSyncStatus || 'not_synced';
    if (status === 'not_synced' || status === 'failed') {
      unsyncedSessions.push({ id: docSnap.id, ...session });
    }
  });

  if (unsyncedSessions.length === 0) return;

  for (let i = 0; i < unsyncedSessions.length; i += CONCURRENCY_LIMIT) {
    const batch = unsyncedSessions.slice(i, i + CONCURRENCY_LIMIT);

    await Promise.allSettled(
      batch.map(async (session) => {
        try {
          const calendarEvent = await googleCalendar.createCalendarEvent({
            clockIn: session.clockIn,
            clockOut: session.clockOut,
            regularHours: session.regularHours,
            unpaidHours: session.unpaidExtraHours,
            paidHours: session.paidExtraHours,
            notes: session.notes || ''
          });

          const sessionRef = doc(db, 'sessions', session.id);
          await updateDoc(sessionRef, {
            calendarEventId: calendarEvent.id,
            calendarSyncStatus: 'synced',
            lastSyncAt: Date.now()
          });

          return { success: true, sessionId: session.id };
        } catch (error) {
          console.error(`Failed to sync session ${session.id}:`, error);

          const sessionRef = doc(db, 'sessions', session.id);
          await updateDoc(sessionRef, {
            calendarSyncStatus: 'failed'
          });

          return { success: false, sessionId: session.id, error };
        }
      })
    );
  }
}

/**
 * Checks if the user has any unsynced or failed sessions.
 * @param {string} userId - The user's uid
 * @returns {Promise<boolean>}
 */
export async function hasUnsyncedSessions(userId) {
  if (!userId) return false;

  const sessionsQuery = query(
    collection(db, 'sessions'),
    where('userId', '==', userId)
  );
  const sessionsSnapshot = await getDocs(sessionsQuery);

  for (const docSnap of sessionsSnapshot.docs) {
    const session = docSnap.data();
    const status = session.calendarSyncStatus || 'not_synced';
    if (status === 'not_synced' || status === 'failed') {
      return true;
    }
  }

  return false;
}
