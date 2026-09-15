import { Icon } from '../components/Brand';

// Generic "coming soon" placeholder — used for the sections that aren't
// built out yet (News, Time Table, Volleyball Fantasy). Swap this out per
// section once there's real content/features to show.
export default function StubPage({ icon, title, subtitle }) {
  return (
    <div className="card stubPage">
      <Icon name={icon} className="stubIcon" strokeWidth="1.5" />
      <h2>{title}</h2>
      <p>{subtitle || 'القسم ده لسه قيد التطوير — قريبًا هيبقى شغال بالكامل.'}</p>
    </div>
  );
}
