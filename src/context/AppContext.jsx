import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  sbGetPlayers, sbGetState, sbGetUsers, sbGetStats, sbGetAccount, sbCreateAccount,
  sbUpdateAccountField, sbGetSettings,
} from '../lib/db';
import { defaultTeam, migrateTeam, hashPassword, sanitizeTeamAgainstPlayers } from '../lib/scoring';

const AppContext = createContext(null);
const SESSION_KEY = 'ffl:session';
const HOST_PASSWORD = '874569';

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState([]);
  const [gwState, setGwState] = useState({ gw: 1, locked: false });
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [team, setTeam] = useState(null);
  const [points, setPoints] = useState({});
  const [settings, setSettings] = useState({ logoUrl: '', coverPhotoUrl: '', fantasyLogoUrl: '', newsLogoUrl: '' });
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState(null);

  const applyFavicon = useCallback((s) => {
    const fav = document.getElementById('favicon');
    if (fav && s.logoUrl) fav.href = s.logoUrl;
  }, []);

  // fetch everything that doesn't depend on who's logged in
  const loadShared = useCallback(async () => {
    const [p, st, u, sd, se] = await Promise.all([
      sbGetPlayers(), sbGetState(), sbGetUsers(), sbGetStats(),
      sbGetSettings().catch(() => settings),
    ]);
    setPlayers(p); setGwState(st); setUsers(u); setStats(sd); setSettings(se);
    applyFavicon(se);
    return { players: p, gwState: st, users: u, stats: sd, settings: se };
  }, [applyFavicon, settings]);

  const loadMyTeam = useCallback(async (username) => {
    const [t, pts] = await Promise.all([
      sbGetAccount(username, 'team'), sbGetAccount(username, 'points'),
    ]);
    setTeam(migrateTeam(t ? t.team : defaultTeam()));
    setPoints((pts && pts.points) || {});
  }, []);

  const saveTeam = useCallback(async (newTeam) => {
    setTeam(newTeam);
    await sbUpdateAccountField(user, 'team', newTeam);
  }, [user]);

  // initial boot: restore session, then load shared + personal data
  useEffect(() => {
    (async () => {
      let saved = null;
      try { saved = localStorage.getItem(SESSION_KEY); } catch { /* private mode */ }
      // A failure here (network down, Supabase unreachable, timed out) used to
      // leave the whole app on a blank white screen forever — setReady(true)
      // never ran because the throw skipped straight past it. Now the app
      // always reaches a real screen: either logged in/out normally, or a
      // clear "can't connect" message instead of nothing at all.
      try {
        await loadShared();
      } catch (e) {
        console.error('initial load failed', e);
        setBootError(String(e.message || e));
        setReady(true);
        return;
      }
      if (saved) {
        try {
          const account = await sbGetAccount(saved, 'team');
          if (account) setUser(saved);
          else { try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ } }
        } catch { /* offline — fall back to login screen */ }
      }
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) loadMyTeam(user);
  }, [user, loadMyTeam]);

  // If the host deletes a player who's sitting in this user's squad, clear
  // that dangling reference and persist the fix — same reasoning as the
  // HTML app: a slot pointing at a deleted player crashed the captain
  // dropdown, and would otherwise silently block picking a replacement.
  useEffect(() => {
    if (!user || !team || !players.length) return;
    const { team: cleaned, changed } = sanitizeTeamAgainstPlayers(players, team);
    if (changed) {
      setTeam(cleaned);
      sbUpdateAccountField(user, 'team', cleaned).catch((e) => console.error('sanitize save failed', e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, user]);

  const signup = useCallback(async (username, password) => {
    const existing = await sbGetAccount(username, 'username');
    if (existing) throw new Error('اسم المستخدم ده متسجل قبل كده، دوس "دخول" بدل كده');
    const hash = await hashPassword(password);
    await sbCreateAccount(username, hash);
    try { localStorage.setItem(SESSION_KEY, username); } catch { /* ignore */ }
    setUser(username);
    setUsers((u) => (u.includes(username) ? u : [...u, username]));
  }, []);

  const login = useCallback(async (username, password) => {
    const existing = await sbGetAccount(username, 'password_hash');
    if (!existing) throw new Error('الاسم ده مش متسجل، دوس "حساب جديد"');
    const hash = await hashPassword(password);
    if (hash !== existing.password_hash) throw new Error('باسورد غلط');
    try { localStorage.setItem(SESSION_KEY, username); } catch { /* ignore */ }
    setUser(username);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setIsHost(false);
    try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  }, []);

  const tryHostLogin = useCallback((password) => {
    if (password === HOST_PASSWORD) { setIsHost(true); return true; }
    return false;
  }, []);

  const refresh = useCallback(async () => {
    const shared = await loadShared();
    if (user) await loadMyTeam(user);
    return shared;
  }, [loadShared, loadMyTeam, user]);

  const value = {
    user, isHost, players, gwState, users, stats, team, points, settings, ready, bootError,
    setPlayers, setGwState, setUsers, setStats, setTeam, setPoints, setSettings,
    saveTeam, signup, login, logout, tryHostLogin, refresh, setIsHost,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
