import { useApp } from '../context/AppContext';
import { calcTeamPointsForGW } from '../lib/scoring';

export default function HistoryCard() {
  const { points, gwState, team, players, stats } = useApp();
  const gws = Object.keys(points).sort((a, b) => parseInt(a.replace('gw', '')) - parseInt(b.replace('gw', '')));
  const finalizedTotal = gws.reduce((s, g) => s + (Number(points[g]) || 0), 0);
  const liveKey = 'gw' + gwState.gw;
  const livePts = points[liveKey] === undefined ? calcTeamPointsForGW(players, stats, team, gwState.gw) : null;
  const total = finalizedTotal + (livePts || 0);

  if (gws.length === 0 && livePts === null) {
    return (
      <div className="card">
        <h3 className="disp" style={{ margin: '0 0 10px' }}>بوينتاتك</h3>
        <p className="hint">لسه معندكش بوينتس متسجلة</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="disp" style={{ margin: '0 0 10px' }}>بوينتاتك</h3>
      <table>
        <thead><tr><th>جيم ويك</th><th>بوينتس</th></tr></thead>
        <tbody>
          {gws.map((g) => (
            <tr key={g}><td>{g.replace('gw', 'GW ')}</td><td>{points[g]}</td></tr>
          ))}
          {livePts !== null && (
            <tr>
              <td>GW {gwState.gw} <span className="hint" style={{ color: 'var(--gold)' }}>(لسه شغال)</span></td>
              <td>{livePts}</td>
            </tr>
          )}
          <tr><td><b>الإجمالي</b></td><td><b className="rank1">{total}</b></td></tr>
        </tbody>
      </table>
    </div>
  );
}
