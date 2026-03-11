/**
 * User-authenticated: send pending welcome push if one exists for this user's email.
 * Called when a new user doc is created (first sign-in). POST with Firebase ID token.
 */
import admin from 'firebase-admin';

const PUSH_DESTINATION_URL = 'https://www.clock-in.pt';

function getAdmin() {
  if (!admin.apps.length) {
    const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!key) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not set');
    const serviceAccount = typeof key === 'string' ? JSON.parse(key) : key;
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  return admin;
}

function formatPlanDisplayName(plan) {
  const p = (plan || 'free').toLowerCase().replace(/[- ]/g, '_');
  const map = { free: 'Free', basic: 'Basic', pro: 'Pro', premium_ai: 'Premium AI', enterprise: 'Enterprise' };
  return map[p] || plan;
}

async function sendPushViaProgressier(recipientId, title, body) {
  const endpoint = process.env.PROGRESSIER_API_ENDPOINT;
  const key = process.env.PROGRESSIER_API_KEY;
  if (!endpoint || !key) throw new Error('Progressier not configured');

  const payload = {
    recipients: { id: recipientId },
    title: String(title).substring(0, 50),
    body: String(body).substring(0, 100),
    url: PUSH_DESTINATION_URL
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Progressier: ${res.status} ${text}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization: Bearer <token>' });
  }
  const token = authHeader.slice(7);

  try {
    const firebaseAdmin = getAdmin();
    const decoded = await firebaseAdmin.auth().verifyIdToken(token);
    const uid = decoded.uid;
    const email = (decoded.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'No email in token' });
    }

    const emailKey = email.replace(/\./g, '_');
    const pendingRef = firebaseAdmin.firestore().doc(`pendingPushInvites/${emailKey}`);
    const pendingSnap = await pendingRef.get();

    if (!pendingSnap.exists) {
      return res.status(200).json({ ok: true, sent: false });
    }

    const { plan } = pendingSnap.data();
    const planName = formatPlanDisplayName(plan);
    const title = "You've been invited!";
    const body = `You've been invited for a ${planName} plan. Welcome to Clock-in.pt!`;

    await sendPushViaProgressier(uid, title, body);
    await pendingRef.delete();

    return res.status(200).json({ ok: true, sent: true });
  } catch (err) {
    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('send-pending-welcome-push error:', err);
    return res.status(500).json({ error: err.message });
  }
}
