/**
 * Admin-only: send email campaign via Resend Broadcasts API.
 * Syncs target users to a Resend Audience, then creates + sends a Broadcast
 * so opens/clicks/bounces are tracked in the Resend dashboard automatically.
 *
 * POST with Firebase ID token in Authorization header.
 * Body: {
 *   subject:    string
 *   html:       string
 *   recipients: "all" | "plan:basic" | "plan:pro" | "plan:premium_ai" | "plan:enterprise" | "plan:free"
 *   fromName?:  string  (default: "Clock In")
 *   previewText?: string
 * }
 */
import admin from 'firebase-admin';

const FROM_EMAIL    = 'contacto@clock-in.pt';
const ADMIN_EMAILS  = ['merloproductions@gmail.com'];
const ADMIN_ALIAS_REGEX = /^merloproductions\+[^@]+@gmail\.com$/i;
const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID; // set once after audience creation

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

async function resendRequest(method, path, body, apiKey) {
  const res = await fetch(`https://api.resend.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Resend ${method} ${path} failed (${res.status})`);
  return data;
}

async function getUserEmails(adminInstance, recipients) {
  const db   = adminInstance.firestore();
  const auth = adminInstance.auth();

  if (recipients.startsWith('email:')) return [recipients.slice(6).trim()];

  const planFilter = recipients.startsWith('plan:') ? recipients.slice(5) : null;

  const snap = planFilter
    ? await db.collection('userSettings').where('subscriptionPlan', '==', planFilter).get()
    : await db.collection('userSettings').get();

  const uids = snap.docs.map(d => d.id);
  if (!uids.length) return [];

  const emails = [];
  for (let i = 0; i < uids.length; i += 100) {
    const batch = uids.slice(i, i + 100).map(uid => ({ uid }));
    const result = await auth.getUsers(batch);
    result.users.forEach(u => { if (u.email) emails.push({ email: u.email, firstName: u.displayName?.split(' ')[0] || '' }); });
  }
  return emails;
}

async function syncContactsToAudience(contacts, audienceId, apiKey) {
  // Upsert contacts in batches of 50
  let synced = 0;
  for (let i = 0; i < contacts.length; i += 50) {
    const batch = contacts.slice(i, i + 50);
    await Promise.allSettled(
      batch.map(({ email, firstName }) =>
        resendRequest('POST', `/audiences/${audienceId}/contacts`, {
          email,
          first_name: firstName || undefined,
          unsubscribed: false,
        }, apiKey)
      )
    );
    synced += batch.length;
  }
  return synced;
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

  const { subject, html, recipients, fromName = 'Clock In', previewText = '' } = req.body || {};
  if (!subject?.trim()) return res.status(400).json({ error: 'subject is required' });
  if (!html?.trim())    return res.status(400).json({ error: 'html is required' });
  if (!recipients)      return res.status(400).json({ error: 'recipients is required' });

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

  // ── Single email shortcut (no audience needed) ─────────────────────────────
  if (recipients.startsWith('email:')) {
    const to = recipients.slice(6).trim();
    try {
      await resendRequest('POST', '/emails', { from: `${fromName} <${FROM_EMAIL}>`, to, subject, html }, RESEND_API_KEY);
      return res.status(200).json({ sent: 1, total: 1, mode: 'direct' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── Broadcast flow (requires full-access key + audience) ───────────────────
  if (!RESEND_AUDIENCE_ID) {
    // Fallback to batch if audience not configured yet
    let contacts;
    try { contacts = await getUserEmails(adminInstance, recipients); } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch users: ' + err.message });
    }
    if (!contacts.length) return res.status(200).json({ sent: 0, total: 0, mode: 'batch' });

    let sent = 0;
    const errors = [];
    for (let i = 0; i < contacts.length; i += 50) {
      const batch = contacts.slice(i, i + 50);
      try {
        await resendRequest('POST', '/emails/batch',
          batch.map(({ email }) => ({ from: `${fromName} <${FROM_EMAIL}>`, to: email, subject, html })),
          RESEND_API_KEY
        );
        sent += batch.length;
      } catch (err) { errors.push(err.message); }
    }
    return res.status(200).json({ sent, total: contacts.length, errors, mode: 'batch' });
  }

  // Full broadcast path
  let contacts;
  try {
    contacts = await getUserEmails(adminInstance, recipients);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch users: ' + err.message });
  }
  if (!contacts.length) return res.status(200).json({ sent: 0, total: 0, mode: 'broadcast' });

  // Sync contacts to Resend Audience
  try {
    await syncContactsToAudience(contacts, RESEND_AUDIENCE_ID, RESEND_API_KEY);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to sync contacts: ' + err.message });
  }

  // Create broadcast
  let broadcast;
  try {
    broadcast = await resendRequest('POST', '/broadcasts', {
      audience_id: RESEND_AUDIENCE_ID,
      from: `${fromName} <${FROM_EMAIL}>`,
      subject,
      html,
      preview_text: previewText || undefined,
      name: `${subject} — ${new Date().toISOString().slice(0, 10)}`,
    }, RESEND_API_KEY);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create broadcast: ' + err.message });
  }

  // Send broadcast
  try {
    await resendRequest('POST', `/broadcasts/${broadcast.id}/send`, {}, RESEND_API_KEY);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to send broadcast: ' + err.message });
  }

  return res.status(200).json({
    sent: contacts.length,
    total: contacts.length,
    broadcastId: broadcast.id,
    mode: 'broadcast',
  });
}
