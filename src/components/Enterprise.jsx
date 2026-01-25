import { useState, useEffect, useMemo } from 'react';
import { collection, doc, getDoc, getDocs, query, where, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  createEnterprise,
  createInvite,
  listMembers,
  listPendingInvites,
  getEnterprise
} from '../lib/enterpriseHelpers';
import { calculatePeriodFinance } from '../lib/financeCalculator';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';
import { getDateFnsLocale } from '../lib/i18n';
import { Building2, UserPlus, Users, Loader, AlertCircle, Crown, ArrowRight, ArrowLeft, Eye, BarChart3, DollarSign, Clock, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberDetailTab, setMemberDetailTab] = useState('sessions');
  const [memberSessions, setMemberSessions] = useState([]);
  const [memberDeductions, setMemberDeductions] = useState([]);
  const [memberSettings, setMemberSettings] = useState(null);
  const [memberDetailLoading, setMemberDetailLoading] = useState(false);
  const [memberDetailError, setMemberDetailError] = useState(null);
  const [memberReportType, setMemberReportType] = useState('monthly');
  const [memberSelectedDate, setMemberSelectedDate] = useState(new Date());

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

  const hasAccess = plan === 'enterprise' || !!enterpriseId;

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
    if (!memberFinanceData) return [];
    return [...(memberFinanceData.sessions || [])].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [memberFinanceData]);

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
  if (enterpriseRole === 'member' && enterprise && !isCreator) {
    return (
      <div className="enterprise-container">
        <div className="enterprise-header">
          <Building2 className="enterprise-header-icon" size={32} />
          <div>
            <h1>{t('enterprise.title')}</h1>
            <p>{t('enterprise.yourePartOf')} <strong>{enterprise.name}</strong></p>
          </div>
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
        <div className="enterprise-stats-strip">
          <div className="enterprise-stat-strip-card">
            <div className="enterprise-stat-strip-value">{members.length}</div>
            <div className="enterprise-stat-strip-label">{t('enterprise.statsMembers')}</div>
          </div>
          <div className="enterprise-stat-strip-card">
            <div className="enterprise-stat-strip-value">{pendingInvites.length}</div>
            <div className="enterprise-stat-strip-label">{t('enterprise.statsPending')}</div>
          </div>
        </div>
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
            {t('enterprise.memberDetail')}: {getMemberDisplayName(selectedMember)}
          </h2>
          <div className="enterprise-member-tabs">
            {(['sessions', 'analytics', 'finance']).map((tab) => (
              <button
                key={tab}
                type="button"
                className={`enterprise-tab ${memberDetailTab === tab ? 'active' : ''}`}
                onClick={() => setMemberDetailTab(tab)}
              >
                {tab === 'sessions' && <Clock size={16} />}
                {tab === 'analytics' && <BarChart3 size={16} />}
                {tab === 'finance' && <DollarSign size={16} />}
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
                            </tr>
                          </thead>
                          <tbody>
                            {memberFilteredSessions.map((s) => (
                              <tr key={s.id || s.date?.getTime()}>
                                <td>{s.date ? format(s.date, 'yyyy-MM-dd') : '-'}</td>
                                <td>{(s.regularHours || 0).toFixed(2)}</td>
                                <td>{(s.isencaoHours || 0).toFixed(2)}</td>
                                <td>{(s.paidExtraHours || 0).toFixed(2)}</td>
                                <td>€{(s.totalEarnings || 0).toFixed(2)}</td>
                              </tr>
                            ))}
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
                  )}
                </div>
              )}
              {memberDetailTab === 'finance' && (
                <div className="enterprise-card enterprise-tab-panel">
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
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
      <>
      <div className="enterprise-admin-grid">
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
          {members.length === 0 ? (
            <p className="enterprise-empty">{t('enterprise.noMembers')}</p>
          ) : (
            <ul className="enterprise-members-list">
              {members.map((m) => (
                <li key={m.id}>
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
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="enterprise-card">
          <h3>{t('enterprise.pendingInvites')}</h3>
          {pendingInvites.length === 0 ? (
            <p className="enterprise-empty">{t('enterprise.noPendingInvites')}</p>
          ) : (
            <ul className="enterprise-invites-list">
              {pendingInvites.map((inv) => (
                <li key={inv.id}>{inv.email}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <EnterpriseAISection enterpriseId={enterpriseId} members={members} />
      </>
      )}
    </div>
  );
}
