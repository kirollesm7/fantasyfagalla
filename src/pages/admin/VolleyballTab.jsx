import { useCallback, useEffect, useState } from 'react';
import { useUI } from '../../context/UIContext';
import { calcVolleyballTeamPoints, VOLLEYBALL_RULES } from '../../lib/volleyballScoring';
import { sbDeleteVolleyballPlayer, sbGetVolleyballAccounts, sbGetVolleyballPlayers, sbGetVolleyballState, sbGetVolleyballStats, sbSaveVolleyballPlayer, sbSetVolleyballState, sbSetVolleyballStats, sbSyncVolleyballLeaderboard, sbUpdateAccountField, uid } from '../../lib/db';

const emptyPlayer = { name: '', price: 8, role: 'Player', team_name: '', color: '#ff7a00', active: true };

export default function VolleyballTab() {
  const { showToast, openConfirm } = useUI();
  const [view, setView] = useState('players');
  const [players, setPlayers] = useState([]);
  const [state, setState] = useState({ gw: 1, locked: false });
  const [stats, setStats] = useState({});
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState(emptyPlayer);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const [playerRows, gameState] = await Promise.all([sbGetVolleyballPlayers(), sbGetVolleyballState()]);
    setPlayers(playerRows); setState(gameState); setStats(await sbGetVolleyballStats(gameState.gw));
  }, []);
  useEffect(() => { load().catch((error) => showToast(error.message, 'error')); }, [load, showToast]);

  const savePlayer = async () => {
    if (!form.name.trim()) return showToast('اكتب اسم اللاعب', 'error');
    setBusy(true);
    try { await sbSaveVolleyballPlayer({ ...form, id: form.id || uid(), name: form.name.trim(), price: Number(form.price) || 0 }); setForm(emptyPlayer); await load(); showToast('تم حفظ اللاعب', 'success'); }
    finally { setBusy(false); }
  };
  const remove = async (player) => {
    if (!(await openConfirm(`حذف ${player.name}؟`))) return;
    await sbDeleteVolleyballPlayer(player.id); await load();
  };
  const setStat = (key, value) => setStats((current) => ({ ...current, [selectedId]: { ...(current[selectedId] || {}), [key]: Number(value) || 0 } }));
  const saveStats = async () => { await sbSetVolleyballStats(state.gw, stats); showToast('تم حفظ نقاط الحكم', 'success'); };
  const toggleLock = async () => { const next = { ...state, locked: !state.locked }; await sbSetVolleyballState(next); setState(next); };
  const finalize = async () => {
    if (!(await openConfirm(`اعتماد الجولة ${state.gw} وفتح الجولة التالية؟`))) return;
    setBusy(true);
    try {
      await sbSetVolleyballStats(state.gw, stats);
      const accounts = await sbGetVolleyballAccounts();
      const totals = [];
      for (const account of accounts) {
        const gwPoints = calcVolleyballTeamPoints(account.volleyball_team, stats);
        const nextPoints = { ...(account.volleyball_points || {}), [`gw${state.gw}`]: gwPoints };
        await sbUpdateAccountField(account.username, 'volleyball_points', nextPoints);
        totals.push({ username: account.username, total_points: Object.values(nextPoints).reduce((sum, value) => sum + (Number(value) || 0), 0) });
      }
      await sbSyncVolleyballLeaderboard(totals);
      const nextState = { gw: Number(state.gw) + 1, locked: false };
      await sbSetVolleyballState(nextState); await sbSetVolleyballStats(nextState.gw, {});
      setState(nextState); setStats({}); setSelectedId(''); showToast('تم اعتماد الجولة', 'success');
    } finally { setBusy(false); }
  };

  return <div className="volleyAdmin">
    <div className="adminContentSwitch"><button className={view === 'players' ? 'active' : ''} onClick={() => setView('players')}>لاعبي الفولي</button><button className={view === 'scoring' ? 'active' : ''} onClick={() => setView('scoring')}>الحكم والنقاط</button></div>
    {view === 'players' && <><div className="card"><h3 className="disp">{form.id ? 'تعديل اللاعب' : 'لاعب جديد'}</h3><input placeholder="اسم اللاعب" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/><div className="row"><input type="number" step="0.5" placeholder="السعر" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })}/><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>{['Player','Hitter','Blocker','Libero','Setter'].map((role) => <option key={role}>{role}</option>)}</select></div><input placeholder="اسم الفريق" value={form.team_name} onChange={(event) => setForm({ ...form, team_name: event.target.value })}/><label>لون القميص <input type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })}/></label><button className="btn" onClick={savePlayer} disabled={busy}>حفظ اللاعب</button>{form.id && <button className="btn ghost" onClick={() => setForm(emptyPlayer)}>إلغاء التعديل</button>}</div><div className="card"><h3 className="disp">اللاعبون ({players.length})</h3>{players.map((player) => <div className="volleyAdminPlayer" key={player.id}><i style={{ background: player.color }}/><strong>{player.name}<small>{player.role} · {player.price}m</small></strong><button className="btn small ghost" onClick={() => setForm(player)}>تعديل</button><button className="btn small danger" onClick={() => remove(player)}>حذف</button></div>)}</div></>}
    {view === 'scoring' && <><div className="card volleyRound"><h3 className="disp">Volleyball GW {state.gw}</h3><b className={state.locked ? 'locked' : ''}>{state.locked ? 'التشكيلات مقفولة' : 'التشكيلات مفتوحة'}</b><button className="btn ghost" onClick={toggleLock}>{state.locked ? 'فتح التشكيلات' : 'قفل التشكيلات'}</button></div><div className="card"><select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}><option value="">اختار اللاعب لإدخال إحصائياته</option>{players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select>{selectedId && <div className="volleyStatsGrid">{VOLLEYBALL_RULES.map(([key,label,value]) => <label key={key}><span>{label} <b>{value > 0 ? '+' : ''}{value}</b></span><input type="number" min="0" value={stats[selectedId]?.[key] || 0} onChange={(event) => setStat(key,event.target.value)}/></label>)}</div>}<button className="btn" onClick={saveStats} disabled={!selectedId}>حفظ نقاط الحكم</button></div><button className="btn danger volleyFinalize" onClick={finalize} disabled={busy}>اعتماد الجولة وفتح التالية</button></>}
  </div>;
}
