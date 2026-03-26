/**
 * Admin-only: permanently delete a user from Firebase Auth + clean up Firestore data.
 * POST with Firebase ID token in Authorization header.
 * Body: { uid: string }
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

  const { uid } = req.body || {};
  if (!uid) return res.status(400).json({ error: 'uid required' });

  // Prevent deleting yourself
  if (uid === decoded.uid) return res.status(400).json({ error: 'Cannot delete your own account' });

  const db = adminInstance.firestore();

  // Delete Firestore subcollections / documents in parallel
  const collections = ['userSettings', 'activeClockIns', 'calendarTokens'];
  await Promise.allSettled(collections.map(col => db.collection(col).doc(uid).delete()));

  // Delete sessions by userId
  try {
    const sessSnap = await db.collection('sessions').where('userId', '==', uid).get();
    const batch = db.batch();
    sessSnap.docs.forEach(d => batch.delete(d.ref));
    if (sessSnap.size) await batch.commit();
  } catch { /* non-critical */ }

  // Delete overwork deductions by userId
  try {
    const owSnap = await db.collection('overworkDeductions').where('userId', '==', uid).get();
    const batch2 = db.batch();
    owSnap.docs.forEach(d => batch2.delete(d.ref));
    if (owSnap.size) await batch2.commit();
  } catch { /* non-critical */ }

  // Delete Firebase Auth user
  try {
    await adminInstance.auth().deleteUser(uid);
  } catch (err) {
    // If user already deleted from Auth, still return success
    if (err.code !== 'auth/user-not-found') {
      return res.status(500).json({ error: 'Failed to delete Auth user: ' + err.message });
    }
  }

  return res.status(200).json({ deleted: true });
}
