import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { sbGetAccount, sbGetVolleyballAccounts, sbGetVolleyballPlayers, sbGetVolleyballState, sbGetVolleyballStats, sbUpdateAccountField } from '../lib/db';
import { calcVolleyballPlayerPoints, calcVolleyballTeamPoints, defaultVolleyballTeam, normalizeVolleyballTeam, VOLLEYBALL_RULES } from '../lib/volleyballScoring';
import './VolleyballFantasyPage.css';

const budgetLimit = 100;

function PlayerSlot({ player, captain, points, label, locked, onClick, onCaptain }) {
  return (
    <div className={`vb-slot ${player ? 'filled' : ''}`}>
      <button type="button" onClick={onClick} disabled={locked}>{player ? <><span className="vb-shirt" style={{ '--shirt': player.color || '#ff7a00' }}>●</span><strong>{player.name}</strong><small>{points !== undefined ? `${points} pts` : `${player.price}m`}</small></> : <><span className="vb-add">+</span><strong>{label}</strong></>}</button>
      {player && onCaptain && <button type="button" className={`vb-captain ${captain ? 'active' : ''}`} onClick={onCaptain} disabled={locked}>C</button>}
    </div>
  );
}

export default function VolleyballFantasyPage() {
  const { user } = useApp();
  const { showToast } = useUI();
  const [section, setSection] = useState('team');
  const [players, setPlayers] = useState([]);
  const [state, setState] = useState({ gw: 1, locked: false });
  const [stats, setStats] = useState({});
  const [team, setTeam] = useState(defaultVolleyballTeam());
  const [points, setPoints] = useState({});
  const [accounts, setAccounts] = useState([]);
  const [picker, setPicker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [playerRows, gameState, accountRows, own] = await Promise.all([
        sbGetVolleyballPlayers(), sbGetVolleyballState(), sbGetVolleyballAccounts(),
        user ? sbGetAccount(user, 'volleyball_team,volleyball_points') : null,
      ]);
      const gameStats = await sbGetVolleyballStats(gameState.gw);
      setPlayers(playerRows.filter((player) => player.active !== false));
      setState(gameState); setStats(gameStats); setAccounts(accountRows);
      setTeam(normalizeVolleyballTeam(own?.volleyball_team));
      setPoints(own?.volleyball_points || {});
    } catch (loadError) { setError('شغّل ملف supabase-volleyball-fantasy.sql أولًا'); console.error(loadError); }
    finally { setLoading(false); }
  }, [user]);
  useEffect(() => { load(); }, [load]);

  const byId = useMemo(() => Object.fromEntries(players.map((player) => [player.id, player])), [players]);
  const selectedIds = [...team.starters, ...team.bench].filter(Boolean);
  const spent = selectedIds.reduce((total, id) => total + (byId[id]?.price || 0), 0);
  const livePoints = calcVolleyballTeamPoints(team, stats);
  const ranking = accounts.map((account) => {
    const saved = account.volleyball_points || {};
    const total = Object.values(saved).reduce((sum, value) => sum + (Number(value) || 0), 0);
    const live = saved[`gw${state.gw}`] === undefined ? calcVolleyballTeamPoints(account.volleyball_team, stats) : 0;
    return { username: account.username, total: total + live, gw: saved[`gw${state.gw}`] ?? live };
  }).sort((a, b) => b.total - a.total);

  const choosePlayer = (player) => {
    if (selectedIds.includes(player.id)) return showToast('اللاعب موجود بالفعل', 'error');
    if (spent + player.price > budgetLimit) return showToast('الميزانية لا تكفي', 'error');
    setTeam((current) => ({ ...current, [picker.group]: current[picker.group].map((id, index) => index === picker.index ? player.id : id) }));
    setPicker(null);
  };
  const removePlayer = (group, index) => {
    const removed = team[group][index];
    setTeam((current) => ({ ...current, [group]: current[group].map((id, itemIndex) => itemIndex === index ? null : id), captainId: current.captainId === removed ? null : current.captainId }));
  };
  const save = async () => {
    if (!user) return showToast('سجل دخولك أولًا', 'error');
    if (team.starters.some((id) => !id) || team.bench.some((id) => !id)) return showToast('اختار 6 أساسي و4 دكة', 'error');
    if (!team.captainId) return showToast('اختار الكابتن', 'error');
    await sbUpdateAccountField(user, 'volleyball_team', team);
    showToast('تم حفظ فريق الفوليبول', 'success');
  };

  if (loading) return <div className="vb-state">Loading Volleyball Fantasy...</div>;
  if (error) return <div className="vb-state"><strong>{error}</strong><button onClick={load}>إعادة المحاولة</button></div>;
  return (
    <main className="vb-page">
      <header className="vb-header"><div className="vb-ball">✦</div><div><small>FAGALLA</small><h1>VOLLEYBALL FANTASY</h1><p>حصريًا في كنيسة العذراء مريم بالفجالة</p></div><span>GW {state.gw}</span></header>
      <nav className="vb-nav">{[['team','My Team'],['points','Points'],['league','Leaderboard'],['rules','Scoring']].map(([id,label]) => <button key={id} className={section === id ? 'active' : ''} onClick={() => setSection(id)}>{label}</button>)}</nav>

      {section === 'team' && <>
        <div className="vb-summary"><span>Budget <b>{(budgetLimit - spent).toFixed(1)}m</b></span><span>Players <b>{selectedIds.length}/10</b></span><span>{state.locked ? 'LOCKED' : 'OPEN'}</span></div>
        <section className="vb-court">
          <div className="vb-court-lines"><i /><i /><i /></div>
          <div className="vb-six">{team.starters.map((id, index) => <PlayerSlot key={index} player={byId[id]} captain={id === team.captainId} label={`Player ${index + 1}`} locked={state.locked} onClick={() => id ? removePlayer('starters', index) : setPicker({ group: 'starters', index })} onCaptain={id ? () => setTeam((current) => ({ ...current, captainId: id })) : null} />)}</div>
        </section>
        <section className="vb-bench"><h2>SUBSTITUTES</h2><div>{team.bench.map((id, index) => <PlayerSlot key={index} player={byId[id]} label={`Sub ${index + 1}`} locked={state.locked} onClick={() => id ? removePlayer('bench', index) : setPicker({ group: 'bench', index })} />)}</div></section>
        {!state.locked && <button className="vb-save" onClick={save}>SAVE VOLLEYBALL TEAM</button>}
      </>}

      {section === 'points' && <section className="vb-panel"><div className="vb-score"><small>GAMEWEEK {state.gw}</small><strong>{points[`gw${state.gw}`] ?? livePoints}</strong><span>POINTS</span></div><div className="vb-points-grid">{team.starters.map((id, index) => <PlayerSlot key={index} player={byId[id]} captain={id === team.captainId} points={id ? calcVolleyballPlayerPoints(stats[id]) * (id === team.captainId ? 2 : 1) : 0} label="Empty" locked />)}</div></section>}

      {section === 'league' && <section className="vb-panel"><h2>VOLLEYBALL LEADERBOARD</h2><div className="vb-table-head"><span>#</span><span>Manager</span><span>GW</span><span>Total</span></div>{ranking.map((row, index) => <div className={`vb-rank ${row.username === user ? 'mine' : ''}`} key={row.username}><b>{index + 1}</b><strong>{row.username}</strong><span>{row.gw}</span><b>{row.total}</b></div>)}</section>}

      {section === 'rules' && <section className="vb-panel"><h2>SCORING SYSTEM</h2>{VOLLEYBALL_RULES.map(([key, label, value]) => <div className="vb-rule" key={key}><span>{label}</span><b className={value < 0 ? 'minus' : ''}>{value > 0 ? '+' : ''}{value}</b></div>)}</section>}

      {picker && <div className="vb-picker" onClick={() => setPicker(null)}><div onClick={(event) => event.stopPropagation()}><header><h2>Choose player</h2><button onClick={() => setPicker(null)}>×</button></header>{players.map((player) => <button key={player.id} disabled={selectedIds.includes(player.id) || spent + player.price > budgetLimit} onClick={() => choosePlayer(player)}><span className="vb-shirt" style={{ '--shirt': player.color }}>●</span><strong>{player.name}<small>{player.role} · {player.team_name || 'Fagalla'}</small></strong><b>{player.price}m</b></button>)}</div></div>}
    </main>
  );
}
