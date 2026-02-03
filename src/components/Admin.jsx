import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc, query, orderBy, limit, where } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { isAdmin } from '../lib/adminUtils';
import { addCallPack } from '../lib/tokenManager';
import { getPlanConfig, savePlanConfig } from '../lib/planConfig';
import { Shield, Users, UserPlus, Crown, BarChart3, Package, Settings, Search, Trash2, Edit2, Eye, Loader, AlertCircle, Check, X, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import './Admin.css';

export function Admin({ user, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [guests, setGuests] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers7d: 0,
    activeUsers30d: 0,
    premiumAISubscribers: 0,
    totalSessions: 0,
    totalAICalls: 0
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

      // Load session counts for statistics
      const sessionsRef = collection(db, 'sessions');
      const sessionsSnapshot = await getDocs(sessionsRef);
      const totalSessions = sessionsSnapshot.size;

      // Calculate active users (users with sessions in last 7/30 days)
      const now = Date.now();
      const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

      const activeUsers7d = new Set();
      const activeUsers30d = new Set();

      sessionsSnapshot.forEach((sessionDoc) => {
        const session = sessionDoc.data();
        const userId = session.userId;
        const clockIn = session.clockIn || 0;

        if (clockIn >= thirtyDaysAgo) {
          activeUsers30d.add(userId);
        }
        if (clockIn >= sevenDaysAgo) {
          activeUsers7d.add(userId);
        }
      });

      // Calculate statistics
      const premiumAISubscribers = allUsers.filter(u => 
        (u.subscriptionPlan || '').toLowerCase() === 'premium_ai'
      ).length;

      // Calculate total AI calls
      let totalAICalls = 0;
      allUsers.forEach(u => {
        if (u.aiUsage && u.aiUsage.totalTokensUsed) {
          // We track totalTokensUsed, but can estimate calls from callsUsed
          totalAICalls += (u.aiUsage.callsUsed || 0);
        }
      });

      setUsers(allUsers);
      setGuests(guestAccounts);
      setStats({
        totalUsers: allUsers.length,
        activeUsers7d: activeUsers7d.size,
        activeUsers30d: activeUsers30d.size,
        premiumAISubscribers,
        totalSessions,
        totalAICalls
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
          <div className="section-header">
            <h2>Usage Analytics</h2>
          </div>

          <div className="analytics-grid">
            <div className="analytics-card">
              <h3>User Growth</h3>
              <div className="analytics-value">{stats.totalUsers}</div>
              <div className="analytics-label">Total registered users</div>
            </div>
            <div className="analytics-card">
              <h3>Active Users</h3>
              <div className="analytics-value">{stats.activeUsers7d}</div>
              <div className="analytics-label">Active in last 7 days</div>
            </div>
            <div className="analytics-card">
              <h3>Subscription Distribution</h3>
              <div className="analytics-value">{stats.premiumAISubscribers}</div>
              <div className="analytics-label">Premium AI subscribers</div>
            </div>
            <div className="analytics-card">
              <h3>Session Activity</h3>
              <div className="analytics-value">{stats.totalSessions}</div>
              <div className="analytics-label">Total sessions tracked</div>
            </div>
          </div>
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
