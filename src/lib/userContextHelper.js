import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { format, startOfYear, endOfYear, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { getCachedQuery } from './queryCache';
import { getPortugueseLaborLawContext } from './portugueseLaborLaw';

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
    const isencaoPercentage = annualIsencaoLimit > 0 ? (usedIsencaoHours / annualIsencaoLimit * 100).toFixed(1) : 0;

    // Calculate current week hours for compliance analysis
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
    const weekSessions = allSessions.filter(s => {
      const sessionDate = new Date(s.clockIn);
      return sessionDate >= weekStart && sessionDate <= weekEnd;
    });
    const weekHours = weekSessions.reduce((sum, s) => sum + (s.totalHours || 0), 0);
    
    // Calculate average daily hours (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentSessions30Days = allSessions.filter(s => new Date(s.clockIn) >= thirtyDaysAgo);
    const totalHours30Days = recentSessions30Days.reduce((sum, s) => sum + (s.totalHours || 0), 0);
    const workDays30Days = new Set(recentSessions30Days.map(s => format(new Date(s.clockIn), 'yyyy-MM-dd'))).size;
    const avgDailyHours = workDays30Days > 0 ? (totalHours30Days / workDays30Days).toFixed(1) : 0;
    
    // Count consecutive weekend work
    const sortedSessions = [...allSessions].sort((a, b) => b.clockIn - a.clockIn);
    let consecutiveWeekends = 0;
    for (const session of sortedSessions) {
      if (session.isWeekend) {
        consecutiveWeekends++;
      } else {
        break;
      }
    }

    // Format recent sessions
    const recentSessionsFormatted = recentSessions.slice(0, 10).map(s => {
      const clockInDate = new Date(s.clockIn);
      const clockOutDate = s.clockOut ? new Date(s.clockOut) : null;
      return `- ${format(clockInDate, 'MMM dd, yyyy')}: ${(s.totalHours || 0).toFixed(1)}h total (${(s.regularHours || 0).toFixed(1)}h regular, ${(s.unpaidExtraHours || 0).toFixed(1)}h unpaid extra, ${(s.paidExtraHours || 0).toFixed(1)}h paid overtime)${s.isWeekend ? ' [Weekend]' : ''}${s.location ? ` - Location: ${s.location}` : ''}`;
    }).join('\n');

    // Get Portuguese labor law knowledge
    const laborLawContext = getPortugueseLaborLawContext();

    // Build context string
    const context = `${laborLawContext}

=== YOUR ROLE ===
You are an AI assistant helping a user manage their work time tracking using the Clock In App. You are also an expert in Portuguese labor law (Código do Trabalho) and human resources best practices. Use your legal knowledge to analyze the user's data, provide compliance insights, and offer expert HR advice.

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
- Used: ${usedIsencaoHours.toFixed(1)} / ${annualIsencaoLimit} hours (${isencaoPercentage}%)
- Remaining: ${remainingIsencaoHours.toFixed(1)} hours
- Status: ${usedIsencaoHours >= annualIsencaoLimit ? 'LIMIT REACHED' : usedIsencaoHours >= annualIsencaoLimit * 0.9 ? 'APPROACHING LIMIT' : 'WITHIN LIMIT'}

CURRENT WEEK COMPLIANCE ANALYSIS:
- This week's total hours: ${weekHours.toFixed(1)} hours
- Portuguese law limit: 40 hours/week
- Status: ${weekHours > 40 ? 'EXCEEDS LIMIT' : weekHours > 35 ? 'APPROACHING LIMIT' : 'WITHIN LIMIT'}
- Average daily hours (last 30 days): ${avgDailyHours} hours/day
- Portuguese law limit: 8 hours/day (normal), 10 hours/day (with overtime)
- Consecutive weekend work: ${consecutiveWeekends} weekends

RECENT SESSIONS (last 10):
${recentSessionsFormatted || 'No recent sessions'}

=== YOUR ANALYSIS INSTRUCTIONS ===

When the user asks questions or you analyze their data:

1. COMPLIANCE ANALYSIS:
   - Compare their actual hours against Portuguese labor law limits
   - Calculate compliance percentages (e.g., "You've used 75% of your Isenção limit")
   - Identify potential violations (e.g., "This week you worked 48 hours, exceeding the 40-hour limit")
   - Alert proactively when approaching limits

2. LEGAL CONTEXT:
   - Reference specific Portuguese labor law articles when relevant
   - Explain legal implications clearly
   - Provide context for their specific situation
   - Clarify rights and obligations

3. HR BEST PRACTICES:
   - Offer work-life balance recommendations
   - Suggest productivity improvements
   - Identify burnout risk patterns
   - Recommend time management strategies
   - Suggest discussions with HR/management when appropriate

4. ACTIONABLE ADVICE:
   - Provide specific, actionable recommendations
   - Calculate exact numbers (hours, percentages, remaining limits)
   - Suggest concrete steps to improve compliance
   - Recommend when to take vacation or use earned days off

5. PROACTIVE ALERTS:
   - Flag compliance issues before they become problems
   - Alert when approaching legal limits
   - Identify concerning patterns (excessive hours, insufficient rest)
   - Suggest preventive measures

6. RESPONSE FORMAT:
   - Format your replies using Markdown: headings, bullet/numbered lists, **bold**, \`code\`, blockquotes, etc., for clarity and readability.

Always be helpful, accurate, and provide context-specific advice based on the user's actual data patterns.`;

    return context;
  } catch (error) {
    console.error('Error loading user context:', error);
    return 'Error loading user context. The user is using a time tracking application called Clock In App.';
  }
}
