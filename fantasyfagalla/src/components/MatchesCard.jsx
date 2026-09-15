function formatMatchTime(iso) {
  try {
    return new Date(iso).toLocaleString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function MatchesCard({ matches }) {
  const upcoming = matches.filter((m) => new Date(m.kickoff_time) >= new Date()).slice(0, 5);
  if (!upcoming.length) return null;
  return (
    <div className="card">
      <h3 className="disp" style={{ margin: '0 0 10px' }}>مواعيد الماتشات الجاية</h3>
      {upcoming.map((m) => (
        <div className="listrow" key={m.id}>
          <span className="lname">{m.home_team} × {m.away_team}</span>
          <span className="hint">{formatMatchTime(m.kickoff_time)}{m.gw ? ` · GW ${m.gw}` : ''}</span>
        </div>
      ))}
    </div>
  );
}
