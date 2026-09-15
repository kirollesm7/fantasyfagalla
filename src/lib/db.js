import { sbFetch, sbUpsert, sbUploadImage } from './supabaseClient';

export function uid() {
  return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ---------------- players ----------------
export async function sbGetPlayers() {
  const rows = (await sbFetch('players?select=*')) || [];
  // Postgres `numeric` comes back as a string over REST — coerce or price math concatenates.
  return rows.map((r) => ({ ...r, price: Number(r.price) || 0, locked: !!r.locked }));
}
export async function sbSetPlayers(list) {
  await sbUpsert(
    'players',
    list.map((p) => ({ id: p.id, name: p.name, price: p.price, color: p.color || '#3C7A4F', locked: !!p.locked }))
  );
  const keep = list.map((p) => p.id);
  const filter = keep.length ? `id=not.in.(${keep.map((id) => `"${id}"`).join(',')})` : 'id=neq.__none__';
  await sbFetch(`players?${filter}`, { method: 'DELETE' });
}
export async function sbSetPlayerLocked(id, locked) {
  await sbFetch(`players?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ locked }),
  });
}

// ---------------- game state (single row) ----------------
export async function sbGetState() {
  const rows = await sbFetch('game_state?id=eq.1&select=gw,locked&order=gw.desc');
  return rows && rows[0] ? { gw: rows[0].gw, locked: rows[0].locked } : { gw: 1, locked: false };
}
// delete-then-insert, not upsert: an upsert only replaces the row if `id`
// has a real primary key in the live table — if that constraint is ever
// missing, "merge-duplicates" silently inserts a second row instead of
// replacing the first, which is what made this unreliable before.
export async function sbSetState(state) {
  await sbFetch('game_state?id=eq.1', { method: 'DELETE' });
  await sbFetch('game_state', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify([{ id: 1, gw: state.gw, locked: state.locked }]),
  });
}

// ---------------- accounts ----------------
export async function sbGetUsers() {
  const rows = await sbFetch('accounts?select=username');
  return (rows || []).map((r) => r.username);
}
export async function sbGetAccountTeams() {
  return (await sbFetch('accounts?select=username,team')) || [];
}
export async function sbGetAccount(username, columns) {
  const rows = await sbFetch(`accounts?username=eq.${encodeURIComponent(username)}&select=${columns}`);
  return rows && rows[0] ? rows[0] : null;
}
// A real INSERT (not upsert), used once at signup. team/points fall back to
// their table defaults, so only password_hash is required here.
export async function sbCreateAccount(username, passwordHash) {
  await sbFetch('accounts', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify([{ username, password_hash: passwordHash }]),
  });
}
// Plain PATCH (UPDATE), never upsert: Postgres validates NOT NULL on a
// proposed INSERT row *before* it checks for a conflict, so upserting just
// {username, team} without password_hash always fails — even though the
// row already exists and would only be updated. UPDATE only touches the
// column(s) in the SET clause and never re-checks the others.
export async function sbUpdateAccountField(username, field, value) {
  const rows = await sbFetch(`accounts?username=eq.${encodeURIComponent(username)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ [field]: value }),
  });
  if (!rows || !rows.length) throw new Error(`account "${username}" not found`);
}
export async function sbResetUserPassword(username, newHash) {
  await sbUpdateAccountField(username, 'password_hash', newHash);
}
export async function sbResetAllPasswords(newHash) {
  await sbFetch('accounts?username=neq.__none__', {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ password_hash: newHash }),
  });
}

// ---------------- gameweek stats ----------------
export async function sbGetStats() {
  const rows = await sbFetch('gw_stats?select=gw,data&order=gw.asc');
  const out = {};
  (rows || []).forEach((r) => {
    out['gw' + r.gw] = r.data || {};
  });
  return out;
}
// Delete-then-insert for the same reason as sbSetState: guarantees exactly
// one row per gameweek regardless of whether the live table's primary key
// is actually enforced.
export async function sbSetStatsForGW(gwKey, data) {
  const gw = parseInt(String(gwKey).replace('gw', ''), 10);
  if (Number.isNaN(gw)) throw new Error('bad gameweek key: ' + gwKey);
  await sbFetch(`gw_stats?gw=eq.${gw}`, { method: 'DELETE' });
  await sbFetch('gw_stats', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify([{ gw, data: data || {} }]),
  });
}

// ---------------- leaderboard cache (best-effort; UI recomputes from truth) ----------------
export async function sbSyncLeaderboard(totalsByUser) {
  await sbFetch('leaderboard?username=neq.__none__', { method: 'DELETE' });
  const rows = Object.keys(totalsByUser).map((u) => ({ username: u, total_points: totalsByUser[u] }));
  if (!rows.length) return;
  await sbFetch('leaderboard', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(rows),
  });
}

