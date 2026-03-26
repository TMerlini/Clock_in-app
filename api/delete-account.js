/**
 * Self-service: authenticated user deletes their own account.
 * POST with Firebase ID token in Authorization header. No body needed — uid comes from token.
 */
import admin from 'firebase-admin';

function getAdmin() {
  if (!admin.apps.length) {
    const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!key) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not set');
    const sa = typeof key === 'string' ? JSON.parse(key) : key;
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  }
  return admin;
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

  const uid = decoded.uid;
  const db = adminInstance.firestore();

  // Delete Firestore documents
  const collections = ['userSettings', 'activeClockIns', 'calendarTokens'];
  await Promise.allSettled(collections.map(col => db.collection(col).doc(uid).delete()));

  // Delete sessions
  try {
    const sessSnap = await db.collection('sessions').where('userId', '==', uid).get();
    if (sessSnap.size) {
      const batch = db.batch();
      sessSnap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  } catch { /* non-critical */ }

  // Delete overwork deductions
  try {
    const owSnap = await db.collection('overworkDeductions').where('userId', '==', uid).get();
    if (owSnap.size) {
      const batch = db.batch();
      owSnap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  } catch { /* non-critical */ }

  // Delete Firebase Auth user
  try {
    await adminInstance.auth().deleteUser(uid);
  } catch (err) {
    if (err.code !== 'auth/user-not-found') {
      return res.status(500).json({ error: 'Failed to delete account: ' + err.message });
    }
  }

  return res.status(200).json({ deleted: true });
}
