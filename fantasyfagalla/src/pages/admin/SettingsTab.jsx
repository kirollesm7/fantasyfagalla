import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useUI } from '../../context/UIContext';
import { sbSetSettings, sbRestartGame } from '../../lib/db';

export default function SettingsTab() {
  const { settings, setSettings, logout } = useApp();
  const { showToast, openConfirm } = useUI();
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '');
  const [coverPhotoUrl, setCoverPhotoUrl] = useState(settings.coverPhotoUrl || '');
  const [fantasyLogoUrl, setFantasyLogoUrl] = useState(settings.fantasyLogoUrl || '');
  const [newsLogoUrl, setNewsLogoUrl] = useState(settings.newsLogoUrl || '');
  const [restarting, setRestarting] = useState(false);

  const applyFavicon = (s) => {
    const fav = document.getElementById('favicon');
    if (fav && s.logoUrl) fav.href = s.logoUrl;
  };

  const saveBranding = async () => {
    try {
      const next = { logoUrl: logoUrl.trim(), coverPhotoUrl: coverPhotoUrl.trim(), fantasyLogoUrl: fantasyLogoUrl.trim(), newsLogoUrl: newsLogoUrl.trim() };
      await sbSetSettings(next);
      setSettings(next);
      applyFavicon(next);
      showToast('اتحفظت الهوية', 'success');
    } catch (e) {
      console.error('save branding failed', e);
      showToast('ماتحفظتش: ' + String(e.message || e).slice(0, 80), 'error');
    }
  };

  const resetBranding = async () => {
    if (!(await openConfirm('ترجع لعلامة البوابة الافتراضية وتشيل صورة الغلاف؟'))) return;
    try {
      await sbSetSettings({ logoUrl: '', coverPhotoUrl: '', fantasyLogoUrl: '', newsLogoUrl: '' });
      setSettings({ logoUrl: '', coverPhotoUrl: '', fantasyLogoUrl: '', newsLogoUrl: '' });
      setLogoUrl(''); setCoverPhotoUrl(''); setFantasyLogoUrl(''); setNewsLogoUrl('');
      showToast('رجع للافتراضي', 'success');
    } catch (e) {
      console.error('reset branding failed', e);
      showToast('مقدرتش أرجّعه: ' + String(e.message || e).slice(0, 80), 'error');
    }
  };

  const restart = async () => {
    if (!(await openConfirm('هيتم مسح كل اللاعبين والفرق والنقط ومعرفش تسترجعها تاني. متأكد؟'))) return;
    if (!(await openConfirm('تأكيد أخير: هتبدأ اللعبة من الصفر خالص (GW 1) لكل الناس. نكمل؟'))) return;
    setRestarting(true);
    try {
      await sbRestartGame();
      showToast('تم إعادة ضبط اللعبة بالكامل من الصفر', 'success');
      logout();
    } catch (e) {
      console.error('restart failed', e);
      showToast('في مشكلة في إعادة الضبط', 'error');
    } finally {
      setRestarting(false);
    }
  };

  return (
    <div>
      <div className="card">
        <h3 className="disp" style={{ margin: '0 0 4px' }}>الهوية</h3>
        <p className="hint">حط رابط لوجو وصورة غلاف عشان تظهر بدل الافتراضي في كل حتة في اللعبة (شاشة الدخول، الشريط العلوي، بانر فريقي، وأيقونة المتصفح).</p>
        <div style={{ marginTop: 12 }}>
          <label>رابط اللوجو</label>
          <input placeholder="https://example.com/logo.png" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
          <p className="hint" style={{ marginTop: 4 }}>أفضل شكل: صورة مربعة (زي 200×200)</p>
        </div>
        <div style={{ marginTop: 12 }}>
          <label>لوجو Fagalla Fantasy</label>
          <input placeholder="https://example.com/fantasy-logo.png" value={fantasyLogoUrl} onChange={(e) => setFantasyLogoUrl(e.target.value)} />
        </div>
        <div style={{ marginTop: 12 }}>
          <label>لوجو News</label>
          <input placeholder="https://example.com/news-logo.png" value={newsLogoUrl} onChange={(e) => setNewsLogoUrl(e.target.value)} />
        </div>
        <div style={{ marginTop: 12 }}>
          <label>رابط صورة الغلاف</label>
          <input placeholder="https://example.com/cover.jpg" value={coverPhotoUrl} onChange={(e) => setCoverPhotoUrl(e.target.value)} />
          <p className="hint" style={{ marginTop: 4 }}>أفضل شكل: صورة عريضة (زي 1200×420)</p>
        </div>
        <div style={{ height: 10 }} />
        <button className="btn" onClick={saveBranding}>احفظ</button>
        {(settings.logoUrl || settings.coverPhotoUrl) && (
          <button className="btn ghost" style={{ marginInlineStart: 8 }} onClick={resetBranding}>رجّع الافتراضي</button>
        )}
      </div>

      <div className="card" style={{ borderColor: 'var(--red)' }}>
        <h3 className="disp" style={{ margin: '0 0 8px', color: '#ffb3a3' }}>منطقة خطر</h3>
        <p className="hint">الزرار ده هيمسح كل حاجة: اللاعبين، اليوزرز، الفرق، النقط، والإحصائيات — ومفيش رجوع بعد كده. استخدمه بس لو عايز تبدأ موسم جديد من الصفر.</p>
        <button className="btn danger" onClick={restart} disabled={restarting}>{restarting ? '... بيتم المسح' : 'Restart اللعبة بالكامل'}</button>
      </div>
    </div>
  );
}
