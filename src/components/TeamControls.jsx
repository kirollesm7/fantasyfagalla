import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { isValidPlayerId, squadCost, playerById } from '../lib/scoring';

function playerSlotState(team, id) {
  if (team.starters.includes(id)) return 'starter';
  if (team.bench.includes(id)) return 'bench';
  return null;
}
function removeFromTeam(team, id) {
  return {
    ...team,
    starters: team.starters.map((x) => (x === id ? null : x)),
    bench: team.bench.map((x) => (x === id ? null : x)),
    captainId: team.captainId === id ? null : team.captainId,
  };
}

export function PickerCard() {
  const { players, team, saveTeam } = useApp();
  const { showToast, openChoice } = useUI();

  const choosePlayerSlot = async (p) => {
    const state = playerSlotState(team, p.id);
    let options;
    if (state === null) {
      options = [
        { label: '⚽ حطه أساسي', value: 'starter' },
        { label: '🪑 حطه بديل', value: 'bench' },
      ];
    } else {
      options = [
        { label: state === 'starter' ? '🪑 حوله بديل' : '⚽ حوله أساسي', value: state === 'starter' ? 'bench' : 'starter' },
        { label: '🗑️ شيله من التشكيلة', value: 'remove', danger: true },
      ];
    }
    const choice = await openChoice({ title: p.name, options });
    if (!choice) return;

    let next = team;
    if (choice === 'remove') {
      next = removeFromTeam(team, p.id);
    } else if (choice === 'starter') {
      next = removeFromTeam(team, p.id);
      const idx = next.starters.findIndex((id) => !isValidPlayerId(players, id));
      if (idx === -1) { showToast('التشكيلة الأساسية مليانة (4 لاعبين)', 'error'); return; }
      const starters = [...next.starters]; starters[idx] = p.id;
      next = { ...next, starters };
    } else if (choice === 'bench') {
      next = removeFromTeam(team, p.id);
      const idx = next.bench.findIndex((id) => !isValidPlayerId(players, id));
      if (idx === -1) { showToast('دكة البدلاء مليانة (3 لاعبين)', 'error'); return; }
      const bench = [...next.bench]; bench[idx] = p.id;
      next = { ...next, bench };
    }
    if (squadCost(players, next) > 100) {
      showToast('تجاوزت الميزانية (100 مليون)، هنرجع الاختيار', 'error');
      return;
    }
    await saveTeam(next);
  };

  const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="card">
      <h3 className="disp" style={{ margin: '0 0 4px' }}>اختار لاعبينك</h3>
      <p className="hint">دوس على اللاعب واختار أساسي ولا بديل. لازم 4 لاعبين أساسي و3 بدلاء.</p>
      <div className="plist" id="plist">
        {sorted.map((p) => {
          const state = playerSlotState(team, p.id);
          return (
            <div
              key={p.id}
              className={`prow ${state ? 'checked' : ''}`}
              style={p.locked ? { opacity: 0.5 } : undefined}
              onClick={() => {
                if (p.locked && state === null) { showToast(`${p.name} مقفول دلوقتي، مش متاح تختاره`, 'error'); return; }
                choosePlayerSlot(p);
              }}
            >
              <div className="info">
                <span>{p.name}</span>
                {p.locked && <span className="incompleteTag" style={{ color: 'var(--red)', borderColor: 'var(--red)' }}>مقفول</span>}
              </div>
              <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                <span className="price">{p.price}M</span>
                <span style={{ fontSize: 11, color: 'var(--gold)', minWidth: 44, textAlign: 'center' }}>
                  {state === 'starter' ? 'أساسي' : state === 'bench' ? 'بديل' : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CaptainCard() {
  const { players, team, saveTeam } = useApp();
  const starters = team.starters.filter((id) => id && playerById(players, id));
  return (
    <div className="card">
      <h3 className="disp" style={{ margin: '0 0 10px' }}>الكابتن</h3>
      {starters.length === 0 ? (
        <p className="hint">اختار تشكيلتك الأساسية الأول</p>
      ) : (
        <select
          value={team.captainId || ''}
          onChange={async (e) => { await saveTeam({ ...team, captainId: e.target.value || null }); }}
        >
          <option value="">-- اختار الكابتن --</option>
          {starters.map((id) => {
            const p = playerById(players, id);
            return <option key={id} value={id}>{p.name}</option>;
          })}
        </select>
      )}
    </div>
  );
}

export function WildcardCard() {
  const { team, gwState, saveTeam } = useApp();
  const { showToast } = useUI();
  const { players } = useApp();

  const bbUsed = team.wildcards.benchBoost;
  const tcUsed = team.wildcards.tripleCaptain;
  const bbActiveNow = bbUsed === gwState.gw;
  const tcActiveNow = tcUsed === gwState.gw;

  const toggle = async (key, activeNow, usedAt) => {
    if (!activeNow) {
      const complete = team.starters.every((id) => isValidPlayerId(players, id)) && team.bench.every((id) => isValidPlayerId(players, id));
      if (!complete) { showToast('كمّل الـ 7 لاعبين الأول قبل ما تستخدم الويلد كارد', 'error'); return; }
    }
    if (usedAt && usedAt !== gwState.gw && !activeNow) return; // already used in a different gw
    await saveTeam({ ...team, wildcards: { ...team.wildcards, [key]: activeNow ? null : gwState.gw } });
  };

  return (
    <div className="card">
      <h3 className="disp" style={{ margin: '0 0 10px' }}>الويلد كاردز (تستخدم مرة واحدة بس في كل الموسم)</h3>
      <div className={`wc-row ${bbActiveNow ? 'active' : ''}`}>
        <div>
          <b>Bench Boost</b>
          <div className="hint">
            {bbUsed ? (bbActiveNow ? 'مفعّل في الجيم ويك ده' : 'اتستخدم في GW ' + bbUsed) : 'بوينتس الأساسي والبدلاء كلهم مع بعض'}
          </div>
        </div>
        <button
          className={`btn small ${bbActiveNow ? 'danger' : ''}`}
          disabled={bbUsed && !bbActiveNow}
          onClick={() => toggle('benchBoost', bbActiveNow, bbUsed)}
        >
          {bbActiveNow ? 'إلغاء' : 'فعّل'}
        </button>
      </div>
      <div className={`wc-row ${tcActiveNow ? 'active' : ''}`}>
        <div>
          <b>Triple Captain</b>
          <div className="hint">
            {tcUsed ? (tcActiveNow ? 'مفعّل في الجيم ويك ده' : 'اتستخدم في GW ' + tcUsed) : 'بوينتس الكابتن ×3 بدل ×2'}
          </div>
        </div>
        <button
          className={`btn small ${tcActiveNow ? 'danger' : ''}`}
          disabled={tcUsed && !tcActiveNow}
          onClick={() => toggle('tripleCaptain', tcActiveNow, tcUsed)}
        >
          {tcActiveNow ? 'إلغاء' : 'فعّل'}
        </button>
      </div>
    </div>
  );
}
