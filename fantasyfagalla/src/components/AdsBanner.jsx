import { useEffect, useRef, useState } from 'react';
import { adImages } from '../lib/db';
import { Icon } from './Brand';

function AdImage({ photos }) {
  const [idx, setIdx] = useState(0);
  const [broken, setBroken] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (photos.length > 1) {
      timerRef.current = setInterval(() => setIdx((i) => (i + 1) % photos.length), 3500);
      return () => clearInterval(timerRef.current);
    }
  }, [photos.length]);

  if (!photos.length || broken) {
    return (
      <div className="adImg adImgPlaceholder" style={{ width: 44 }}>
        <Icon name="image" />
      </div>
    );
  }
  return <img src={photos[idx]} alt="" className="adImg" onError={() => setBroken(true)} />;
}

export default function AdsBanner({ ads }) {
  const active = ads.filter((a) => a.active);
  if (!active.length) return null;
  return (
    <div>
      {active.map((ad) => {
        const photos = adImages(ad);
        const inner = (
          <>
            <AdImage photos={photos} />
            <span className="adText">{ad.title}</span>
          </>
        );
        return ad.link_url ? (
          <a key={ad.id} href={ad.link_url} target="_blank" rel="noopener noreferrer" className="adCard">{inner}</a>
        ) : (
          <div key={ad.id} className="adCard">{inner}</div>
        );
      })}
    </div>
  );
}
