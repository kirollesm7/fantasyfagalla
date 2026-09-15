import { useApp } from '../context/AppContext';
import { BrandGlyph } from './Brand';
import SportSwitcher from './SportSwitcher';

export default function FantasyBrandHeader({ sport, onSwitchSport, children }) {
  const { settings } = useApp();
  return (
    <>
      <header className="fpl-team-brand-header">
        <span><BrandGlyph logoUrl={settings?.fantasyLogoUrl || settings?.logoUrl} /></span>
        <div><strong>FAGALLA FANTASY</strong><small>Build your team. Own the game.</small></div>
      </header>
      {onSwitchSport != null && <div className="fpl-sport-row"><SportSwitcher value={sport} onChange={onSwitchSport} /></div>}
      {children}
    </>
  );
}