import { useEffect, useState } from 'react';
import { sbGetAccount } from '../lib/db';
import { migrateTeam, defaultTeam, isSquadComplete, squadCount, SQUAD_SIZE } from '../lib/scoring';
import { PitchView } from './SquadViews';
import { useApp } from '../context/AppContext';

export default function UserTeamModal({ username, onClose }) {
  const { players, stats, gwState } = useApp();
  const [team, setTeam] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const row = await sbGetAccount(username, 'team');
        setTeam(migrateTeam((row && row.team) || defaultTeam()));
      } catch (e) {
        console.error('load user team failed', e);
        setError('مقدرتش أجيب التشكيلة، جرب تاني.');
      }
    })();
  }, [username]);

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: 420 }}>
        <h3 className="disp" style={{ margin: '0 0 12px' }}>تشكيلة {username}</h3>
        {error && <p className="hint">{error}</p>}
        {!error && !team && <p className="hint">بيتحمل...</p>}
        {!error && team && (
          <>
            {!isSquadComplete(players, team) && (
              <p className="hint" style={{ marginBottom: 10 }}>
                {username} لسه مكمّلش التشكيلة ({squadCount(players, team)} من {SQUAD_SIZE}).
              </p>
            )}
            <PitchView team={team} players={players} stats={stats} gw={gwState.gw} />
          </>
        )}
        <button className="btn ghost small" style={{ width: '100%', marginTop: 14 }} onClick={onClose}>قفل</button>
      </div>
    </div>
  );
}
