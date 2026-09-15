import { useMemo } from 'react';

// people on the same score share a rank (1,2,2,4) rather than being split apart
export default function RankTable({ rows, pointsLabel, onSelectUser, search = '' }) {
  const q = search.trim().toLowerCase();
  const ranked = useMemo(() => {
    return rows.reduce((acc, r, i) => {
      const prev = acc[i - 1];
      const rank = prev && prev.val === r.val ? prev.rank : i + 1;
      acc.push({ ...r, rank });
      return acc;
    }, []);
  }, [rows]);

  return (
    <table className="stTable">
      <thead><tr><th>#</th><th>اللاعب</th><th>{pointsLabel}</th></tr></thead>
      <tbody>
        {ranked.map((r) => {
          const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : r.rank;
          const hidden = q && !r.user.toLowerCase().includes(q);
          return (
            <tr
              key={r.user}
              className={`${r.isMe ? 'me-row' : ''} clickableRow`}
              style={hidden ? { display: 'none' } : undefined}
              onClick={() => onSelectUser(r.user)}
            >
              <td className="rankcell">{medal}</td>
              <td className="namecell">
                <span className="avatarCircle">{(r.user.trim().charAt(0) || '?').toUpperCase()}</span>
                <span>{r.user}{r.note}{r.isMe ? <span className="hint"> (انت)</span> : null}</span>
              </td>
              <td className="ptscell">{r.val}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
