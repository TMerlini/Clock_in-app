/**
 * One-off test endpoint: sends a single push notification to a specific user.
 * GET /api/test-push?userId=YOUR_FIREBASE_UID
 * Optional: ?secret=YOUR_CRON_SECRET (required if CRON_SECRET is set)
 *
 * Remove or protect this endpoint after testing.
 */
const PUSH_DESTINATION_URL = 'https://www.clock-in.pt';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, secret } = req.query;
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    if (secret !== cronSecret) {
      return res.status(401).json({ error: 'Add ?secret=YOUR_CRON_SECRET or set CRON_SECRET in env' });
    }
  }

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId', hint: 'Use ?userId=YOUR_FIREBASE_UID' });
  }

  const pushUrl = process.env.PUSH_SERVICE_URL;
  const pushKey = process.env.PUSH_SERVICE_API_KEY;
  if (!pushUrl || !pushKey) {
    return res.status(500).json({ error: 'PUSH_SERVICE_URL or PUSH_SERVICE_API_KEY not set' });
  }

  try {
    const res2 = await fetch(`${pushUrl}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': pushKey },
      body: JSON.stringify({
        targetUserId: userId,
        title: 'Clock In: Test Notification',
        body: 'Push notifications are working correctly.',
        url: PUSH_DESTINATION_URL,
      }),
    });

    if (!res2.ok) {
      const text = await res2.text();
      return res.status(502).json({ error: `Push service error ${res2.status}: ${text}` });
    }

    return res.status(200).json({ ok: true, message: 'Test push sent. Check your device.' });
  } catch (err) {
    console.error('test-push error:', err);
    return res.status(500).json({ error: err.message });
  }
}
