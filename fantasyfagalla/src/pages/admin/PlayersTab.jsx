import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useUI } from '../../context/UIContext';
import { sbSetPlayers, sbSetPlayerLocked, uid } from '../../lib/db';

export default function PlayersTab() {
  const { players, setPlayers } = useApp();
  const { showToast, openConfirm } = useUI();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [color, setColor] = useState('#3C7A4F');
  const [search, setSearch] = useState('');

  const addPlayer = async () => {
    const n = name.trim();
    const pr = parseFloat(price);
    if (!n || Number.isNaN(pr)) { showToast('اكتب اسم وسعر صحيح', 'error'); return; }
    const next = [...players, { id: uid(), name: n, price: pr, color, locked: false }];
    setPlayers(next);
    await sbSetPlayers(next);
    setName(''); setPrice(''); setColor('#3C7A4F');
  };

  const updatePlayer = async (id, patch) => {
    const next = players.map((p) => (p.id === id ? { ...p, ...patch } : p));
    setPlayers(next);
    await sbSetPlayers(next);
  };

  const toggleLock = async (p) => {
    const next = !p.locked;
    try {
      await sbSetPlayerLocked(p.id, next);
      setPlayers(players.map((x) => (x.id === p.id ? { ...x, locked: next } : x)));
      showToast(next ? `${p.name} اتقفل` : `${p.name} اتفتح`, 'success');
    } catch (e) {
      console.error('toggle player lock failed', e);
      showToast('مقدرتش أغيّر القفل: ' + String(e.message || e).slice(0, 80), 'error');
    }
  };

  const deletePlayer = async (p) => {
    if (!(await openConfirm(`حذف ${p.name}؟`))) return;
    const next = players.filter((x) => x.id !== p.id);
    setPlayers(next);
    await sbSetPlayers(next);
  };

  const filtered = players.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div>
      <div className="card">
        <h3 className="disp" style={{ margin: '0 0 10px' }}>إضافة لاعب</h3>
        <div className="row">
          <div style={{ flex: 2, minWidth: 140 }}><label>الاسم</label><input placeholder="اسم اللاعب" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div style={{ flex: 1, minWidth: 90 }}><label>السعر (مليون)</label><input type="number" min="0" step="0.5" placeholder="10" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
          <div style={{ minWidth: 60 }}><label>لون التيشيرت</label><input type="color" className="colorpick" value={color} onChange={(e) => setColor(e.target.value)} /></div>
        </div>
        <div style={{ height: 10 }} />
        <button className="btn" onClick={addPlayer}>ضيف اللاعب</button>
      </div>

      <div className="card">
        <h3 className="disp" style={{ margin: '0 0 10px' }}>كل اللاعبين</h3>
        <input placeholder="دوّر باسم لاعب..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="plist" style={{ marginTop: 10 }}>
          {filtered.length === 0 && <p className="hint">لسه معملتش لاعبين</p>}
          {filtered.map((p) => (
            <div className="prow" key={p.id}>
              <div className="info">
                <span>{p.name}</span>
                {p.locked && <span className="incompleteTag" style={{ color: 'var(--red)', borderColor: 'var(--red)' }}>مقفول</span>}
              </div>
              <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                <input type="color" className="colorpick" value={p.color || '#3C7A4F'} onChange={(e) => updatePlayer(p.id, { color: e.target.value })} title="لون التيشيرت" />
                <input type="number" step="0.5" style={{ width: 70, padding: 5 }} value={p.price} onChange={(e) => updatePlayer(p.id, { price: parseFloat(e.target.value) || 0 })} />
                <button className={`btn small ${p.locked ? 'danger' : 'ghost'}`} title="امنع/اسمح بشراء اللاعب ده" onClick={() => toggleLock(p)}>{p.locked ? 'فك القفل' : 'قفل'}</button>
                <button className="btn small danger" onClick={() => deletePlayer(p)}>حذف</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
