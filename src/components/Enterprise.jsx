import { useState, useEffect, useMemo, useRef, useCallback, Fragment } from 'react';
import { collection, doc, getDoc, getDocs, query, where, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  createEnterprise,
  createInvite,
  listMembers,
  listPendingInvites,
  getEnterprise,
  updateEnterprise,
  removeMember,
  cancelInvite,
  leaveOrganization,
  setMemberRole,
  getEnterprisePremiumAIMemberCount
} from '../lib/enterpriseHelpers';
import { getEnterpriseMaxPremiumUsers } from '../lib/planConfig';
import { getEnterpriseStats, getEnterpriseTeamWarnings } from '../lib/enterpriseMembersContext';
import { calculatePeriodFinance } from '../lib/financeCalculator';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format, formatDistanceToNow, eachMonthOfInterval, subMonths, subWeeks, subDays, subYears, addDays, addWeeks } from 'date-fns';
import { getDateFnsLocale } from '../lib/i18n';
import { formatHoursMinutes } from '../lib/utils';
import { Building2, UserPlus, Users, Loader, AlertCircle, Crown, ArrowRight, ArrowLeft, Eye, BarChart3, DollarSign, Clock, Download, Trash2, X, Shield, UserMinus, TrendingUp, AlertTriangle, Bot, MapPin, Calendar as CalendarIcon, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { LocationMiniMap } from './LocationMiniMap';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
import { EnterpriseAISection } from './EnterpriseAISection';
import './Enterprise.css';

/**
 * Get display name for a member: alias (username) > email > id
 * @param {Object} member - Member object with username, email, and id
 * @returns {string} Display name
 */
function getMemberDisplayName(member) {
  if (member?.username?.trim()) {
    return `@${member.username.trim()}`;
  }
  if (member?.email?.trim()) {
    return member.email.trim();
  }
  return member?.id || 'Unknown';
}

/**
 * Returns warning keys for likely misconfigurations in member finance settings.
 * @param {Object} fs - financeSettings object
 * @returns {string[]} Array of translation keys for warning messages
 */
function getMemberFinanceSettingsWarnings(fs) {
  if (!fs) return [];
  const warnings = [];
  const rate = fs.hourlyRate ?? 0;
  if (!rate || rate <= 0) {
    warnings.push('enterprise.memberFinanceWarningNoHourlyRate');
  }
  const taxType = fs.taxDeductionType || 'both';
  const ssRate = fs.socialSecurityRate ?? 11;
  if ((taxType === 'both' || taxType === 'social_security') && ssRate === 0) {
    warnings.push('enterprise.memberFinanceWarningZeroSocialSecurity');
  }
  const irsBase = fs.irsBaseSalaryRate ?? 0;
  const irsIht = fs.irsIhtRate ?? 0;
  const irsOt = fs.irsOvertimeRate ?? 0;
  const irsLegacy = fs.irsRate ?? 0;
  const hasAnyIrs = irsBase > 0 || irsIht > 0 || irsOt > 0 || irsLegacy > 0;
  if ((taxType === 'both' || taxType === 'irs') && !hasAnyIrs) {
    warnings.push('enterprise.memberFinanceWarningZeroIrs');
  }
  return warnings;
}

export function Enterprise({ user, onNavigate }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [enterpriseId, setEnterpriseId] = useState(null);
  const [enterpriseRole, setEnterpriseRole] = useState(null);
  const [enterprise, setEnterprise] = useState(null);
  const [members, setMembers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [createName, setCreateName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [cancellingInviteId, setCancellingInviteId] = useState(null);
  const [orgNameEdit, setOrgNameEdit] = useState('');
  const [savingOrgName, setSavingOrgName] = useState(false);
  const [leavingOrg, setLeavingOrg] = useState(false);
  const [membersFilter, setMembersFilter] = useState('');
  const [membersRoleFilter, setMembersRoleFilter] = useState('all');
  const [updatingRoleId, setUpdatingRoleId] = useState(null);
  const [globalStats, setGlobalStats] = useState(null);
  const [teamChartData, setTeamChartData] = useState([]);
  const [teamChartLoading, setTeamChartLoading] = useState(false);
  const [teamChartScale, setTeamChartScale] = useState('linear');
  const [teamWarnings, setTeamWarnings] = useState([]);
  const [teamWarningsLoading, setTeamWarningsLoading] = useState(false);
  const [aiTriggerPrompt, setAiTriggerPrompt] = useState(null);
  const aiSectionRef = useRef(null);
  const [globalStatsLoading, setGlobalStatsLoading] = useState(false);
  const [globalStatsPeriod, setGlobalStatsPeriod] = useState('monthly');
  const [globalStatsDate, setGlobalStatsDate] = useState(new Date());
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberDetailTab, setMemberDetailTab] = useState('sessions');
  const [memberSessions, setMemberSessions] = useState([]);
  const [memberDeductions, setMemberDeductions] = useState([]);
  const [memberSettings, setMemberSettings] = useState(null);
  const [memberDetailLoading, setMemberDetailLoading] = useState(false);
  const [memberDetailError, setMemberDetailError] = useState(null);
  const [memberReportType, setMemberReportType] = useState('monthly');
  const [memberSelectedDate, setMemberSelectedDate] = useState(new Date());
  const [bulkExportLoading, setBulkExportLoading] = useState(false);
  const [expandedMapSession, setExpandedMapSession] = useState(null);
  const [ongoingSessions, setOngoingSessions] = useState([]);
  const [elapsedTick, setElapsedTick] = useState(0);

  const googleCalendar = useGoogleCalendar();
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarEventsLoading, setCalendarEventsLoading] = useState(false);
  const [calendarViewMode, setCalendarViewMode] = useState('daily');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarCollapsed, setCalendarCollapsed] = useState(true);
  const [calendarList, setCalendarList] = useState([]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const settingsRef = doc(db, 'userSettings', user.uid);
        const snap = await getDoc(settingsRef);
        const data = snap.exists() ? snap.data() : {};
        const p = (data.subscriptionPlan || data.plan || '').toLowerCase();
        const eid = data.enterpriseId || null;
        const role = data.enterpriseRole || null;
        setPlan(p);
        setEnterpriseId(eid);
        setEnterpriseRole(role);

        if (eid) {
          const [ent, mems, invs] = await Promise.all([
            getEnterprise(eid),
            listMembers(eid),
            listPendingInvites(eid)
          ]);
          setEnterprise(ent);
          setMembers(mems);
          setPendingInvites(invs);
          if (ent && ent.createdBy === user.uid && role === 'member') {
            await setDoc(settingsRef, { enterpriseRole: 'admin' }, { merge: true });
            setEnterpriseRole('admin');
          }
        }
      } catch (err) {
        console.error('Enterprise load error:', err);
        setError(err.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  useEffect(() => {
    if (enterprise?.name != null) setOrgNameEdit(enterprise.name);
  }, [enterprise?.name]);

  // On-going sessions: real-time listeners for activeClockIns per member
  useEffect(() => {
    if (!enterpriseId || !members.length) {
      setOngoingSessions([]);
      return;
    }
    const memberById = new Map(members.map(m => [m.id, m]));
    const unsubs = [];
    members.forEach((member) => {
      const ref = doc(db, 'activeClockIns', member.id);
      const unsub = onSnapshot(ref, (snap) => {
        setOngoingSessions((prev) => {
          const m = memberById.get(member.id);
          if (!snap.exists()) {
            return prev.filter((s) => s.member.id !== member.id);
          }
          const data = snap.data();
          const clockInTime = data.clockInTime ?? (data.clockIn?.toDate ? data.clockIn.toDate().getTime() : Date.now());
          const entry = { member: m || member, clockInTime };
          const next = prev.filter((s) => s.member.id !== member.id);
          next.push(entry);
          return next.sort((a, b) => a.clockInTime - b.clockInTime);
        });
      });
      unsubs.push(unsub);
    });
    return () => unsubs.forEach((u) => u());
  }, [enterpriseId, members]);

  // Elapsed time tick for ongoing sessions (updates every second)
  useEffect(() => {
    if (ongoingSessions.length === 0) return;
    const id = setInterval(() => setElapsedTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [ongoingSessions.length]);

  const hasAccess = plan === 'enterprise' || !!enterpriseId;

  // Google Calendar: load calendars and events
  useEffect(() => {
    if (!googleCalendar.isAuthorized) return;
    const load = async () => {
      try {
        const cals = await googleCalendar.listCalendars();
        setCalendarList(cals);
      } catch (err) {
        console.error('Error loading calendars:', err);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleCalendar.isAuthorized]);

  useEffect(() => {
    if (!googleCalendar.isAuthorized || calendarList.length === 0) return;
    const load = async () => {
      setCalendarEventsLoading(true);
      try {
        const now = new Date();
        const timeMin = subDays(now, 90);
        const timeMax = addDays(now, 30);
        const calendarIds = calendarList.map(c => c.id);
        const events = await googleCalendar.listCalendarEvents(
          timeMin.toISOString(),
          timeMax.toISOString(),
          250,
          calendarIds
        );
        setCalendarEvents(events);
      } catch (err) {
        console.error('Error loading calendar events:', err);
      } finally {
        setCalendarEventsLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleCalendar.isAuthorized, calendarList.length]);

  const calendarPeriodEvents = useMemo(() => {
    if (!calendarEvents.length) return [];
    let start, end;
    if (calendarViewMode === 'daily') {
      start = startOfDay(calendarDate);
      end = endOfDay(calendarDate);
    } else if (calendarViewMode === 'weekly') {
      start = startOfWeek(calendarDate, { weekStartsOn: 1 });
      end = endOfDay(endOfWeek(calendarDate, { weekStartsOn: 1 }));
    } else {
      start = startOfMonth(calendarDate);
      end = endOfDay(endOfMonth(calendarDate));
    }
    return calendarEvents
      .filter(ev => {
        const evStart = new Date(ev.start.dateTime || ev.start.date);
        return evStart >= start && evStart <= end;
      })
      .sort((a, b) => {
        const aStart = new Date(a.start.dateTime || a.start.date).getTime();
        const bStart = new Date(b.start.dateTime || b.start.date).getTime();
        return bStart - aStart;
      });
  }, [calendarEvents, calendarDate, calendarViewMode]);

  const handleCalendarNav = useCallback((direction) => {
    setCalendarDate(prev => {
      if (calendarViewMode === 'daily') return direction > 0 ? addDays(prev, 1) : subDays(prev, 1);
      if (calendarViewMode === 'weekly') return direction > 0 ? addWeeks(prev, 1) : subWeeks(prev, 1);
      return direction > 0 ? new Date(prev.getFullYear(), prev.getMonth() + 1, 1) : new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
    });
  }, [calendarViewMode]);

  const calendarDateLabel = useMemo(() => {
    const loc = getDateFnsLocale();
    if (calendarViewMode === 'daily') return format(calendarDate, 'EEEE, MMM d, yyyy', { locale: loc });
    if (calendarViewMode === 'weekly') {
      const ws = startOfWeek(calendarDate, { weekStartsOn: 1 });
      const we = endOfWeek(calendarDate, { weekStartsOn: 1 });
      return `${format(ws, 'MMM d', { locale: loc })} – ${format(we, 'MMM d, yyyy', { locale: loc })}`;
    }
    return format(calendarDate, 'MMMM yyyy', { locale: loc });
  }, [calendarDate, calendarViewMode]);

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    if (!createName.trim() || creating) return;
    setCreating(true);
    setError(null);
    setSuccess(null);
    try {
      const { id: eid } = await createEnterprise(user.uid, createName.trim());
      setSuccess(t('enterprise.createSuccess'));
      setCreateName('');
      setEnterpriseId(eid);
      setEnterpriseRole('admin');
      const [ent, mems, invs] = await Promise.all([
        getEnterprise(eid),
        listMembers(eid),
        listPendingInvites(eid)
      ]);
      setEnterprise(ent);
      setMembers(mems);
      setPendingInvites(invs);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || t('enterprise.createError'));
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || inviting || !enterpriseId) return;
    const email = inviteEmail.trim().toLowerCase();
    if (user.email && user.email.toLowerCase() === email) {
      setError(t('enterprise.inviteSelf'));
      return;
    }
    
    // Check Premium AI member limit before inviting
    try {
      const maxPremiumUsers = await getEnterpriseMaxPremiumUsers();
      const premiumAiCount = await getEnterprisePremiumAIMemberCount(enterpriseId);
      if (premiumAiCount >= maxPremiumUsers) {
        setError(t('enterprise.premiumAiLimitReached', { count: maxPremiumUsers }) || `Premium AI member limit reached (${maxPremiumUsers} members). Additional members will join with free plan.`);
        return;
      }
    } catch (err) {
      console.error('Error checking Premium AI count:', err);
      // Continue with invite even if check fails
    }
    
    setInviting(true);
    setError(null);
    setSuccess(null);
    try {
      await createInvite(enterpriseId, inviteEmail.trim(), user.uid);
      setSuccess(t('enterprise.inviteSuccess'));
      setInviteEmail('');
      const invs = await listPendingInvites(enterpriseId);
      setPendingInvites(invs);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message === 'Invite already pending for this email' ? t('enterprise.inviteError') : err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (m) => {
    if (!enterprise || !enterpriseId || removingMemberId) return;
    if (m.id === enterprise.createdBy) return;
    if (m.id === user?.uid) return;
    const name = getMemberDisplayName(m);
    if (!window.confirm(t('enterprise.removeConfirm', { name }))) return;
    setRemovingMemberId(m.id);
    setError(null);
    setSuccess(null);
    try {
      await removeMember(m.id);
      const mems = await listMembers(enterpriseId);
      setMembers(mems);
      setSuccess(t('enterprise.removeSuccess'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err?.message || t('common.error'));
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleLeaveOrg = async () => {
    if (!user?.uid || leavingOrg) return;
    if (!window.confirm(t('enterprise.leaveConfirm'))) return;
    setLeavingOrg(true);
    setError(null);
    try {
      await leaveOrganization(user.uid);
      setEnterpriseId(null);
      setEnterprise(null);
      setMembers([]);
      setPendingInvites([]);
      setEnterpriseRole(null);
      setSuccess(t('enterprise.leaveSuccess'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err?.message || t('common.error'));
    } finally {
      setLeavingOrg(false);
    }
  };

  const handleRenameOrg = async (e) => {
    e.preventDefault();
    if (!enterpriseId || !enterprise || savingOrgName) return;
    const name = (orgNameEdit || '').trim();
    if (!name || name === enterprise.name) return;
    setSavingOrgName(true);
    setError(null);
    setSuccess(null);
    try {
      await updateEnterprise(enterpriseId, { name });
      const ent = await getEnterprise(enterpriseId);
      setEnterprise(ent);
      setSuccess(t('enterprise.renameSuccess'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err?.message || t('common.error'));
    } finally {
      setSavingOrgName(false);
    }
  };

  const handleSetMemberRole = async (m, newRole) => {
    if (!enterpriseId || !enterprise || updatingRoleId) return;
    if (m.id === enterprise.createdBy) return;
    const label = newRole === 'admin' ? t('enterprise.promoteConfirm', { name: getMemberDisplayName(m) }) : t('enterprise.demoteConfirm', { name: getMemberDisplayName(m) });
    if (!window.confirm(label)) return;
    setUpdatingRoleId(m.id);
    setError(null);
    setSuccess(null);
    try {
      await setMemberRole(m.id, newRole);
      const mems = await listMembers(enterpriseId);
      setMembers(mems);
      setSuccess(newRole === 'admin' ? t('enterprise.promoteSuccess') : t('enterprise.demoteSuccess'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err?.message || t('common.error'));
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleCancelInvite = async (inv) => {
    if (!enterpriseId || cancellingInviteId) return;
    if (!window.confirm(t('enterprise.cancelInviteConfirm', { email: inv.email }))) return;
    setCancellingInviteId(inv.id);
    setError(null);
    setSuccess(null);
    try {
      await cancelInvite(inv.id);
      const invs = await listPendingInvites(enterpriseId);
      setPendingInvites(invs);
      setSuccess(t('enterprise.cancelInviteSuccess'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err?.message || t('common.error'));
    } finally {
      setCancellingInviteId(null);
    }
  };

  useEffect(() => {
    if (!selectedMember || !enterpriseId) {
      setMemberSessions([]);
      setMemberDeductions([]);
      setMemberSettings(null);
      setMemberDetailError(null);
      return;
    }
    let cancelled = false;
    setMemberDetailLoading(true);
    setMemberDetailError(null);
    const load = async () => {
      try {
        const [sessionsSnap, deductionsSnap, settingsSnap] = await Promise.all([
          getDocs(query(collection(db, 'sessions'), where('userId', '==', selectedMember.id))),
          getDocs(query(collection(db, 'overworkDeductions'), where('userId', '==', selectedMember.id))),
          getDoc(doc(db, 'userSettings', selectedMember.id))
        ]);
        if (cancelled) return;
        const sessions = [];
        sessionsSnap.forEach((d) => {
          const data = d.data();
          sessions.push({
            id: d.id,
            ...data,
            clockIn: data.clockIn?.toDate ? data.clockIn.toDate() : new Date(data.clockIn)
          });
        });
        const deductions = [];
        deductionsSnap.forEach((d) => deductions.push({ id: d.id, ...d.data() }));
        deductions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setMemberSessions(sessions);
        setMemberDeductions(deductions);
        setMemberSettings(settingsSnap.exists() ? settingsSnap.data() : null);
      } catch (e) {
        if (!cancelled) {
          console.error('Member detail load error:', e);
          setMemberDetailError(e?.message || t('common.error'));
        }
      } finally {
        if (!cancelled) setMemberDetailLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedMember, enterpriseId, t]);

  const memberDateRange = useMemo(() => {
    const d = memberSelectedDate;
    switch (memberReportType) {
      case 'daily':
        return {
          start: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0),
          end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
        };
      case 'weekly':
        return { start: startOfWeek(d, { weekStartsOn: 1 }), end: endOfWeek(d, { weekStartsOn: 1 }) };
      case 'monthly':
        return { start: startOfMonth(d), end: endOfMonth(d) };
      case 'yearly':
        return { start: startOfYear(d), end: endOfYear(d) };
      default:
        return { start: startOfMonth(d), end: endOfMonth(d) };
    }
  }, [memberReportType, memberSelectedDate]);

  const globalStatsDateRange = useMemo(() => {
    const d = globalStatsDate;
    switch (globalStatsPeriod) {
      case 'daily':
        return {
          start: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0),
          end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
        };
      case 'weekly':
        return { start: startOfWeek(d, { weekStartsOn: 1 }), end: endOfWeek(d, { weekStartsOn: 1 }) };
      case 'monthly':
        return { start: startOfMonth(d), end: endOfMonth(d) };
      case 'yearly':
        return { start: startOfYear(d), end: endOfYear(d) };
      default:
        return { start: startOfMonth(d), end: endOfMonth(d) };
    }
  }, [globalStatsPeriod, globalStatsDate]);

  const overworkChartData = useMemo(() => {
    const pm = globalStats?.perMember ?? [];
    return pm.map((m) => ({
      name: m.memberName,
      paidOT: m.paidOvertimeHours ?? 0,
      isencao: m.unpaidHours ?? 0
    }));
  }, [globalStats]);

  useEffect(() => {
    if (!enterpriseId || !members.length || selectedMember) {
      setGlobalStats(null);
      return;
    }
    let cancelled = false;
    setGlobalStatsLoading(true);
    getEnterpriseStats(enterpriseId, members, globalStatsDateRange)
      .then((stats) => {
        if (!cancelled) {
          setGlobalStats(stats);
          setGlobalStatsLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          console.error('Global stats load error:', e);
          setGlobalStats(null);
          setGlobalStatsLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [enterpriseId, members, globalStatsDateRange, selectedMember]);

  useEffect(() => {
    if (!enterpriseId || !members.length || selectedMember) {
      setTeamChartData([]);
      return;
    }
    let cancelled = false;
    setTeamChartLoading(true);
    const end = new Date();
    const start = subMonths(end, 5);
    const months = eachMonthOfInterval({ start, end });
    Promise.all(
      months.map((m) =>
        getEnterpriseStats(enterpriseId, members, {
          start: startOfMonth(m),
          end: endOfMonth(m)
        }).then((s) => ({
          date: format(m, 'MMM yyyy', { locale: getDateFnsLocale() }),
          grossIncome: s.grossSalary || 0,
          netIncome: s.netSalary || 0,
          taxes: s.totalDeductions || 0
        }))
      )
    )
      .then((data) => {
        if (!cancelled) {
          setTeamChartData(data);
          setTeamChartLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          console.error('Team chart load error:', e);
          setTeamChartData([]);
          setTeamChartLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [enterpriseId, members, selectedMember]);

  useEffect(() => {
    if (!enterpriseId || !members.length || selectedMember) {
      setTeamWarnings([]);
      return;
    }
    let cancelled = false;
    setTeamWarningsLoading(true);
    getEnterpriseTeamWarnings(enterpriseId, members)
      .then(({ warnings }) => {
        if (!cancelled) {
          const sorted = [...warnings].sort((a, b) => {
            if (a.severity !== b.severity) return a.severity === 'high' ? -1 : 1;
            return (a.memberName || '').localeCompare(b.memberName || '');
          });
          setTeamWarnings(sorted);
          setTeamWarningsLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          console.error('Team warnings load error:', e);
          setTeamWarnings([]);
          setTeamWarningsLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [enterpriseId, members, selectedMember]);

  const financeSettings = useMemo(() => {
    const s = memberSettings?.financeSettings || {};
    return {
      hourlyRate: s.hourlyRate || 0,
      isencaoRate: s.isencaoRate || 0,
      isencaoCalculationMethod: s.isencaoCalculationMethod || 'percentage',
      isencaoFixedAmount: s.isencaoFixedAmount || 0,
      taxDeductionType: s.taxDeductionType || 'both',
      irsRate: s.irsRate || 0,
      irsBaseSalaryRate: s.irsBaseSalaryRate || 0,
      irsIhtRate: s.irsIhtRate || 0,
      irsOvertimeRate: s.irsOvertimeRate || 0,
      socialSecurityRate: s.socialSecurityRate ?? 11,
      customTaxRate: s.customTaxRate || 0,
      mealAllowanceIncluded: !!s.mealAllowanceIncluded,
      overtimeFirstHourRate: s.overtimeFirstHourRate ?? 1.25,
      overtimeSubsequentRate: s.overtimeSubsequentRate ?? 1.5,
      weekendOvertimeRate: s.weekendOvertimeRate ?? 1.5,
      holidayOvertimeRate: s.holidayOvertimeRate ?? 2,
      fixedBonus: s.fixedBonus || 0,
      dailyMealSubsidy: s.dailyMealSubsidy || 0,
      mealCardDeduction: s.mealCardDeduction || 0
    };
  }, [memberSettings]);

  const memberFinanceData = useMemo(() => {
    if (!memberSessions.length || !memberSettings) return null;
    try {
      return calculatePeriodFinance(memberSessions, memberDateRange, financeSettings);
    } catch (e) {
      return null;
    }
  }, [memberSessions, memberSettings, memberDateRange, financeSettings]);

  const memberFilteredSessions = useMemo(() => {
    if (memberFinanceData) {
      return [...(memberFinanceData.sessions || [])].sort((a, b) => b.date.getTime() - a.date.getTime());
    }
    // Fallback: use raw sessions filtered by date range when finance data unavailable
    if (!memberSessions.length || !memberDateRange?.start || !memberDateRange?.end) return [];
    const filtered = memberSessions.filter(s => {
      let clockInTime;
      if (s.clockIn?.toDate) {
        clockInTime = s.clockIn.toDate().getTime();
      } else if (s.clockIn instanceof Date) {
        clockInTime = s.clockIn.getTime();
      } else {
        clockInTime = s.clockIn;
      }
      return clockInTime >= memberDateRange.start.getTime() && clockInTime <= memberDateRange.end.getTime();
    });
    return filtered.map(s => {
      const clockIn = s.clockIn?.toDate ? s.clockIn.toDate() : (s.clockIn instanceof Date ? s.clockIn : new Date(s.clockIn));
      return {
        id: s.id,
        date: clockIn,
        regularHours: s.regularHours || 0,
        isencaoHours: s.unpaidExtraHours || s.isencaoHours || 0,
        paidExtraHours: s.paidExtraHours || 0,
        totalEarnings: 0 // Can't calculate without finance settings
      };
    }).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [memberFinanceData, memberSessions, memberDateRange]);

  const memberPreviousDateRange = useMemo(() => {
    if (!memberDateRange?.start || !memberDateRange?.end) return null;
    const { start, end } = memberDateRange;
    const len = end.getTime() - start.getTime();
    let prevStart;
    switch (memberReportType) {
      case 'daily':
        prevStart = subDays(start, 1);
        return { start: prevStart, end: new Date(prevStart.getTime() + len) };
      case 'weekly':
        prevStart = subWeeks(start, 1);
        return { start: prevStart, end: new Date(prevStart.getTime() + len) };
      case 'monthly':
        prevStart = subMonths(start, 1);
        return { start: prevStart, end: new Date(prevStart.getTime() + len) };
      case 'yearly':
        prevStart = subYears(start, 1);
        return { start: prevStart, end: new Date(prevStart.getTime() + len) };
      default:
        prevStart = subMonths(start, 1);
        return { start: prevStart, end: new Date(prevStart.getTime() + len) };
    }
  }, [memberDateRange, memberReportType]);

  const memberPreviousFinanceData = useMemo(() => {
    if (!memberSessions.length || !memberSettings || !memberPreviousDateRange) return null;
    try {
      return calculatePeriodFinance(memberSessions, memberPreviousDateRange, financeSettings);
    } catch (e) {
      return null;
    }
  }, [memberSessions, memberSettings, memberPreviousDateRange, financeSettings]);

  const memberAnalyticsChartData = useMemo(() => {
    if (!memberFilteredSessions.length) return [];
    return memberFilteredSessions
      .slice()
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((s) => ({
        date: format(s.date, 'MMM d', { locale: getDateFnsLocale() }),
        hours: (s.regularHours || 0) + (s.isencaoHours || 0) + (s.paidExtraHours || 0),
        earnings: s.totalEarnings || 0
      }));
  }, [memberFilteredSessions]);

  const rawSessionById = useMemo(() => {
    const m = new Map();
    (memberSessions || []).forEach((s) => m.set(s.id, s));
    return m;
  }, [memberSessions]);

  const filteredMembers = useMemo(() => {
    let list = members;
    const q = (membersFilter || '').trim().toLowerCase();
    if (q) {
      list = list.filter((m) => {
        const name = getMemberDisplayName(m).toLowerCase();
        const email = (m.email || '').toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }
    if (membersRoleFilter === 'admin') list = list.filter((m) => m.enterpriseRole === 'admin');
    else if (membersRoleFilter === 'member') list = list.filter((m) => m.enterpriseRole !== 'admin');
    return list;
  }, [members, membersFilter, membersRoleFilter]);

  const handleMemberExportCSV = () => {
    if (!memberFinanceData || !selectedMember) return;
    const csvRows = [];
    const header = [t('finance.csv.date'), t('finance.csv.regularHours'), t('finance.csv.isencaoHours'), t('finance.csv.overtimeHours'), t('finance.csv.totalEarnings')];
    csvRows.push(header.join(','));
    memberFilteredSessions.forEach((s) => {
      csvRows.push([
        format(s.date, 'yyyy-MM-dd'),
        (s.regularHours || 0).toFixed(2),
        (s.isencaoHours || 0).toFixed(2),
        (s.paidExtraHours || 0).toFixed(2),
        (s.totalEarnings || 0).toFixed(2)
      ].join(','));
    });
    csvRows.push('');
    csvRows.push([t('finance.csv.summary')].join(','));
    csvRows.push([t('finance.csv.total'), memberFinanceData.hours.regular.toFixed(2), memberFinanceData.hours.isencao.toFixed(2), memberFinanceData.hours.paidExtra.toFixed(2), memberFinanceData.earnings.grossSalary.toFixed(2)].join(','));
    csvRows.push('');
    csvRows.push([t('finance.csv.totalDeductions'), memberFinanceData.deductions.total.toFixed(2)].join(','));
    csvRows.push([t('finance.csv.netSalary'), memberFinanceData.netSalary.toFixed(2)].join(','));
    const csv = csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const memberName = getMemberDisplayName(selectedMember).replace(/[^a-zA-Z0-9.-]/g, '_');
    link.download = `enterprise-member-${memberName}-${memberReportType}-${format(memberSelectedDate, 'yyyy-MM-dd')}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleBulkExportAllMembers = async () => {
    if (!enterpriseId || !members.length || !globalStatsDateRange?.start || !globalStatsDateRange?.end) return;
    setBulkExportLoading(true);
    try {
      const rows = [];
      const header = ['Member', t('finance.csv.date'), t('finance.csv.regularHours'), t('finance.csv.isencaoHours'), t('finance.csv.overtimeHours'), t('finance.csv.totalEarnings')];
      rows.push(header.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','));

      for (const m of members) {
        const [sessionsSnap, settingsSnap] = await Promise.all([
          getDocs(query(collection(db, 'sessions'), where('userId', '==', m.id))),
          getDoc(doc(db, 'userSettings', m.id))
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
        let financeData = null;
        try {
          financeData = calculatePeriodFinance(sessions, globalStatsDateRange, financeSettings);
        } catch (e) {
          console.error('Bulk export finance calc error:', e);
        }
        const memberName = getMemberDisplayName(m).replace(/"/g, '""');
        const sessionRows = (financeData?.sessions || []).sort((a, b) => b.date.getTime() - a.date.getTime());
        sessionRows.forEach((s) => {
          rows.push([
            `"${memberName}"`,
            format(s.date, 'yyyy-MM-dd'),
            (s.regularHours || 0).toFixed(2),
            (s.isencaoHours || 0).toFixed(2),
            (s.paidExtraHours || 0).toFixed(2),
            (s.totalEarnings || 0).toFixed(2)
          ].join(','));
        });
      }

      const csv = rows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const periodLabel = globalStatsDateRange?.start && globalStatsDateRange?.end
        ? `${format(globalStatsDateRange.start, 'yyyy-MM-dd')}-${format(globalStatsDateRange.end, 'yyyy-MM-dd')}`
        : 'export';
      link.download = `enterprise-all-members-${periodLabel}.csv`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Bulk export error:', err);
      setError(t('common.error') || 'Export failed');
    } finally {
      setBulkExportLoading(false);
    }
  };

  const handleGlobalStatsExportCSV = () => {
    const periodLabel = globalStatsDateRange?.start && globalStatsDateRange?.end
      ? `${format(globalStatsDateRange.start, 'yyyy-MM-dd', { locale: getDateFnsLocale() })} – ${format(globalStatsDateRange.end, 'yyyy-MM-dd', { locale: getDateFnsLocale() })}`
      : '-';
    const rows = [];
    rows.push(['Enterprise Dashboard Export', '']);
    rows.push([t('enterprise.exportPeriod', { defaultValue: 'Period' }), periodLabel]);
    rows.push([t('enterprise.statsMembers'), String(members.length)]);
    rows.push([t('enterprise.statsPending'), String(pendingInvites.length)]);
    rows.push([t('enterprise.statsWageCosts'), `€${(globalStats?.grossSalary ?? 0).toFixed(2)}`]);
    rows.push([t('enterprise.statsTotalTaxes'), `€${(globalStats?.totalDeductions ?? 0).toFixed(2)}`]);
    rows.push([t('finance.irsDeduction', { defaultValue: 'IRS' }), `€${(globalStats?.irs ?? 0).toFixed(2)}`]);
    rows.push([t('finance.socialSecurityDeduction', { defaultValue: 'Social Security' }), `€${(globalStats?.socialSecurity ?? 0).toFixed(2)}`]);
    rows.push([t('finance.customTaxDeduction', { defaultValue: 'Custom Tax' }), `€${(globalStats?.customTax ?? 0).toFixed(2)}`]);
    rows.push([t('enterprise.statsNetPay'), `€${(globalStats?.netSalary ?? 0).toFixed(2)}`]);
    rows.push([t('enterprise.statsTotalHours'), `${(globalStats?.totalHours ?? 0).toFixed(1)}h`]);
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `enterprise-dashboard-${globalStatsPeriod}-${format(globalStatsDate, 'yyyy-MM-dd')}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  if (!user) {
    return (
      <div className="enterprise-container">
        <div className="enterprise-unauthorized">
          <Building2 size={48} />
          <p>{t('enterprise.upgradeDescription')}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="enterprise-container">
        <div className="enterprise-loading">
          <Loader className="spinning" size={32} />
          <span>{t('enterprise.loading')}</span>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="enterprise-container">
        <div className="enterprise-upgrade">
          <Building2 className="enterprise-upgrade-icon" size={48} />
          <h2>{t('enterprise.upgradeCta')}</h2>
          <p>{t('enterprise.upgradeDescription')}</p>
          <button
            type="button"
            className="enterprise-upgrade-btn"
            onClick={() => onNavigate && onNavigate('premium-plus')}
          >
            <Crown size={18} />
            <span>{t('enterprise.upgradeCta')}</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (plan === 'enterprise' && !enterpriseId) {
    return (
      <div className="enterprise-container">
        <div className="enterprise-header">
          <Building2 className="enterprise-header-icon" size={32} />
          <div>
            <h1>{t('enterprise.title')}</h1>
            <p>{t('enterprise.subtitle')}</p>
          </div>
        </div>
        {success && <div className="enterprise-success">{success}</div>}
        {error && (
          <div className="enterprise-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        <div className="enterprise-card">
          <h2>{t('enterprise.createOrg')}</h2>
          <form onSubmit={handleCreateOrg}>
            <label htmlFor="org-name">{t('enterprise.orgName')}</label>
            <input
              id="org-name"
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder={t('enterprise.orgNamePlaceholder')}
              required
            />
            <button type="submit" disabled={creating || !createName.trim()}>
              {creating ? t('common.loading') : t('enterprise.create')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const isCreator = enterprise && enterprise.createdBy === user.uid;
  // Members (non-admins) should not have access to Enterprise page
  if (enterpriseRole === 'member' && enterprise && !isCreator) {
    return (
      <div className="enterprise-container">
        <div className="enterprise-unauthorized">
          <Building2 size={48} />
          <h2>{t('enterprise.unauthorized')}</h2>
          <p>{t('enterprise.memberNoAccess')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="enterprise-container">
      <div className="enterprise-header">
        <Building2 className="enterprise-header-icon" size={32} />
        <div>
          <h1>{t('enterprise.title')}</h1>
          <p>{enterprise?.name ? `${t('enterprise.subtitle')} • ${enterprise.name}` : t('enterprise.subtitle')}</p>
        </div>
      </div>

      {success && <div className="enterprise-success">{success}</div>}
      {error && (
        <div className="enterprise-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {!selectedMember && (
        <div className="enterprise-ongoing-section">
          <h3 className="enterprise-ongoing-title">{t('enterprise.ongoingSessions')}</h3>
          {ongoingSessions.length > 0 ? (
          <div className="enterprise-ongoing-list">
            {ongoingSessions.map(({ member, clockInTime }) => {
              const elapsedMs = Date.now() - clockInTime;
              const elapsedHours = elapsedMs / (1000 * 60 * 60);
              const hasIsencao = (member.annualIsencaoLimit ?? 0) > 0;
              const maxHours = hasIsencao ? 10 : 8;
              const progressPercent = Math.min(100, (elapsedHours / maxHours) * 100);
              let barColor = 'green';
              if (hasIsencao) {
                if (elapsedHours >= 10) barColor = 'red';
                else if (elapsedHours >= 8) barColor = 'orange';
              } else {
                if (elapsedHours >= 8) barColor = 'red';
              }
              const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
              const minutes = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));
              const seconds = Math.floor((elapsedMs % (1000 * 60)) / 1000);
              const elapsedLabel = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
              return (
                <div key={member.id} className="enterprise-ongoing-card">
                  <div className="enterprise-ongoing-member">
                    {member.profilePicture ? (
                      <img src={member.profilePicture} alt="" className="enterprise-ongoing-avatar" />
                    ) : (
                      <div className="enterprise-ongoing-avatar-fallback"><Users size={18} /></div>
                    )}
                    <span className="enterprise-ongoing-name">{getMemberDisplayName(member)}</span>
                  </div>
                  <div className="enterprise-ongoing-bar-wrap">
                    <div className="enterprise-ongoing-bar-track">
                      <div
                        className={`enterprise-ongoing-bar-fill enterprise-ongoing-bar-${barColor}`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className="enterprise-ongoing-elapsed">{elapsedLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
          ) : (
            <p className="enterprise-ongoing-empty">{t('enterprise.ongoingSessionsEmpty')}</p>
          )}
        </div>
      )}

      {!selectedMember && (
        <>
        {/* Team Warnings - below On-Going Sessions */}
        <div className="enterprise-card enterprise-warnings-card">
          <h3><AlertTriangle size={20} /> {t('enterprise.teamWarnings')}</h3>
          {teamWarningsLoading ? (
            <div className="enterprise-warnings-loading">
              <Loader size={20} className="spinning" />
              <span>{t('enterprise.loading')}</span>
            </div>
          ) : teamWarnings.length === 0 ? (
            <p className="enterprise-empty">{t('enterprise.noWarnings')}</p>
          ) : (
            <ul className="enterprise-warnings-list">
              {teamWarnings.map((w, idx) => {
                const member = members.find((m) => m.id === w.memberId);
                const typeKey = {
                  isencao_over: 'isencaoOver',
                  isencao_approaching: 'isencaoApproaching',
                  overtime_weekly: 'overtimeWeekly',
                  overtime_weekly_approaching: 'overtimeWeeklyApproaching',
                  overtime_annual: 'overtimeAnnual',
                  overtime_annual_approaching: 'overtimeAnnualApproaching',
                  forgotten_clockout: 'forgottenClockout',
                  unusual_clockin_time: 'unusualClockinTime'
                }[w.type] || w.type;
                return (
                  <li key={`${w.memberId}-${w.type}-${idx}`} className={`enterprise-warning-item enterprise-warning--${w.severity}`}>
                    <div className="enterprise-warning-info">
                      <span className="enterprise-warning-member">{w.memberName}</span>
                      <span className="enterprise-warning-type">{t(`enterprise.${typeKey}`)}</span>
                      <span className="enterprise-warning-detail">{w.detail}</span>
                    </div>
                    {member && (
                      <button
                        type="button"
                        className="enterprise-view-btn enterprise-warning-view"
                        onClick={() => setSelectedMember(member)}
                        title={t('enterprise.viewMember')}
                      >
                        <Eye size={14} />
                        <span>{t('enterprise.viewMember')}</span>
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Calendar Events - after Team Warnings */}
        <div className="enterprise-calendar-section enterprise-calendar-top">
          <button
            type="button"
            className="enterprise-calendar-header"
            onClick={() => setCalendarCollapsed(prev => !prev)}
          >
            <div className="enterprise-calendar-title-wrap">
              <CalendarIcon size={22} className="enterprise-calendar-icon" />
              <h2 className="enterprise-calendar-title">{t('enterprise.calendarSection.title')}</h2>
              {calendarPeriodEvents.length > 0 && (
                <span className="enterprise-calendar-badge">{calendarPeriodEvents.length}</span>
              )}
            </div>
            {calendarCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
          {!calendarCollapsed && (
            <div className="enterprise-calendar-body">
              {!googleCalendar.isAuthorized ? (
                <div className="enterprise-calendar-empty">
                  <CalendarIcon size={32} />
                  <p>{t('enterprise.calendarSection.notAuthorized')}</p>
                </div>
              ) : (
                <>
                  <div className="enterprise-calendar-controls">
                    <div className="enterprise-calendar-tabs">
                      {['daily', 'weekly', 'monthly'].map(mode => (
                        <button
                          key={mode}
                          type="button"
                          className={`enterprise-calendar-tab ${calendarViewMode === mode ? 'active' : ''}`}
                          onClick={() => setCalendarViewMode(mode)}
                        >
                          {t(`enterprise.calendarSection.${mode}`)}
                        </button>
                      ))}
                    </div>
                    <div className="enterprise-calendar-nav">
                      <button type="button" className="enterprise-calendar-nav-btn" onClick={() => handleCalendarNav(-1)}>
                        <ChevronLeft size={18} />
                      </button>
                      <span className="enterprise-calendar-date-label">{calendarDateLabel}</span>
                      <button type="button" className="enterprise-calendar-nav-btn" onClick={() => handleCalendarNav(1)}>
                        <ChevronRight size={18} />
                      </button>
                      <button
                        type="button"
                        className="enterprise-calendar-today-btn"
                        onClick={() => setCalendarDate(new Date())}
                      >
                        {t('enterprise.calendarSection.today')}
                      </button>
                    </div>
                  </div>
                  {calendarEventsLoading ? (
                    <div className="enterprise-calendar-loading">
                      <Loader size={24} className="spinning" />
                    </div>
                  ) : calendarPeriodEvents.length === 0 ? (
                    <div className="enterprise-calendar-empty">
                      <CalendarIcon size={28} />
                      <p>{t('enterprise.calendarSection.empty')}</p>
                    </div>
                  ) : (
                    <div className="enterprise-calendar-events">
                      {calendarPeriodEvents.map(event => {
                        const evStart = event.start.dateTime ? new Date(event.start.dateTime) : null;
                        const evEnd = event.end.dateTime ? new Date(event.end.dateTime) : null;
                        const isAllDay = !event.start.dateTime;
                        const sourceCal = calendarList.find(c => c.id === event.sourceCalendarId);
                        return (
                          <div key={event.id} className="enterprise-event-card">
                            <div className="enterprise-event-header">
                              <span className="enterprise-event-title">{event.summary || t('enterprise.calendarSection.noTitle')}</span>
                              <span className="enterprise-event-time">
                                {isAllDay
                                  ? t('enterprise.calendarSection.allDay')
                                  : evStart && evEnd
                                    ? `${format(evStart, 'HH:mm')} – ${format(evEnd, 'HH:mm')}`
                                    : evStart ? format(evStart, 'HH:mm') : ''}
                              </span>
                            </div>
                            {evStart && calendarViewMode !== 'daily' && (
                              <div className="enterprise-event-date">
                                {format(evStart, 'EEE, MMM d', { locale: getDateFnsLocale() })}
                              </div>
                            )}
                            {sourceCal && (
                              <div className="enterprise-event-source">
                                <CalendarIcon size={12} />
                                <span>{sourceCal.summary}</span>
                              </div>
                            )}
                            {event.location && (
                              <div className="enterprise-event-location">
                                <MapPin size={12} />
                                <span>{event.location}</span>
                              </div>
                            )}
                            {event.description && (
                              <div
                                className="enterprise-event-description"
                                dangerouslySetInnerHTML={{
                                  __html: (event.description || '').replace(/\r\n/g, '\n').replace(/\n/g, '<br>')
                                }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* AI Call card - after Calendar */}
        <div className="enterprise-card enterprise-ai-call-card enterprise-ai-top">
          <h3><Bot size={20} /> {t('enterprise.aiCall.title')}</h3>
          <p className="enterprise-ai-call-desc">{t('enterprise.aiCall.description')}</p>
          <button
            type="button"
            className="enterprise-ai-call-btn"
            onClick={() => {
              setAiTriggerPrompt(t('enterprise.aiCall.prompt'));
              aiSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            {t('enterprise.aiCall.button')}
          </button>
        </div>

        <EnterpriseAISection
          ref={aiSectionRef}
          enterpriseId={enterpriseId}
          members={members}
          triggerPrompt={aiTriggerPrompt}
          onTriggerConsumed={() => setAiTriggerPrompt(null)}
        />

        <div className="enterprise-global-stats-controls">
          <select
            value={globalStatsPeriod}
            onChange={(e) => setGlobalStatsPeriod(e.target.value)}
            className="enterprise-select"
          >
            <option value="daily">{t('finance.daily')}</option>
            <option value="weekly">{t('finance.weekly')}</option>
            <option value="monthly">{t('finance.monthly')}</option>
            <option value="yearly">{t('finance.yearly')}</option>
          </select>
          <input
            type="date"
            value={format(globalStatsDate, 'yyyy-MM-dd')}
            onChange={(e) => setGlobalStatsDate(e.target.value ? new Date(e.target.value) : new Date())}
            className="enterprise-date-input"
          />
          {globalStatsDateRange?.start && globalStatsDateRange?.end && (
            <span className="enterprise-stats-period-label">
              {format(globalStatsDateRange.start, 'MMM d, yyyy', { locale: getDateFnsLocale() })} – {format(globalStatsDateRange.end, 'MMM d, yyyy', { locale: getDateFnsLocale() })}
            </span>
          )}
          <button type="button" className="enterprise-export-btn" onClick={handleGlobalStatsExportCSV} title={t('finance.exportCSV')}>
            <Download size={18} />
            <span>{t('finance.exportCSV')}</span>
          </button>
          <button
            type="button"
            className="enterprise-export-btn"
            onClick={handleBulkExportAllMembers}
            disabled={bulkExportLoading || members.length === 0}
            title={t('enterprise.exportAllMembers', { defaultValue: 'Export all members' })}
          >
            {bulkExportLoading ? <Loader size={18} className="spinning" /> : <Download size={18} />}
            <span>{bulkExportLoading ? t('enterprise.exporting', { defaultValue: 'Exporting...' }) : t('enterprise.exportAllMembers', { defaultValue: 'Export all members' })}</span>
          </button>
        </div>
        <div className="enterprise-stats-strip">
          <div className="enterprise-stat-strip-card">
            <div className="enterprise-stat-strip-value">{members.length}</div>
            <div className="enterprise-stat-strip-label">{t('enterprise.statsMembers')}</div>
          </div>
          <div className="enterprise-stat-strip-card">
            <div className="enterprise-stat-strip-value">{pendingInvites.length}</div>
            <div className="enterprise-stat-strip-label">{t('enterprise.statsPending')}</div>
          </div>
          <div className="enterprise-stat-strip-card">
            <div className="enterprise-stat-strip-value">
              {globalStatsLoading ? <Loader size={20} className="spinning" /> : `€${(globalStats?.grossSalary ?? 0).toFixed(2)}`}
            </div>
            <div className="enterprise-stat-strip-label">{t('enterprise.statsWageCosts')}</div>
          </div>
          <div className="enterprise-stat-strip-card">
            <div className="enterprise-stat-strip-value">
              {globalStatsLoading ? <Loader size={20} className="spinning" /> : `€${(globalStats?.totalDeductions ?? 0).toFixed(2)}`}
            </div>
            <div className="enterprise-stat-strip-label">{t('enterprise.statsTotalTaxes')}</div>
          </div>
          <div className="enterprise-stat-strip-card enterprise-stat-strip-card--muted" title={t('finance.irsDeduction')}>
            <div className="enterprise-stat-strip-value enterprise-stat-strip-value--small">
              {globalStatsLoading ? <Loader size={16} className="spinning" /> : `€${(globalStats?.irs ?? 0).toFixed(2)}`}
            </div>
            <div className="enterprise-stat-strip-label">{t('finance.irsDeduction')}</div>
          </div>
          <div className="enterprise-stat-strip-card enterprise-stat-strip-card--muted" title={t('finance.socialSecurityDeduction')}>
            <div className="enterprise-stat-strip-value enterprise-stat-strip-value--small">
              {globalStatsLoading ? <Loader size={16} className="spinning" /> : `€${(globalStats?.socialSecurity ?? 0).toFixed(2)}`}
            </div>
            <div className="enterprise-stat-strip-label">{t('finance.socialSecurityDeduction')}</div>
          </div>
          <div className="enterprise-stat-strip-card enterprise-stat-strip-card--muted" title={t('finance.customTaxDeduction')}>
            <div className="enterprise-stat-strip-value enterprise-stat-strip-value--small">
              {globalStatsLoading ? <Loader size={16} className="spinning" /> : `€${(globalStats?.customTax ?? 0).toFixed(2)}`}
            </div>
            <div className="enterprise-stat-strip-label">{t('finance.customTaxDeduction')}</div>
          </div>
          <div className="enterprise-stat-strip-card">
            <div className="enterprise-stat-strip-value">
              {globalStatsLoading ? <Loader size={20} className="spinning" /> : `€${(globalStats?.netSalary ?? 0).toFixed(2)}`}
            </div>
            <div className="enterprise-stat-strip-label">{t('enterprise.statsNetPay')}</div>
          </div>
          <div className="enterprise-stat-strip-card">
            <div className="enterprise-stat-strip-value">
              {globalStatsLoading ? <Loader size={20} className="spinning" /> : `${(globalStats?.totalHours ?? 0).toFixed(1)}h`}
            </div>
            <div className="enterprise-stat-strip-label">{t('enterprise.statsTotalHours')}</div>
          </div>
        </div>
        {((globalStats?.overIsencaoCount ?? 0) > 0 || (globalStats?.approachingIsencaoCount ?? 0) > 0) && (
          <div className="enterprise-compliance-strip">
            <h4 className="enterprise-compliance-title">{t('enterprise.compliance')}</h4>
            <div className="enterprise-compliance-items">
              {(globalStats?.overIsencaoCount ?? 0) > 0 && (
                <span className="enterprise-compliance-badge enterprise-compliance-over">
                  {t('enterprise.complianceOverIsencao', { count: globalStats.overIsencaoCount })}
                </span>
              )}
              {(globalStats?.approachingIsencaoCount ?? 0) > 0 && (
                <span className="enterprise-compliance-badge enterprise-compliance-approaching">
                  {t('enterprise.complianceApproachingIsencao', { count: globalStats.approachingIsencaoCount })}
                </span>
              )}
            </div>
            <p className="enterprise-compliance-hint">{t('enterprise.complianceHint')}</p>
          </div>
        )}
        {teamChartLoading ? (
          <div className="enterprise-chart-section enterprise-chart-loading">
            <Loader className="spinning" size={28} />
            <span>{t('enterprise.loading')}</span>
          </div>
        ) : teamChartData.length > 0 ? (
          <div className="enterprise-chart-section">
            <div className="enterprise-chart-header">
              <div className="enterprise-chart-title-wrap">
                <TrendingUp className="enterprise-chart-icon" size={22} />
                <div>
                  <h2 className="enterprise-chart-title">{t('enterprise.chartTitle')}</h2>
                  <p className="enterprise-chart-subtitle">{t('enterprise.chartSubtitle')}</p>
                </div>
              </div>
              <div className="enterprise-chart-controls">
                <button
                  type="button"
                  className={`enterprise-scale-toggle ${teamChartScale === 'linear' ? 'active' : ''}`}
                  onClick={() => setTeamChartScale('linear')}
                >
                  {t('finance.chart.scaleLinear')}
                </button>
                <button
                  type="button"
                  className={`enterprise-scale-toggle ${teamChartScale === 'log' ? 'active' : ''}`}
                  onClick={() => setTeamChartScale('log')}
                >
                  {t('finance.chart.scaleLog')}
                </button>
              </div>
            </div>
            <div className="enterprise-chart-container">
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={teamChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
                  <YAxis
                    scale={teamChartScale === 'log' ? 'log' : 'linear'}
                    domain={teamChartScale === 'log' ? ['auto', 'auto'] : [0, 'auto']}
                    stroke="var(--muted-foreground)"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(v) => (v <= 0 ? '€0' : `€${v.toFixed(0)}`)}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--foreground)' }}
                    formatter={(v) => `€${Number(v).toFixed(2)}`}
                  />
                  <Legend wrapperStyle={{ paddingTop: '16px' }} />
                  <Line type="monotone" dataKey="grossIncome" stroke="var(--primary)" strokeWidth={2} name={t('finance.chart.grossIncome')} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="netIncome" stroke="#10b981" strokeWidth={2} name={t('finance.chart.netIncome')} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="taxes" stroke="#ef4444" strokeWidth={2} name={t('finance.chart.taxes')} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}

        <div className="enterprise-overwork-section">
          <div className="enterprise-overwork-header">
            <h2 className="enterprise-overwork-section-title">{t('enterprise.overworkSection.title')}</h2>
            {globalStatsDateRange?.start && globalStatsDateRange?.end && (
              <p className="enterprise-overwork-subtitle">
                {format(globalStatsDateRange.start, 'MMM d, yyyy', { locale: getDateFnsLocale() })}
                {' – '}
                {format(globalStatsDateRange.end, 'MMM d, yyyy', { locale: getDateFnsLocale() })}
              </p>
            )}
          </div>
          <div className="enterprise-overwork-cards">
            <div className="enterprise-overwork-card">
              <div className="enterprise-overwork-card-label">{t('enterprise.overworkSection.totalPaidOT')}</div>
              <div className="enterprise-overwork-card-value">
                {globalStatsLoading ? (
                  <Loader size={18} className="spinning" />
                ) : (
                  formatHoursMinutes(
                    (globalStats?.perMember ?? []).reduce((s, m) => s + (m.paidOvertimeHours ?? 0), 0)
                  )
                )}
              </div>
            </div>
            <div className="enterprise-overwork-card">
              <div className="enterprise-overwork-card-label">{t('enterprise.overworkSection.totalIsencao')}</div>
              <div className="enterprise-overwork-card-value">
                {globalStatsLoading ? (
                  <Loader size={18} className="spinning" />
                ) : (
                  formatHoursMinutes(
                    (globalStats?.perMember ?? []).reduce((s, m) => s + (m.unpaidHours ?? 0), 0)
                  )
                )}
              </div>
            </div>
            <div className="enterprise-overwork-card">
              <div className="enterprise-overwork-card-label">{t('enterprise.overworkSection.membersOverLimit')}</div>
              <div className="enterprise-overwork-card-value">
                {globalStatsLoading ? (
                  <Loader size={18} className="spinning" />
                ) : (
                  globalStats?.overIsencaoCount ?? 0
                )}
              </div>
            </div>
            <div className="enterprise-overwork-card">
              <div className="enterprise-overwork-card-label">{t('enterprise.overworkSection.membersApproaching')}</div>
              <div className="enterprise-overwork-card-value">
                {globalStatsLoading ? (
                  <Loader size={18} className="spinning" />
                ) : (
                  globalStats?.approachingIsencaoCount ?? 0
                )}
              </div>
            </div>
          </div>
          <div className="enterprise-overwork-chart-wrap">
            <h3 className="enterprise-overwork-chart-title">{t('enterprise.overworkSection.chartTitle')}</h3>
            {!overworkChartData.length || overworkChartData.every((d) => d.paidOT === 0 && d.isencao === 0) ? (
              <p className="enterprise-overwork-empty">{t('enterprise.overworkSection.empty')}</p>
            ) : (
              <div className="enterprise-overwork-chart">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={overworkChartData} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="name"
                      stroke="var(--muted-foreground)"
                      style={{ fontSize: '11px' }}
                      tick={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
                    />
                    <YAxis
                      stroke="var(--muted-foreground)"
                      style={{ fontSize: '12px' }}
                      tickFormatter={(v) => `${v}h`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--foreground)'
                      }}
                      formatter={(v) => formatHoursMinutes(Number(v))}
                    />
                    <Legend wrapperStyle={{ paddingTop: '8px' }} />
                    <Bar dataKey="paidOT" name={t('enterprise.overworkSection.chartPaidOT')} fill="var(--primary)" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="isencao" name={t('enterprise.overworkSection.chartIsencao')} fill="#d97706" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
        </>
      )}

      {selectedMember ? (
        <div className="enterprise-member-detail">
          <button
            type="button"
            className="enterprise-back-btn"
            onClick={() => { setSelectedMember(null); setMemberDetailTab('sessions'); }}
          >
            <ArrowLeft size={18} />
            <span>{t('enterprise.back')}</span>
          </button>
          <h2 className="enterprise-member-detail-title">
            {(selectedMember.profilePicture || memberSettings?.profilePicture) ? (
              <img src={selectedMember.profilePicture || memberSettings.profilePicture} alt="" className="enterprise-member-detail-avatar" />
            ) : (
              <div className="enterprise-member-detail-avatar-fallback"><Users size={20} /></div>
            )}
            {t('enterprise.memberDetail')}: {getMemberDisplayName(selectedMember)}
          </h2>
          <div className="enterprise-member-tabs">
            {['sessions', 'analytics', 'finance', 'overwork'].map((tab) => (
              <button
                key={tab}
                type="button"
                className={`enterprise-tab ${memberDetailTab === tab ? 'active' : ''}`}
                onClick={() => setMemberDetailTab(tab)}
              >
                {tab === 'sessions' && <Clock size={16} />}
                {tab === 'analytics' && <BarChart3 size={16} />}
                {tab === 'finance' && <DollarSign size={16} />}
                {tab === 'overwork' && <BarChart3 size={16} />}
                <span>{t(`enterprise.${tab}`)}</span>
              </button>
            ))}
          </div>
          <div className="enterprise-member-date-controls">
            <select
              value={memberReportType}
              onChange={(e) => setMemberReportType(e.target.value)}
              className="enterprise-select"
            >
              <option value="daily">{t('finance.daily')}</option>
              <option value="weekly">{t('finance.weekly')}</option>
              <option value="monthly">{t('finance.monthly')}</option>
              <option value="yearly">{t('finance.yearly')}</option>
            </select>
            <input
              type="date"
              value={format(memberSelectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setMemberSelectedDate(e.target.value ? new Date(e.target.value) : new Date())}
              className="enterprise-date-input"
            />
            {memberDetailTab === 'finance' && memberFinanceData && (
              <button type="button" className="enterprise-export-btn" onClick={handleMemberExportCSV} title={t('finance.exportCSV')}>
                <Download size={18} />
                <span>{t('finance.exportCSV')}</span>
              </button>
            )}
          </div>
          {memberDetailError ? (
            <div className="enterprise-card enterprise-tab-panel">
              <div className="enterprise-error">
                <AlertCircle size={18} />
                <span>{memberDetailError}</span>
              </div>
            </div>
          ) : memberDetailLoading ? (
            <div className="enterprise-loading">
              <Loader className="spinning" size={28} />
              <span>{t('enterprise.loading')}</span>
            </div>
          ) : (
            <>
              <div className="enterprise-member-summary">
                <div className="enterprise-member-summary-item">
                  <strong>{t('enterprise.period')}</strong>
                  <span>{memberDateRange.start && memberDateRange.end
                    ? `${format(memberDateRange.start, 'MMM d, yyyy', { locale: getDateFnsLocale() })} – ${format(memberDateRange.end, 'MMM d, yyyy', { locale: getDateFnsLocale() })}`
                    : '-'}</span>
                </div>
                <div className="enterprise-member-summary-item">
                  <strong>{t('enterprise.sessionsInPeriod')}</strong>
                  <span>{memberFilteredSessions.length}</span>
                </div>
                <div className="enterprise-member-summary-item">
                  <strong>{t('enterprise.workingDays')}</strong>
                  <span>{memberFinanceData?.workingDays ?? '-'}</span>
                </div>
                <div className="enterprise-member-summary-item">
                  <strong>{t('enterprise.role')}</strong>
                  <span>{selectedMember.enterpriseRole === 'admin' ? t('enterprise.admin') : t('enterprise.member')}</span>
                </div>
              </div>
              {memberDetailTab === 'sessions' && (
                <div className="enterprise-card enterprise-tab-panel">
                  {memberFilteredSessions.length === 0 ? (
                    <p className="enterprise-empty">{t('sessions.noSessionsRecorded')}</p>
                  ) : (
                    <>
                      <p className="enterprise-empty" style={{ marginBottom: '0.75rem' }}>
                        {t('enterprise.sessionsCount', { count: memberFilteredSessions.length })}
                      </p>
                      <div className="enterprise-sessions-table-wrap">
                        <table className="enterprise-sessions-table">
                          <thead>
                            <tr>
                              <th>{t('finance.csv.date')}</th>
                              <th>{t('finance.csv.regularHours')}</th>
                              <th>{t('finance.csv.isencaoHours')}</th>
                              <th>{t('finance.csv.overtimeHours')}</th>
                              <th>{t('finance.csv.totalEarnings')}</th>
                              <th>{t('enterprise.location')}</th>
                              <th>{t('enterprise.edited')}</th>
                              <th>{t('enterprise.notes')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {memberFilteredSessions.map((s) => {
                              const raw = rawSessionById.get(s.id);
                              const hasCoords = raw?.clockInCoords || raw?.clockOutCoords;
                              const isMapOpen = expandedMapSession === s.id;
                              return (
                                <Fragment key={s.id || s.date?.getTime()}>
                                  <tr>
                                    <td>{s.date ? format(s.date, 'yyyy-MM-dd') : '-'}</td>
                                    <td>{(s.regularHours || 0).toFixed(2)}</td>
                                    <td>{(s.isencaoHours || 0).toFixed(2)}</td>
                                    <td>{(s.paidExtraHours || 0).toFixed(2)}</td>
                                    <td>€{(s.totalEarnings || 0).toFixed(2)}</td>
                                    <td className="enterprise-cell-ellipsis" title={[
                                      raw?.clockInCoords?.address && `${t('session.clockInLocation')}: ${raw.clockInCoords.address}`,
                                      raw?.clockOutCoords?.address && `${t('session.clockOutLocation')}: ${raw.clockOutCoords.address}`,
                                      raw?.location
                                    ].filter(Boolean).join('\n') || '-'}>
                                      <div className="enterprise-location-cell">
                                        <span>
                                          {raw?.clockInCoords?.address && raw?.clockOutCoords?.address
                                            ? `${t('session.clockInLocation')}: ${raw.clockInCoords.address} | ${t('session.clockOutLocation')}: ${raw.clockOutCoords.address}`
                                            : (raw?.location || raw?.clockInCoords?.address || raw?.clockOutCoords?.address || '-')}
                                        </span>
                                        {hasCoords && (
                                          <button
                                            className={`enterprise-location-btn${isMapOpen ? ' active' : ''}`}
                                            onClick={() => setExpandedMapSession(isMapOpen ? null : s.id)}
                                            title={t(isMapOpen ? 'enterprise.hideLocation' : 'enterprise.viewLocation')}
                                          >
                                            <MapPin size={16} />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                    <td className="enterprise-edited-cell">
                                      {raw?.editedAt ? (
                                        <span
                                          className="enterprise-edited-icon"
                                          title={
                                            (raw?.editCount || 1) > 1
                                              ? t('enterprise.editedCountTooltip', {
                                                  count: raw.editCount,
                                                  date: format(new Date(raw.editedAt), 'PPp', { locale: getDateFnsLocale() })
                                                })
                                              : t('enterprise.editedTooltip', {
                                                  date: format(new Date(raw.editedAt), 'PPp', { locale: getDateFnsLocale() })
                                                })
                                          }
                                        >
                                          <Pencil size={14} />
                                        </span>
                                      ) : (
                                        '-'
                                      )}
                                    </td>
                                    <td className="enterprise-cell-ellipsis" title={raw?.notes || ''}>{raw?.notes || '-'}</td>
                                  </tr>
                                  {isMapOpen && hasCoords && (
                                    <tr className="enterprise-map-row">
                                      <td colSpan={8}>
                                        <LocationMiniMap
                                          clockInCoords={raw.clockInCoords}
                                          clockOutCoords={raw.clockOutCoords}
                                          height={180}
                                        />
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
              {memberDetailTab === 'analytics' && (
                <div className="enterprise-card enterprise-tab-panel">
                  {!memberFinanceData ? (
                    <p className="enterprise-empty">{t('finance.noData')}</p>
                  ) : (
                    <>
                      <div className="enterprise-analytics-cards">
                        <div className="enterprise-stat-card">
                          <span className="enterprise-stat-label">{t('finance.regularHours')}</span>
                          <span className="enterprise-stat-value">{(memberFinanceData.hours.regular || 0).toFixed(2)}h</span>
                        </div>
                        <div className="enterprise-stat-card">
                          <span className="enterprise-stat-label">{t('analytics.isencaoUnpaid')}</span>
                          <span className="enterprise-stat-value">{(memberFinanceData.hours.isencao || 0).toFixed(2)}h</span>
                        </div>
                        <div className="enterprise-stat-card">
                          <span className="enterprise-stat-label">{t('finance.overtimeHours')}</span>
                          <span className="enterprise-stat-value">{(memberFinanceData.hours.paidExtra || 0).toFixed(2)}h</span>
                        </div>
                        <div className="enterprise-stat-card">
                          <span className="enterprise-stat-label">{t('enterprise.workingDays')}</span>
                          <span className="enterprise-stat-value">{memberFinanceData.workingDays ?? 0}</span>
                        </div>
                        <div className="enterprise-stat-card">
                          <span className="enterprise-stat-label">{t('finance.totalHours')}</span>
                          <span className="enterprise-stat-value">{(memberFinanceData.hours.regular + memberFinanceData.hours.isencao + memberFinanceData.hours.paidExtra).toFixed(2)}h</span>
                        </div>
                        <div className="enterprise-stat-card">
                          <span className="enterprise-stat-label">{t('finance.baseSalary')}</span>
                          <span className="enterprise-stat-value">€{memberFinanceData.earnings.baseSalary.toFixed(2)}</span>
                        </div>
                        <div className="enterprise-stat-card">
                          <span className="enterprise-stat-label">{t('finance.grossSalary')}</span>
                          <span className="enterprise-stat-value">€{memberFinanceData.earnings.grossSalary.toFixed(2)}</span>
                        </div>
                        <div className="enterprise-stat-card highlight">
                          <span className="enterprise-stat-label">{t('finance.netSalary')}</span>
                          <span className="enterprise-stat-value">€{memberFinanceData.netSalary.toFixed(2)}</span>
                        </div>
                      </div>
                      {memberAnalyticsChartData.length > 0 && (
                        <div className="enterprise-member-chart-wrap">
                          <h4 className="enterprise-member-chart-title">{t('enterprise.memberChartTitle')}</h4>
                          <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={memberAnalyticsChartData} margin={{ top: 5, right: 24, left: 10, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                              <XAxis dataKey="date" stroke="var(--muted-foreground)" style={{ fontSize: 11 }} />
                              <YAxis yAxisId="left" stroke="var(--muted-foreground)" style={{ fontSize: 11 }} tickFormatter={(v) => (v <= 0 ? '0' : `${v}h`)} />
                              <YAxis yAxisId="right" orientation="right" stroke="var(--muted-foreground)" style={{ fontSize: 11 }} tickFormatter={(v) => (v <= 0 ? '€0' : `€${v}`)} />
                              <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={(val, name) => [name === t('enterprise.chartEarnings') ? `€${Number(val).toFixed(2)}` : `${val}h`, name]} />
                              <Bar yAxisId="left" dataKey="hours" fill="var(--primary)" name={t('enterprise.chartHours')} radius={[4, 4, 0, 0]} />
                              <Bar yAxisId="right" dataKey="earnings" fill="#10b981" name={t('enterprise.chartEarnings')} radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              {memberDetailTab === 'finance' && (
                <div className="enterprise-card enterprise-tab-panel">
                  {(() => {
                    const fsWarnings = getMemberFinanceSettingsWarnings(financeSettings);
                    const fs = memberSettings?.financeSettings;
                    return (
                      <>
                        {fsWarnings.length > 0 && (
                          <div className="enterprise-member-finance-settings-warning">
                            <AlertTriangle size={18} />
                            <div>
                              <strong>{t('enterprise.memberFinanceSettingsWarning')}</strong>
                              <ul className="enterprise-member-finance-settings-warning-list">
                                {fsWarnings.map((key) => (
                                  <li key={key}>{t(key)}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                        <div className="enterprise-member-finance-settings">
                          <h4 className="enterprise-member-finance-settings-title">{t('enterprise.memberFinanceSettingsTitle')}</h4>
                          {!fs || Object.keys(fs).length === 0 ? (
                            <p className="enterprise-member-finance-settings-empty">{t('enterprise.memberFinanceSettingsNotConfigured')}</p>
                          ) : (
                            <div className="enterprise-member-finance-settings-grid">
                              <div className="enterprise-member-finance-settings-row">
                                <span className="enterprise-member-finance-settings-label">{t('settings.finance.hourlyRate')}</span>
                                <span className="enterprise-member-finance-settings-value">€{(fs.hourlyRate ?? 0).toFixed(2)}</span>
                              </div>
                              <div className="enterprise-member-finance-settings-row">
                                <span className="enterprise-member-finance-settings-label">{t('settings.finance.taxDeductionType')}</span>
                                <span className="enterprise-member-finance-settings-value">
                                  {t(`settings.finance.taxType${({ irs: 'Irs', social_security: 'SocialSecurity', both: 'Both', custom: 'Custom' })[fs.taxDeductionType || 'both'] || 'Both'}`)}
                                </span>
                              </div>
                              <div className="enterprise-member-finance-settings-row">
                                <span className="enterprise-member-finance-settings-label">{t('settings.finance.socialSecurityRate')}</span>
                                <span className="enterprise-member-finance-settings-value">{(fs.socialSecurityRate ?? 11)}%</span>
                              </div>
                              <div className="enterprise-member-finance-settings-row">
                                <span className="enterprise-member-finance-settings-label">{t('settings.finance.irsBaseSalaryRate')}</span>
                                <span className="enterprise-member-finance-settings-value">{(fs.irsBaseSalaryRate ?? 0)}%</span>
                              </div>
                              <div className="enterprise-member-finance-settings-row">
                                <span className="enterprise-member-finance-settings-label">{t('settings.finance.irsIhtRate')}</span>
                                <span className="enterprise-member-finance-settings-value">{(fs.irsIhtRate ?? 0)}%</span>
                              </div>
                              <div className="enterprise-member-finance-settings-row">
                                <span className="enterprise-member-finance-settings-label">{t('settings.finance.irsOvertimeRate')}</span>
                                <span className="enterprise-member-finance-settings-value">{(fs.irsOvertimeRate ?? 0)}%</span>
                              </div>
                              <div className="enterprise-member-finance-settings-row">
                                <span className="enterprise-member-finance-settings-label">{t('settings.finance.isencaoCalculationMethod')}</span>
                                <span className="enterprise-member-finance-settings-value">
                                  {fs.isencaoCalculationMethod === 'fixed'
                                    ? t('settings.finance.isencaoCalculationMethodFixed')
                                    : t('settings.finance.isencaoCalculationMethodPercentage')}
                                  {fs.isencaoCalculationMethod === 'fixed' && (fs.isencaoFixedAmount ?? 0) > 0
                                    ? ` (€${(fs.isencaoFixedAmount ?? 0).toFixed(2)})`
                                    : ''}
                                </span>
                              </div>
                              <div className="enterprise-member-finance-settings-row">
                                <span className="enterprise-member-finance-settings-label">{t('settings.finance.mealAllowanceIncluded')}</span>
                                <span className="enterprise-member-finance-settings-value">{fs.mealAllowanceIncluded ? t('common.yes') : t('common.no')}</span>
                              </div>
                              {(fs.dailyMealSubsidy ?? 0) > 0 && (
                                <div className="enterprise-member-finance-settings-row">
                                  <span className="enterprise-member-finance-settings-label">{t('settings.finance.dailyMealSubsidy')}</span>
                                  <span className="enterprise-member-finance-settings-value">€{(fs.dailyMealSubsidy ?? 0).toFixed(2)}</span>
                                </div>
                              )}
                              {(fs.mealCardDeduction ?? 0) > 0 && (
                                <div className="enterprise-member-finance-settings-row">
                                  <span className="enterprise-member-finance-settings-label">{t('settings.finance.mealCardDeduction')}</span>
                                  <span className="enterprise-member-finance-settings-value">€{(fs.mealCardDeduction ?? 0).toFixed(2)}</span>
                                </div>
                              )}
                              {(fs.fixedBonus ?? 0) > 0 && (
                                <div className="enterprise-member-finance-settings-row">
                                  <span className="enterprise-member-finance-settings-label">{t('settings.finance.fixedBonus')}</span>
                                  <span className="enterprise-member-finance-settings-value">€{(fs.fixedBonus ?? 0).toFixed(2)}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {!memberFinanceData ? (
                          <p className="enterprise-empty">{t('finance.noData')}</p>
                        ) : (
                          <>
                            <p className="enterprise-period-label">
                              {memberDateRange.start && memberDateRange.end &&
                                `${format(memberDateRange.start, 'MMM d', { locale: getDateFnsLocale() })} – ${format(memberDateRange.end, 'MMM d, yyyy', { locale: getDateFnsLocale() })}`}
                            </p>
                            <div className="enterprise-analytics-cards">
                              <div className="enterprise-stat-card">
                                <span className="enterprise-stat-label">{t('finance.baseSalary')}</span>
                                <span className="enterprise-stat-value">€{memberFinanceData.earnings.baseSalary.toFixed(2)}</span>
                              </div>
                              <div className="enterprise-stat-card">
                                <span className="enterprise-stat-label">{t('finance.isencaoEarnings')}</span>
                                <span className="enterprise-stat-value">€{memberFinanceData.earnings.isencaoSalary.toFixed(2)}</span>
                              </div>
                              <div className="enterprise-stat-card">
                                <span className="enterprise-stat-label">{t('finance.overtimeEarnings')}</span>
                                <span className="enterprise-stat-value">€{memberFinanceData.earnings.overtimeSalary.toFixed(2)}</span>
                              </div>
                              <div className="enterprise-stat-card">
                                <span className="enterprise-stat-label">{t('finance.grossSalary')}</span>
                                <span className="enterprise-stat-value">€{memberFinanceData.earnings.grossSalary.toFixed(2)}</span>
                              </div>
                              <div className="enterprise-stat-card">
                                <span className="enterprise-stat-label">{t('finance.totalDeductions')}</span>
                                <span className="enterprise-stat-value">€{memberFinanceData.deductions.total.toFixed(2)}</span>
                              </div>
                              <div className="enterprise-stat-card highlight">
                                <span className="enterprise-stat-label">{t('finance.netSalary')}</span>
                                <span className="enterprise-stat-value">€{memberFinanceData.netSalary.toFixed(2)}</span>
                              </div>
                            </div>
                            {memberPreviousFinanceData?.earnings != null && (
                              <div className="enterprise-finance-vs-previous">
                                <h4 className="enterprise-vs-title">{t('enterprise.financeVsPrevious')}</h4>
                                <div className="enterprise-vs-row enterprise-vs-header">
                                  <span>{t('enterprise.vsMetric')}</span>
                                  <span>{t('enterprise.vsThis')}</span>
                                  <span>{t('enterprise.vsPrevious')}</span>
                                  <span>{t('enterprise.vsDelta')}</span>
                                </div>
                                <div className="enterprise-vs-row">
                                  <span>{t('finance.grossSalary')}</span>
                                  <span>€{memberFinanceData.earnings.grossSalary.toFixed(2)}</span>
                                  <span className="enterprise-vs-prev">€{(memberPreviousFinanceData.earnings?.grossSalary ?? 0).toFixed(2)}</span>
                                  <span className={memberFinanceData.earnings.grossSalary >= (memberPreviousFinanceData.earnings?.grossSalary ?? 0) ? 'enterprise-vs-up' : 'enterprise-vs-down'}>
                                    {memberFinanceData.earnings.grossSalary >= (memberPreviousFinanceData.earnings?.grossSalary ?? 0) ? '↑' : '↓'} €{Math.abs(memberFinanceData.earnings.grossSalary - (memberPreviousFinanceData.earnings?.grossSalary ?? 0)).toFixed(2)}
                                  </span>
                                </div>
                                <div className="enterprise-vs-row">
                                  <span>{t('finance.netSalary')}</span>
                                  <span>€{memberFinanceData.netSalary.toFixed(2)}</span>
                                  <span className="enterprise-vs-prev">€{(memberPreviousFinanceData.netSalary ?? 0).toFixed(2)}</span>
                                  <span className={memberFinanceData.netSalary >= (memberPreviousFinanceData.netSalary ?? 0) ? 'enterprise-vs-up' : 'enterprise-vs-down'}>
                                    {memberFinanceData.netSalary >= (memberPreviousFinanceData.netSalary ?? 0) ? '↑' : '↓'} €{Math.abs(memberFinanceData.netSalary - (memberPreviousFinanceData.netSalary ?? 0)).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
              {memberDetailTab === 'overwork' && (
                <div className="enterprise-card enterprise-tab-panel">
                  <h4 className="enterprise-overwork-title">{t('analytics.usageHistory')}</h4>
                  {memberDeductions.length === 0 ? (
                    <p className="enterprise-empty">{t('analytics.noOverworkUsed')}</p>
                  ) : (
                    <ul className="enterprise-deductions-list">
                      {memberDeductions.map((d) => (
                        <li key={d.id} className="enterprise-deduction-item">
                          <div className="enterprise-deduction-info">
                            <span className="enterprise-deduction-date">
                              {format(new Date(d.timestamp), 'MMM dd, yyyy HH:mm', { locale: getDateFnsLocale() })}
                            </span>
                            {d.reason && <span className="enterprise-deduction-reason">{d.reason}</span>}
                          </div>
                          <span className="enterprise-deduction-hours">
                            -{formatHoursMinutes(d.hours)}
                            <span className="enterprise-deduction-days"> ({(d.hours / 8).toFixed(2)} {t('analytics.days')})</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
      <>
      <div className="enterprise-admin-grid">
        {isCreator && (
          <div className="enterprise-card">
            <h3><Building2 size={20} /> {t('enterprise.orgSettings')}</h3>
            <form onSubmit={handleRenameOrg}>
              <label htmlFor="org-name-edit">{t('enterprise.orgName')}</label>
              <input
                id="org-name-edit"
                type="text"
                value={orgNameEdit}
                onChange={(e) => setOrgNameEdit(e.target.value)}
                placeholder={t('enterprise.orgNamePlaceholder')}
              />
              <button type="submit" disabled={savingOrgName || !(orgNameEdit || '').trim() || (orgNameEdit || '').trim() === (enterprise?.name || '')}>
                {savingOrgName ? t('common.loading') : t('enterprise.saveOrgName')}
              </button>
            </form>
          </div>
        )}
        <div className="enterprise-card">
          <h3><UserPlus size={20} /> {t('enterprise.inviteByEmail')}</h3>
          <form onSubmit={handleInvite}>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => { setInviteEmail(e.target.value); setError(null); }}
              placeholder={t('enterprise.invitePlaceholder')}
              required
            />
            <button type="submit" disabled={inviting || !inviteEmail.trim()}>
              {inviting ? t('common.loading') : t('enterprise.invite')}
            </button>
          </form>
        </div>

        <div className="enterprise-card">
          <h3><Users size={20} /> {t('enterprise.members')}</h3>
          {members.length > 0 && (
            <div className="enterprise-members-filters">
              <input
                type="text"
                className="enterprise-search-input"
                placeholder={t('enterprise.searchMembers')}
                value={membersFilter}
                onChange={(e) => setMembersFilter(e.target.value)}
              />
              <select
                className="enterprise-select"
                value={membersRoleFilter}
                onChange={(e) => setMembersRoleFilter(e.target.value)}
              >
                <option value="all">{t('enterprise.filterAll')}</option>
                <option value="admin">{t('enterprise.admin')}</option>
                <option value="member">{t('enterprise.member')}</option>
              </select>
            </div>
          )}
          {members.length === 0 ? (
            <p className="enterprise-empty">{t('enterprise.noMembers')}</p>
          ) : filteredMembers.length === 0 ? (
            <p className="enterprise-empty">{t('enterprise.noMembersMatch')}</p>
          ) : (
            <ul className="enterprise-members-list">
              {filteredMembers.map((m) => {
                const isCreatorMember = enterprise?.createdBy === m.id;
                const isSelf = m.id === user?.uid;
                const canRemove = !isCreatorMember && !isSelf;
                const canPromote = !isCreatorMember && !isSelf && m.enterpriseRole !== 'admin';
                const canDemote = !isCreatorMember && !isSelf && m.enterpriseRole === 'admin';
                const isRemoving = removingMemberId === m.id;
                const isUpdatingRole = updatingRoleId === m.id;
                return (
                  <li key={m.id}>
                    {m.profilePicture ? (
                      <img src={m.profilePicture} alt="" className="enterprise-member-avatar" />
                    ) : (
                      <div className="enterprise-member-avatar-fallback"><Users size={16} /></div>
                    )}
                    <span>{getMemberDisplayName(m)}</span>
                    <div className="enterprise-member-actions">
                      <span className="enterprise-role-badge">{m.enterpriseRole === 'admin' ? t('enterprise.admin') : t('enterprise.member')}</span>
                      <button
                        type="button"
                        className="enterprise-view-btn"
                        onClick={() => setSelectedMember(m)}
                        title={t('enterprise.monitor')}
                      >
                        <Eye size={14} />
                        <span>{t('enterprise.viewMember')}</span>
                      </button>
                      {canPromote && (
                        <button
                          type="button"
                          className="enterprise-promote-btn"
                          onClick={() => handleSetMemberRole(m, 'admin')}
                          disabled={isUpdatingRole}
                          title={t('enterprise.makeAdmin')}
                        >
                          {isUpdatingRole ? <Loader size={14} className="spinning" /> : <Shield size={14} />}
                          <span>{t('enterprise.makeAdmin')}</span>
                        </button>
                      )}
                      {canDemote && (
                        <button
                          type="button"
                          className="enterprise-demote-btn"
                          onClick={() => handleSetMemberRole(m, 'member')}
                          disabled={isUpdatingRole}
                          title={t('enterprise.demoteToMember')}
                        >
                          {isUpdatingRole ? <Loader size={14} className="spinning" /> : <UserMinus size={14} />}
                          <span>{t('enterprise.demoteToMember')}</span>
                        </button>
                      )}
                      {canRemove && (
                        <button
                          type="button"
                          className="enterprise-remove-btn-icon"
                          onClick={() => handleRemoveMember(m)}
                          disabled={isRemoving}
                          title={t('enterprise.removeMember')}
                        >
                          {isRemoving ? <Loader size={16} className="spinning" /> : <X size={16} />}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="enterprise-card">
          <h3>{t('enterprise.pendingInvites')}</h3>
          {pendingInvites.length === 0 ? (
            <p className="enterprise-empty">{t('enterprise.noPendingInvites')}</p>
          ) : (
            <ul className="enterprise-invites-list">
              {pendingInvites.map((inv) => {
                const invDate = inv.invitedAt?.toDate ? inv.invitedAt.toDate() : (inv.invitedAt ? new Date(inv.invitedAt) : null);
                const invitedAgo = invDate ? formatDistanceToNow(invDate, { addSuffix: true, locale: getDateFnsLocale() }) : null;
                const isCancelling = cancellingInviteId === inv.id;
                return (
                  <li key={inv.id}>
                    <div className="enterprise-invite-info">
                      <span className="enterprise-invite-email">{inv.email}</span>
                      {invitedAgo && <span className="enterprise-invite-ago">{t('enterprise.invitedAgo', { ago: invitedAgo })}</span>}
                    </div>
                    <button
                      type="button"
                      className="enterprise-cancel-invite-btn"
                      onClick={() => handleCancelInvite(inv)}
                      disabled={isCancelling}
                      title={t('enterprise.cancelInvite')}
                    >
                      {isCancelling ? <Loader size={14} className="spinning" /> : <X size={14} />}
                      <span>{t('enterprise.cancelInvite')}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}
