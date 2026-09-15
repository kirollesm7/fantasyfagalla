import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { useNotifications } from '../hooks/useNotifications';

const DISMISS_KEY = 'ffl:notif-banner-dismissed';

export default function NotificationOptIn() {
  const { user } = useApp();
  const { showToast } = useUI();
  const { permission, busy, enable } = useNotifications(user);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });

  if (permission === 'granted' || permission === 'unsupported' || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  };

  const handleEnable = async () => {
    const result = await enable();
    if (result.ok) showToast('اتفعّلت الإشعارات — هتوصلك أي إعلان جديد فورًا', 'success');
    else if (permission === 'denied') showToast('لازم تسمح بالإشعارات من إعدادات المتصفح', 'error');
  };

  return (
    <div className="card" style={{ borderColor: 'var(--gold)' }}>
      <h3 className="disp" style={{ margin: '0 0 6px' }}>فعّل إشعارات الموبايل</h3>
      <p className="hint">تعرف فورًا أول ما الهوست يضيف إعلان جديد، حتى لو اللعبة مقفولة.</p>
      <div className="row" style={{ gap: 8, marginTop: 10 }}>
        <button className="btn small" onClick={handleEnable} disabled={busy}>{busy ? '... بيفعّل' : 'فعّل الإشعارات'}</button>
        <button className="btn ghost small" onClick={dismiss}>لأ شكرًا</button>
      </div>
    </div>
  );
}
