export const VOLLEYBALL_RULES = [
  ['best_player', 'Best player', 5],
  ['best_hitter', 'Best hitter', 5],
  ['best_blocker', 'Best blocker', 5],
  ['best_libero', 'Best libero', 5],
  ['best_setter', 'Best setter', 5],
  ['point_won', 'Player won point', 1],
  ['point_lost', 'Player lost point', -1],
  ['ace_serve', 'Ace serve', 3],
  ['won_serve', 'Won serve', 1],
  ['net', 'Net fault', -1],
  ['carry', 'Carry', -1],
  ['yellow_card', 'Yellow card', -2],
  ['red_card', 'Red card', -5],
];

export const defaultVolleyballTeam = () => ({ starters: Array(6).fill(null), bench: Array(4).fill(null), captainId: null, viceCaptainId: null });

export function normalizeVolleyballTeam(team) {
  const clean = team || {};
  return {
    starters: Array.from({ length: 6 }, (_, index) => clean.starters?.[index] || null),
    bench: Array.from({ length: 4 }, (_, index) => clean.bench?.[index] || null),
    captainId: clean.captainId || null,
    viceCaptainId: clean.viceCaptainId || null,
  };
}

export function calcVolleyballPlayerPoints(stat = {}) {
  return VOLLEYBALL_RULES.reduce((total, [key, , value]) => total + (Number(stat[key]) || 0) * value, 0);
}

export function calcVolleyballTeamPoints(team, stats = {}) {
  const normalized = normalizeVolleyballTeam(team);
  return normalized.starters.reduce((total, id) => {
    if (!id) return total;
    const points = calcVolleyballPlayerPoints(stats[id]);
    return total + points + (id === normalized.captainId ? points : 0);
  }, 0);
}
