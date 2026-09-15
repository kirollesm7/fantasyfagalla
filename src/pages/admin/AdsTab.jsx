import { useEffect, useState, useCallback } from 'react';
import { useUI } from '../../context/UIContext';
import { sbGetAds, sbAddAd, sbUpdateAd, sbToggleAd, sbDeleteAd, sbUploadImage, adImages } from '../../lib/db';

export default function AdsTab() {
  const { showToast, openConfirm } = useUI();
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new, object = editing

  const load = useCallback(async () => {
    setLoading(true);
    try { setAds(await sbGetAds()); }
    catch (e) { console.error('load ads failed', e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (ad) => {
    try { await sbToggleAd(ad.id, !ad.active); await load(); }
    catch { showToast('مقدرتش أغيّر الحالة', 'error'); }
  };
  const remove = async (ad) => {
    if (!(await openConfirm('حذف الإعلان ده؟'))) return;
    try { await sbDeleteAd(ad.id); await load(); }
    catch { showToast('مقدرتش أحذفه', 'error'); }
  };
  const promote = async (ad) => {
    try {
      await sbUpdateAd(ad.id, { created_at: new Date().toISOString() });
      await load();
      showToast('الخبر بقى هو الخبر الرئيسي', 'success');
    } catch {
      showToast('مقدرتش أغيّر الخبر الرئيسي', 'error');
    }
  };

  return (
    <div className="card">
        <h3 className="disp" style={{ margin: '0 0 4px' }}>إدارة الإعلانات</h3>
        <p className="hint">الإعلانات المفعّلة تظهر في قسم Sponsored داخل صفحة الأخبار.</p>
      <div style={{ height: 10 }} />
       <button className="btn" onClick={() => setEditing(null)}>إعلان جديد</button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
        {loading && <p className="hint">بيتحمل...</p>}
        {!loading && ads.length === 0 && <p className="hint">لسه مفيش إعلانات</p>}
        {!loading && ads.map((ad) => {
          const photos = adImages(ad);
          return (
            <div className="prow" key={ad.id}>
              <div className="info">
                {photos.length > 0 && <img src={photos[0]} style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 6 }} alt="" />}
                <span>{ad.title || '(من غير عنوان)'}{photos.length > 1 && <span className="hint"> ({photos.length} صور)</span>}</span>
              </div>
              <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                <button className="btn small ghost" onClick={() => promote(ad)}>خليه رئيسي</button>
                <button className={`btn small ${ad.active ? '' : 'ghost'}`} onClick={() => toggle(ad)}>
                  <span className={`statusDot ${ad.active ? 'is-open' : 'is-locked'}`}>{ad.active ? 'مفعّل' : 'موقّف'}</span>
                </button>
                <button className="btn small ghost" onClick={() => setEditing(ad)}>تعديل</button>
                <button className="btn small danger" onClick={() => remove(ad)}>حذف</button>
              </div>
            </div>
          );
        })}
      </div>

      {editing !== undefined && (
        <AdEditor
          existingAd={editing}
          onClose={() => setEditing(undefined)}
          onSaved={load}
        />
      )}
    </div>
  );
}

function AdEditor({ existingAd, onClose, onSaved }) {
  const { showToast } = useUI();
  const isEdit = !!existingAd;
  const [title, setTitle] = useState(isEdit ? existingAd.title || '' : '');
  const [link, setLink] = useState(isEdit ? existingAd.link_url || '' : '');
  const [images, setImages] = useState(isEdit ? [...adImages(existingAd)] : []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      try {
        const url = await sbUploadImage(file, 'ads');
        setImages((imgs) => [...imgs, url]);
      } catch (err) {
        console.error('ad photo upload failed', err);
        showToast('مقدرش يرفع صورة: ' + String(err.message || err).slice(0, 80), 'error');
      }
    }
    setUploading(false);
    e.target.value = '';
  };

  const save = async () => {
    const t = title.trim();
    if (!t) { showToast('اكتب عنوان أو نص للإعلان', 'error'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await sbUpdateAd(existingAd.id, { title: t, link_url: link.trim() || null, images, image_url: images[0] || null });
        showToast('اتحفظ التعديل', 'success');
      } else {
        await sbAddAd({ title: t, link_url: link.trim(), images, active: true });
        showToast('اتضاف الخبر', 'success');
        // fire the push notification for brand-new ads only — best-effort,
        // never blocks or fails the ad creation itself if this errors
        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'خبر جديد', body: t }),
        }).catch((e) => console.error('[notify] request failed', e));
      }
      onClose();
      await onSaved();
    } catch (e) {
      console.error('save ad failed', e);
      showToast('مقدرتش يحفظ: ' + String(e.message || e).slice(0, 80), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: 420 }}>
        <h3 className="disp" style={{ margin: '0 0 12px' }}>{isEdit ? 'تعديل الخبر' : 'خبر جديد'}</h3>
        <label>عنوان الخبر</label>
        <input placeholder="اكتب عنوان الخبر" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div style={{ height: 8 }} />
        <label>رابط التفاصيل (اختياري)</label>
        <input placeholder="https://..." value={link} onChange={(e) => setLink(e.target.value)} />
        <div style={{ height: 10 }} />
        <label>صور الخبر والـ Stories</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0' }}>
          {images.length === 0 && <p className="hint" style={{ margin: 0 }}>لسه مفيش صور</p>}
          {images.map((url, idx) => (
            <div key={idx} style={{ position: 'relative', width: 56, height: 56 }}>
              <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} alt="" />
              <button
                style={{ position: 'absolute', top: -6, insetInlineStart: -6, width: 20, height: 20, borderRadius: '50%', background: 'var(--red)', color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer', lineHeight: 1 }}
                onClick={() => setImages((imgs) => imgs.filter((_, i) => i !== idx))}
              >×</button>
            </div>
          ))}
        </div>
        <input type="file" accept="image/*" multiple onChange={onFiles} disabled={uploading} />
        <p className="hint" style={{ marginTop: 4 }}>تقدر تختار أكتر من صورة، هتتعرض بالتبادل في البانر كل شوية.</p>
        <div className="row" style={{ marginTop: 16, gap: 8 }}>
          <button className="btn ghost small" style={{ flex: 1 }} onClick={onClose} disabled={saving}>إلغاء</button>
          <button className="btn small" style={{ flex: 1 }} onClick={save} disabled={saving || uploading}>{isEdit ? 'احفظ' : 'ضيف'}</button>
        </div>
      </div>
    </div>
  );
}
