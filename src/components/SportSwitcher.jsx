export function FootballIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 4.5 7.2v9.6L12 21l7.5-4.2V7.2L12 3Z" />
      <path d="m12 7 1.5 3 3.3.5-2.4 2.3.6 3.2-3-1.6-3 1.6.6-3.2-2.4-2.3 3.3-.5L12 7Z" />
    </svg>
  );
}

export function VolleyballIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3c2.6 2.2 4.2 4.5 4.8 7M3.5 10.3c3.5-.4 6.2.1 8.2 1.8M7.5 19.7c.9-3.3 2.4-5.7 4.7-7.5M20.5 13.7c-3.3.4-6-.1-8.3-1.7M16.5 4.3c-.8 3.1-2.3 5.6-4.7 7.7" />
    </svg>
  );
}

export default function SportSwitcher({ value = 'football', onChange, className = '' }) {
  return (
    <div className={`fpl-sport-switcher ${className}`} role="tablist" aria-label="Sport">
      <button
        type="button"
        role="tab"
        aria-selected={value === 'football'}
        className={value === 'football' ? 'active' : ''}
        onClick={() => onChange?.('football')}
      >
        <FootballIcon /><span>Football</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === 'volleyball'}
        className={value === 'volleyball' ? 'active' : ''}
        onClick={() => onChange?.('volleyball')}
      >
        <VolleyballIcon /><span>Volleyball</span>
      </button>
    </div>
  );
}