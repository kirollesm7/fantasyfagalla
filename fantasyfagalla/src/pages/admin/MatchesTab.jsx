import { useCallback, useEffect, useState } from 'react';
import { useUI } from '../../context/UIContext';
import { sbDeleteMatch, sbDeleteVolleyballMatch, sbGetMatches, sbGetVolleyballMatches, sbReplaceSchedule, sbUpdateScheduledMatch } from '../../lib/db';
import { generateLeagueSchedule, matchDisplayStatus } from '../../lib/scheduleGenerator';

const DAYS = [['6','السبت'],['0','الأحد'],['1','الإثنين'],['2','الثلاثاء'],['3','الأربعاء'],['4','الخميس'],['5','الجمعة']];
const today = new Date().toISOString().slice(0,10);

export default function MatchesTab() {
  const { showToast, openConfirm } = useUI();
  const [sport,setSport] = useState('football');
  const [matches,setMatches] = useState([]);
  const [preview,setPreview] = useState([]);
  const [form,setForm] = useState({ teams:'', gamesPerWeek:2, duration:60, gap:15, weekdays:['5','6'], startDate:today, startTime:'18:00', doubleRound:true });
  const table = sport === 'football' ? 'matches' : 'volleyball_matches';
  const load = useCallback(async () => setMatches(sport === 'football' ? await sbGetMatches() : await sbGetVolleyballMatches()),[sport]);
  useEffect(() => { load().catch((error) => showToast(error.message,'error')); },[load,showToast]);
  const toggleDay = (day) => setForm((current) => ({...current,weekdays:current.weekdays.includes(day)?current.weekdays.filter((item)=>item!==day):[...current.weekdays,day]}));
  const generate = () => { try { setPreview(generateLeagueSchedule({...form,teams:form.teams.split(/\n|,/)})); } catch(error) { showToast(error.message,'error'); } };
  const publish = async () => {
    if (!preview.length) return showToast('اعمل توليد للجدول الأول','error');
    if (matches.length && !(await openConfirm(`استبدال جدول ${sport === 'football'?'الكورة':'الفولي'} الحالي؟`))) return;
    try {
      await sbReplaceSchedule(table, preview);
      setPreview([]); await load();
      showToast('تم نشر الدوري والجدول','success');
    } catch (error) { console.error('Publish schedule failed:', error); showToast('فشل النشر: ' + (error.message || 'خطأ'),'error'); }
  };
  const updateLocal = (id,field,value) => setMatches((current)=>current.map((match)=>match.id===id?{...match,[field]:value}:match));
  const saveResult = async (match) => {
    try {
      await sbUpdateScheduledMatch(table, match.id, { home_score: Number(match.home_score) || 0, away_score: Number(match.away_score) || 0, status: match.status });
      showToast('تم تحديث المباراة','success');
    } catch (error) { console.error('Score update failed:', error); showToast('فشل حفظ النتيجة: ' + (error.message || 'خطأ'),'error'); }
  };
  const remove = async (match) => {
    if (!(await openConfirm('حذف المباراة؟'))) return;
    try {
      await (sport === 'football' ? sbDeleteMatch(match.id) : sbDeleteVolleyballMatch(match.id));
      await load();
    } catch (error) { console.error('Delete match failed:', error); showToast('فشل الحذف: ' + (error.message || 'خطأ'),'error'); }
  };
  return <div className="scheduleAdmin">
    <div className="adminContentSwitch"><button className={sport==='football'?'active':''} onClick={()=>{setSport('football');setPreview([])}}>دوري الكورة</button><button className={sport==='volleyball'?'active':''} onClick={()=>{setSport('volleyball');setPreview([])}}>دوري الفولي</button></div>
    <div className="card scheduleBuilder"><h3 className="disp">مولّد الدوري العشوائي</h3><p className="hint">اكتب كل فريق في سطر. كل ضغطة توليد تغيّر ترتيب المواجهات، والنظام يضمن أن كل فريق يقابل باقي الفرق.</p><label>أسماء الفرق</label><textarea rows="6" placeholder={'فريق النور\nفريق الرجاء\nفريق السلام\nفريق المحبة'} value={form.teams} onChange={(event)=>setForm({...form,teams:event.target.value})}/><div className="row"><label>مباريات كل فريق أسبوعيًا<input type="number" min="1" max="7" value={form.gamesPerWeek} onChange={(event)=>setForm({...form,gamesPerWeek:event.target.value})}/></label><label>مدة المباراة بالدقائق<input type="number" min="10" value={form.duration} onChange={(event)=>setForm({...form,duration:event.target.value})}/></label><label>فاصل بين المباريات<input type="number" min="0" value={form.gap} onChange={(event)=>setForm({...form,gap:event.target.value})}/></label></div><label>أيام اللعب</label><div className="scheduleDays">{DAYS.map(([value,label])=><button type="button" key={value} className={form.weekdays.includes(value)?'active':''} onClick={()=>toggleDay(value)}>{label}</button>)}</div><div className="row"><label>بداية الدوري<input type="date" value={form.startDate} onChange={(event)=>setForm({...form,startDate:event.target.value})}/></label><label>أول مباراة الساعة<input type="time" value={form.startTime} onChange={(event)=>setForm({...form,startTime:event.target.value})}/></label></div><label className="scheduleCheck"><input type="checkbox" checked={form.doubleRound} onChange={(event)=>setForm({...form,doubleRound:event.target.checked})}/> ذهاب وعودة</label><div className="row"><button className="btn ghost" onClick={generate}>توليد عشوائي</button><button className="btn" onClick={publish} disabled={!preview.length}>نشر الجدول ({preview.length})</button></div></div>
    {!!preview.length&&<div className="card"><h3>معاينة قبل النشر</h3>{preview.map((match)=><div className="schedulePreview" key={match.id}><b>GW {match.gw}</b><span>{match.home_team} × {match.away_team}</span><small>{new Date(match.kickoff_time).toLocaleString('ar-EG')}</small></div>)}</div>}
    <div className="card"><h3 className="disp">الجدول المنشور ({matches.length})</h3>{matches.map((match)=><div className="scheduleMatchEdit" key={match.id}><div><b>{match.home_team} × {match.away_team}</b><small>{new Date(match.kickoff_time).toLocaleString('ar-EG')} · {match.duration_minutes||60} دقيقة · {matchDisplayStatus(match)}</small></div><div className="scheduleScore"><input type="number" value={match.home_score} onChange={(event)=>updateLocal(match.id,'home_score',event.target.value)}/><span>-</span><input type="number" value={match.away_score} onChange={(event)=>updateLocal(match.id,'away_score',event.target.value)}/><select value={match.status} onChange={(event)=>updateLocal(match.id,'status',event.target.value)}><option value="upcoming">قادمة</option><option value="live">Live يدوي</option><option value="finished">انتهت</option></select><button className="btn small" onClick={()=>saveResult(match)}>حفظ</button><button className="btn small danger" onClick={()=>remove(match)}>حذف</button></div></div>)}</div>
  </div>;
}
