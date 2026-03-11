/**
 * Admin-only: store guest invite for push and optionally send immediately if user exists.
 * POST with Firebase ID token. Body: { email, plan }.
 * Stores pendingPushInvites for first-sign-in delivery; if Firebase user exists, sends now.
 */
import admin from 'firebase-admin';

const PUSH_DESTINATION_URL = 'https://www.clock-in.pt';

const ADMIN_EMAILS = ['merloproductions@gmail.com'];
const ADMIN_ALIAS_REGEX = /^merloproductions\+[^@]+@gmail\.com$/i;

function getAdmin() {
  if (!admin.apps.length) {
    const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!key) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not set');
    const serviceAccount = typeof key === 'string' ? JSON.parse(key) : key;
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  return admin;
}

function isAdminEmail(email) {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((a) => a.toLowerCase() === e) || ADMIN_ALIAS_REGEX.test(e);
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
    if (!isAdminEmail(decoded.email)) {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { email, plan } = req.body || {};
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    const emailKey = email.trim().toLowerCase().replace(/\./g, '_');
    const planName = formatPlanDisplayName(plan || 'free');
    const title = "You've been invited!";
    const body = `You've been invited for a ${planName} plan. Welcome to Clock-in.pt!`;

    // Store pending for first-sign-in delivery
    await firebaseAdmin.firestore().doc(`pendingPushInvites/${emailKey}`).set({
      email: email.trim().toLowerCase(),
      plan: plan || 'free',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Try to send now if user exists in Firebase Auth
    let sentNow = false;
    try {
      const userRecord = await firebaseAdmin.auth().getUserByEmail(email.trim().toLowerCase());
      if (userRecord?.uid) {
        await sendPushViaProgressier(userRecord.uid, title, body);
        sentNow = true;
        await firebaseAdmin.firestore().doc(`pendingPushInvites/${emailKey}`).delete();
      }
    } catch (lookupErr) {
      // User not in Auth yet - pending will be sent on first sign-in
    }

    return res.status(200).json({
      ok: true,
      sentNow,
      message: sentNow ? 'Push sent to user.' : 'Invite stored. User will receive welcome push when they first sign in.'
    });
  } catch (err) {
    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token expired. Please sign in again.' });
    }
    console.error('send-guest-invite-push error:', err);
    return res.status(500).json({ error: err.message });
  }
}
