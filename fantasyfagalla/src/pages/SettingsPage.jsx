import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { InstallAppButton } from '../components/InstallPWA';
import { useNotifications } from '../hooks/useNotifications';
import { Icon } from '../components/Brand';

export default function SettingsPage({ onOpenAdmin }) {
  const { user, isHost, logout, tryHostLogin, setIsHost, refresh } = useApp();
  const { showToast, openModal } = useUI();
  const { permission, busy, enable } = useNotifications(user);

  const handleRefresh = async () => {
    showToast('بيتحدث...');
    await refresh();
    showToast('اتحدث', 'success');
  };

  const handleHost = async () => {
    if (isHost) { setIsHost(false); showToast('خرجت من وضع الـ Host'); return; }
    const pass = await openModal({ title: 'باسورد الـ Host', placeholder: 'اكتب الباسورد', type: 'password' });
    if (pass === null || pass.trim() === '') return;
    if (!tryHostLogin(pass)) {
      showToast('باسورد غلط', 'error');
      return;
    }
    showToast('تم فتح لوحة الهوست', 'success');
    onOpenAdmin?.();
  };

  const handleNotifications = async () => {
    const result = await enable();
    if (result.ok) showToast('اتفعّلت الإشعارات', 'success');
    else if (permission === 'denied') showToast('لازم تسمح بالإشعارات من إعدادات المتصفح', 'error');
  };

  return (
    <div>
      <div className="card">
        <h3 className="disp" style={{ margin: '0 0 4px' }}>الإعدادات</h3>
        <p className="hint">مسجّل دخول بـ <b>{user}</b></p>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <b>تحديث البيانات</b>
            <p className="hint" style={{ margin: '2px 0 0' }}>يجيب آخر تحديث من الداتابيز</p>
          </div>
          <button className="btn ghost small" onClick={handleRefresh}><Icon name="refresh" style={{ width: 16, height: 16 }} /></button>
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <b>إشعارات الموبايل</b>
            <p className="hint" style={{ margin: '2px 0 0' }}>
              {permission === 'granted' ? 'مفعّلة ✅' : 'اعرف فورًا أول ما يتضاف إعلان جديد'}
            </p>
          </div>
          {permission !== 'granted' && (
            <button className="btn small" onClick={handleNotifications} disabled={busy}>{busy ? '...' : 'فعّل'}</button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <b>تثبيت التطبيق</b>
            <p className="hint" style={{ margin: '2px 0 0' }}>يفتح من الشاشة الرئيسية زي أي أبليكيشن</p>
          </div>
          <InstallAppButton />
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <b>وضع الـ Host</b>
            <p className="hint" style={{ margin: '2px 0 0' }}>{isHost ? 'مفعّل دلوقتي' : 'لإدارة الجيم ويك واللاعبين'}</p>
          </div>
          <button className="btn ghost small" onClick={handleHost}>{isHost ? 'خروج' : 'دخول كـ Host'}</button>
        </div>
      </div>

      <div className="card">
        <button className="btn danger" style={{ width: '100%' }} onClick={logout}>تسجيل خروج</button>
      </div>
    </div>
  );
}
