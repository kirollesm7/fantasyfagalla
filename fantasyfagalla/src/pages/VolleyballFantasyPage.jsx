import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { sbGetAccount, sbGetVolleyballAccounts, sbGetVolleyballMatches, sbGetVolleyballPlayers, sbGetVolleyballState, sbGetVolleyballStats, sbUpdateAccountField } from '../lib/db';
import { calcVolleyballTeamPoints, defaultVolleyballTeam, normalizeVolleyballTeam, VOLLEYBALL_RULES } from '../lib/volleyballScoring';
import { matchDisplayStatus } from '../lib/scheduleGenerator';
import FantasyBrandHeader from '../components/FantasyBrandHeader';
import NewsPage from './NewsPage';
import TimeTablePage from './TimeTablePage';
import './VolleyballFantasyPage.css';

const budgetLimit = 100;

const VB_SECTIONS = [
  ['home', 'Home'],
  ['team', 'Team'],
  ['matches', 'Fixtures'],
  ['leagues', 'League'],
  ['news', 'News'],
  ['more', 'More'],
];

function PlayerPhoto({ player }) {
  return <span className="vb-photo" style={{ '--player': player?.color || '#7148ff' }}>{player?.image_url ? <img src={player.image_url} alt="" /> : (player?.name?.slice(0, 1) || '+')}</span>;
}

function PlayerSlot({ player, captain, vice, points, label, locked, onClick, onCaptain, onVice }) {
  return <div className={`vb-slot ${player ? 'filled' : ''}`}>
    <button type="button" onClick={onClick} disabled={locked}><PlayerPhoto player={player}/>{player ? <><strong>{player.name}</strong><small>{player.country || player.team_name || 'FAG'} · {points !== undefined ? `${points} pts` : `$${player.price}m`}</small></> : <strong>{label}</strong>}</button>
    {player && onCaptain && <><button type="button" className={`vb-badge captain ${captain ? 'active' : ''}`} onClick={onCaptain} disabled={locked}>C</button><button type="button" className={`vb-badge vice ${vice ? 'active' : ''}`} onClick={onVice} disabled={locked}>VC</button></>}
  </div>;
}

