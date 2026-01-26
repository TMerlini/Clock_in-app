import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfWeek, endOfWeek } from 'date-fns';
import { calculatePeriodFinance } from './financeCalculator';

/**
 * Aggregates enterprise member data (sessions, analytics, finance) into a formatted context string for AI
 * @param {string} enterpriseId - The enterprise ID
 * @param {Array<{id: string, email?: string, enterpriseRole: string}>} members - Array of member objects
 * @returns {Promise<string>} Formatted context string with team data
 */
export async function getEnterpriseMembersContext(enterpriseId, members) {
  try {
    if (!enterpriseId || !members || members.length === 0) {
      return 'No members data available.';
    }

    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const currentYear = now.getFullYear();
    const yearStart = startOfYear(now).getTime();
    const yearEnd = endOfYear(now).getTime();

    // Load data for all members in parallel
    const memberDataPromises = members.map(async (member) => {
      try {
        const [sessionsSnap, settingsSnap] = await Promise.all([
          getDocs(query(collection(db, 'sessions'), where('userId', '==', member.id))),
          getDoc(doc(db, 'userSettings', member.id))
        ]);

        const sessions = [];
        sessionsSnap.forEach((d) => {
          const data = d.data();
          sessions.push({
            id: d.id,
            ...data,
            clockIn: data.clockIn?.toDate ? data.clockIn.toDate() : new Date(data.clockIn)
          });
        });

        const settings = settingsSnap.exists() ? settingsSnap.data() : {};
        const financeSettings = settings.financeSettings || {};

        // Calculate current month finance
        let financeData = null;
        if (sessions.length > 0 && financeSettings.hourlyRate) {
          try {
            financeData = calculatePeriodFinance(
              sessions,
              { start: currentMonthStart, end: currentMonthEnd },
              {
                hourlyRate: financeSettings.hourlyRate || 0,
                isencaoRate: financeSettings.isencaoRate || 0,
                isencaoCalculationMethod: financeSettings.isencaoCalculationMethod || 'percentage',
                isencaoFixedAmount: financeSettings.isencaoFixedAmount || 0,
                taxDeductionType: financeSettings.taxDeductionType || 'both',
                irsRate: financeSettings.irsRate || 0,
                irsBaseSalaryRate: financeSettings.irsBaseSalaryRate || 0,
                irsIhtRate: financeSettings.irsIhtRate || 0,
                irsOvertimeRate: financeSettings.irsOvertimeRate || 0,
                socialSecurityRate: financeSettings.socialSecurityRate ?? 11,
                customTaxRate: financeSettings.customTaxRate || 0,
                mealAllowanceIncluded: !!financeSettings.mealAllowanceIncluded,
                overtimeFirstHourRate: financeSettings.overtimeFirstHourRate ?? 1.25,
                overtimeSubsequentRate: financeSettings.overtimeSubsequentRate ?? 1.5,
                weekendOvertimeRate: financeSettings.weekendOvertimeRate ?? 1.5,
                holidayOvertimeRate: financeSettings.holidayOvertimeRate ?? 2,
                fixedBonus: financeSettings.fixedBonus || 0,
                dailyMealSubsidy: financeSettings.dailyMealSubsidy || 0,
                mealCardDeduction: financeSettings.mealCardDeduction || 0
              }
            );
          } catch (e) {
            console.error(`Error calculating finance for member ${member.id}:`, e);
          }
        }

        // Calculate analytics
        const totalSessions = sessions.length;
        const totalHours = sessions.reduce((sum, s) => sum + (s.totalHours || 0), 0);
        const regularHours = sessions.reduce((sum, s) => sum + (s.regularHours || 0), 0);
        const unpaidHours = sessions.reduce((sum, s) => sum + (s.unpaidExtraHours || 0), 0);
        const paidOvertimeHours = sessions.reduce((sum, s) => sum + (s.paidExtraHours || 0), 0);
        const weekendSessions = sessions.filter(s => s.isWeekend).length;

        // Current year Isenção usage
        const yearSessions = sessions.filter(s => {
          const sessionTime = s.clockIn?.getTime ? s.clockIn.getTime() : new Date(s.clockIn).getTime();
          return sessionTime >= yearStart && sessionTime <= yearEnd;
        });
        const usedIsencaoHours = yearSessions.reduce((sum, s) => sum + (s.unpaidExtraHours || 0), 0);
        const annualIsencaoLimit = settings.annualIsencaoLimit || 200;
        const isencaoPercentage = annualIsencaoLimit > 0 ? (usedIsencaoHours / annualIsencaoLimit * 100).toFixed(1) : 0;

        // Recent activity (last 30 days)
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const recentSessions = sessions.filter(s => {
          const sessionDate = s.clockIn?.getTime ? s.clockIn.getTime() : new Date(s.clockIn).getTime();
          return sessionDate >= thirtyDaysAgo.getTime();
        });
        const recentHours = recentSessions.reduce((sum, s) => sum + (s.totalHours || 0), 0);
        const recentWorkDays = new Set(recentSessions.map(s => {
          const d = s.clockIn?.getTime ? s.clockIn : new Date(s.clockIn);
          return format(d, 'yyyy-MM-dd');
        })).size;

        return {
          member,
          sessions,
          settings,
          financeData,
          analytics: {
            totalSessions,
            totalHours,
            regularHours,
            unpaidHours,
            paidOvertimeHours,
            weekendSessions,
            usedIsencaoHours,
            annualIsencaoLimit,
            isencaoPercentage,
            recentHours,
            recentWorkDays
          }
        };
      } catch (error) {
        console.error(`Error loading data for member ${member.id}:`, error);
        return {
          member,
          sessions: [],
          settings: {},
          financeData: null,
          analytics: {
            totalSessions: 0,
            totalHours: 0,
            regularHours: 0,
            unpaidHours: 0,
            paidOvertimeHours: 0,
            weekendSessions: 0,
            usedIsencaoHours: 0,
            annualIsencaoLimit: 200,
            isencaoPercentage: 0,
            recentHours: 0,
            recentWorkDays: 0
          }
        };
      }
    });

    const allMemberData = await Promise.all(memberDataPromises);

    // Calculate team aggregates
    const teamTotalHours = allMemberData.reduce((sum, m) => sum + m.analytics.totalHours, 0);
    const teamRegularHours = allMemberData.reduce((sum, m) => sum + m.analytics.regularHours, 0);
    const teamUnpaidHours = allMemberData.reduce((sum, m) => sum + m.analytics.unpaidHours, 0);
    const teamPaidOvertimeHours = allMemberData.reduce((sum, m) => sum + m.analytics.paidOvertimeHours, 0);
    const teamTotalSessions = allMemberData.reduce((sum, m) => sum + m.analytics.totalSessions, 0);
    const teamIsencaoUsed = allMemberData.reduce((sum, m) => sum + m.analytics.usedIsencaoHours, 0);
    const teamRecentHours = allMemberData.reduce((sum, m) => sum + m.analytics.recentHours, 0);
    const teamRecentWorkDays = allMemberData.reduce((sum, m) => sum + m.analytics.recentWorkDays, 0);

    // Team finance aggregates (current month)
    const teamGrossSalary = allMemberData.reduce((sum, m) => {
      return sum + (m.financeData?.earnings?.grossSalary || 0);
    }, 0);
    const teamNetSalary = allMemberData.reduce((sum, m) => {
      return sum + (m.financeData?.netSalary || 0);
    }, 0);
    const teamTotalDeductions = allMemberData.reduce((sum, m) => {
      return sum + (m.financeData?.deductions?.total || 0);
    }, 0);

    // Identify compliance issues
    const membersOverIsencaoLimit = allMemberData.filter(m => 
      m.analytics.usedIsencaoHours >= m.analytics.annualIsencaoLimit
    );
    const membersApproachingIsencaoLimit = allMemberData.filter(m => {
      const percentage = m.analytics.annualIsencaoLimit > 0 
        ? (m.analytics.usedIsencaoHours / m.analytics.annualIsencaoLimit * 100)
        : 0;
      return percentage >= 90 && percentage < 100;
    });

    // Format per-member summaries
    const memberSummaries = allMemberData.map((m) => {
      // Get display name: alias (username) > email > id
      const displayName = m.member.username?.trim() 
        ? `@${m.member.username.trim()}` 
        : (m.member.email?.trim() || m.member.id || 'Unknown');
      const role = m.member.enterpriseRole || 'member';
      const finance = m.financeData;
      const analytics = m.analytics;

      let summary = `\n**${displayName}** (${role})`;
      summary += `\n- Total sessions: ${analytics.totalSessions}`;
      summary += `\n- Total hours (all time): ${analytics.totalHours.toFixed(1)}h`;
      summary += `\n- Regular hours: ${analytics.regularHours.toFixed(1)}h`;
      summary += `\n- Isenção (unpaid) hours: ${analytics.unpaidHours.toFixed(1)}h`;
      summary += `\n- Paid overtime: ${analytics.paidOvertimeHours.toFixed(1)}h`;
      summary += `\n- Weekend sessions: ${analytics.weekendSessions}`;
      summary += `\n- Current year Isenção: ${analytics.usedIsencaoHours.toFixed(1)}h / ${analytics.annualIsencaoLimit}h (${analytics.isencaoPercentage}%)`;
      
      if (analytics.usedIsencaoHours >= analytics.annualIsencaoLimit) {
        summary += ` [LIMIT REACHED]`;
      } else if (analytics.usedIsencaoHours >= analytics.annualIsencaoLimit * 0.9) {
        summary += ` [APPROACHING LIMIT]`;
      }

      summary += `\n- Recent activity (last 30 days): ${analytics.recentHours.toFixed(1)}h over ${analytics.recentWorkDays} working days`;

      if (finance) {
        summary += `\n- Current month finance:`;
        summary += `\n  - Gross salary: €${finance.earnings.grossSalary.toFixed(2)}`;
        summary += `\n  - Net salary: €${finance.netSalary.toFixed(2)}`;
        summary += `\n  - Total deductions: €${finance.deductions.total.toFixed(2)}`;
        summary += `\n  - Working days: ${finance.workingDays || 0}`;
      } else {
        summary += `\n- Finance data: Not configured or no sessions`;
      }

      return summary;
    }).join('\n');

    // Build context string
    const context = `=== ENTERPRISE TEAM DATA ===

You have access to detailed data for all members of this enterprise. Use this information to provide team-level analyses, identify compliance issues, and suggest workarounds.

TEAM OVERVIEW:
- Total members: ${members.length}
- Total sessions (all time): ${teamTotalSessions}
- Total hours worked (all time): ${teamTotalHours.toFixed(1)}h
- Regular hours: ${teamRegularHours.toFixed(1)}h
- Isenção (unpaid) hours: ${teamUnpaidHours.toFixed(1)}h
- Paid overtime hours: ${teamPaidOvertimeHours.toFixed(1)}h
- Current year Isenção used (team total): ${teamIsencaoUsed.toFixed(1)}h
- Recent activity (last 30 days): ${teamRecentHours.toFixed(1)}h over ${teamRecentWorkDays} working days

CURRENT MONTH FINANCE (TEAM AGGREGATE):
- Total gross salary: €${teamGrossSalary.toFixed(2)}
- Total net salary: €${teamNetSalary.toFixed(2)}
- Total deductions: €${teamTotalDeductions.toFixed(2)}

COMPLIANCE FLAGS:
- Members over Isenção limit: ${membersOverIsencaoLimit.length} (${membersOverIsencaoLimit.map(m => {
        const name = m.member.username?.trim() ? `@${m.member.username.trim()}` : (m.member.email?.trim() || m.member.id || 'Unknown');
        return name;
      }).join(', ') || 'none'})
- Members approaching Isenção limit (≥90%): ${membersApproachingIsencaoLimit.length} (${membersApproachingIsencaoLimit.map(m => {
        const name = m.member.username?.trim() ? `@${m.member.username.trim()}` : (m.member.email?.trim() || m.member.id || 'Unknown');
        return name;
      }).join(', ') || 'none'})

PER-MEMBER DETAILS:
${memberSummaries}

=== YOUR ANALYSIS INSTRUCTIONS ===

When analyzing team data:

1. **Team-Level Analysis:**
   - Identify patterns across members (e.g., "3 members are approaching Isenção limits")
   - Calculate team averages (e.g., average hours per member, average Isenção usage)
   - Highlight outliers (members with unusually high/low hours, excessive overtime, etc.)

2. **Compliance Monitoring:**
   - Flag members who have exceeded or are approaching Isenção limits
   - Identify members with excessive weekly hours (>40h/week average)
   - Alert about members with insufficient rest patterns
   - Suggest team-wide policy adjustments if multiple members show similar issues

3. **Workarounds for Warning Situations:**
   - For members approaching/over Isenção limits: suggest redistributing work, converting to paid overtime, or using time off
   - For excessive hours: recommend workload balancing, hiring additional staff, or adjusting schedules
   - For compliance risks: provide specific legal context and actionable steps

4. **Finance Insights:**
   - Compare gross vs net salaries across members
   - Identify members with high deductions (may indicate high earnings or tax bracket issues)
   - Suggest optimization opportunities (e.g., meal allowance adjustments, tax planning)

5. **Individual Member Support:**
   - When asked about a specific member, provide detailed analysis of their data
   - Compare their metrics against team averages
   - Provide personalized recommendations based on their patterns

Always reference specific member data when providing analyses, and suggest concrete, actionable workarounds for any compliance issues identified.`;

    return context;
  } catch (error) {
    console.error('Error loading enterprise members context:', error);
    return 'Error loading team data. Member data may not be available.';
  }
}

