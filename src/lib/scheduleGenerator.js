import { uid } from './db';

function shuffle(items) {
  const list = [...items];
  for (let index = list.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [list[index], list[other]] = [list[other], list[index]];
  }
  return list;
}

export function generateLeagueSchedule({ teams, gamesPerWeek, duration, gap, weekdays, startDate, startTime, doubleRound }) {
  const names = shuffle([...new Set(teams.map((name) => name.trim()).filter(Boolean))]);
  if (names.length < 2) throw new Error('أدخل فريقين على الأقل');
  if (names.length % 2) names.push(null);
  const fixed = names[0];
  let rotating = names.slice(1);
  const rounds = [];
  for (let round = 0; round < names.length - 1; round += 1) {
    const order = [fixed, ...rotating];
    const fixtures = [];
    for (let index = 0; index < order.length / 2; index += 1) {
      const first = order[index];
      const second = order[order.length - 1 - index];
      if (first && second) fixtures.push(round % 2 ? [second, first] : [first, second]);
    }
    rounds.push(fixtures);
    rotating = [rotating.at(-1), ...rotating.slice(0, -1)];
  }
  if (doubleRound) rounds.push(...rounds.map((fixtures) => fixtures.map(([home, away]) => [away, home])));
  const allowedDays = weekdays.map(Number);
  if (!allowedDays.length) throw new Error('اختار يوم لعب واحد على الأقل');
  const roundsEachWeek = Math.max(1, Math.min(Number(gamesPerWeek) || 1, allowedDays.length));
  const selectedDays = allowedDays.slice(0, roundsEachWeek);
  const cursor = new Date(`${startDate}T${startTime || '18:00'}`);
  const output = [];
  let roundIndex = 0;
  while (roundIndex < rounds.length) {
    if (selectedDays.includes(cursor.getDay())) {
      rounds[roundIndex].forEach(([home_team, away_team], matchIndex) => {
        const kickoff = new Date(cursor.getTime() + matchIndex * (Number(duration) + Number(gap || 0)) * 60000);
        output.push({ id: uid(), home_team, away_team, kickoff_time: kickoff.toISOString(), duration_minutes: Number(duration), home_score: 0, away_score: 0, status: 'upcoming', gw: roundIndex + 1, note: `Round ${roundIndex + 1}` });
      });
      roundIndex += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return output;
}

export function matchDisplayStatus(match, now = Date.now()) {
  if (match.status === 'finished') return 'finished';
  const start = new Date(match.kickoff_time).getTime();
  const end = start + (Number(match.duration_minutes) || 60) * 60000;
  if (now >= start && now < end) return 'live';
  if (now >= end) return 'waiting';
  return 'upcoming';
}

export function buildLeagueTable(matches, sport = 'football') {
  const rows = {};
  const get = (name) => rows[name] ||= { team: name, played: 0, won: 0, drawn: 0, lost: 0, scored: 0, conceded: 0, points: 0 };
  matches.filter((match) => match.status === 'finished').forEach((match) => {
    const home = get(match.home_team); const away = get(match.away_team);
    const hs = Number(match.home_score) || 0; const as = Number(match.away_score) || 0;
    home.played += 1; away.played += 1; home.scored += hs; home.conceded += as; away.scored += as; away.conceded += hs;
    if (hs === as) { home.drawn += 1; away.drawn += 1; home.points += 1; away.points += 1; }
    else if (hs > as) { home.won += 1; away.lost += 1; home.points += sport === 'volleyball' ? 2 : 3; }
    else { away.won += 1; home.lost += 1; away.points += sport === 'volleyball' ? 2 : 3; }
  });
  matches.forEach((match) => { get(match.home_team); get(match.away_team); });
  return Object.values(rows).sort((a,b) => b.points-a.points || (b.scored-b.conceded)-(a.scored-a.conceded) || b.scored-a.scored);
}
