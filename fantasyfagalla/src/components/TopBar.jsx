import { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { BrandGlyph, Icon } from './Brand';

const MODES = [
  { id: 'news', label: 'News', icon: 'news' },
  { id: 'timetable', label: 'Time Table', icon: 'calendar' },
  { id: 'fbfantasy', label: 'FB Fantasy', icon: 'team' },
  { id: 'volleyball', label: 'Volley ball Fantasy', icon: 'volleyball' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export default function TopBar({ appMode, setAppMode }) {
  const { user, gwState, settings, isHost } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const closeMenu = () => setMenuOpen(false);
  const onDocClick = (e) => {
    if (menuRef.current && !menuRef.current.contains(e.target)) closeMenu();
  };

  return (
    <div className="top">
      <div className="brand">
        <div className="ball"><BrandGlyph logoUrl={settings.logoUrl} /></div>
        <div>
          <h1>فانتازي فچالة ليج</h1>
          <small>
            <span className={`statusDot ${gwState.locked ? 'is-locked' : 'is-open'}`}>{gwState.locked ? 'قافل' : 'مفتوح'}</span>
          </small>
        </div>
      </div>
      <div className="row" style={{ alignItems: 'center', gap: 8 }}>
        <div className="userchip"><b>{user}</b></div>
        <div className="menuWrap" ref={menuRef}>
          <button className="menuBtn" onClick={() => setMenuOpen((v) => !v)} onMouseDown={() => document.addEventListener('click', onDocClick, { once: true })}>
            <Icon name="menu" style={{ width: 19, height: 19 }} />
          </button>
          <div className={`topMenuPanel ${menuOpen ? '' : 'hidden'}`}>
            {[...MODES, ...(isHost ? [{ id: 'admin', label: 'Admin', icon: 'settings' }] : [])].map((m) => (
              <button
                key={m.id}
                onClick={() => { setAppMode(m.id); closeMenu(); }}
                style={appMode === m.id ? { background: 'var(--surface)', fontWeight: 800 } : undefined}
              >
                <Icon name={m.icon} style={{ width: 17, height: 17 }} />
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
