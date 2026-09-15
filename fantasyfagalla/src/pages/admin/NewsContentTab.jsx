import { useCallback, useEffect, useState } from 'react';
import { sbDeleteContent, sbGetNewsItems, sbGetStories, sbSaveContent, sbUploadImage, uid } from '../../lib/db';
import { useUI } from '../../context/UIContext';

export default function NewsContentTab() {
  const { showToast, openConfirm } = useUI();
  const [type, setType] = useState('news_items');
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: '', image_url: '', link_url: '' });
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => setItems(type === 'stories' ? await sbGetStories() : await sbGetNewsItems()), [type]);
  useEffect(() => { load().catch((error) => showToast(String(error.message || error), 'error')); }, [load, showToast]);

  const add = async () => {
    if (!form.title.trim()) return showToast('اكتب العنوان', 'error');
    setBusy(true);
    try {
      await sbSaveContent(type, { id: uid(), title: form.title.trim(), image_url: form.image_url.trim() || null, link_url: form.link_url.trim() || null, active: true, ...(type === 'news_items' ? { featured: false } : {}) });
      setForm({ title: '', image_url: '', link_url: '' });
      await load();
      showToast('تم النشر', 'success');
    } finally { setBusy(false); }
  };
  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const imageUrl = await sbUploadImage(file, type === 'stories' ? 'stories' : 'news');
      setForm((current) => ({ ...current, image_url: imageUrl }));
    }
    finally { setBusy(false); }
  };
  const update = async (item, patch) => { await sbSaveContent(type, { ...item, ...patch }); await load(); };
  const feature = async (item) => {
    await Promise.all(items.map((entry) => sbSaveContent('news_items', { ...entry, featured: entry.id === item.id })));
    await load();
  };
  const remove = async (item) => {
    if (!(await openConfirm(`حذف ${item.title}؟`))) return;
    await sbDeleteContent(type, item.id); await load();
  };

  return (
    <div className="hostContentManager">
      <div className="adminContentSwitch"><button className={type === 'news_items' ? 'active' : ''} onClick={() => setType('news_items')}>الأخبار</button><button className={type === 'stories' ? 'active' : ''} onClick={() => setType('stories')}>Stories</button></div>
      <div className="card">
        <h3 className="disp">{type === 'stories' ? 'Story جديدة' : 'خبر جديد'}</h3>
        <input placeholder="العنوان" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        <input placeholder="رابط الصورة" value={form.image_url} onChange={(event) => setForm({ ...form, image_url: event.target.value })} />
        <input type="file" accept="image/*" onChange={upload} disabled={busy} />
        <input placeholder="رابط التفاصيل (اختياري)" value={form.link_url} onChange={(event) => setForm({ ...form, link_url: event.target.value })} />
        {form.image_url && <img className="adminContentPreview" src={form.image_url} alt="" />}
        <button className="btn" onClick={add} disabled={busy}>نشر</button>
      </div>
      <div className="card"><h3 className="disp">المحتوى المنشور</h3>{items.map((item) => <div className="adminContentRow" key={item.id}>{item.image_url ? <img src={item.image_url} alt="" /> : <span /> }<strong>{item.title}</strong><div>{type === 'news_items' && <button className="btn small ghost" onClick={() => feature(item)}>{item.featured ? 'رئيسي' : 'خليه رئيسي'}</button>}<button className="btn small ghost" onClick={() => update(item, { active: !item.active })}>{item.active ? 'إخفاء' : 'إظهار'}</button><button className="btn small danger" onClick={() => remove(item)}>حذف</button></div></div>)}</div>
    </div>
  );
}
