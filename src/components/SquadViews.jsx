import { playerById, gwPlayerPoints } from '../lib/scoring';

export function PlayerCard({ id, team, players, stats, gw }) {
  const p = playerById(players, id);
  const isCap = team.captainId === id;
  return (
    <div className={`playercard ${p ? '' : 'empty'}`}>
      {isCap && <div className="cap-badge">C</div>}
      <div className="jersey" style={{ background: p ? p.color || '#3C7A4F' : 'rgba(255,255,255,.12)' }} />
      <div className="pname">{p ? p.name : 'فاضي'}</div>
      {p && <div className="ppts">{gwPlayerPoints(stats, gw, p.id)} نقطة</div>}
    </div>
  );
}

export function PitchView({ team, players, stats, gw }) {
  return (
    <div className="pitchwrap">
      <div className="pitch-row">
        {team.starters.map((id, i) => (
          <PlayerCard key={i} id={id} team={team} players={players} stats={stats} gw={gw} />
        ))}
      </div>
      <div className="bench-strip">
        <h4>البدلاء</h4>
        <div className="pitch-row" style={{ margin: 0 }}>
          {team.bench.map((id, i) => (
            <PlayerCard key={i} id={id} team={team} players={players} stats={stats} gw={gw} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ListView({ team, players, stats, gw }) {
  const section = (title, ids) => (
    <div key={title}>
      <div className="hint" style={{ margin: '10px 0 6px', fontFamily: "'Cairo',sans-serif", color: 'var(--gold)' }}>{title}</div>
      {ids.map((id, i) => {
        const p = playerById(players, id);
        return (
          <div className="listrow" key={i}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="swatch" style={{ background: p ? p.color || '#3C7A4F' : 'transparent' }} />
              <span className="lname">{p ? p.name : 'فاضي'}</span>
              {p && team.captainId === p.id && <span style={{ color: 'var(--gold)', marginInlineStart: 6, fontWeight: 900 }}>©️</span>}
            </div>
            <div className="row" style={{ gap: 14, alignItems: 'center' }}>
              <span className="price">{p ? `${p.price}M` : ''}</span>
              <span className="lpts">{p ? gwPlayerPoints(stats, gw, p.id) : ''}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
  return (
    <>
      {section('الأساسي', team.starters)}
      {section('البدلاء', team.bench)}
    </>
  );
}
