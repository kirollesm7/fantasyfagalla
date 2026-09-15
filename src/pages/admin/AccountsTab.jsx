import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useUI } from '../../context/UIContext';
import { sbResetUserPassword, sbResetAllPasswords } from '../../lib/db';
import { hashPassword } from '../../lib/scoring';

export default function AccountsTab() {
  const { users } = useApp();
  const { showToast, openModal, openConfirm } = useUI();
  const [search, setSearch] = useState('');

  const resetOne = async (u) => {
    const pass = await openModal({ title: `باسورد جديد لـ ${u}`, placeholder: 'اكتب الباسورد الجديد', type: 'password' });
    if (pass === null || pass.trim() === '') return;
    if (pass.length < 4) { showToast('اكتب باسورد 4 حروف/أرقام على الأقل', 'error'); return; }
    try {
      const hash = await hashPassword(pass);
      await sbResetUserPassword(u, hash);
      showToast(`باسورد ${u} اتغيّر`, 'success');
    } catch (e) {
      console.error('reset user password failed', e);
      showToast('مقدرتش أغيّر الباسورد: ' + String(e.message || e).slice(0, 80), 'error');
    }
  };

  const resetAll = async () => {
    const pass = await openModal({ title: 'الباسورد الجديد لكل الحسابات', placeholder: 'اكتب باسورد جديد', type: 'password' });
    if (pass === null || pass.trim() === '') return;
    if (pass.length < 4) { showToast('اكتب باسورد 4 حروف/أرقام على الأقل', 'error'); return; }
    if (!(await openConfirm(`هيتغيّر باسورد كل اللاعبين لـ "${pass}". لازم تبعتلهم الباسورد الجديد بنفسك. متأكد؟`))) return;
    try {
      const hash = await hashPassword(pass);
      await sbResetAllPasswords(hash);
      showToast('باسورد كل الحسابات اتغيّر', 'success');
    } catch (e) {
      console.error('reset all passwords failed', e);
      showToast('مقدرتش أغيّر الباسوردات: ' + String(e.message || e).slice(0, 80), 'error');
    }
  };

  const filtered = users.filter((u) => u.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="card">
      <h3 className="disp" style={{ margin: '0 0 4px' }}>إدارة الباسوردات</h3>
      <p className="hint">اختار مين تحطله باسورد جديد. الاسم والتشكيلة والنقط بتاعته مش هيتأثروا.</p>
      <input placeholder="دوّر باسم يوزر..." style={{ marginTop: 10 }} value={search} onChange={(e) => setSearch(e.target.value)} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        {users.length === 0 && <p className="hint">لسه محدش عمل حساب</p>}
        {filtered.map((u) => (
          <div className="prow" key={u}>
            <div className="info"><span>{u}</span></div>
            <button className="btn small ghost" onClick={() => resetOne(u)}>باسورد جديد</button>
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid var(--line)', marginTop: 14, paddingTop: 12 }}>
        <button className="btn ghost small" onClick={resetAll}>حط نفس الباسورد لكل الحسابات دفعة واحدة</button>
      </div>
    </div>
  );
}
