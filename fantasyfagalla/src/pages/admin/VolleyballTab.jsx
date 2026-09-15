import { useCallback, useEffect, useState } from 'react';
import { useUI } from '../../context/UIContext';
import { calcVolleyballTeamPoints, VOLLEYBALL_RULES } from '../../lib/volleyballScoring';
import { sbDeleteVolleyballMatch, sbDeleteVolleyballPlayer, sbGetVolleyballAccounts, sbGetVolleyballMatches, sbGetVolleyballPlayers, sbGetVolleyballState, sbGetVolleyballStats, sbSaveVolleyballMatch, sbSaveVolleyballPlayer, sbSetVolleyballState, sbSetVolleyballStats, sbSyncVolleyballLeaderboard, sbUpdateAccountField, uid } from '../../lib/db';

const emptyPlayer = { name: '', price: 8, role: 'Player', team_name: '', country: '', image_url: '', color: '#ff7a00', active: true };
const emptyMatch = { home_team: '', away_team: '', home_country: '', away_country: '', kickoff_time: '', status: 'upcoming', home_score: 0, away_score: 0, round_label: '' };

export default function VolleyballTab() {
  const { showToast, openConfirm } = useUI();
  const [view, setView] = useState('players');
  const [players, setPlayers] = useState([]);
  const [state, setState] = useState({ gw: 1, locked: false });
  const [stats, setStats] = useState({});
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState(emptyPlayer);
  const [matches, setMatches] = useState([]);
  const [matchForm, setMatchForm] = useState(emptyMatch);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const [playerRows, gameState, matchRows] = await Promise.all([sbGetVolleyballPlayers(), sbGetVolleyballState(), sbGetVolleyballMatches()]);
    setPlayers(playerRows); setState(gameState); setMatches(matchRows); setStats(await sbGetVolleyballStats(gameState.gw));
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
  const saveMatch = async () => {
    if (!matchForm.home_team || !matchForm.away_team || !matchForm.kickoff_time) return showToast('كمل بيانات المباراة', 'error');
    await sbSaveVolleyballMatch({ ...matchForm, id: matchForm.id || uid(), kickoff_time: new Date(matchForm.kickoff_time).toISOString(), home_score: Number(matchForm.home_score) || 0, away_score: Number(matchForm.away_score) || 0 });
    setMatchForm(emptyMatch); await load(); showToast('تم حفظ المباراة', 'success');
  };
  const removeMatch = async (match) => { if (!(await openConfirm(`حذف ${match.home_team} ضد ${match.away_team}؟`))) return; await sbDeleteVolleyballMatch(match.id); await load(); };
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
    <div className="adminContentSwitch volleyAdminSwitch"><button className={view === 'players' ? 'active' : ''} onClick={() => setView('players')}>اللاعبون</button><button className={view === 'scoring' ? 'active' : ''} onClick={() => setView('scoring')}>الحكم والنقاط</button><button className={view === 'matches' ? 'active' : ''} onClick={() => setView('matches')}>المباريات</button></div>
    {view === 'players' && <><div className="card"><h3 className="disp">{form.id ? 'تعديل اللاعب' : 'لاعب جديد'}</h3><input placeholder="اسم اللاعب" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/><div className="row"><input type="number" step="0.5" placeholder="السعر" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })}/><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>{['Player','Hitter','Blocker','Libero','Setter'].map((role) => <option key={role}>{role}</option>)}</select></div><input placeholder="اسم الفريق" value={form.team_name} onChange={(event) => setForm({ ...form, team_name: event.target.value })}/><input placeholder="الدولة أو الكود EGY" value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })}/><input placeholder="رابط صورة اللاعب" value={form.image_url} onChange={(event) => setForm({ ...form, image_url: event.target.value })}/><label>لون اللاعب <input type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })}/></label><button className="btn" onClick={savePlayer} disabled={busy}>حفظ اللاعب</button>{form.id && <button className="btn ghost" onClick={() => setForm(emptyPlayer)}>إلغاء التعديل</button>}</div><div className="card"><h3 className="disp">اللاعبون ({players.length})</h3>{players.map((player) => <div className="volleyAdminPlayer" key={player.id}><i style={{ background: player.color }}/><strong>{player.name}<small>{player.role} · {player.country || player.team_name} · {player.price}m</small></strong><button className="btn small ghost" onClick={() => setForm(player)}>تعديل</button><button className="btn small danger" onClick={() => remove(player)}>حذف</button></div>)}</div></>}
    {view === 'scoring' && <><div className="card volleyRound"><h3 className="disp">Volleyball GW {state.gw}</h3><b className={state.locked ? 'locked' : ''}>{state.locked ? 'التشكيلات مقفولة' : 'التشكيلات مفتوحة'}</b><button className="btn ghost" onClick={toggleLock}>{state.locked ? 'فتح التشكيلات' : 'قفل التشكيلات'}</button></div><div className="card"><select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}><option value="">اختار اللاعب لإدخال إحصائياته</option>{players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select>{selectedId && <div className="volleyStatsGrid">{VOLLEYBALL_RULES.map(([key,label,value]) => <label key={key}><span>{label} <b>{value > 0 ? '+' : ''}{value}</b></span><input type="number" min="0" value={stats[selectedId]?.[key] || 0} onChange={(event) => setStat(key,event.target.value)}/></label>)}</div>}<button className="btn" onClick={saveStats} disabled={!selectedId}>حفظ نقاط الحكم</button></div><button className="btn danger volleyFinalize" onClick={finalize} disabled={busy}>اعتماد الجولة وفتح التالية</button></>}
    {view === 'matches' && <><div className="card"><h3 className="disp">إضافة أو تحديث مباراة</h3><div className="row"><input placeholder="الفريق الأول" value={matchForm.home_team} onChange={(event) => setMatchForm({...matchForm,home_team:event.target.value})}/><input placeholder="الفريق الثاني" value={matchForm.away_team} onChange={(event) => setMatchForm({...matchForm,away_team:event.target.value})}/></div><div className="row"><input placeholder="كود الدولة الأولى" value={matchForm.home_country} onChange={(event) => setMatchForm({...matchForm,home_country:event.target.value})}/><input placeholder="كود الدولة الثانية" value={matchForm.away_country} onChange={(event) => setMatchForm({...matchForm,away_country:event.target.value})}/></div><input type="datetime-local" value={matchForm.kickoff_time ? String(matchForm.kickoff_time).slice(0,16) : ''} onChange={(event) => setMatchForm({...matchForm,kickoff_time:event.target.value})}/><select value={matchForm.status} onChange={(event) => setMatchForm({...matchForm,status:event.target.value})}><option value="upcoming">Upcoming</option><option value="live">Live</option><option value="finished">Finished</option></select><div className="row"><input type="number" placeholder="نتيجة الأول" value={matchForm.home_score} onChange={(event) => setMatchForm({...matchForm,home_score:event.target.value})}/><input type="number" placeholder="نتيجة الثاني" value={matchForm.away_score} onChange={(event) => setMatchForm({...matchForm,away_score:event.target.value})}/></div><input placeholder="اسم الجولة أو البطولة" value={matchForm.round_label} onChange={(event) => setMatchForm({...matchForm,round_label:event.target.value})}/><button className="btn" onClick={saveMatch}>حفظ المباراة</button>{matchForm.id && <button className="btn ghost" onClick={() => setMatchForm(emptyMatch)}>إلغاء التعديل</button>}</div><div className="card">{matches.map((match) => <div className="volleyAdminPlayer" key={match.id}><i/><strong>{match.home_team} ضد {match.away_team}<small>{match.status} · {match.home_score}-{match.away_score}</small></strong><button className="btn small ghost" onClick={() => setMatchForm({...match,kickoff_time:String(match.kickoff_time).slice(0,16)})}>تعديل</button><button className="btn small danger" onClick={() => removeMatch(match)}>حذف</button></div>)}</div></>}
  </div>;
}
