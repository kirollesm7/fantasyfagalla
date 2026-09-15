import { useCallback } from 'react';
import { sbGetAccount } from '../lib/db';
import { migrateTeam, defaultTeam, calcTeamPointsForGW } from '../lib/scoring';

// Ported from the HTML app's computeMyRanks(): fetches every user's points +
// team in parallel (not sequentially — that's what made this slow before),
// then works out the current user's overall rank, total, last-gameweek rank,
// and a per-gameweek breakdown of how the total is made up.
export function useRankInfo({ user, users, players, stats, gwState, team }) {
  return useCallback(async () => {
    const entries = await Promise.all(
      users.map(async (u) => {
        const pointsRow = await sbGetAccount(u, 'points');
        const points = (pointsRow && pointsRow.points) || {};
        const teamData = u === user ? team : migrateTeam((await sbGetAccount(u, 'team'))?.team || defaultTeam());
        return [u, points, teamData];
      })
    );
    const allPoints = {}; const allTeams = {};
    entries.forEach(([u, points, teamData]) => { allPoints[u] = points; allTeams[u] = teamData; });

    const liveKey = 'gw' + gwState.gw;
    const totals = users
      .map((u) => {
        const finalized = Object.values(allPoints[u]).reduce((a, b) => a + (Number(b) || 0), 0);
        const live = allPoints[u][liveKey] === undefined ? calcTeamPointsForGW(players, stats, allTeams[u], gwState.gw) : 0;
        return { user: u, total: finalized + live };
      })
      .sort((a, b) => b.total - a.total);

    const overallRank = totals.findIndex((r) => r.user === user) + 1;
    const myTotal = totals.find((r) => r.user === user)?.total || 0;

    const finalizedGWs = new Set();
    Object.values(allPoints).forEach((pts) => Object.keys(pts).forEach((g) => finalizedGWs.add(g)));
    const gwList = [...finalizedGWs].sort((a, b) => parseInt(a.replace('gw', '')) - parseInt(b.replace('gw', '')));
    let lastGWRank = null;
    if (gwList.length) {
      const lastGW = gwList[gwList.length - 1];
      const rows = users
        .filter((u) => allPoints[u][lastGW] !== undefined)
        .map((u) => ({ user: u, pts: allPoints[u][lastGW] }))
        .sort((a, b) => b.pts - a.pts);
      lastGWRank = rows.findIndex((r) => r.user === user) + 1;
    }

    const myPoints = allPoints[user] || {};
    const myLiveEntry = myPoints[liveKey] === undefined
      ? [{ gw: gwState.gw, pts: calcTeamPointsForGW(players, stats, allTeams[user] || team, gwState.gw), live: true }]
      : [];
    const breakdown = Object.keys(myPoints)
      .map((k) => ({ gw: parseInt(k.replace('gw', ''), 10), pts: Number(myPoints[k]) || 0, live: false }))
      .concat(myLiveEntry)
      .sort((a, b) => a.gw - b.gw);

    return { overallRank: overallRank || null, totalPts: myTotal, lastGWRank, breakdown, allPoints, allTeams };
  }, [user, users, players, stats, gwState, team]);
}
