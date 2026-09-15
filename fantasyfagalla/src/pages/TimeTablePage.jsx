import { useCallback, useEffect, useMemo, useState } from 'react';
import { sbGetMatches, sbGetVolleyballMatches } from '../lib/db';
import { buildLeagueTable, matchDisplayStatus } from '../lib/scheduleGenerator';
import './TimeTablePage.css';

export default function TimeTablePage({ sport = 'football', embedded = false }) {
  const [football, setFootball] = useState([]);
  const [volleyball, setVolleyball] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const load = useCallback(async () => {
    setLoading(true);
    const [fb, vb] = await Promise.all([sport === 'football' ? sbGetMatches() : [], sport === 'volleyball' ? sbGetVolleyballMatches().catch(() => []) : []]);
    setFootball(fb); setVolleyball(vb); setLoading(false);
  }, [sport]);
  useEffect(() => { load(); const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, [load]);
  const matches = sport === 'football' ? football : volleyball;
  const table = useMemo(() => buildLeagueTable(matches, sport), [matches, sport]);
  const header = embedded ? null : <header><small>FAGALLA LEAGUES</small><h1>{sport === 'football' ? 'مواعيد الكورة والترتيب' : 'مواعيد الفولي والترتيب'}</h1><p>مباريات ونتائج وترتيب {sport === 'football' ? 'دوري الكورة' : 'دوري الفولي'} مباشر</p></header>;
  return <main className={`leaguePage${embedded ? ' embedded' : ''}`}>{header}{loading ? <div className="leagueEmpty">جاري تحميل الجدول...</div> : <><section className="leagueBlock"><h2>جدول الدوري</h2><div className="leagueTableHead"><span>#</span><span>الفريق</span><span>لعب</span><span>له</span><span>عليه</span><span>نقط</span></div>{table.map((row, index) => <div className="leagueTableRow" key={row.team}><b>{index + 1}</b><strong>{row.team}<small>{row.won} فوز · {row.drawn} تعادل · {row.lost} خسارة</small></strong><span>{row.played}</span><span>{row.scored}</span><span>{row.conceded}</span><b>{row.points}</b></div>)}{!table.length && <div className="leagueEmpty">الهوست لسه ما نشرش الدوري</div>}</section><section className="leagueBlock"><h2>المباريات</h2>{matches.map((match) => { const status = matchDisplayStatus(match, now); return <article className={`leagueFixture ${status}`} key={match.id}><div><small>GW {match.gw || '-'} · {new Date(match.kickoff_time).toLocaleString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small><b>{status === 'live' ? 'يلعب الآن' : status === 'finished' ? 'انتهت' : status === 'waiting' ? 'بانتظار النتيجة' : 'قادمة'}</b></div><section><strong>{match.home_team}</strong><span>{status === 'upcoming' ? 'VS' : `${match.home_score} - ${match.away_score}`}</span><strong>{match.away_team}</strong></section><footer>مدة المباراة {match.duration_minutes || 60} دقيقة</footer></article>; })}{!matches.length && <div className="leagueEmpty">لا توجد مباريات منشورة بعد</div>}</section></>}</main>;
}