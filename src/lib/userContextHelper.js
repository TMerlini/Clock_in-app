import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { format, startOfYear, endOfYear } from 'date-fns';
import { getCachedQuery } from './queryCache';

/**
 * Aggregates user data (sessions, analytics, settings) into a formatted context string for AI
 * @param {string} userId - The user ID
 * @returns {Promise<string>} Formatted context string
 */
export async function getUserContext(userId) {
  try {
    // Load settings and sessions in parallel with caching
    const [settingsDoc, allSessionsSnapshot] = await Promise.all([
      getCachedQuery('userSettings', { userId }, async () => {
        const docSnap = await getDoc(doc(db, 'userSettings', userId));
        return docSnap.exists() ? docSnap.data() : {};
      }),
      getCachedQuery('sessions', { userId }, async () => {
        const querySnapshot = await getDocs(query(
          collection(db, 'sessions'),
          where('userId', '==', userId)
        ));
        const allSessions = [];
        querySnapshot.forEach((docSnap) => {
          allSessions.push({ id: docSnap.id, ...docSnap.data() });
        });
        return allSessions;
      })
    ]);

    const settings = settingsDoc;
    const allSessions = allSessionsSnapshot;
    
    // Sort by clockIn descending (newest first) for recent sessions
    allSessions.sort((a, b) => b.clockIn - a.clockIn);
    const recentSessions = allSessions.slice(0, 20);

    // Calculate analytics
    const totalSessions = allSessions.length;
    const totalHours = allSessions.reduce((sum, s) => sum + (s.totalHours || 0), 0);
    const regularHours = allSessions.reduce((sum, s) => sum + (s.regularHours || 0), 0);
    const unpaidHours = allSessions.reduce((sum, s) => sum + (s.unpaidExtraHours || 0), 0);
    const paidOvertimeHours = allSessions.reduce((sum, s) => sum + (s.paidExtraHours || 0), 0);
    const weekendSessions = allSessions.filter(s => s.isWeekend).length;
    const totalWeekendDaysOff = allSessions.reduce((sum, s) => sum + (s.weekendDaysOff || 0), 0);
    const totalWeekendBonus = allSessions.reduce((sum, s) => sum + (s.weekendBonus || 0), 0);

    // Calculate current year Isenção usage
    const currentYear = new Date().getFullYear();
    const yearStart = startOfYear(new Date(currentYear, 0, 1)).getTime();
    const yearEnd = endOfYear(new Date(currentYear, 11, 31)).getTime();
    const yearSessions = allSessions.filter(s => 
      s.clockIn >= yearStart && s.clockIn <= yearEnd
    );
    const usedIsencaoHours = yearSessions.reduce((sum, s) => sum + (s.unpaidExtraHours || 0), 0);
    const annualIsencaoLimit = settings.annualIsencaoLimit || 200;
    const remainingIsencaoHours = Math.max(0, annualIsencaoLimit - usedIsencaoHours);

    // Format recent sessions
    const recentSessionsFormatted = recentSessions.slice(0, 10).map(s => {
      const clockInDate = new Date(s.clockIn);
      const clockOutDate = s.clockOut ? new Date(s.clockOut) : null;
      return `- ${format(clockInDate, 'MMM dd, yyyy')}: ${(s.totalHours || 0).toFixed(1)}h total (${(s.regularHours || 0).toFixed(1)}h regular, ${(s.unpaidExtraHours || 0).toFixed(1)}h unpaid extra, ${(s.paidExtraHours || 0).toFixed(1)}h paid overtime)${s.isWeekend ? ' [Weekend]' : ''}${s.location ? ` - Location: ${s.location}` : ''}`;
    }).join('\n');

    // Build context string
    const context = `You are an AI assistant helping a user manage their work time tracking using the Clock In App.

APP CONTEXT:
This is a time tracking application that helps users track their work sessions, categorize hours (regular, unpaid extra "Isenção", paid overtime), manage breaks, and sync with Google Calendar.

USER SETTINGS:
- Regular hours threshold: ${settings.regularHoursThreshold || 8} hours
- Unpaid extra (Isenção) enabled: ${settings.enableUnpaidExtra !== false ? 'Yes' : 'No'}
- Unpaid extra threshold: ${settings.unpaidExtraThreshold || 10} hours (if enabled)
- Annual Isenção limit: ${annualIsencaoLimit} hours/year
- Default lunch duration: ${(settings.lunchDuration || 1).toFixed(1)} hours
- Weekend days off per work day: ${settings.weekendDaysOff || 1} days
- Weekend bonus: €${settings.weekendBonus || 100}

USER ANALYTICS (ALL TIME):
- Total sessions: ${totalSessions}
- Total hours worked: ${totalHours.toFixed(1)} hours
- Regular hours: ${regularHours.toFixed(1)} hours
- Unpaid extra (Isenção) hours: ${unpaidHours.toFixed(1)} hours
- Paid overtime hours: ${paidOvertimeHours.toFixed(1)} hours
- Weekend sessions: ${weekendSessions}
- Days off earned (from weekend work): ${totalWeekendDaysOff.toFixed(1)} days
- Weekend bonus earned: €${totalWeekendBonus.toFixed(2)}

CURRENT YEAR (${currentYear}) ISENÇÃO STATUS:
- Used: ${usedIsencaoHours.toFixed(1)} / ${annualIsencaoLimit} hours
- Remaining: ${remainingIsencaoHours.toFixed(1)} hours

RECENT SESSIONS (last 10):
${recentSessionsFormatted || 'No recent sessions'}

The user can ask questions about their time tracking, get advice on work patterns, understand their statistics, or ask general questions.`;

    return context;
  } catch (error) {
    console.error('Error loading user context:', error);
    return 'Error loading user context. The user is using a time tracking application called Clock In App.';
  }
}
