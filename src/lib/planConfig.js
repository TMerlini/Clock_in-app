/**
 * Plan configuration – admin-editable prices, features, and enterprise settings.
 * Stored in Firestore planConfig/plans. Admin-only read/write.
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const PLAN_CONFIG_COLLECTION = 'planConfig';
const PLAN_CONFIG_DOC = 'plans';

/** Default feature keys (translatable). Exported for Admin reset. */
export const DEFAULT_FEATURES = {
  basic: [
    'premiumPlus.plans.basic.feature1',
    'premiumPlus.plans.basic.feature2',
    'premiumPlus.plans.basic.feature3',
    'premiumPlus.plans.basic.feature4',
    'premiumPlus.plans.basic.feature5',
    'premiumPlus.plans.basic.feature8',
    'premiumPlus.plans.basic.feature9',
    'premiumPlus.plans.basic.feature10'
  ],
  pro: [
    'premiumPlus.plans.pro.feature1',
    'premiumPlus.plans.pro.feature2',
    'premiumPlus.plans.pro.feature3',
    'premiumPlus.plans.pro.feature4',
    'premiumPlus.plans.pro.feature5',
    'premiumPlus.plans.pro.feature6',
    'premiumPlus.plans.pro.feature8',
    'premiumPlus.plans.pro.feature9',
    'premiumPlus.plans.pro.feature10'
  ],
  premium_ai: [
    'premiumPlus.plans.premiumAi.feature1',
    'premiumPlus.plans.premiumAi.feature2',
    'premiumPlus.plans.premiumAi.feature3',
    'premiumPlus.plans.premiumAi.feature4',
    'premiumPlus.plans.premiumAi.feature5',
    'premiumPlus.plans.premiumAi.feature6',
    'premiumPlus.plans.premiumAi.feature7',
    'premiumPlus.plans.premiumAi.feature8',
    'premiumPlus.plans.premiumAi.feature9',
    'premiumPlus.plans.premiumAi.feature10'
  ],
  enterprise: [
    'premiumPlus.plans.enterprise.feature1',
    'premiumPlus.plans.enterprise.feature2',
    'premiumPlus.plans.enterprise.feature3',
    'premiumPlus.plans.enterprise.feature4',
    'premiumPlus.plans.enterprise.feature5',
    'premiumPlus.plans.enterprise.feature6',
    'premiumPlus.plans.enterprise.feature7',
    'premiumPlus.plans.enterprise.feature8',
    'premiumPlus.plans.enterprise.feature10'
  ]
};

const DEFAULTS = {
  basic: {
    price: '€0.99',
    period: 'month',
    paymentLink: '',
    features: DEFAULT_FEATURES.basic
  },
  pro: {
    price: '€4.99',
    period: 'month',
    paymentLink: '',
    features: DEFAULT_FEATURES.pro
  },
  premium_ai: {
    price: '€9.99',
    period: 'month',
    paymentLink: '',
    features: DEFAULT_FEATURES.premium_ai
  },
  enterprise: {
    price: '€199',
    period: 'month',
    paymentLink: '',
    maxPremiumUsers: 10,
    features: DEFAULT_FEATURES.enterprise
  },
  callPack: {
    paymentLink: '',
    packSize: 50
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
      if (planId === 'callPack') continue;
      const defaultPlan = DEFAULTS[planId];
      const stored = data[planId] || {};
      merged[planId] = {
        ...defaultPlan,
        ...stored,
        features: Array.isArray(stored.features) ? stored.features : (defaultPlan.features || [])
      };
    }
    merged.callPack = { ...(DEFAULTS.callPack || {}), ...(data.callPack || {}) };
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
