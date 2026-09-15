import { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { UIProvider } from './context/UIContext';
import Login from './pages/Login';
import TopBar from './components/TopBar';
import TeamPage from './pages/TeamPage';
import NewsPage from './pages/NewsPage';
import TimeTablePage from './pages/TimeTablePage';
import VolleyballFantasyPage from './pages/VolleyballFantasyPage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';

const FANTASY_DOCK_CSS = `
.fantasy-only-shell {
  min-height: 100vh;
  width: 100%;
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
  background: #f6f6f8;
}

.fantasy-only-body {
  width: 100%;
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
}

.fantasy-mode-dock {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1200;
  height: calc(92px + env(safe-area-inset-bottom, 0px));
  padding-top: 8px;
  padding-right: max(10px, env(safe-area-inset-right, 0px));
  padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
  padding-left: max(10px, env(safe-area-inset-left, 0px));
  display: grid;
  grid-template-columns: repeat(var(--dock-count, 5), minmax(0, 1fr));
  align-items: center;
  gap: 2px;
  background: rgba(255,255,255,.98);
  border-top: 1px solid rgba(55,0,60,.08);
  box-shadow: 0 -8px 26px rgba(0,0,0,.08);
  backdrop-filter: blur(16px);
}

.fantasy-mode-dock button {
  min-width: 0;
  height: 72px;
  padding: 4px 2px 3px;
  border: 0;
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #77727a;
  background: transparent;
  font: inherit;
  font-size: 10px;
  font-weight: 850;
  cursor: pointer;
}

.fantasy-mode-dock button.active {
  color: #37003c;
}

.fantasy-mode-dock .dock-icon {
  width: 39px;
  height: 39px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: currentColor;
  transition: .18s ease;
}

.fantasy-mode-dock button.active .dock-icon {
  color: #37003c;
  background: #00ffcf;
  box-shadow: 0 7px 18px rgba(0,255,207,.28);
}

.fantasy-mode-dock svg {
  width: 24px;
  height: 24px;
  display: block;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@media (min-width: 760px) {
  .fantasy-mode-dock {
    left: 50%;
    right: auto;
    width: min(620px, calc(100% - 32px));
    transform: translateX(-50%);
    bottom: 12px;
    border: 1px solid rgba(55,0,60,.08);
    border-radius: 22px;
  }
}

@media (max-width: 430px) {
  .fantasy-mode-dock {
    height: calc(82px + env(safe-area-inset-bottom, 0px));
    padding-right: max(4px, env(safe-area-inset-right, 0px));
    padding-left: max(4px, env(safe-area-inset-left, 0px));
  }
  .fantasy-mode-dock button { height: 64px; gap: 2px; padding-inline: 0; border-radius: 10px; font-size: 8.5px; }
  .fantasy-mode-dock .dock-icon { width: 34px; height: 34px; border-radius: 10px; }
  .fantasy-mode-dock svg { width: 21px; height: 21px; }
}
`;

function DockIcon({ type }) {
  if (type === 'admin') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 19 6v5c0 4.8-2.8 8.1-7 10-4.2-1.9-7-5.2-7-10V6l7-3Z" />
        <path d="M9 12l2 2 4-5" />
      </svg>
    );
  }
  if (type === 'news') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    );
  }
  if (type === 'timetable') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4M17 3v4M3 9h18M7 13h2M11 13h2M15 13h2M7 17h2M11 17h2" />
      </svg>
    );
  }
  if (type === 'volleyball') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3c2.6 2.2 4.2 4.5 4.8 7M3.5 10.3c3.5-.4 6.2.1 8.2 1.8M7.5 19.7c.9-3.3 2.4-5.7 4.7-7.5M20.5 13.7c-3.3.4-6-.1-8.3-1.7M16.5 4.3c-.8 3.1-2.3 5.6-4.7 7.7" />
      </svg>
    );
  }
  if (type === 'settings') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19 12a7 7 0 0 0-.12-1.28l2-1.55-2-3.46-2.42.98A7 7 0 0 0 14.25 5l-.37-2.58h-4l-.37 2.58a7 7 0 0 0-2.21 1.69l-2.42-.98-2 3.46 2 1.55A7 7 0 0 0 4.76 12c0 .44.04.87.12 1.28l-2 1.55 2 3.46 2.42-.98A7 7 0 0 0 9.51 19l.37 2.58h4L14.25 19a7 7 0 0 0 2.21-1.69l2.42.98 2-3.46-2-1.55c.08-.41.12-.84.12-1.28Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 4.5 7.2v9.6L12 21l7.5-4.2V7.2L12 3Z" />
      <path d="m12 7 1.5 3 3.3.5-2.4 2.3.6 3.2-3-1.6-3 1.6.6-3.2-2.4-2.3 3.3-.5L12 7Z" />
    </svg>
  );
}

