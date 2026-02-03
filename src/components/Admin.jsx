import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { isAdmin } from '../lib/adminUtils';
import { addCallPack } from '../lib/tokenManager';
import { getPlanConfig, savePlanConfig } from '../lib/planConfig';
import { Shield, Users, UserPlus, Crown, BarChart3, Package, Settings, Search, Trash2, Edit2, Eye, Loader, AlertCircle, Check, X, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfDay, startOfMonth, subDays, eachDayOfInterval } from 'date-fns';
import { useTranslation } from 'react-i18next';
import './Admin.css';

export function Admin({ user }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [guests, setGuests] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers7d: 0,
    activeUsers30d: 0,
    premiumAISubscribers: 0,
    totalSessions: 0,
    totalAICalls: 0,
    newUsersThisMonth: 0,
    sessionsThisMonth: 0,
    enterpriseCount: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState('stats');
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [newGuestEmail, setNewGuestEmail] = useState('');
  const [newGuestPlan, setNewGuestPlan] = useState('free');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [planConfig, setPlanConfig] = useState(null);
  const [planConfigLoading, setPlanConfigLoading] = useState(false);
  const [planConfigSaving, setPlanConfigSaving] = useState(null);
  const [expandedPlanEditor, setExpandedPlanEditor] = useState(null);
  const [analyticsDateRange, setAnalyticsDateRange] = useState('30d');

  useEffect(() => {
    if (user && isAdmin(user)) {
      loadAdminData();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeSection === 'subscriptions' && user && isAdmin(user)) {
      const load = async () => {
        setPlanConfigLoading(true);
        try {
          const config = await getPlanConfig();
          setPlanConfig(config);
        } catch (err) {
          console.error('Error loading plan config:', err);
        } finally {
          setPlanConfigLoading(false);
        }
      };
      load();
    }
  }, [activeSection, user]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      
      // Load all user settings
      const userSettingsRef = collection(db, 'userSettings');
      const userSettingsSnapshot = await getDocs(userSettingsRef);
      
      const allUsers = [];
      const guestAccounts = [];
      
      userSettingsSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        allUsers.push({
          id: docSnap.id,
          email: data.email || '',
          subscriptionPlan: data.subscriptionPlan || data.plan || 'free',
          createdAt: data.createdAt,
          createdBy: data.createdBy,
          userType: data.userType || 'regular',
          isPremium: data.isPremium || false,
          ...data
        });
        
        // Filter guests (created by admin)
        if (data.createdBy || data.userType === 'guest') {
          guestAccounts.push({
            id: docSnap.id,
            email: data.email || '',
            subscriptionPlan: data.subscriptionPlan || data.plan || 'free',
            createdAt: data.createdAt,
            createdBy: data.createdBy
          });
        }
      });

      // Load sessions for statistics and analytics
      const sessionsRef = collection(db, 'sessions');
      const sessionsSnapshot = await getDocs(sessionsRef);
      const sessionsList = [];
      const totalSessions = sessionsSnapshot.size;

      // Calculate active users (users with sessions in last 7/30 days)
      const now = Date.now();
      const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
      const monthStart = startOfMonth(new Date()).getTime();

      const activeUsers7d = new Set();
      const activeUsers30d = new Set();
      let newUsersThisMonth = 0;
      let sessionsThisMonth = 0;

      sessionsSnapshot.forEach((sessionDoc) => {
        const session = sessionDoc.data();
        const userId = session.userId;
        const clockIn = session.clockIn || 0;
        sessionsList.push({ id: sessionDoc.id, userId, clockIn, ...session });

        if (clockIn >= monthStart) sessionsThisMonth++;
        if (clockIn >= thirtyDaysAgo) activeUsers30d.add(userId);
        if (clockIn >= sevenDaysAgo) activeUsers7d.add(userId);
      });

      allUsers.forEach((u) => {
        const createdAtMs = u.createdAt?.seconds ? u.createdAt.seconds * 1000 : (u.createdAt || 0);
        if (createdAtMs >= monthStart) newUsersThisMonth++;
      });

      // Load enterprise count
      let enterpriseCount = 0;
      try {
        const enterprisesRef = collection(db, 'enterprises');
        const enterprisesSnap = await getDocs(enterprisesRef);
        enterpriseCount = enterprisesSnap.size;
      } catch { /* enterprises may not exist */ }

      // Calculate statistics
      const premiumAISubscribers = allUsers.filter(u =>
        (u.subscriptionPlan || '').toLowerCase() === 'premium_ai'
      ).length;

      // Calculate total AI calls
      let totalAICalls = 0;
      allUsers.forEach(u => {
        if (u.aiUsage && u.aiUsage.totalTokensUsed) {
          totalAICalls += (u.aiUsage.callsUsed || 0);
        }
      });

      setUsers(allUsers);
      setGuests(guestAccounts);
      setSessions(sessionsList);
      setStats({
        totalUsers: allUsers.length,
        activeUsers7d: activeUsers7d.size,
        activeUsers30d: activeUsers30d.size,
        premiumAISubscribers,
        totalSessions,
        totalAICalls,
        newUsersThisMonth,
        sessionsThisMonth,
        enterpriseCount: enterpriseCount
      });
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGuest = async (e) => {
    e.preventDefault();
    
    if (!newGuestEmail || !newGuestEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !isAdmin(currentUser)) {
        alert('Unauthorized');
        return;
      }

      // Generate a user ID (for now, use email-based hash or Firestore doc ID)
      // Note: This creates a userSettings doc, but the actual user must sign in via Google Auth
      // The guest will need to sign in with this email via Google Auth to access the account
      const guestDocRef = doc(db, 'userSettings', newGuestEmail.toLowerCase().replace(/\./g, '_'));
      const guestDoc = await getDoc(guestDocRef);

      if (guestDoc.exists()) {
        alert('User already exists');
        return;
      }

      const now = new Date();
      await setDoc(guestDocRef, {
        email: newGuestEmail.toLowerCase(),
        subscriptionPlan: newGuestPlan,
        plan: newGuestPlan,
        userType: 'guest',
        createdBy: currentUser.uid,
        createdAt: { seconds: Math.floor(now.getTime() / 1000), nanoseconds: 0 },
        createdByEmail: currentUser.email
      });

      // Initialize calls if Premium AI
      if (newGuestPlan === 'premium_ai' || newGuestPlan === 'enterprise') {
        // Note: We need the actual user ID (Firebase Auth UID), not email
        // This will be set when user signs in
        // For now, just set the subscription plan
      }

      alert('Guest account created! User can now sign in with Google using this email.');
      setNewGuestEmail('');
      setNewGuestPlan('free');
      setShowAddGuest(false);
      await loadAdminData();
    } catch (error) {
      console.error('Error creating guest:', error);
      alert('Error creating guest account: ' + error.message);
    }
  };

  const handleUpdateUserPlan = async (userId, newPlan) => {
    try {
      const userSettingsRef = doc(db, 'userSettings', userId);
      await setDoc(userSettingsRef, {
        subscriptionPlan: newPlan,
        plan: newPlan
      }, { merge: true });

      alert(`Subscription plan updated to ${newPlan}`);
      await loadAdminData();
    } catch (error) {
      console.error('Error updating user plan:', error);
      alert('Error updating plan: ' + error.message);
    }
  };

  const handleAddCallPack = async (userId, packSize = 50) => {
    try {
      await addCallPack(userId, packSize);
      alert(`Call pack added! +${packSize} calls added to user's account.`);
      await loadAdminData();
    } catch (error) {
      console.error('Error adding call pack:', error);
      alert('Error adding call pack: ' + error.message);
    }
  };

  const handleSavePlanConfig = async (planId, updates) => {
    setPlanConfigSaving(planId);
    try {
      await savePlanConfig({ [planId]: updates });
      const config = await getPlanConfig();
      setPlanConfig(config);
      alert(`Plan "${planId}" saved successfully.`);
    } catch (err) {
      console.error('Error saving plan config:', err);
      alert('Error saving plan config: ' + err.message);
    } finally {
      setPlanConfigSaving(null);
    }
  };

  const handleUpdatePlanEditor = (planId, field, value) => {
    if (!planConfig) return;
    setPlanConfig({
      ...planConfig,
      [planId]: {
        ...(planConfig[planId] || {}),
        [field]: value
      }
    });
  };

  const handleAddFeature = (planId) => {
    const plan = planConfig?.[planId];
    const features = Array.isArray(plan?.features) ? [...plan.features, ''] : [''];
    handleUpdatePlanEditor(planId, 'features', features);
  };

  const handleRemoveFeature = (planId, index) => {
    const plan = planConfig?.[planId];
    const features = Array.isArray(plan?.features) ? plan.features.filter((_, i) => i !== index) : [];
    handleUpdatePlanEditor(planId, 'features', features);
  };

  const handleUpdateFeature = (planId, index, value) => {
    const plan = planConfig?.[planId];
    const features = Array.isArray(plan?.features) ? [...plan.features] : [];
    features[index] = value;
    handleUpdatePlanEditor(planId, 'features', features);
  };

  const handleDeleteGuest = async (guestId, guestEmail) => {
    if (!confirm(`Are you sure you want to delete guest account: ${guestEmail}?`)) {
      return;
    }

    try {
      const userSettingsRef = doc(db, 'userSettings', guestId);
      await deleteDoc(userSettingsRef);
      alert('Guest account deleted');
      await loadAdminData();
    } catch (error) {
      console.error('Error deleting guest:', error);
      alert('Error deleting guest: ' + error.message);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.subscriptionPlan || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredGuests = guests.filter(g =>
    g.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const createdAtToMs = (ts) => {
    if (!ts) return 0;
    if (ts.seconds != null) return ts.seconds * 1000;
    return typeof ts === 'number' ? ts : 0;
  };

  const analyticsChartData = useMemo(() => {
    if (!users.length && !sessions.length) return null;
    const days = parseInt(analyticsDateRange, 10) || 30;
    const end = new Date();
    const start = subDays(end, days);
    const interval = eachDayOfInterval({ start, end });

    const newSignupsByDay = {};
    const activeByDay = {};
    const sessionsByDay = {};
    interval.forEach((d) => {
      const key = format(d, 'yyyy-MM-dd');
      newSignupsByDay[key] = 0;
      activeByDay[key] = new Set();
      sessionsByDay[key] = 0;
    });

    users.forEach((u) => {
      const ms = createdAtToMs(u.createdAt);
      if (ms >= start.getTime() && ms <= end.getTime()) {
        const key = format(startOfDay(ms), 'yyyy-MM-dd');
        if (newSignupsByDay[key] !== undefined) newSignupsByDay[key]++;
      }
    });

    sessions.forEach((s) => {
      const clockIn = s.clockIn || 0;
      if (clockIn >= start.getTime() && clockIn <= end.getTime()) {
        const key = format(startOfDay(clockIn), 'yyyy-MM-dd');
        if (activeByDay[key]) activeByDay[key].add(s.userId);
        if (sessionsByDay[key] !== undefined) sessionsByDay[key]++;
      }
    });

    const usersOverTime = interval.map((d) => {
      const key = format(d, 'yyyy-MM-dd');
      return {
        date: format(d, 'MMM d'),
        fullDate: key,
        newUsers: newSignupsByDay[key] || 0,
        activeUsers: activeByDay[key]?.size || 0,
        sessions: sessionsByDay[key] || 0
      };
    });

    const dist = { free: 0, basic: 0, pro: 0, premium_ai: 0, enterprise: 0 };
    users.forEach((u) => {
      let plan = (u.subscriptionPlan || 'free').toLowerCase().replace(/[- ]/g, '_');
      if (!(plan in dist)) plan = 'free';
      dist[plan]++;
    });
    const subscriptionDistribution = Object.entries(dist)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name: name.replace('_', ' '), value }));

    return { usersOverTime, subscriptionDistribution };
  }, [users, sessions, analyticsDateRange]);

  // Check if user is admin
  if (!user || !isAdmin(user)) {
    return (
      <div className="admin-container">
        <div className="admin-unauthorized">
          <AlertCircle size={48} />
          <h2>Unauthorized</h2>
          <p>You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-loading">
          <Loader className="spinning" />
          <span>Loading admin data...</span>
        </div>
      </div>
    );
  }

  const plans = ['free', 'basic', 'pro', 'premium_ai', 'enterprise'];

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div className="header-content">
          <Shield className="header-icon" />
          <div>
            <h1>Admin Dashboard</h1>
            <p>Manage users, subscriptions, and app analytics</p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{stats.totalUsers}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active (7 days)</div>
          <div className="stat-value">{stats.activeUsers7d}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active (30 days)</div>
          <div className="stat-value">{stats.activeUsers30d}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Premium AI</div>
          <div className="stat-value">{stats.premiumAISubscribers}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Sessions</div>
          <div className="stat-value">{stats.totalSessions}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total AI Calls</div>
          <div className="stat-value">{stats.totalAICalls}</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeSection === 'guests' ? 'active' : ''}`}
          onClick={() => setActiveSection('guests')}
        >
          <UserPlus size={18} />
          <span>Guest Management ({guests.length})</span>
        </button>
        <button
          className={`admin-tab ${activeSection === 'users' ? 'active' : ''}`}
          onClick={() => setActiveSection('users')}
        >
          <Users size={18} />
          <span>User Management ({users.length})</span>
        </button>
        <button
          className={`admin-tab ${activeSection === 'subscriptions' ? 'active' : ''}`}
          onClick={() => setActiveSection('subscriptions')}
        >
          <Crown size={18} />
          <span>Subscriptions</span>
        </button>
        <button
          className={`admin-tab ${activeSection === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveSection('analytics')}
        >
          <BarChart3 size={18} />
          <span>Analytics</span>
        </button>
        <button
          className={`admin-tab ${activeSection === 'callpacks' ? 'active' : ''}`}
          onClick={() => setActiveSection('callpacks')}
        >
          <Package size={18} />
          <span>Call Packs</span>
        </button>
      </div>

      {/* Guest Management Section */}
      {activeSection === 'guests' && (
        <div className="admin-section">
          <div className="section-header">
            <h2>Guest Management</h2>
            <button
              className="add-guest-button"
              onClick={() => setShowAddGuest(!showAddGuest)}
            >
              <UserPlus size={18} />
              <span>Add Guest</span>
            </button>
          </div>

          {showAddGuest && (
            <form className="add-guest-form" onSubmit={handleAddGuest}>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={newGuestEmail}
                  onChange={(e) => setNewGuestEmail(e.target.value)}
                  placeholder="guest@example.com"
                  required
                />
              </div>
              <div className="form-group">
                <label>Initial Subscription Plan</label>
                <select
                  value={newGuestPlan}
                  onChange={(e) => setNewGuestPlan(e.target.value)}
                >
                  <option value="free">Free</option>
                  <option value="basic">Basic (€0.99/month)</option>
                  <option value="pro">Pro (€4.99/month)</option>
                  <option value="premium_ai">Premium AI (€9.99/month)</option>
                  <option value="enterprise">Enterprise (Custom)</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="submit" className="submit-button">
                  <Check size={18} />
                  <span>Create Guest</span>
                </button>
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => {
                    setShowAddGuest(false);
                    setNewGuestEmail('');
                    setNewGuestPlan('free');
                  }}
                >
                  <X size={18} />
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          )}

          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search guests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="guests-list">
            {filteredGuests.length === 0 ? (
              <div className="empty-state">No guests found</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Plan</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGuests.map((guest) => (
                    <tr key={guest.id}>
                      <td>{guest.email}</td>
                      <td>
                        <select
                          value={guest.subscriptionPlan}
                          onChange={(e) => handleUpdateUserPlan(guest.id, e.target.value)}
                          className="plan-select"
                        >
                          {plans.map(plan => (
                            <option key={plan} value={plan}>{plan}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {guest.createdAt?.seconds
                          ? new Date(guest.createdAt.seconds * 1000).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      <td>
                        <button
                          className="action-button delete"
                          onClick={() => handleDeleteGuest(guest.id, guest.email)}
                          title="Delete guest"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* User Management Section */}
      {activeSection === 'users' && (
        <div className="admin-section">
          <div className="section-header">
            <h2>User Management</h2>
          </div>

          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search users by email or plan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="users-list">
            {filteredUsers.length === 0 ? (
              <div className="empty-state">No users found</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Plan</th>
                    <th>User Type</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.slice(0, 100).map((userItem) => (
                    <tr key={userItem.id}>
                      <td>{userItem.email || userItem.id}</td>
                      <td>
                        <select
                          value={userItem.subscriptionPlan}
                          onChange={(e) => handleUpdateUserPlan(userItem.id, e.target.value)}
                          className="plan-select"
                        >
                          {plans.map(plan => (
                            <option key={plan} value={plan}>{plan}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span className={`user-type-badge ${userItem.userType || 'regular'}`}>
                          {userItem.userType || 'regular'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-button view"
                            onClick={() => {
                              setSelectedUser(userItem);
                              setShowUserDetails(true);
                            }}
                            title="View details"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Subscription Management Section */}
      {activeSection === 'subscriptions' && (
        <div className="admin-section">
          <div className="section-header">
            <h2>Subscription Management</h2>
          </div>

          <div className="subscription-stats">
            {plans.map(plan => {
              const count = users.filter(u => (u.subscriptionPlan || '').toLowerCase() === plan.toLowerCase()).length;
              const percentage = users.length > 0 ? ((count / users.length) * 100).toFixed(1) : 0;
              
              return (
                <div key={plan} className="subscription-stat-card">
                  <div className="stat-plan-name">{plan.toUpperCase()}</div>
                  <div className="stat-plan-count">{count} users</div>
                  <div className="stat-plan-percentage">{percentage}%</div>
                </div>
              );
            })}
          </div>

          <p className="plan-config-hint">Edit prices and features shown on the Premium+ page. Display prices are cosmetic; update Stripe Payment Links separately for actual charges.</p>

          {planConfigLoading ? (
            <div className="plan-editor-loading">
              <Loader className="spinning" size={24} />
              <span>Loading plan config...</span>
            </div>
          ) : planConfig && (
            <div className="plan-editor-list">
              {['basic', 'pro', 'premium_ai', 'enterprise'].map((planId) => {
                const plan = planConfig[planId] || {};
                const isExpanded = expandedPlanEditor === planId;
                const features = Array.isArray(plan.features) ? plan.features : [];
                return (
                  <div key={planId} className="plan-editor-card">
                    <button
                      type="button"
                      className="plan-editor-header"
                      onClick={() => setExpandedPlanEditor(isExpanded ? null : planId)}
                    >
                      <span className="plan-editor-title">{planId.replace('_', ' ').toUpperCase()}</span>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                    {isExpanded && (
                      <div className="plan-editor-body">
                        <div className="plan-editor-row">
                          <div className="form-group">
                            <label>Price (display)</label>
                            <input
                              type="text"
                              value={plan.price || ''}
                              onChange={(e) => handleUpdatePlanEditor(planId, 'price', e.target.value)}
                              placeholder="e.g. €0.99 or Custom"
                            />
                          </div>
                          <div className="form-group">
                            <label>Period</label>
                            <select
                              value={plan.period || 'month'}
                              onChange={(e) => handleUpdatePlanEditor(planId, 'period', e.target.value)}
                            >
                              <option value="month">month</option>
                              <option value="year">year</option>
                            </select>
                          </div>
                          {planId === 'enterprise' && (
                            <div className="form-group">
                              <label>Max Premium+ users (included in plan)</label>
                              <input
                                type="number"
                                min={0}
                                value={plan.maxPremiumUsers ?? 10}
                                onChange={(e) => handleUpdatePlanEditor(planId, 'maxPremiumUsers', parseInt(e.target.value, 10) || 0)}
                              />
                            </div>
                          )}
                        </div>
                        <div className="form-group">
                          <label>Features</label>
                          <div className="plan-features-list">
                            {features.map((f, i) => (
                              <div key={i} className="plan-feature-row">
                                <input
                                  type="text"
                                  value={f}
                                  onChange={(e) => handleUpdateFeature(planId, i, e.target.value)}
                                  placeholder="Feature description"
                                />
                                <button
                                  type="button"
                                  className="action-button delete"
                                  onClick={() => handleRemoveFeature(planId, i)}
                                  title="Remove"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              className="add-feature-button"
                              onClick={() => handleAddFeature(planId)}
                            >
                              <Plus size={16} />
                              <span>Add feature</span>
                            </button>
                          </div>
                        </div>
                        <div className="plan-editor-actions">
                          <button
                            type="button"
                            className="submit-button"
                            disabled={planConfigSaving === planId}
                            onClick={() => handleSavePlanConfig(planId, plan)}
                          >
                            {planConfigSaving === planId ? (
                              <>
                                <Loader className="spinning" size={16} />
                                <span>Saving...</span>
                              </>
                            ) : (
                              <>
                                <Check size={16} />
                                <span>Save {planId}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Analytics Section */}
      {activeSection === 'analytics' && (
        <div className="admin-section">
          <div className="section-header analytics-section-header">
            <h2>{t('admin.analytics.title', { defaultValue: 'Usage Analytics' })}</h2>
            <select
              className="analytics-date-range-select"
              value={analyticsDateRange}
              onChange={(e) => setAnalyticsDateRange(e.target.value)}
            >
              <option value="7d">{t('admin.analytics.range7d', { defaultValue: 'Last 7 days' })}</option>
              <option value="14d">{t('admin.analytics.range14d', { defaultValue: 'Last 14 days' })}</option>
              <option value="30d">{t('admin.analytics.range30d', { defaultValue: 'Last 30 days' })}</option>
              <option value="90d">{t('admin.analytics.range90d', { defaultValue: 'Last 90 days' })}</option>
            </select>
          </div>

          <div className="analytics-grid">
            <div className="analytics-card">
              <h3>{t('admin.analytics.totalUsers', { defaultValue: 'Total Users' })}</h3>
              <div className="analytics-value">{stats.totalUsers}</div>
              <div className="analytics-label">{t('admin.analytics.totalRegistered', { defaultValue: 'Total registered users' })}</div>
            </div>
            <div className="analytics-card">
              <h3>{t('admin.analytics.active7d', { defaultValue: 'Active (7 days)' })}</h3>
              <div className="analytics-value">{stats.activeUsers7d}</div>
              <div className="analytics-label">{t('admin.analytics.activeLast7', { defaultValue: 'Active in last 7 days' })}</div>
            </div>
            <div className="analytics-card">
              <h3>{t('admin.analytics.active30d', { defaultValue: 'Active (30 days)' })}</h3>
              <div className="analytics-value">{stats.activeUsers30d}</div>
              <div className="analytics-label">{t('admin.analytics.activeLast30', { defaultValue: 'Active in last 30 days' })}</div>
            </div>
            <div className="analytics-card">
              <h3>{t('admin.analytics.premiumAI', { defaultValue: 'Premium AI' })}</h3>
              <div className="analytics-value">{stats.premiumAISubscribers}</div>
              <div className="analytics-label">{t('admin.analytics.premiumSubscribers', { defaultValue: 'Premium AI subscribers' })}</div>
            </div>
            <div className="analytics-card">
              <h3>{t('admin.analytics.totalSessions', { defaultValue: 'Total Sessions' })}</h3>
              <div className="analytics-value">{stats.totalSessions}</div>
              <div className="analytics-label">{t('admin.analytics.sessionsTracked', { defaultValue: 'Total sessions tracked' })}</div>
            </div>
            <div className="analytics-card">
              <h3>{t('admin.analytics.totalAICalls', { defaultValue: 'Total AI Calls' })}</h3>
              <div className="analytics-value">{stats.totalAICalls}</div>
              <div className="analytics-label">{t('admin.analytics.aiCallsUsed', { defaultValue: 'AI calls used' })}</div>
            </div>
            <div className="analytics-card">
              <h3>{t('admin.analytics.newThisMonth', { defaultValue: 'New This Month' })}</h3>
              <div className="analytics-value">{stats.newUsersThisMonth ?? 0}</div>
              <div className="analytics-label">{t('admin.analytics.newUsersMonth', { defaultValue: 'New users this month' })}</div>
            </div>
            <div className="analytics-card">
              <h3>{t('admin.analytics.sessionsThisMonth', { defaultValue: 'Sessions This Month' })}</h3>
              <div className="analytics-value">{stats.sessionsThisMonth ?? 0}</div>
              <div className="analytics-label">{t('admin.analytics.sessionsMonth', { defaultValue: 'Sessions this month' })}</div>
            </div>
            <div className="analytics-card">
              <h3>{t('admin.analytics.enterpriseOrgs', { defaultValue: 'Enterprise Orgs' })}</h3>
              <div className="analytics-value">{stats.enterpriseCount ?? 0}</div>
              <div className="analytics-label">{t('admin.analytics.enterpriseOrgsLabel', { defaultValue: 'Enterprise organizations' })}</div>
            </div>
          </div>

          {analyticsChartData ? (
            <div className="analytics-charts">
              <div className="analytics-chart-card">
                <h3 className="analytics-chart-title">{t('admin.analytics.usersOverTime', { defaultValue: 'New Signups Over Time' })}</h3>
                <div className="analytics-chart-container">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={analyticsChartData.usersOverTime} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
                      <YAxis stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--foreground)' }}
                      />
                      <Line type="monotone" dataKey="newUsers" stroke="var(--primary)" strokeWidth={2} name={t('admin.analytics.newSignups', { defaultValue: 'New signups' })} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="analytics-chart-card">
                <h3 className="analytics-chart-title">{t('admin.analytics.activeUsersOverTime', { defaultValue: 'Active Users Over Time' })}</h3>
                <div className="analytics-chart-container">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={analyticsChartData.usersOverTime} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
                      <YAxis stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--foreground)' }}
                      />
                      <Bar dataKey="activeUsers" name={t('admin.analytics.activeUsers', { defaultValue: 'Active users' })} fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="analytics-chart-card">
                <h3 className="analytics-chart-title">{t('admin.analytics.sessionsOverTime', { defaultValue: 'Sessions Over Time' })}</h3>
                <div className="analytics-chart-container">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={analyticsChartData.usersOverTime} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
                      <YAxis stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--foreground)' }}
                      />
                      <Bar dataKey="sessions" name={t('admin.analytics.sessions', { defaultValue: 'Sessions' })} fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {analyticsChartData.subscriptionDistribution.length > 0 && (
                <div className="analytics-chart-card analytics-pie-card">
                  <h3 className="analytics-chart-title">{t('admin.analytics.subscriptionDistribution', { defaultValue: 'Subscription Distribution' })}</h3>
                  <div className="analytics-chart-container analytics-pie-container">
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={analyticsChartData.subscriptionDistribution}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {analyticsChartData.subscriptionDistribution.map((_, i) => (
                            <Cell key={i} fill={['var(--primary)', '#10b981', '#f59e0b', '#8b5cf6', '#6366f1'][i % 5]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--foreground)' }}
                          formatter={(v) => [v, t('admin.analytics.users', { defaultValue: 'users' })]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="analytics-charts-empty">{t('admin.analytics.noData', { defaultValue: 'No analytics data available.' })}</div>
          )}
        </div>
      )}

      {/* Call Pack Management Section */}
      {activeSection === 'callpacks' && (
        <div className="admin-section">
          <div className="section-header">
            <h2>Call Pack Management</h2>
          </div>

          <div className="call-pack-management">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search Premium AI users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="premium-ai-users">
              {users.filter(u => (u.subscriptionPlan || '').toLowerCase() === 'premium_ai').length === 0 ? (
                <div className="empty-state">No Premium AI users found</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Calls Used</th>
                      <th>Calls Remaining</th>
                      <th>Packs</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter(u => (u.subscriptionPlan || '').toLowerCase() === 'premium_ai')
                      .filter(u => !searchTerm || u.email.toLowerCase().includes(searchTerm.toLowerCase()))
                      .slice(0, 100)
                      .map((userItem) => {
                        const aiUsage = userItem.aiUsage || {};
                        const callsUsed = aiUsage.callsUsed || 0;
                        const callsAllocated = aiUsage.callsAllocated || 75;
                        const packsRemaining = (aiUsage.callPacks || []).reduce((sum, p) => sum + (p.remaining || 0), 0);
                        
                        return (
                          <tr key={userItem.id}>
                            <td>{userItem.email || userItem.id}</td>
                            <td>{callsUsed}/{callsAllocated}</td>
                            <td>{Math.max(0, callsAllocated - callsUsed) + packsRemaining}</td>
                            <td>{aiUsage.callPacks?.length || 0} packs</td>
                            <td>
                              <button
                                className="action-button add"
                                onClick={() => handleAddCallPack(userItem.id, 50)}
                                title="Add +50 calls pack"
                              >
                                <Package size={16} />
                                <span>+50 Calls</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowUserDetails(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>User Details</h2>
              <button className="modal-close" onClick={() => setShowUserDetails(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <label>Email:</label>
                <span>{selectedUser.email || selectedUser.id}</span>
              </div>
              <div className="detail-row">
                <label>Subscription Plan:</label>
                <span>{selectedUser.subscriptionPlan || 'free'}</span>
              </div>
              <div className="detail-row">
                <label>User Type:</label>
                <span>{selectedUser.userType || 'regular'}</span>
              </div>
              {selectedUser.aiUsage && (
                <>
                  <div className="detail-row">
                    <label>AI Calls Used:</label>
                    <span>{selectedUser.aiUsage.callsUsed || 0}/{selectedUser.aiUsage.callsAllocated || 75}</span>
                  </div>
                  <div className="detail-row">
                    <label>Total Tokens Used:</label>
                    <span>{selectedUser.aiUsage.totalTokensUsed || 0}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