// ---------------- ads ----------------
export async function sbGetAds() {
  return (await sbFetch('ads?select=id,title,image_url,images,link_url,active,created_at&order=created_at.desc')) || [];
}
export async function sbGetNewsItems() {
  return (await sbFetch('news_items?select=*&order=featured.desc,created_at.desc')) || [];
}
export async function sbGetStories() {
  return (await sbFetch('stories?select=*&order=created_at.desc')) || [];
}
export async function sbSaveContent(table, item) {
  await sbUpsert(table, [{ ...item, id: item.id || uid() }]);
}
export async function sbDeleteContent(table, id) {
  await sbFetch(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ---------------- volleyball fantasy ----------------
export async function sbGetVolleyballPlayers() {
  const rows = (await sbFetch('volleyball_players?select=*&order=name.asc')) || [];
  return rows.map((row) => ({ ...row, price: Number(row.price) || 0 }));
}
export async function sbSaveVolleyballPlayer(player) {
  await sbUpsert('volleyball_players', [{ ...player, id: player.id || uid() }]);
}
export async function sbDeleteVolleyballPlayer(id) {
  await sbFetch(`volleyball_players?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
}
export async function sbGetVolleyballState() {
  const rows = await sbFetch('volleyball_state?id=eq.1&select=gw,locked');
  return rows?.[0] || { gw: 1, locked: false };
}
export async function sbSetVolleyballState(state) {
  await sbUpsert('volleyball_state', [{ id: 1, gw: Number(state.gw) || 1, locked: !!state.locked }]);
}
export async function sbGetVolleyballStats(gw) {
  const rows = await sbFetch(`volleyball_stats?gw=eq.${Number(gw)}&select=data`);
  return rows?.[0]?.data || {};
}
export async function sbSetVolleyballStats(gw, data) {
  await sbUpsert('volleyball_stats', [{ gw: Number(gw), data: data || {} }]);
}
export async function sbGetVolleyballAccounts() {
  return (await sbFetch('accounts?select=username,volleyball_team,volleyball_points')) || [];
}
export async function sbSyncVolleyballLeaderboard(rows) {
  if (!rows.length) return;
  await sbUpsert('volleyball_leaderboard', rows.map((row) => ({ username: row.username, total_points: row.total_points, updated_at: new Date().toISOString() })));
}
export async function sbAddAd(ad) {
  await sbFetch('ads', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify([
      { id: uid(), title: ad.title || '', image_url: ad.image_url || null, images: ad.images || [], link_url: ad.link_url || null, active: ad.active !== false },
    ]),
  });
}
export async function sbUpdateAd(id, fields) {
  await sbFetch(`ads?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(fields),
  });
}
export async function sbToggleAd(id, active) {
  await sbUpdateAd(id, { active });
}
export async function sbDeleteAd(id) {
  await sbFetch(`ads?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
}
export function adImages(ad) {
  if (ad.images && ad.images.length) return ad.images;
  if (ad.image_url) return [ad.image_url];
  return [];
}
export { sbUploadImage };

// ---------------- match schedule ----------------
export async function sbGetMatches() {
  return (await sbFetch('matches?select=id,home_team,away_team,kickoff_time,gw,note&order=kickoff_time.asc')) || [];
}
export async function sbAddMatch(m) {
  await sbFetch('matches', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify([{ id: uid(), home_team: m.home_team, away_team: m.away_team, kickoff_time: m.kickoff_time, gw: m.gw || null, note: m.note || null }]),
  });
}
export async function sbDeleteMatch(id) {
  await sbFetch(`matches?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ---------------- branding settings ----------------
export async function sbGetSettings() {
  const rows = await sbFetch('settings?id=eq.1&select=*');
  return rows && rows[0] ? { logoUrl: rows[0].logo_url || '', coverPhotoUrl: rows[0].cover_photo_url || '', fantasyLogoUrl: rows[0].fantasy_logo_url || '', newsLogoUrl: rows[0].news_logo_url || '' } : { logoUrl: '', coverPhotoUrl: '', fantasyLogoUrl: '', newsLogoUrl: '' };
}
export async function sbSetSettings(settings) {
  await sbFetch('settings?id=eq.1', { method: 'DELETE' });
  await sbFetch('settings', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify([{ id: 1, logo_url: settings.logoUrl || null, cover_photo_url: settings.coverPhotoUrl || null, fantasy_logo_url: settings.fantasyLogoUrl || null, news_logo_url: settings.newsLogoUrl || null }]),
  });
}

// ---------------- push notification tokens ----------------
export async function sbSaveNotificationToken(username, token) {
  await sbFetch('push_subscriptions', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify([{ id: uid(), username, token }]),
  });
}

// ---------------- full reset ----------------
export async function sbRestartGame() {
  await sbFetch('players?id=neq.__none__', { method: 'DELETE' });
  await sbFetch('accounts?username=neq.__none__', { method: 'DELETE' });
  await sbFetch('gw_stats?gw=gte.0', { method: 'DELETE' });
  await sbSetState({ gw: 1, locked: false });
}
