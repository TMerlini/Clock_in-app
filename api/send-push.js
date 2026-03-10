/**
 * Admin-only: send manual push notification via Progressier.
 * POST with Firebase ID token in Authorization header.
 * Body: { title, body, url?, recipients: "all" | userId }
 */
import admin from 'firebase-admin';

const BASE_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://www.clock-in.pt';

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

    const { title, body, url, recipients } = req.body || {};
    if (!title || !body) {
      return res.status(400).json({ error: 'Missing title or body' });
    }

    const progressierRecipients = recipients === 'all'
      ? { users: 'all' }
      : typeof recipients === 'string' && recipients
        ? { id: recipients }
        : null;
    if (!progressierRecipients) {
      return res.status(400).json({ error: 'recipients must be "all" or a userId' });
    }

    const endpoint = process.env.PROGRESSIER_API_ENDPOINT;
    const key = process.env.PROGRESSIER_API_KEY;
    if (!endpoint || !key) {
      return res.status(500).json({ error: 'Progressier not configured' });
    }

    const res2 = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        recipients: progressierRecipients,
        title: String(title).substring(0, 50),
        body: String(body).substring(0, 100),
        url: url || BASE_URL
      })
    });

    if (!res2.ok) {
      const text = await res2.text();
      return res.status(502).json({ error: `Progressier: ${res2.status} ${text}` });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token expired. Please sign in again.' });
    }
    console.error('send-push error:', err);
    return res.status(500).json({ error: err.message });
  }
}
