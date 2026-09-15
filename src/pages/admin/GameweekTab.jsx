import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useUI } from '../../context/UIContext';
import {
  sbGetState, sbSetState, sbGetStats, sbGetUsers, sbGetPlayers, sbGetAccount,
  sbSetStatsForGW, sbSyncLeaderboard, sbUpdateAccountField,
} from '../../lib/db';
import { emptyPlayerStat, migrateTeam, defaultTeam, calcTeamPointsForGW, rollTeamToNextGameweek, gwPlayerPoints, calcPlayerPoints, totalPlayerPoints, SCORING } from '../../lib/scoring';

export default function GameweekTab() {
  const { players, gwState, setGwState, stats, setStats, setUsers, setPlayers, refresh } = useApp();
  const { showToast, openConfirm } = useUI();
  const [busy, setBusy] = useState(null);
  const [search, setSearch] = useState('');
  const [statModal, setStatModal] = useState(null); // player being edited

  const toggleLock = async () => {
    const target = !gwState.locked;
    setBusy('lock');
    try {
      await sbSetState({ gw: gwState.gw, locked: target });
      const fresh = await sbGetState();
      setGwState(fresh);
      showToast(fresh.locked === target ? (target ? 'اتقفل' : 'اتفتح') : 'التغيير ماتسجلش صح، جرب تاني', fresh.locked === target ? 'success' : 'error');
    } catch (e) {
      console.error('toggle lock failed', e);
      showToast('مقدرتش أغيّر حالة الجيم ويك: ' + String(e.message || e).slice(0, 80), 'error');
    } finally {
      setBusy(null);
    }
  };

  const zeroGW = async () => {
    if (!(await openConfirm(`هترجّع نقط كل اللاعبين في GW ${gwState.gw} لصفر. متأكد؟`))) return;
    setBusy('zero');
    try {
      const freshPlayers = await sbGetPlayers();
      setPlayers(freshPlayers);
      const zeroed = {};
      freshPlayers.forEach((p) => { zeroed[p.id] = emptyPlayerStat(); });
      await sbSetStatsForGW('gw' + gwState.gw, zeroed);
      setStats(await sbGetStats());
      showToast('اتصفّرت', 'success');
    } catch (e) {
      console.error('zero gw failed', e);
      showToast('مقدرتش أصفّرها: ' + String(e.message || e).slice(0, 80), 'error');
    } finally {
      setBusy(null);
    }
  };

  const finalizeGW = async () => {
    if (!(await openConfirm('هيتم حساب بوينتس الجيم ويك ده لكل اللاعبين وبعدين هيبدأ جيم ويك جديد. متأكد؟'))) return;
    setBusy('finalize');
    let freshState, freshUsers, freshPlayers, freshStats;
    try {
      [freshState, freshUsers, freshPlayers, freshStats] = await Promise.all([sbGetState(), sbGetUsers(), sbGetPlayers(), sbGetStats()]);
    } catch (e) {
      console.error('finalize refresh failed', e);
      showToast('مقدرتش أجيب آخر البيانات، جرب تاني', 'error');
      setBusy(null); return;
    }
    if (!freshUsers.length) { showToast('مفيش لاعبين متسجلين لسه', 'error'); setBusy(null); return; }

    const gwNum = freshState.gw;
    const nextGw = gwNum + 1;
    const newTotals = {};
    try {
      for (const u of freshUsers) {
        const teamRow = await sbGetAccount(u, 'team');
        const team = migrateTeam((teamRow && teamRow.team) || defaultTeam());
        const pts = calcTeamPointsForGW(freshPlayers, freshStats, team, gwNum);
        const pointsRow = await sbGetAccount(u, 'points');
        const pointsLog = (pointsRow && pointsRow.points) || {};
        pointsLog['gw' + gwNum] = pts;
        await sbUpdateAccountField(u, 'points', pointsLog);
        await sbUpdateAccountField(u, 'team', rollTeamToNextGameweek(team, gwNum));
        newTotals[u] = Object.values(pointsLog).reduce((a, b) => a + (Number(b) || 0), 0);
      }
      const zeroed = {};
      freshPlayers.forEach((p) => { zeroed[p.id] = emptyPlayerStat(); });
      await sbSetStatsForGW('gw' + nextGw, zeroed);
      await sbSetState({ gw: nextGw, locked: false });
    } catch (e) {
      console.error('finalize failed', e);
      showToast('في مشكلة وإحنا بنحسب النقط — مفيش حاجة اتغيرت', 'error');
      setBusy(null); return;
    }
    try {
      await sbSyncLeaderboard(newTotals);
    } catch (e) {
      console.error('leaderboard sync failed', e);
      showToast('النقط اتسجلت، بس جدول الترتيب المحفوظ مقدرش يتحدث — شغّل ملف SQL الجديد', 'error');
    }
    await refresh();
    setUsers(freshUsers);
    showToast('البوينتس اتسجلت وكل اللاعبين اتصفّروا — بدأ GW ' + nextGw, 'success');
    setBusy(null);
  };

  const filteredPlayers = players.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()));
  const gwKeys = Object.keys(stats).filter((k) => /^gw\d+$/.test(k)).sort((a, b) => parseInt(a.slice(2)) - parseInt(b.slice(2)));

  return (
    <div>
      <div className="card">
        <h3 className="disp" style={{ margin: '0 0 10px' }}>التحكم في الجيم ويك</h3>
        <p>الجيم ويك الحالي: <b className="rank1">GW {gwState.gw}</b> — الحالة: <span className={`statusDot ${gwState.locked ? 'is-locked' : 'is-open'}`}>{gwState.locked ? 'قافل' : 'مفتوح'}</span></p>

        <div style={{ marginTop: 14 }}>
          <button className="btn ghost" style={{ width: '100%' }} disabled={busy === 'lock'} onClick={toggleLock}>
            {busy === 'lock' ? '... بيتنفذ' : gwState.locked ? 'افتح التعديل تاني' : 'اقفل التعديل (الماتش بدأ)'}
          </button>
          <p className="hint">ده بيمنع الناس تعدّل تشكيلتها بس. <b>مش</b> بيبدأ جيم ويك جديد ومش بيصفّر حاجة.</p>
        </div>

        <div style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
          <button className="btn" style={{ width: '100%' }} disabled={busy === 'finalize'} onClick={finalizeGW}>
            {busy === 'finalize' ? '... بيحسب وبيقفل' : `اقفل GW ${gwState.gw} خالص وابدأ GW ${gwState.gw + 1}`}
          </button>
          <p className="hint">ده بيسجّل نقط كل الناس في GW {gwState.gw}، وبعدين <b>يصفّر كل اللاعبين</b> ويبدأ GW {gwState.gw + 1}. ده الزرار اللي يبدأ جيم ويك جديد.</p>
        </div>

        <div style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
          <button className="btn ghost" style={{ width: '100%' }} disabled={busy === 'zero'} onClick={zeroGW}>
            {busy === 'zero' ? '... بيصفّر' : `صفّر نقط كل اللاعبين في GW ${gwState.gw}`}
          </button>
          <p className="hint">بيرجّع نقط كل اللاعبين في الجيم ويك الحالي لصفر من غير ما يبدأ جيم ويك جديد.</p>
        </div>
      </div>

      <div className="card">
        <h3 className="disp" style={{ margin: '0 0 4px' }}>إحصائيات GW {gwState.gw}</h3>
        <p className="hint">دوس على أي لاعب عشان تسجّل أفعاله في الماتش (جول، أسيست، كروت...) وبتتحسب النقط أوتوماتيك.</p>
        <input placeholder="دوّر باسم لاعب..." style={{ marginTop: 10 }} value={search} onChange={(e) => setSearch(e.target.value)} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
          {filteredPlayers.map((p) => (
            <div className="prow" key={p.id}>
              <div className="info"><span>{p.name}</span></div>
              <div className="row" style={{ gap: 10, alignItems: 'center' }}>
                <span className="hint">نقط GW {gwState.gw}: <b className="num" style={{ color: 'var(--gold)' }}>{gwPlayerPoints(stats, gwState.gw, p.id)}</b></span>
                <button className="btn small ghost" onClick={() => setStatModal(p)}>تفاصيل</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {players.length > 0 && gwKeys.length > 0 && (
        <div className="card">
          <h3 className="disp" style={{ margin: '0 0 4px' }}>سجل نقط اللاعبين</h3>
          <p className="hint">نقط كل لاعب في كل جيم ويك. الأرقام دي محفوظة ومش بتتمسح لما تصفّر الجيم ويك الجديد.</p>
          <div style={{ overflowX: 'auto', marginTop: 10 }}>
            <table className="stTable" style={{ minWidth: 180 + gwKeys.length * 60 }}>
              <thead>
                <tr>
                  <th>اللاعب</th>
                  {gwKeys.map((k) => <th key={k} style={{ textAlign: 'center' }}>GW {k.slice(2)}</th>)}
                  <th style={{ textAlign: 'center' }}>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id}>
                    <td><span className="swatch" style={{ background: p.color || '#3C7A4F' }} />{p.name}</td>
                    {gwKeys.map((k) => <td key={k} style={{ textAlign: 'center' }}>{calcPlayerPoints(p.id, stats[k])}</td>)}
                    <td className="ptscell" style={{ textAlign: 'center' }}>{totalPlayerPoints(stats, p.id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {statModal && (
        <PlayerStatsModal
          player={statModal}
          gwKey={'gw' + gwState.gw}
          existing={(stats['gw' + gwState.gw] && stats['gw' + gwState.gw][statModal.id]) || null}
          onClose={() => setStatModal(null)}
          onSaved={async (vals) => {
            const fullGw = stats['gw' + gwState.gw] ? { ...stats['gw' + gwState.gw] } : {};
            fullGw[statModal.id] = vals;
            await sbSetStatsForGW('gw' + gwState.gw, fullGw);
            setStats(await sbGetStats());
          }}
        />
      )}
    </div>
  );
}

function PlayerStatsModal({ player, gwKey, existing, onClose, onSaved }) {
  const { showToast, openConfirm } = useUI();
  const isOldFormat = existing && typeof existing.points === 'number' && !Object.keys(SCORING).some((k) => k in existing);
  const [vals, setVals] = useState(() => {
    const base = emptyPlayerStat();
    if (existing?.played !== undefined) base.played = Boolean(existing.played);
    if (existing && !isOldFormat) Object.keys(SCORING).forEach((k) => { if (k in existing) base[k] = existing[k]; });
    return base;
  });
  const [saving, setSaving] = useState(false);

  const total = Object.keys(SCORING).reduce((sum, k) => {
    const def = SCORING[k];
    const v = def.kind === 'bool' ? (vals[k] ? 1 : 0) : Number(vals[k]) || 0;
    return sum + v * def.pts;
  }, 0);

  const save = async () => {
    const allZero = Object.keys(SCORING).every((k) => (SCORING[k].kind === 'bool' ? !vals[k] : !vals[k]));
    if (isOldFormat && allZero && existing.points !== 0) {
      if (!(await openConfirm(`هتحوّل نقط ${player.name} القديمة (${existing.points}) لصفر لأنك مدخلتش أي تفاصيل. متأكد؟`))) return;
    }
    setSaving(true);
    try {
      await onSaved(vals);
      showToast(`اتحفظت إحصائيات ${player.name}`, 'success');
      onClose();
    } catch (e) {
      console.error('save player stat failed', e);
      showToast('ماتحفظتش: ' + String(e.message || e).slice(0, 80), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: 380 }}>
        <h3 className="disp" style={{ margin: '0 0 2px' }}>{player.name}</h3>
        <p className="hint" style={{ margin: '0 0 12px' }}>GW {gwKey.replace('gw', '')}</p>
        {isOldFormat && (
          <p className="hint" style={{ color: 'var(--gold)', margin: '0 0 12px' }}>
            النقط القديمة لليعب ده كانت {existing.points} (بالنظام القديم). لو حفظت من غير ما تدخل تفاصيل، هتتحول لصفر.
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', paddingBottom: 9, borderBottom: '1px solid var(--line)' }}>
            <label style={{ margin: 0 }}><b>شارك في المباراة</b> <span className="hint">(مهم للأوتوسب حتى لو سجّل 0)</span></label>
            <input type="checkbox" checked={!!vals.played} onChange={(e) => setVals((v) => ({ ...v, played: e.target.checked }))} />
          </div>
          {Object.keys(SCORING).map((k) => {
            const def = SCORING[k];
            const sign = def.pts > 0 ? '+' : '';
            return (
              <div className="row" key={k} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ margin: 0 }}>{def.label} <span className="hint">({sign}{def.pts}{def.kind === 'count' ? ' لكل مرة' : ''})</span></label>
                {def.kind === 'bool' ? (
                  <input type="checkbox" checked={!!vals[k]} onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.checked }))} />
                ) : (
                  <input type="number" min="0" style={{ width: 60, padding: 5, textAlign: 'center' }} value={vals[k]} onChange={(e) => setVals((v) => ({ ...v, [k]: parseInt(e.target.value) || 0 }))} />
                )}
              </div>
            );
          })}
        </div>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
          <span className="hint">الإجمالي</span>
          <span className="num" style={{ fontSize: 20, color: 'var(--gold)' }}>{total}</span>
        </div>
        <div className="row" style={{ marginTop: 14, gap: 8 }}>
          <button className="btn ghost small" style={{ flex: 1 }} onClick={onClose} disabled={saving}>إلغاء</button>
          <button className="btn small" style={{ flex: 1 }} onClick={save} disabled={saving}>احفظ</button>
        </div>
      </div>
    </div>
  );
}
