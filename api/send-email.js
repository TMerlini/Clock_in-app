/**
 * Admin-only: send email / newsletter via Resend.
 * POST with Firebase ID token in Authorization header.
 * Body: {
 *   subject: string,
 *   html: string,
 *   recipients: "all" | "plan:basic" | "plan:pro" | "plan:premium_ai" | "plan:enterprise" | "email:user@example.com"
 *   fromName?: string  (default: "Clock In")
 * }
 */
import admin from 'firebase-admin';

const FROM_EMAIL = 'contacto@clock-in.pt';
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

async function getRecipients(adminInstance, recipients) {
  const db = adminInstance.firestore();
  const auth = adminInstance.auth();

  if (recipients.startsWith('email:')) {
    return [recipients.slice(6).trim()];
  }

  if (recipients === 'all' || recipients.startsWith('plan:')) {
    const planFilter = recipients.startsWith('plan:') ? recipients.slice(5) : null;

    // Get all users from userSettings
    const snap = planFilter
      ? await db.collection('userSettings').where('subscriptionPlan', '==', planFilter).get()
      : await db.collection('userSettings').get();

    const uids = snap.docs.map((d) => d.id);
    if (!uids.length) return [];

    // Batch fetch emails from Firebase Auth (max 100 per request)
    const emails = [];
    for (let i = 0; i < uids.length; i += 100) {
      const batch = uids.slice(i, i + 100).map((uid) => ({ uid }));
      const result = await auth.getUsers(batch);
      result.users.forEach((u) => {
        if (u.email) emails.push(u.email);
      });
    }
    return emails;
  }

  return [];
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

  if (!isAdminEmail(decoded.email)) {
    return res.status(403).json({ error: 'Admin only' });
  }

  const { subject, html, recipients, fromName = 'Clock In' } = req.body || {};
  if (!subject?.trim()) return res.status(400).json({ error: 'subject is required' });
  if (!html?.trim()) return res.status(400).json({ error: 'html is required' });
  if (!recipients) return res.status(400).json({ error: 'recipients is required' });

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

  let emails;
  try {
    emails = await getRecipients(adminInstance, recipients);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch recipients: ' + err.message });
  }

  if (!emails.length) {
    return res.status(200).json({ sent: 0, message: 'No recipients found' });
  }

  // Send in batches of 50 (Resend batch limit)
  let sent = 0;
  const errors = [];

  for (let i = 0; i < emails.length; i += 50) {
    const batch = emails.slice(i, i + 50);
    try {
      const resp = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          batch.map((to) => ({
            from: `${fromName} <${FROM_EMAIL}>`,
            to,
            subject,
            html,
          }))
        ),
      });
      const data = await resp.json();
      if (!resp.ok) {
        errors.push(data.message || 'Batch failed');
      } else {
        sent += batch.length;
      }
    } catch (err) {
      errors.push(err.message);
    }
  }

  return res.status(200).json({ sent, total: emails.length, errors });
}
