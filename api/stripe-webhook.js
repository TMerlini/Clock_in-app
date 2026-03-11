/**
 * Stripe Webhook: handles checkout.session.completed for plans and call packs.
 * Updates Firestore userSettings when users complete payment.
 * Requires: STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY, FIREBASE_SERVICE_ACCOUNT_KEY
 *
 * Payment Link metadata (in Stripe Dashboard):
 * - Plans: metadata.plan = basic | pro | premium_ai | enterprise
 * - Call pack: metadata.type = call_pack (optional: metadata.pack_size = 50)
 */
import Stripe from 'stripe';
import admin from 'firebase-admin';

const CALL_PACK_SIZE_DEFAULT = 50;
const PLANS = ['basic', 'pro', 'premium_ai', 'enterprise'];

function getAdmin() {
  if (!admin.apps.length) {
    const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!key) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not set');
    const serviceAccount = typeof key === 'string' ? JSON.parse(key) : key;
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  return admin;
}

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function normalizePlan(plan) {
  if (!plan || typeof plan !== 'string') return null;
  return plan.toLowerCase().replace(/[- ]/g, '_');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!webhookSecret || !secretKey) {
    console.error('STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY not set');
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const stripe = new Stripe(secretKey);
  const sig = req.headers['stripe-signature'] || req.headers['Stripe-Signature'];

  if (!sig) {
    return res.status(400).json({ error: 'Missing Stripe-Signature' });
  }

  let rawBody;
  try {
    rawBody = await getRawBody(req);
  } catch (err) {
    console.error('Failed to read raw body:', err);
    return res.status(400).json({ error: 'Invalid body' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  if (event.type !== 'checkout.session.completed') {
    return res.status(200).json({ received: true });
  }

  const session = event.data.object;
  const userId = session.client_reference_id;
  if (!userId) {
    console.warn('checkout.session.completed missing client_reference_id');
    return res.status(200).json({ received: true });
  }

  const metadata = session.metadata || {};
  const planMeta = normalizePlan(metadata.plan);
  const isCallPack = metadata.type === 'call_pack' || planMeta === 'call_pack';

  const firebaseAdmin = getAdmin();
  const db = firebaseAdmin.firestore();

  try {
    if (isCallPack) {
      const packSize = parseInt(metadata.pack_size, 10) || await getPackSizeFromConfig(db);
      await addCallPackServer(db, userId, packSize);
    } else if (planMeta && PLANS.includes(planMeta)) {
      const userSettingsRef = db.doc(`userSettings/${userId}`);
      await userSettingsRef.set(
        {
          subscriptionPlan: planMeta,
          plan: planMeta
        },
        { merge: true }
      );
    } else {
      console.warn('Unknown metadata:', metadata, '- session:', session.id);
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
    return res.status(500).json({ error: err.message });
  }

  return res.status(200).json({ received: true });
}

async function getPackSizeFromConfig(db) {
  try {
    const snap = await db.doc('planConfig/plans').get();
    const data = snap.exists ? snap.data() : {};
    const packSize = data?.callPack?.packSize;
    return typeof packSize === 'number' && packSize > 0 ? packSize : CALL_PACK_SIZE_DEFAULT;
  } catch {
    return CALL_PACK_SIZE_DEFAULT;
  }
}

async function addCallPackServer(db, userId, packSize) {
  if (!userId || !packSize || packSize <= 0) {
    throw new Error('Invalid pack size for call pack');
  }

  const settingsRef = db.doc(`userSettings/${userId}`);
  const snap = await settingsRef.get();

  if (!snap.exists) {
    throw new Error('User settings document does not exist');
  }

  const settings = snap.data();
  const aiUsage = settings.aiUsage || {
    callsAllocated: 0,
    callsUsed: 0,
    totalTokensUsed: 0,
    callPacks: []
  };

  const callPacks = [...(aiUsage.callPacks || [])];
  const packId = `pack_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  const now = admin.firestore.Timestamp.now();

  callPacks.push({
    id: packId,
    calls: packSize,
    purchasedAt: now,
    used: 0,
    remaining: packSize
  });

  await settingsRef.set(
    {
      aiUsage: {
        ...aiUsage,
        callPacks
      }
    },
    { merge: true }
  );

  return packId;
}