function FantasyModeDock({ appMode, setAppMode }) {
  const { isHost } = useApp();
  const items = [
    { id: 'settings', label: 'Settings', icon: 'settings' },
    { id: 'volleyball', label: 'Volleyball', icon: 'volleyball' },
    { id: 'fbfantasy', label: 'FB Fantasy', icon: 'fantasy' },
    { id: 'timetable', label: 'Time Table', icon: 'timetable' },
    { id: 'news', label: 'News', icon: 'news' },
  ];
  if (isHost) items.unshift({ id: 'admin', label: 'Host', icon: 'admin' });

  return (
    <nav className="fantasy-mode-dock" style={{ '--dock-count': items.length }} aria-label="Main app navigation">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={appMode === item.id ? 'active' : ''}
          onClick={() => setAppMode(item.id)}
        >
          <span className="dock-icon"><DockIcon type={item.icon} /></span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function Shell() {
  const { user, ready, bootError, isHost } = useApp();
  const [appMode, setAppMode] = useState('fbfantasy');

  if (!ready) return null;

  if (bootError) {
    return (
      <div className="login-box">
        <div className="ball ball-error"><span style={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>!</span></div>
        <h1 className="disp">مفيش اتصال بقاعدة البيانات</h1>
        <div className="card" style={{ textAlign: 'right' }}>
          <p style={{ lineHeight: 1.8 }}>اتأكد من الحاجتين دول:</p>
          <p style={{ lineHeight: 1.8 }}>
            ١- إنك شغّلت ملف الـ SQL في Supabase.<br />
            ٢- إن الـ URL والـ anon key مكتوبين صح في src/lib/supabaseClient.js.
          </p>
          <p className="hint" style={{ marginTop: 12 }}>تفاصيل الخطأ: {bootError.slice(0, 200)}</p>
          <button className="btn" style={{ width: '100%', marginTop: 12 }} onClick={() => window.location.reload()}>جرب تاني</button>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  const fantasyMode = appMode === 'fbfantasy';
  const immersiveMode = fantasyMode || appMode === 'news' || appMode === 'volleyball';

  return (
    <div className={immersiveMode ? 'fantasy-only-shell' : `wrap ${appMode === 'admin' ? 'admin-app-shell' : ''}`}>
      <style>{FANTASY_DOCK_CSS}</style>

      {/* Keep the original app shell completely unchanged outside Football Fantasy. */}
      {!immersiveMode && <TopBar appMode={appMode} setAppMode={setAppMode} />}

      <div id="tabbody" className={immersiveMode ? 'fantasy-only-body' : ''}>
        {appMode === 'news' && <NewsPage />}
        {appMode === 'timetable' && <TimeTablePage />}
        {appMode === 'volleyball' && <VolleyballFantasyPage />}
        {appMode === 'settings' && <SettingsPage onOpenAdmin={() => setAppMode('admin')} />}
        {appMode === 'admin' && isHost && <AdminPage />}
        {fantasyMode && <TeamPage />}
      </div>

      {/* Keep the main app shell available while moving between every section. */}
      <FantasyModeDock appMode={appMode} setAppMode={setAppMode} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <UIProvider>
        <Shell />
      </UIProvider>
    </AppProvider>
  );
}