function MatchCard({ match, live = false }) {
  const time = new Date(match.kickoff_time);
  return <article className="vb-match-card"><div><span className={live ? 'live' : ''}>{live ? 'LIVE' : (match.round_label || 'UPCOMING')}</span><small>{Number.isNaN(time.getTime()) ? '' : time.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</small></div><section><strong><i>{match.home_country || 'VB'}</i>{match.home_team}</strong><b>{live ? `${match.home_score} - ${match.away_score}` : 'VS'}</b><strong><i>{match.away_country || 'VB'}</i>{match.away_team}</strong></section></article>;
}

export default function VolleyballFantasyPage({ onSwitchSport }) {
  const { user } = useApp();
  const { showToast } = useUI();
  const [section, setSection] = useState('home');
  const [players, setPlayers] = useState([]);
  const [state, setState] = useState({ gw: 1, locked: false });
  const [stats, setStats] = useState({});
  const [team, setTeam] = useState(defaultVolleyballTeam());
  const [points, setPoints] = useState({});
  const [accounts, setAccounts] = useState([]);
  const [matches, setMatches] = useState([]);
  const [picker, setPicker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [playerRows, gameState, accountRows, matchRows, own] = await Promise.all([sbGetVolleyballPlayers(), sbGetVolleyballState(), sbGetVolleyballAccounts(), sbGetVolleyballMatches(), user ? sbGetAccount(user, 'volleyball_team,volleyball_points') : null]);
      setPlayers(playerRows.filter((player) => player.active !== false)); setState(gameState); setAccounts(accountRows); setMatches(matchRows);
      setStats(await sbGetVolleyballStats(gameState.gw)); setTeam(normalizeVolleyballTeam(own?.volleyball_team)); setPoints(own?.volleyball_points || {});
    } catch (loadError) { setError('شغّل ملف supabase-volleyball-fantasy.sql أولًا'); console.error(loadError); }
    finally { setLoading(false); }
  }, [user]);
  useEffect(() => { load(); }, [load]);

  const byId = useMemo(() => Object.fromEntries(players.map((player) => [player.id, player])), [players]);
  const selectedIds = [...team.starters, ...team.bench].filter(Boolean);
  const spent = selectedIds.reduce((total, id) => total + (byId[id]?.price || 0), 0);
  const livePoints = calcVolleyballTeamPoints(team, stats);
  const savedTotal = Object.values(points).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const totalPoints = savedTotal + (points[`gw${state.gw}`] === undefined ? livePoints : 0);
  const ranking = accounts.map((account) => { const saved = account.volleyball_points || {}; const total = Object.values(saved).reduce((sum, value) => sum + (Number(value) || 0), 0); const live = saved[`gw${state.gw}`] === undefined ? calcVolleyballTeamPoints(account.volleyball_team, stats) : 0; return { username: account.username, total: total + live, gw: saved[`gw${state.gw}`] ?? live }; }).sort((a,b) => b.total - a.total);
  const myRank = Math.max(1, ranking.findIndex((row) => row.username === user) + 1);
  const liveMatches = matches.filter((match) => matchDisplayStatus(match) === 'live');
  const upcomingMatches = matches.filter((match) => matchDisplayStatus(match) === 'upcoming');
  const topFor = (key) => players.map((player) => ({ player, value: Number(stats[player.id]?.[key]) || 0 })).sort((a,b) => b.value - a.value)[0];

  const choosePlayer = (player) => {
    if (selectedIds.includes(player.id)) return showToast('اللاعب موجود بالفعل', 'error');
    if (spent + player.price > budgetLimit) return showToast('الميزانية لا تكفي', 'error');
    setTeam((current) => ({ ...current, [picker.group]: current[picker.group].map((id,index) => index === picker.index ? player.id : id) })); setPicker(null);
  };
  const removePlayer = (group,index) => { const removed = team[group][index]; setTeam((current) => ({ ...current, [group]: current[group].map((id,itemIndex) => itemIndex === index ? null : id), captainId: current.captainId === removed ? null : current.captainId, viceCaptainId: current.viceCaptainId === removed ? null : current.viceCaptainId })); };
  const autoPick = () => { const picked = [...players].sort((a,b) => a.price - b.price).slice(0,10); if (picked.length < 10 || picked.reduce((sum,p) => sum + p.price,0) > budgetLimit) return showToast('لا يوجد 10 لاعبين مناسبين للميزانية', 'error'); setTeam({ starters: picked.slice(0,6).map((p) => p.id), bench: picked.slice(6).map((p) => p.id), captainId: picked[0].id, viceCaptainId: picked[1].id }); };
  const save = async () => { if (team.starters.some((id) => !id) || team.bench.some((id) => !id)) return showToast('اختار 6 أساسي و4 دكة', 'error'); if (!team.captainId || !team.viceCaptainId || team.captainId === team.viceCaptainId) return showToast('اختار Captain وVice Captain مختلفين', 'error'); await sbUpdateAccountField(user,'volleyball_team',team); showToast('تم حفظ الفريق','success'); };

  if (loading) return <main className="vb-page"><FantasyBrandHeader sport="volleyball" onSwitchSport={onSwitchSport} /><div className="vb-state"><span className="fpl-state-spinner" /><strong>Loading Volleyball</strong><small>Getting your squad and gameweek state...</small></div></main>;
  if (error) return <main className="vb-page"><FantasyBrandHeader sport="volleyball" onSwitchSport={onSwitchSport} /><div className="vb-state"><strong>{error}</strong><button onClick={load}>إعادة المحاولة</button></div></main>;

  return <main className="vb-page">
    <FantasyBrandHeader sport="volleyball" onSwitchSport={onSwitchSport} />

    <nav className="vb-section-nav" aria-label="Volleyball sections">
      {VB_SECTIONS.map(([id, label]) => <button key={id} type="button" className={section === id ? 'active' : ''} onClick={() => setSection(id)}>{label}</button>)}
    </nav>

    {section === 'home' && <div className="vb-screen">
      <section className="fpl-home-page vb-home">
        <div className="vb-heading"><h1>Volleyball</h1><span>Gameweek {state.gw}</span></div>
        <section className="vb-home-stats">
          <div><small>Total Points</small><b>{totalPoints}</b></div>
          <div><small>Global Rank</small><b>#{myRank}</b></div>
          <div><small>League Rank</small><b>#{myRank}</b></div>
        </section>
        <div className="vb-title"><h2><i />Live Now</h2><span>{liveMatches.length} matches live</span></div>
        <div className="vb-match-scroll">{liveMatches.length ? liveMatches.map((match) => <MatchCard key={match.id} match={match} live/>) : <div className="vb-empty">No live matches</div>}</div>
        <div className="vb-title"><h2>Upcoming Matches</h2></div>
        <div className="vb-match-scroll">{upcomingMatches.length ? upcomingMatches.map((match) => <MatchCard key={match.id} match={match}/>) : <div className="vb-empty">Host will add upcoming matches</div>}</div>
      </section>
      <section className="fpl-home-links vb-actions">
        <button onClick={() => setSection('team')}><span><strong>My Team</strong><small>Manage your squad</small></span><b>›</b></button>
        <button onClick={() => setSection('matches')}><span><strong>Fixtures</strong><small>Track fixtures</small></span><b>›</b></button>
        <button onClick={() => setSection('leagues')}><span><strong>Leagues</strong><small>Compete globally</small></span><b>›</b></button>
      </section>
    </div>}

    {section === 'team' && <div className="vb-screen">
      <div className="vb-heading"><h1>My Team</h1><span>6 starters · 4 bench</span></div>
      <div className="vb-tabs">
        <button className="active">Team</button>
        <button onClick={() => setSection('matches')}>Fixtures</button>
        <button onClick={() => setSection('leagues')}>League</button>
      </div>
      <div className="vb-team-values">
        <span>Budget Remaining <b>${(budgetLimit-spent).toFixed(1)}m</b></span>
        <span>Team Value <b>${spent.toFixed(1)}m</b></span>
      </div>
      <section className="vb-court">
        <div className="vb-court-lines"><i /><i /><i /></div>
        <div className="vb-six">{team.starters.map((id,index) => <PlayerSlot key={index} player={byId[id]} captain={id === team.captainId} vice={id === team.viceCaptainId} label={`Player ${index+1}`} locked={state.locked} onClick={() => id ? removePlayer('starters',index) : setPicker({group:'starters',index})} onCaptain={id ? () => setTeam((current) => ({...current,captainId:id,viceCaptainId:current.viceCaptainId === id ? null : current.viceCaptainId})) : null} onVice={id ? () => setTeam((current) => ({...current,viceCaptainId:id,captainId:current.captainId === id ? null : current.captainId})) : null}/>)}</div>
      </section>
      <section className="vb-bench">
        <h2>Bench (4/4)</h2>
        <div>{team.bench.map((id,index) => <PlayerSlot key={index} player={byId[id]} label={`Sub ${index+1}`} locked={state.locked} onClick={() => id ? removePlayer('bench',index) : setPicker({group:'bench',index})}/>)}</div>
      </section>
      {!state.locked && <div className="vb-team-buttons"><button onClick={autoPick}>Auto Pick</button><button onClick={save}>Save Team</button></div>}
    </div>}

    {section === 'matches' && <div className="vb-screen">
      <div className="vb-heading"><h1>مواعيد الفولي</h1><span>Live scores, fixtures and league table</span></div>
      <TimeTablePage sport="volleyball" embedded />
    </div>}

    {section === 'leagues' && <div className="vb-screen">
      <div className="vb-heading"><h1>Leagues</h1><span>Bigger community. Higher stakes.</span></div>
      <section className="fpl-league-table-wrap vb-league">
        <header><strong>Fagalla Players League</strong><span>One Game. One Community.</span></header>
        <div className="vb-league-rows">
          {ranking.map((row,index) => <div className={`vb-rank ${row.username === user ? 'mine' : ''}`} key={row.username}><b>{index+1}</b><strong>{row.username === user ? 'You' : row.username}</strong><span>{row.total}</span><i>{index % 2 ? '▼ 1' : '▲ 2'}</i></div>)}
        </div>
      </section>
      <div className="vb-title"><h2>Matchweek Highlights</h2></div>
      <section className="vb-highlights">
        {[['point_won','Top Scorer','pts'],['best_blocker','Most Blocks','blocks'],['best_setter','Best Setter','awards']].map(([key,label,unit]) => { const top=topFor(key); return <div key={key}><small>{label}</small><PlayerPhoto player={top?.player}/><strong>{top?.player?.name || '-'}</strong><b>{top?.value || 0} {unit}</b></div>; })}
      </section>
    </div>}

    {section === 'news' && <div className="vb-screen vb-news-screen"><NewsPage /></div>}

    {section === 'more' && <div className="vb-screen">
      <div className="vb-heading"><h1>More</h1><span>Play. Predict. Dominate.</span></div>
      <section className="vb-rules">
        <h2>Scoring System</h2>
        {VOLLEYBALL_RULES.map(([key,label,value]) => <div key={key}><span>{label}</span><b className={value<0?'minus':''}>{value>0?'+':''}{value}</b></div>)}
      </section>
      <div className="vb-exclusive">حصريًا في كنيسة العذراء مريم بالفجالة<small>Volleyball brings us closer.</small></div>
    </div>}

    {picker && <div className="vb-picker" onClick={() => setPicker(null)}><div onClick={(event) => event.stopPropagation()}><header><h2>Choose player</h2><button onClick={() => setPicker(null)}>×</button></header>{players.map((player) => <button key={player.id} disabled={selectedIds.includes(player.id)||spent+player.price>budgetLimit} onClick={() => choosePlayer(player)}><PlayerPhoto player={player}/><strong>{player.name}<small>{player.role} · {player.country || player.team_name || 'Fagalla'}</small></strong><b>${player.price}m</b></button>)}</div></div>}
  </main>;
}