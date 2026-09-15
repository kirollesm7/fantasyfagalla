import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { sbGetAccount } from '../lib/db';
import { calcPlayerPoints, calcTeamPointsForGW, defaultTeam, migrateTeam } from '../lib/scoring';

function playerById(players, id) {
  return players.find((player) => String(player.id) === String(id));
}

function teamForGameweek(team, gw, currentGw) {
  const migrated = migrateTeam(team || defaultTeam());
  if (Number(gw) === Number(currentGw)) return migrated;
  const snapshot = migrated.transferState?.history?.[String(gw)]?.squad;
  return snapshot ? migrateTeam({ ...migrated, ...snapshot }) : migrated;
}

function ReadOnlyPlayer({ id, players, stats, gw, captainId, viceCaptainId, benchOrder }) {
  const player = playerById(players, id);
  if (!player) return <div className="fpl-ro-player empty"><span>Empty</span></div>;
  const raw = stats[`gw${gw}`]?.[id] ?? stats[`gw${gw}`]?.[String(id)] ?? {};
  const points = calcPlayerPoints(id, { [id]: raw });
  return (
    <div className="fpl-ro-player">
      {benchOrder && <i>{benchOrder}</i>}
      <div className="fpl-ro-shirt" style={{ '--kit': player.color || '#5b64d8' }} />
      <strong>{player.name}</strong>
      <small>{points} pts</small>
      {String(captainId) === String(id) && <b className="fpl-ro-badge">C</b>}
      {String(viceCaptainId) === String(id) && <b className="fpl-ro-badge vice">V</b>}
    </div>
  );
}

function ManagerTeam({ username, team, players, stats, gw, currentGw, onClose }) {
  const shownTeam = teamForGameweek(team, gw, currentGw);
  return (
    <div className="fpl-manager-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <section className="fpl-manager-sheet" role="dialog" aria-modal="true" aria-label={`${username} team`}>
        <header><div><span>MANAGER TEAM</span><h2>{username}</h2></div><button type="button" onClick={onClose}>Close</button></header>
        <div className="fpl-ro-gw">Gameweek {gw} · Read only</div>
        <div className="fpl-ro-pitch">
          <div className="fpl-ro-line" />
          <div className="fpl-ro-row">
            {shownTeam.starters.slice(0, 2).map((id, index) => <ReadOnlyPlayer key={`s${index}`} id={id} players={players} stats={stats} gw={gw} captainId={shownTeam.captainId} viceCaptainId={shownTeam.viceCaptainId} />)}
          </div>
          <div className="fpl-ro-row">
            {shownTeam.starters.slice(2, 4).map((id, index) => <ReadOnlyPlayer key={`s${index + 2}`} id={id} players={players} stats={stats} gw={gw} captainId={shownTeam.captainId} viceCaptainId={shownTeam.viceCaptainId} />)}
          </div>
          <div className="fpl-ro-bench">
            {shownTeam.bench.map((id, index) => <ReadOnlyPlayer key={`b${index}`} id={id} players={players} stats={stats} gw={gw} benchOrder={index + 1} />)}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function StandingsPage() {
  const { user, users, players, stats, gwState, team: myTeam } = useApp();
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedGw, setSelectedGw] = useState(Number(gwState.gw));
  const [viewing, setViewing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await Promise.all(users.map(async (username) => {
        const [teamRow, pointsRow] = await Promise.all([
          username === user ? Promise.resolve({ team: myTeam }) : sbGetAccount(username, 'team'),
          sbGetAccount(username, 'points'),
        ]);
        return [username, { team: migrateTeam(teamRow?.team || defaultTeam()), points: pointsRow?.points || {} }];
      }));
      setRecords(Object.fromEntries(rows));
    } catch (loadError) {
      console.error('standings load failed', loadError);
      setError('The league table could not be loaded. Try again.');
    } finally {
      setLoading(false);
    }
  }, [myTeam, user, users]);

  useEffect(() => { load(); }, [load]);

  const gameweeks = useMemo(() => {
    const found = new Set([Number(gwState.gw)]);
    Object.values(records).forEach((record) => Object.keys(record.points).forEach((key) => found.add(Number(key.replace('gw', '')))));
    return [...found].filter(Boolean).sort((a, b) => a - b);
  }, [gwState.gw, records]);

  const rows = useMemo(() => users.map((username) => {
    const record = records[username] || { team: defaultTeam(), points: {} };
    const gwKey = `gw${selectedGw}`;
    const finalizedGw = record.points[gwKey];
    const gwPoints = finalizedGw !== undefined
      ? Number(finalizedGw) || 0
      : Number(selectedGw) === Number(gwState.gw)
        ? calcTeamPointsForGW(players, stats, record.team, selectedGw)
        : 0;
    const finalizedTotal = Object.values(record.points).reduce((sum, value) => sum + (Number(value) || 0), 0);
    const live = record.points[`gw${gwState.gw}`] === undefined
      ? calcTeamPointsForGW(players, stats, record.team, gwState.gw)
      : 0;
    return { username, gwPoints, total: finalizedTotal + live, team: record.team };
  }).filter((row) => row.username.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => b.total - a.total || b.gwPoints - a.gwPoints || a.username.localeCompare(b.username)), [gwState.gw, players, records, search, selectedGw, stats, users]);

  if (loading) return <div className="fpl-state"><span className="fpl-state-spinner" /><strong>Loading league</strong><small>Updating ranks and teams...</small></div>;
  if (error) return <div className="fpl-state error"><strong>Failed request</strong><small>{error}</small><button type="button" onClick={load}>Try again</button></div>;

  return (
    <div className="fpl-league-page">
      <section className="fpl-screen-heading"><div><span>Fagalla Fantasy League</span><h1>Standings</h1><p>Overall standings and gameweek scores</p></div><strong>GW {gwState.gw}</strong></section>
      <div className="fpl-league-toolbar">
        <label><span>Gameweek</span><select value={selectedGw} onChange={(event) => setSelectedGw(Number(event.target.value))}>{gameweeks.map((gw) => <option key={gw} value={gw}>Gameweek {gw}</option>)}</select></label>
        <label><span>Find manager</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search manager" /></label>
      </div>
      <section className="fpl-league-table-wrap">
        <header><strong>Fagalla Fantasy League</strong><span>{users.length} managers</span></header>
        <div className="fpl-table-wrap fpl-league-scroll">
          <table className="fpl-league-table">
            <colgroup><col className="rank" /><col className="manager" /><col className="gw" /><col className="total" /></colgroup>
            <thead><tr><th>Rank</th><th>Team / Manager</th><th>GW</th><th>Total</th></tr></thead>
            <tbody>{rows.map((row, index) => (
              <tr key={row.username} className={row.username === user ? 'me' : ''} onClick={() => setViewing(row)}>
                <td>{index + 1}</td><td><button type="button" className="fpl-manager-link" onClick={() => setViewing(row)}><strong>{row.username}</strong><span>View team</span></button>{row.username === user && <small>You</small>}</td><td>{row.gwPoints}</td><td><b>{row.total}</b></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        {!rows.length && <div className="fpl-state"><strong>No managers found</strong><small>Try a different search.</small></div>}
      </section>
      {viewing && <ManagerTeam username={viewing.username} team={viewing.team} players={players} stats={stats} gw={selectedGw} currentGw={gwState.gw} onClose={() => setViewing(null)} />}
    </div>
  );
}