const defaultFinanceSettings = () => ({
  hourlyRate: 0,
  isencaoRate: 0,
  isencaoCalculationMethod: 'percentage',
  isencaoFixedAmount: 0,
  taxDeductionType: 'both',
  irsRate: 0,
  irsBaseSalaryRate: 0,
  irsIhtRate: 0,
  irsOvertimeRate: 0,
  socialSecurityRate: 11,
  customTaxRate: 0,
  mealAllowanceIncluded: false,
  overtimeFirstHourRate: 1.25,
  overtimeSubsequentRate: 1.5,
  weekendOvertimeRate: 1.5,
  holidayOvertimeRate: 2,
  fixedBonus: 0,
  dailyMealSubsidy: 0,
  mealCardDeduction: 0
});

/**
 * Fetch per-member finance for a date range and aggregate team stats.
 * @param {string} enterpriseId
 * @param {Array<{id: string}>} members
 * @param {{ start: Date, end: Date }} dateRange
 * @returns {Promise<{ grossSalary: number, netSalary: number, totalDeductions: number, irs: number, socialSecurity: number, customTax: number, totalHours: number, totalWorkingDays: number, memberCount: number, overIsencaoCount: number, approachingIsencaoCount: number, perMember: Array<{ memberId: string, memberName: string, paidOvertimeHours: number, unpaidHours: number }> }>}
 */
