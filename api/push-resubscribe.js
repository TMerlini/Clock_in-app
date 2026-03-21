/**
 * No-auth proxy for push subscription key rotation.
 * Called by the service worker's pushsubscriptionchange event handler,
 * which runs in a background context where the user session is not available.
 * The push service uses oldEndpoint to look up and transfer the existing userId.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { endpoint, keys, oldEndpoint } = req.body || {};

  const pushUrl = process.env.PUSH_SERVICE_URL;
  const pushKey = process.env.PUSH_SERVICE_API_KEY;
  if (!pushUrl || !pushKey) {
    return res.status(500).json({ error: 'Push service not configured' });
  }

  try {
    await fetch(`${pushUrl}/resubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': pushKey },
      body: JSON.stringify({ endpoint, keys, oldEndpoint }),
    });
    return res.json({ ok: true });
  } catch {
    return res.status(502).json({ error: 'Push service unavailable' });
  }
}
