/**
 * Admin-only: send manual push notification via Scaffold Push Service.
 * POST with Firebase ID token in Authorization header.
 * Body: { title, body, url?, recipients: "all" | userId, icon?, image? }
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

    const { title, body, url, recipients, icon, image } = req.body || {};
    if (!title || !body) {
      return res.status(400).json({ error: 'Missing title or body' });
    }
    if (!recipients || (recipients !== 'all' && typeof recipients !== 'string')) {
      return res.status(400).json({ error: 'recipients must be "all" or a userId' });
    }

    const pushUrl = process.env.PUSH_SERVICE_URL;
    const pushKey = process.env.PUSH_SERVICE_API_KEY;
    if (!pushUrl || !pushKey) {
      return res.status(500).json({ error: 'Push service not configured' });
    }

    const payload = {
      title: String(title).substring(0, 50),
      body: String(body).substring(0, 100),
      url: url || PUSH_DESTINATION_URL,
    };
    if (recipients !== 'all') payload.targetUserId = recipients;
    if (icon && typeof icon === 'string') payload.icon = icon;
    if (image && typeof image === 'string') payload.image = image;

    const res2 = await fetch(`${pushUrl}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': pushKey },
      body: JSON.stringify(payload),
    });

    if (!res2.ok) {
      const text = await res2.text();
      return res.status(502).json({ error: `Push service: ${res2.status} ${text}` });
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