export async function getEnterpriseStats(enterpriseId, members, dateRange) {
  if (!enterpriseId || !members || members.length === 0 || !dateRange?.start || !dateRange?.end) {
    return {
      grossSalary: 0,
      netSalary: 0,
      totalDeductions: 0,
      irs: 0,
      socialSecurity: 0,
      customTax: 0,
      totalHours: 0,
      totalWorkingDays: 0,
      memberCount: members?.length || 0,
      overIsencaoCount: 0,
      approachingIsencaoCount: 0,
      perMember: []
    };
  }
  const { start, end } = dateRange;
  const yearStart = startOfYear(end);
  const yearEnd = endOfYear(end);
  const promises = members.map(async (member) => {
    try {
      const [sessionsSnap, settingsSnap] = await Promise.all([
        getDocs(query(collection(db, 'sessions'), where('userId', '==', member.id))),
        getDoc(doc(db, 'userSettings', member.id))
      ]);
      const sessions = [];
      sessionsSnap.forEach((d) => {
        const data = d.data();
        sessions.push({
          id: d.id,
          ...data,
          clockIn: data.clockIn?.toDate ? data.clockIn.toDate() : new Date(data.clockIn)
        });
      });
      const settings = settingsSnap.exists() ? settingsSnap.data() : {};
      const fs = settings.financeSettings || {};
      const financeSettings = {
        ...defaultFinanceSettings(),
        hourlyRate: fs.hourlyRate || 0,
        isencaoRate: fs.isencaoRate || 0,
        isencaoCalculationMethod: fs.isencaoCalculationMethod || 'percentage',
        isencaoFixedAmount: fs.isencaoFixedAmount || 0,
        taxDeductionType: fs.taxDeductionType || 'both',
        irsRate: fs.irsRate || 0,
        irsBaseSalaryRate: fs.irsBaseSalaryRate || 0,
        irsIhtRate: fs.irsIhtRate || 0,
        irsOvertimeRate: fs.irsOvertimeRate || 0,
        socialSecurityRate: fs.socialSecurityRate ?? 11,
        customTaxRate: fs.customTaxRate || 0,
        mealAllowanceIncluded: !!fs.mealAllowanceIncluded,
        overtimeFirstHourRate: fs.overtimeFirstHourRate ?? 1.25,
        overtimeSubsequentRate: fs.overtimeSubsequentRate ?? 1.5,
        weekendOvertimeRate: fs.weekendOvertimeRate ?? 1.5,
        holidayOvertimeRate: fs.holidayOvertimeRate ?? 2,
        fixedBonus: fs.fixedBonus || 0,
        dailyMealSubsidy: fs.dailyMealSubsidy || 0,
        mealCardDeduction: fs.mealCardDeduction || 0
      };
      let finance = null;
      if (sessions.length > 0 && financeSettings.hourlyRate) {
        try {
          finance = calculatePeriodFinance(sessions, { start, end }, financeSettings);
        } catch (e) {
          console.error(`Finance calc error for member ${member.id}:`, e);
        }
      }
      const yearSessions = sessions.filter((s) => {
        const t = s.clockIn?.getTime ? s.clockIn.getTime() : new Date(s.clockIn).getTime();
        return t >= yearStart.getTime() && t <= yearEnd.getTime();
      });
      const usedIsencaoHours = yearSessions.reduce((sum, s) => sum + (s.unpaidExtraHours || 0), 0);
      const annualIsencaoLimit = settings.annualIsencaoLimit || 200;
      const overLimit = usedIsencaoHours >= annualIsencaoLimit;
      const approaching = annualIsencaoLimit > 0 && usedIsencaoHours >= annualIsencaoLimit * 0.9 && usedIsencaoHours < annualIsencaoLimit;
      const memberName = member.username?.trim()
        ? `@${member.username.trim()}`
        : (member.email?.trim() || member.id || 'Unknown');
      const paidOvertimeHours = finance?.hours?.paidExtra ?? 0;
      const unpaidHours = finance?.hours?.isencao ?? 0;
      return { member, memberName, finance, overLimit, approaching, paidOvertimeHours, unpaidHours };
    } catch (e) {
      console.error(`Stats fetch error for member ${member.id}:`, e);
      const memberName = member.username?.trim()
        ? `@${member.username.trim()}`
        : (member.email?.trim() || member.id || 'Unknown');
      return {
        member,
        memberName,
        finance: null,
        overLimit: false,
        approaching: false,
        paidOvertimeHours: 0,
        unpaidHours: 0
      };
    }
  });
  const results = await Promise.all(promises);
  const perMember = results.map((r) => ({
    memberId: r.member.id,
    memberName: r.memberName,
    paidOvertimeHours: r.paidOvertimeHours ?? 0,
    unpaidHours: r.unpaidHours ?? 0
  }));
  const agg = {
    grossSalary: 0,
    netSalary: 0,
    totalDeductions: 0,
    irs: 0,
    socialSecurity: 0,
    customTax: 0,
    totalHours: 0,
    totalWorkingDays: 0,
    memberCount: members.length,
    overIsencaoCount: 0,
    approachingIsencaoCount: 0
  };
  results.forEach((r) => {
    if (!r) return;
    const f = r.finance;
    if (r.overLimit) agg.overIsencaoCount += 1;
    if (r.approaching) agg.approachingIsencaoCount += 1;
    if (!f) return;
    agg.grossSalary += f.earnings?.grossSalary ?? 0;
    agg.netSalary += f.netSalary ?? 0;
    agg.totalDeductions += (f.deductions?.total ?? 0) + (f.deductions?.mealCardDeduction ?? 0);
    agg.irs += f.deductions?.irs ?? 0;
    agg.socialSecurity += f.deductions?.socialSecurity ?? 0;
    agg.customTax += f.deductions?.custom ?? 0;
    agg.totalHours += (f.hours?.regular ?? 0) + (f.hours?.isencao ?? 0) + (f.hours?.paidExtra ?? 0);
    agg.totalWorkingDays += f.workingDays ?? 0;
  });
  return { ...agg, perMember };
}

