/**
 * One-off test endpoint: sends a single push notification.
 * GET /api/test-push?userId=YOUR_FIREBASE_UID
 * Or: /api/test-push?email=your@email.com (for testing - must match progressier.add target)
 * Optional: ?secret=YOUR_CRON_SECRET (required if CRON_SECRET is set)
 *
 * Remove or protect this endpoint after testing.
 */
const PUSH_DESTINATION_URL = 'https://www.clock-in.pt';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, email, secret } = req.query;
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    if (secret !== cronSecret) {
      return res.status(401).json({ error: 'Add ?secret=YOUR_CRON_SECRET or set CRON_SECRET in env' });
    }
  }

  const recipients = userId ? { id: userId } : email ? { email: email } : null;
  if (!recipients) {
    return res.status(400).json({
      error: 'Missing userId or email',
      hint: 'Use ?userId=YOUR_UID or ?email=your@email.com (must match what progressier.add uses)'
    });
  }

  const endpoint = process.env.PROGRESSIER_API_ENDPOINT;
  const key = process.env.PROGRESSIER_API_KEY;
  if (!endpoint || !key) {
    return res.status(500).json({ error: 'PROGRESSIER_API_ENDPOINT or PROGRESSIER_API_KEY not set' });
  }

  try {
    const payload = {
      recipients,
      title: 'Clock In: Test Notification',
      body: 'Push notifications are working correctly.',
      url: PUSH_DESTINATION_URL
    };
    const res2 = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify(payload)
    });

    if (!res2.ok) {
      const text = await res2.text();
      return res.status(502).json({ error: `Progressier API error ${res2.status}: ${text}` });
    }

    return res.status(200).json({ ok: true, message: 'Test push sent. Check your device.' });
  } catch (err) {
    console.error('test-push error:', err);
    return res.status(500).json({ error: err.message });
  }
}
