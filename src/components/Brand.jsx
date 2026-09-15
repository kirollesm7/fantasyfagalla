import glyphSrc from '../assets/glyph.png';

// The gateway-arch mark (real logo asset), or the host's own logo if one's
// been set from the admin panel. Fills whatever box it's placed in.
export function BrandGlyph({ logoUrl }) {
  const src = logoUrl || glyphSrc;
  return <img src={src} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: logoUrl ? 'inherit' : 0 }} />;
}

const PATHS = {
  team: 'M6 4l3 2h6l3-2 3 4-3 2v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V10L3 8z',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 4H3v2a4 4 0 0 0 4 4M17 4h4v2a4 4 0 0 1-4 4',
  shield: 'M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  refresh: 'M4 4v6h6M20 20v-6h-6M4.5 15a8 8 0 0 0 14 3.5L20 16M19.5 9a8 8 0 0 0-14-3.5L4 8',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  key: 'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0L19 4m-3.5 3.5L19 11',
  image: 'M3 4h18v16H3zM9 10a1.6 1.6 0 1 0 0-3.2A1.6 1.6 0 0 0 9 10zM3 17l5-5 3 3 4-4 6 6',
  download: 'M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2',
  news: 'M4 4h13a2 2 0 0 1 2 2v13a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V4zM8 8h8M8 12h8M8 16h5M20 8v10a2 2 0 0 1-2 2',
  calendar: 'M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
  volleyball: 'M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2zM12 2c2.5 2.5 3.5 6 2 10M12 2C9.5 4.5 8.5 8 10 12M2.5 9c3 1.5 6.5 1.5 9.5 0M2 14.5c4 2 10 2 14.5 0M12 12c2 3 2.5 6.5 1 10',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  chevronLeft: 'M15 18l-6-6 6-6',
};

export function Icon({ name, ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d={PATHS[name] || ''} />
    </svg>
  );
}