const ANNUAL_OVERTIME_CAP = 150;

function memberDisplayName(m) {
  const n = (m.username || '').trim();
  if (n) return n.startsWith('@') ? n : `@${n}`;
  const e = (m.email || '').trim();
  if (e) return e;
  return m.id || 'Unknown';
}

/**
 * Fetch per-member team warnings (Isenção, overtime, etc.) for the Team Warnings card.
 * @param {string} enterpriseId
 * @param {Array<{ id: string, email?: string, username?: string }>} members
 * @returns {Promise<{ warnings: Array<{ memberId: string, memberName: string, type: string, severity: string, detail: string }> }>}
 */
export async function getEnterpriseTeamWarnings(enterpriseId, members) {
  if (!enterpriseId || !members || members.length === 0) {
    return { warnings: [] };
  }
  const now = new Date();
  const yearStart = startOfYear(now);
  const yearEnd = endOfYear(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const promises = members.map(async (member) => {
    const warnings = [];
    const name = memberDisplayName(member);
    try {
      const [sessionsSnap, settingsSnap] = await Promise.all([
        getDocs(query(collection(db, 'sessions'), where('userId', '==', member.id))),
        getDoc(doc(db, 'userSettings', member.id))
      ]);
      const sessions = [];
      sessionsSnap.forEach((d) => {
        const data = d.data();
        sessions.push({
          id: d.id,
          ...data,
          clockIn: data.clockIn?.toDate ? data.clockIn.toDate() : new Date(data.clockIn)
        });
      });
      const settings = settingsSnap.exists() ? settingsSnap.data() : {};
      const annualIsencaoLimit = settings.annualIsencaoLimit ?? 200;

      const yearSessions = sessions.filter((s) => {
        const t = s.clockIn?.getTime ? s.clockIn.getTime() : new Date(s.clockIn).getTime();
        return t >= yearStart.getTime() && t <= yearEnd.getTime();
      });
      const usedIsencaoHours = yearSessions.reduce((sum, s) => sum + (s.unpaidExtraHours || 0), 0);

      if (usedIsencaoHours >= annualIsencaoLimit) {
        const pct = annualIsencaoLimit > 0 ? ((usedIsencaoHours / annualIsencaoLimit) * 100).toFixed(0) : 0;
        warnings.push({
          memberId: member.id,
          memberName: name,
          type: 'isencao_over',
          severity: 'high',
          detail: `${usedIsencaoHours.toFixed(0)}h / ${annualIsencaoLimit}h (${pct}%)`
        });
      } else if (annualIsencaoLimit > 0 && usedIsencaoHours >= annualIsencaoLimit * 0.9) {
        const pct = ((usedIsencaoHours / annualIsencaoLimit) * 100).toFixed(0);
        warnings.push({
          memberId: member.id,
          memberName: name,
          type: 'isencao_approaching',
          severity: 'medium',
          detail: `${pct}% (${usedIsencaoHours.toFixed(0)}h / ${annualIsencaoLimit}h)`
        });
      }

      const weekSessions = sessions.filter((s) => {
        const t = s.clockIn?.getTime ? s.clockIn.getTime() : new Date(s.clockIn).getTime();
        return t >= weekStart.getTime() && t <= weekEnd.getTime();
      });
      const weekHours = weekSessions.reduce((sum, s) => sum + (s.totalHours || 0), 0);
      if (weekHours > 40) {
        warnings.push({
          memberId: member.id,
          memberName: name,
          type: 'overtime_weekly',
          severity: 'medium',
          detail: `${weekHours.toFixed(0)}h this week`
        });
      }

      const ytdPaidExtra = yearSessions.reduce((sum, s) => sum + (s.paidExtraHours || 0), 0);
      if (ytdPaidExtra > ANNUAL_OVERTIME_CAP) {
        warnings.push({
          memberId: member.id,
          memberName: name,
          type: 'overtime_annual',
          severity: 'high',
          detail: `${ytdPaidExtra.toFixed(0)}h / ${ANNUAL_OVERTIME_CAP}h`
        });
      }

      return warnings;
    } catch (e) {
      console.error(`Team warnings fetch error for member ${member.id}:`, e);
      return [];
    }
  });

  const results = await Promise.all(promises);
  const warnings = results.flat();
  return { warnings };
}
