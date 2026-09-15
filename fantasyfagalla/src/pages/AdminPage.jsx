import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BrandGlyph } from '../components/Brand';
import GameweekTab from './admin/GameweekTab';
import PlayersTab from './admin/PlayersTab';
import MatchesTab from './admin/MatchesTab';
import AccountsTab from './admin/AccountsTab';
import AdsTab from './admin/AdsTab';
import SettingsTab from './admin/SettingsTab';
import NewsContentTab from './admin/NewsContentTab';
import VolleyballTab from './admin/VolleyballTab';
import './AdminPage.css';

const SUB_TABS = [
  { id: 'gameweek', label: 'الجيم ويك' },
  { id: 'players', label: 'اللاعبين' },
  { id: 'volleyball', label: 'فانتازي الفولي' },
  { id: 'matches', label: 'الدوري والجدول' },
  { id: 'accounts', label: 'الحسابات' },
  { id: 'content', label: 'News & Stories' },
  { id: 'ads', label: 'الإعلانات' },
  { id: 'danger', label: 'الإعدادات' },
];

export default function AdminPage() {
  const { settings } = useApp();
  const [sub, setSub] = useState('gameweek');

  return (
    <div className="adminTheme">
      <div className="adminHeader">
        <div className="brandmark" style={{ color: 'var(--gold)' }}><BrandGlyph logoUrl={settings.logoUrl} /></div>
        <div className="adminHeaderCopy">
          <small>Beyond the Game. Through the Gateway.</small>
          <h2>لوحة الهوست</h2>
        </div>
        <span className="adminSecureBadge">HOST MODE</span>
      </div>

      <div className="adminSubNav">
        {SUB_TABS.map((t) => (
          <button key={t.id} className={sub === t.id ? 'active' : ''} onClick={() => setSub(t.id)}>{t.label}</button>
        ))}
      </div>

      {sub === 'gameweek' && <GameweekTab />}
      {sub === 'players' && <PlayersTab />}
      {sub === 'volleyball' && <VolleyballTab />}
      {sub === 'matches' && <MatchesTab />}
      {sub === 'accounts' && <AccountsTab />}
      {sub === 'content' && <NewsContentTab />}
      {sub === 'ads' && <AdsTab />}
      {sub === 'danger' && <SettingsTab />}

      <div className="adminMotto"><span>Fantasy Faggala League</span><b>Confident. Focused. Limitless.</b></div>
    </div>
  );
}
