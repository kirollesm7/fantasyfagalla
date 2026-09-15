import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { adImages, sbGetAds, sbGetNewsItems, sbGetStories } from '../lib/db';
import { BrandGlyph } from '../components/Brand';
import './NewsPage.css';

const FALLBACK_NEWS_IMAGES = [
  'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?auto=format&fit=crop&w=1200&q=85',
];

function contentImage(item, index = 0) {
  const images = adImages(item);
  if (images.length) return images[index] || images[0];
  const seed = [...String(item?.id || item?.title || '')].reduce((total, letter) => total + letter.charCodeAt(0), 0);
  return FALLBACK_NEWS_IMAGES[seed % FALLBACK_NEWS_IMAGES.length];
}

function SafeImage({ item, className, index = 0 }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? FALLBACK_NEWS_IMAGES[(index + 1) % FALLBACK_NEWS_IMAGES.length] : contentImage(item, index);
  return <img className={className} src={src} alt="" loading="lazy" onError={() => setFailed(true)} />;
}

function Story({ article, image, onOpen }) {
  return (
    <button type="button" className="news-story" onClick={onOpen}>
      <span>{image ? <img src={image} alt="" /> : <b>{article.title?.slice(0, 1) || 'N'}</b>}</span>
      <strong>{article.title || 'News'}</strong>
    </button>
  );
}

function StoryViewer({ stories, index, onIndex, onClose }) {
  const story = stories[index];
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (index < stories.length - 1) onIndex(index + 1);
      else onClose();
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [index, onClose, onIndex, stories.length]);
  if (!story) return null;
  const previous = () => onIndex(Math.max(0, index - 1));
  const next = () => index < stories.length - 1 ? onIndex(index + 1) : onClose();
  return (
    <div className="news-story-viewer" role="dialog" aria-modal="true" aria-label={story.article.title}>
      <div className="news-story-progress">
        {stories.map((item, progressIndex) => <span key={item.key} className={progressIndex < index ? 'complete' : progressIndex === index ? 'active' : ''}><i /></span>)}
      </div>
      <header>
        <strong>{story.article.title || 'Fagalla News'}</strong>
        <button type="button" onClick={onClose} aria-label="Close story">×</button>
      </header>
      <div className="news-story-media">
        {story.image ? <img src={story.image} alt="" /> : <div>FAGALLA NEWS</div>}
      </div>
      <button type="button" className="news-story-tap previous" onClick={previous} aria-label="Previous story" />
      <button type="button" className="news-story-tap next" onClick={next} aria-label="Next story" />
      <div className="news-story-caption">
        <strong>{story.article.title}</strong>
        {story.article.link_url && <a href={story.article.link_url} target="_blank" rel="noreferrer">Open story ↗</a>}
      </div>
    </div>
  );
}

function ArticlePage({ article, onBack }) {
  const images = adImages(article).length ? adImages(article) : [contentImage(article)];
  return (
    <article className="news-article-page">
      <button type="button" className="news-back" onClick={onBack}>← Latest news</button>
      <div className="news-article-images">
        {images.map((image, index) => <img key={`${image}-${index}`} src={image} alt="" loading="lazy" />)}
        {!images.length && <div className="news-image-empty"><span>FAGALLA</span><small>NEWS IMAGE</small></div>}
      </div>
      <div className="news-article-copy">
        <span>FAGALLA · LATEST</span>
        <h1>{article.title}</h1>
        {article.link_url && <a href={article.link_url} target="_blank" rel="noreferrer">Open full story ↗</a>}
      </div>
    </article>
  );
}

export default function NewsPage() {
  const { settings } = useApp();
  const [ads, setAds] = useState([]);
  const [newsItems, setNewsItems] = useState([]);
  const [storyItems, setStoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [storyIndex, setStoryIndex] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [adRows, newsRows, storyRows] = await Promise.all([
        sbGetAds(),
        sbGetNewsItems().catch(() => []),
        sbGetStories().catch(() => []),
      ]);
      setAds((adRows || []).filter((item) => item.active !== false));
      setNewsItems((newsRows || []).filter((item) => item.active !== false));
      setStoryItems((storyRows || []).filter((item) => item.active !== false));
    } catch (loadError) {
      console.error('news load failed', loadError);
      setError('تعذر تحميل الأخبار حاليًا.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const articles = newsItems.length ? newsItems : ads;
  const stories = useMemo(() => (storyItems.length ? storyItems : articles).flatMap((article) => {
    const images = adImages(article);
    return (images.length ? images : [contentImage(article)]).map((image, index) => ({ article, image, key: `${article.id}-${index}` }));
  }), [articles, storyItems]);
  const featured = articles.find((item) => item.featured) || articles[0] || null;
  const remaining = articles.filter((item) => item.id !== featured?.id);

  if (selected) return <ArticlePage article={selected} onBack={() => setSelected(null)} />;

  return (
    <main className="news-home">
      <header className="news-brand-row">
        <div className="news-brand-mark"><BrandGlyph logoUrl={settings?.newsLogoUrl || settings?.logoUrl} /></div>
        <div><strong>FAGALLA</strong><span>NEWS</span></div>
        <button type="button" onClick={load} disabled={loading} aria-label="Refresh news">↻</button>
      </header>

      {loading ? (
        <div className="news-loading"><span /><span /><strong>Loading latest news...</strong></div>
      ) : error ? (
        <div className="news-state"><strong>تعذر تحميل الأخبار</strong><small>{error}</small><button type="button" onClick={load}>حاول مرة أخرى</button></div>
      ) : !featured && !stories.length && !ads.length ? (
        <div className="news-state"><strong>لا توجد أخبار حاليًا</strong><small>الأخبار التي ينشرها الهوست ستظهر هنا.</small></div>
      ) : (
        <>
          <section className="news-stories" aria-label="News stories">
            {stories.map((story, index) => <Story key={story.key} article={story.article} image={story.image} onOpen={() => setStoryIndex(index)} />)}
          </section>

          {featured && <button type="button" className="news-featured" onClick={() => setSelected(featured)}>
            <div className="news-featured-image">
              <SafeImage item={featured} />
            </div>
            <div className="news-featured-copy"><span>FEATURED</span><h1>{featured.title}</h1><small>Read story →</small></div>
          </button>}

          {!!remaining.length && (
            <section className="news-feed">
              <h2>Latest</h2>
              {remaining.map((article) => (
                <button type="button" key={article.id} onClick={() => setSelected(article)}>
                  <span className="news-feed-copy"><small>LATEST NEWS</small><strong>{article.title}</strong><i>Read story</i></span>
                  <span className="news-feed-image"><SafeImage item={article} index={1} /></span>
                </button>
              ))}
            </section>
          )}
          {!!ads.length && (
            <section className="news-sponsored">
              <h2>Sponsored</h2>
              <div>{ads.map((ad) => <a key={ad.id} href={ad.link_url || undefined} target={ad.link_url ? '_blank' : undefined} rel="noreferrer"><SafeImage item={ad} index={2} /><strong>{ad.title}</strong><span>AD</span></a>)}</div>
            </section>
          )}
        </>
      )}
      {storyIndex !== null && <StoryViewer stories={stories} index={storyIndex} onIndex={setStoryIndex} onClose={() => setStoryIndex(null)} />}
    </main>
  );
}
