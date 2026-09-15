// ---- Supabase config ----
// Same project the HTML version used. Change these if you move to a new one.
export const SUPABASE_URL = 'https://rhdaubsmcjxgjeizxkmr.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZGF1YnNtY2p4Z2plaXp4a21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMTU5OTcsImV4cCI6MjEwMTY5MTk5N30.SEp6M_-z9rOQQgRT5byNoYJAfOjfM80XjKD58KsCATk';

const HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
  'Content-Type': 'application/json',
};

const SB_TIMEOUT_MS = 15000;

// Every REST call goes through this. Times out after 15s instead of hanging
// forever on a stalled connection (which previously made buttons look frozen
// with no error and no success).
export async function sbFetch(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SB_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...options,
      headers: { ...HEADERS, ...(options.headers || {}) },
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error(`supabase ${options.method || 'GET'} ${path} timed out after ${SB_TIMEOUT_MS / 1000}s`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`supabase ${options.method || 'GET'} ${path} failed: ${res.status} ${body}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function sbUpsert(table, rows) {
  if (!rows.length) return;
  await sbFetch(table, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(rows),
  });
}

// Uploads a file to Supabase Storage (bucket "media") and returns its public URL.
const SB_MEDIA_BUCKET = 'media';
export async function sbUploadImage(file, folder = 'ads') {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/storage/v1/object/${SB_MEDIA_BUCKET}/${path}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('الرفع خد وقت طويل جدًا وانقطع');
    throw e;
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`رفع الصورة فشل: ${res.status} ${body}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${SB_MEDIA_BUCKET}/${path}`;
}
