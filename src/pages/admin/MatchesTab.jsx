import { useEffect, useState, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useUI } from '../../context/UIContext';
import { sbGetMatches, sbAddMatch, sbDeleteMatch } from '../../lib/db';

function formatMatchTime(iso) {
  try {
    return new Date(iso).toLocaleString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function MatchesTab() {
  const { gwState } = useApp();
  const { showToast, openConfirm } = useUI();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ home: '', away: '', time: '', gw: '', note: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try { setMatches(await sbGetMatches()); }
    catch (e) { console.error('load matches failed', e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addMatch = async () => {
    if (!form.home.trim() || !form.away.trim()) { showToast('اكتب اسم الفريقين', 'error'); return; }
    if (!form.time) { showToast('اختار موعد الماتش', 'error'); return; }
    try {
      await sbAddMatch({
        home_team: form.home.trim(), away_team: form.away.trim(),
        kickoff_time: new Date(form.time).toISOString(),
        gw: parseInt(form.gw) || null, note: form.note.trim(),
      });
      setForm({ home: '', away: '', time: '', gw: '', note: '' });
      showToast('اتضاف الماتش', 'success');
      await load();
    } catch (e) {
      console.error('add match failed', e);
      showToast('مقدرتش أضيف الماتش: ' + String(e.message || e).slice(0, 80), 'error');
    }
  };

  const removeMatch = async (m) => {
    if (!(await openConfirm('حذف الماتش ده؟'))) return;
    try { await sbDeleteMatch(m.id); await load(); }
    catch { showToast('مقدرتش أحذفه', 'error'); }
  };

  return (
    <div className="card">
      <h3 className="disp" style={{ margin: '0 0 4px' }}>مواعيد الماتشات</h3>
      <p className="hint">الماتشات دي بتظهر للاعبين في صفحة "فريقي".</p>
      <div className="row" style={{ marginTop: 10 }}>
        <div style={{ flex: 1, minWidth: 120 }}><label>الفريق المستضيف</label><input placeholder="مثال: الأهلي" value={form.home} onChange={(e) => setForm((f) => ({ ...f, home: e.target.value }))} /></div>
        <div style={{ flex: 1, minWidth: 120 }}><label>الفريق الضيف</label><input placeholder="مثال: الزمالك" value={form.away} onChange={(e) => setForm((f) => ({ ...f, away: e.target.value }))} /></div>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <div style={{ flex: 2, minWidth: 180 }}><label>الموعد</label><input type="datetime-local" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} /></div>
        <div style={{ flex: 1, minWidth: 80 }}><label>GW (اختياري)</label><input type="number" placeholder={gwState.gw} value={form.gw} onChange={(e) => setForm((f) => ({ ...f, gw: e.target.value }))} /></div>
      </div>
      <div style={{ marginTop: 8 }}><label>ملاحظة (اختياري)</label><input placeholder="مثال: الدوري المصري" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} /></div>
      <div style={{ height: 10 }} />
      <button className="btn" onClick={addMatch}>ضيف ماتش</button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
        {loading && <p className="hint">بيتحمل...</p>}
        {!loading && matches.length === 0 && <p className="hint">لسه مفيش ماتشات متسجلة</p>}
        {!loading && matches.map((m) => (
          <div className="prow" key={m.id} style={{ flexWrap: 'wrap' }}>
            <div className="info"><span>{m.home_team} × {m.away_team}</span></div>
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <span className="hint">{formatMatchTime(m.kickoff_time)}{m.gw ? ` · GW ${m.gw}` : ''}</span>
              <button className="btn small danger" onClick={() => removeMatch(m)}>حذف</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
