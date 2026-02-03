/**
 * Plan configuration – admin-editable prices, features, and enterprise settings.
 * Stored in Firestore planConfig/plans. Admin-only read/write.
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const PLAN_CONFIG_COLLECTION = 'planConfig';
const PLAN_CONFIG_DOC = 'plans';

const DEFAULTS = {
  basic: {
    price: '€0.99',
    period: 'month',
    features: [
      'Everything in Free',
      'Calendar view and import',
      'Analytics and Finance with CSV export',
      'Settings and Google Calendar sync',
      'Full session management'
    ]
  },
  pro: {
    price: '€4.99',
    period: 'month',
    features: [
      'Everything in Basic',
      'AI Advisor (buy call packs to use)',
      'Advanced analytics and reports',
      'Export functionality',
      'Priority support',
      'Custom date ranges'
    ]
  },
  premium_ai: {
    price: '€9.99',
    period: 'month',
    features: [
      'Everything in Pro',
      'AI Advisor access (75 calls/month base)',
      'Portuguese labor law compliance analysis',
      'Legal limit calculations (overtime, Isenção, vacation)',
      'HR best practices & work-life balance guidance',
      'Compliance monitoring & proactive alerts',
      'Buy additional call packs as needed'
    ]
  },
  enterprise: {
    price: '€199',
    period: 'month',
    maxPremiumUsers: 10,
    features: [
      'Everything in Premium AI',
      '225 AI calls/month (150 + 75 base)',
      'Up to {{count}} members get Premium AI included',
      'Create organization & invite team',
      'Monitor sessions, analytics & finance per member',
      'Centralized team dashboard',
      'Export per member (CSV)'
    ]
  }
};

/**
 * Fetch plan config from Firestore and merge with defaults.
 * @returns {Promise<Object>} Merged plan config
 */
export async function getPlanConfig() {
  try {
    const ref = doc(db, PLAN_CONFIG_COLLECTION, PLAN_CONFIG_DOC);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return { ...DEFAULTS };
    }
    const data = snap.data();
    const merged = {};
    for (const planId of Object.keys(DEFAULTS)) {
      const defaultPlan = DEFAULTS[planId];
      const stored = data[planId] || {};
      merged[planId] = {
        ...defaultPlan,
        ...stored,
        features: Array.isArray(stored.features) ? stored.features : (defaultPlan.features || [])
      };
    }
    return merged;
  } catch (error) {
    console.error('Error loading plan config:', error);
    return { ...DEFAULTS };
  }
}

/**
 * Get the configurable max Premium AI users per enterprise.
 * @returns {Promise<number>}
 */
export async function getEnterpriseMaxPremiumUsers() {
  const config = await getPlanConfig();
  const enterprise = config.enterprise || DEFAULTS.enterprise;
  const n = enterprise.maxPremiumUsers;
  return typeof n === 'number' && n >= 0 ? n : 10;
}

/**
 * Save plan config to Firestore. Admin only.
 * @param {Object} config - Partial or full plan config to merge
 */
export async function savePlanConfig(config) {
  const ref = doc(db, PLAN_CONFIG_COLLECTION, PLAN_CONFIG_DOC);
  await setDoc(ref, config, { merge: true });
}
