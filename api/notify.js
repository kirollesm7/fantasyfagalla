// Vercel serverless function: POST /api/notify
// This is the ONLY place that touches the Firebase service account — it
// must never be imported into client code, since that key grants full
// admin access to your Firebase project.
//
// Required Vercel environment variables (Project Settings → Environment Variables):
//   FIREBASE_SERVICE_ACCOUNT_JSON  — the full JSON key file content, as one string
//                                    (Firebase Console → Project settings →
//                                    Service accounts → Generate new private key)
//   SUPABASE_URL                   — optional override, defaults to the project below
//   SUPABASE_ANON_KEY              — optional override, defaults to the project below

import admin from 'firebase-admin';

if (!admin.apps.length) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    console.error('[notify] FIREBASE_SERVICE_ACCOUNT_JSON is not set');
  } else {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rhdaubsmcjxgjeizxkmr.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZGF1YnNtY2p4Z2plaXp4a21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMTU5OTcsImV4cCI6MjEwMTY5MTk5N30.SEp6M_-z9rOQQgRT5byNoYJAfOjfM80XjKD58KsCATk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  if (!admin.apps.length) {
    res.status(500).json({ error: 'FIREBASE_SERVICE_ACCOUNT_JSON not configured on the server' });
    return;
  }

  const { title, body } = req.body || {};
  if (!title) {
    res.status(400).json({ error: 'title is required' });
    return;
  }

  try {
    const tokensRes = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?select=token`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!tokensRes.ok) throw new Error('failed to fetch tokens: ' + tokensRes.status);
    const rows = await tokensRes.json();
    const tokens = [...new Set((rows || []).map((r) => r.token).filter(Boolean))];

    if (!tokens.length) {
      res.status(200).json({ sent: 0, message: 'no subscribers yet' });
      return;
    }

    const result = await admin.messaging().sendEachForMulticast({
      notification: { title, body: body || '' },
      tokens,
    });

    // clean up tokens for uninstalled apps / revoked permission
    const deadTokens = [];
    result.responses.forEach((r, i) => {
      if (!r.success && r.error && r.error.code === 'messaging/registration-token-not-registered') {
        deadTokens.push(tokens[i]);
      }
    });
    if (deadTokens.length) {
      const filter = deadTokens.map((t) => `"${t}"`).join(',');
      await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?token=in.(${filter})`, {
        method: 'DELETE',
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      }).catch(() => {});
    }

    res.status(200).json({ sent: result.successCount, failed: result.failureCount });
  } catch (e) {
    console.error('[notify] failed', e);
    res.status(500).json({ error: String(e.message || e) });
  }
}
