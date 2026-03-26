/**
 * Admin-only: cancel a scheduled Resend broadcast and remove from Firestore.
 * POST with Firebase ID token in Authorization header.
 * Body: { broadcastId: string }
 */
import admin from 'firebase-admin';

const ADMIN_EMAILS = ['merloproductions@gmail.com'];
const ADMIN_ALIAS_REGEX = /^merloproductions\+[^@]+@gmail\.com$/i;

function getAdmin() {
  if (!admin.apps.length) {
    const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!key) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not set');
    const sa = typeof key === 'string' ? JSON.parse(key) : key;
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  }
  return admin;
}

function isAdminEmail(email) {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  return ADMIN_EMAILS.some(a => a.toLowerCase() === e) || ADMIN_ALIAS_REGEX.test(e);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing auth token' });

  const adminInstance = getAdmin();
  let decoded;
  try {
    decoded = await adminInstance.auth().verifyIdToken(token);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (!isAdminEmail(decoded.email)) return res.status(403).json({ error: 'Admin only' });

  const { broadcastId } = req.body || {};
  if (!broadcastId) return res.status(400).json({ error: 'broadcastId required' });

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

  // Cancel in Resend (delete the broadcast)
  try {
    const resp = await fetch(`https://api.resend.com/broadcasts/${broadcastId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
    });
    if (!resp.ok && resp.status !== 404) {
      const d = await resp.json();
      throw new Error(d.message || `Resend DELETE failed (${resp.status})`);
    }
  } catch (err) {
    return res.status(500).json({ error: 'Failed to cancel broadcast: ' + err.message });
  }

  // Mark as cancelled in Firestore
  try {
    await adminInstance.firestore().collection('scheduledEmails').doc(broadcastId).update({ status: 'cancelled' });
  } catch { /* non-critical */ }

  return res.status(200).json({ cancelled: true });
}
