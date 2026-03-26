/**
 * Sends a welcome email to a newly registered user.
 * Called client-side on first login (when userSettings doesn't exist yet).
 * Template is stored in Firestore: system/welcomeEmail { subject, html, fromName }
 * Falls back to a default template if none is saved.
 *
 * POST with Firebase ID token in Authorization header.
 * Body: {} (user info taken from the token)
 */
import admin from 'firebase-admin';

const FROM_EMAIL = 'contacto@clock-in.pt';

const DEFAULT_SUBJECT = 'Welcome to Clock In! 🎉';
const DEFAULT_HTML = `<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f0f0f;color:#e5e5e5;border-radius:12px;overflow:hidden">
  <div style="background:#6366f1;padding:32px 24px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:22px">Welcome to Clock In!</h1>
  </div>
  <div style="padding:32px 24px">
    <p style="margin:0 0 16px">Hi there 👋</p>
    <p style="margin:0 0 16px">Thanks for signing up. Clock In helps you track work hours, manage overtime, and stay compliant with Portuguese labour law — all in one place.</p>
    <p style="margin:0 0 16px">You're currently on the free plan. Explore the app and let us know if you have any questions.</p>
    <div style="text-align:center;margin:24px 0 8px">
      <a href="https://www.clock-in.pt" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Open Clock In →</a>
    </div>
    <p style="margin:24px 0 0;font-size:12px;color:#666;text-align:center">You're receiving this because you signed up at clock-in.pt</p>
  </div>
</div>`;

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

  const { email, name } = decoded;
  if (!email) return res.status(400).json({ error: 'No email on account' });

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

  // Load template from Firestore (fallback to default)
  let subject = DEFAULT_SUBJECT;
  let html = DEFAULT_HTML;
  let fromName = 'Clock In';
  try {
    const snap = await adminInstance.firestore().doc('system/welcomeEmail').get();
    if (snap.exists) {
      const d = snap.data();
      if (d.subject) subject = d.subject;
      if (d.html) html = d.html;
      if (d.fromName) fromName = d.fromName;
    }
  } catch { /* use defaults */ }

  // Personalise {{name}} placeholder if template uses it
  const firstName = name?.split(' ')[0] || '';
  html = html.replace(/\{\{name\}\}/g, firstName).replace(/\{\{email\}\}/g, email);
  subject = subject.replace(/\{\{name\}\}/g, firstName);

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${fromName} <${FROM_EMAIL}>`, to: email, subject, html }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.message || 'Resend error');
    return res.status(200).json({ sent: true });
  } catch (err) {
    console.error('Welcome email failed:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
