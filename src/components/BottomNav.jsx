import { useApp } from '../context/AppContext';
import { Icon } from './Brand';

const TABS = [
  { id: 'team', label: 'فريقي', icon: 'team' },
  { id: 'standings', label: 'الترتيب', icon: 'trophy' },
];

export default function BottomNav({ activeTab, setActiveTab }) {
  const { isHost } = useApp();
  const tabs = isHost ? [...TABS, { id: 'admin', label: 'لوحة الهوست', icon: 'shield' }] : TABS;
  return (
    <div className="bottomNav">
      {tabs.map((t) => (
        <button key={t.id} className={activeTab === t.id ? 'active' : ''} onClick={() => setActiveTab(t.id)}>
          <Icon name={t.icon} />
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}
