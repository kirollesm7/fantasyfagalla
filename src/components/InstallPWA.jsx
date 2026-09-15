import { useState } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useUI } from '../context/UIContext';
import { Icon } from './Brand';

const DISMISS_KEY = 'ffl:install-banner-dismissed';

// The button is ALWAYS shown (until the app is actually installed) rather
// than only appearing once the browser fires beforeinstallprompt — Chrome's
// timing for that event is inconsistent, so gating visibility on it made the
// button effectively invisible in practice. If the native prompt isn't ready
// yet when tapped, we fall back to clear manual instructions instead.
export function InstallAppButton({ variant = 'button' }) {
  const { installed, isIOS, canPromptNatively, promptInstall } = useInstallPrompt();
  const { showToast } = useUI();

  if (installed) return null;

  const install = async () => {
    if (canPromptNatively) {
      const outcome = await promptInstall();
      if (outcome === 'accepted') showToast('اتثبّت! هتلاقيه على الشاشة الرئيسية', 'success');
      return;
    }
    if (isIOS) {
      showToast('دوس زرار المشاركة ⬆️ في Safari تحت، واختار "Add to Home Screen"');
      return;
    }
    showToast('افتح قائمة المتصفح (⋮ فوق يمين) ودوس "تثبيت التطبيق" أو "Install app"');
  };

  if (variant === 'menu-item') {
    return (
      <button onClick={install}>
        <Icon name="download" style={{ width: 17, height: 17 }} />
        <span>تثبيت التطبيق</span>
      </button>
    );
  }

  return (
    <button className="btn small" onClick={install} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Icon name="download" style={{ width: 15, height: 15 }} />
      <span>تثبيت التطبيق</span>
    </button>
  );
}

// Dismissible banner shown once (per browser) on the team page.
export function InstallBanner() {
  const { installed } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });

  if (installed || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  };

  return (
    <div className="card" style={{ borderColor: 'var(--gold)' }}>
      <h3 className="disp" style={{ margin: '0 0 6px' }}>ثبّت اللعبة على موبايلك</h3>
      <p className="hint">هتفتح بضغطة واحدة من الشاشة الرئيسية بعدين، زي أي أبليكيشن عادي.</p>
      <div className="row" style={{ gap: 8, marginTop: 10 }}>
        <InstallAppButton />
        <button className="btn ghost small" onClick={dismiss}>لأ شكرًا</button>
      </div>
    </div>
  );
}
