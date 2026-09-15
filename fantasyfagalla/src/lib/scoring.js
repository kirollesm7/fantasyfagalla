// طريقة احتساب نقاط فنتازي — كل فعل بنقطه
export const SCORING = {
  goals: { label: 'أهداف', pts: 5, kind: 'count' },
  assists: { label: 'أسيستات', pts: 3, kind: 'count' },
  saves: { label: 'تصديات', pts: 1, kind: 'count' },
  cleanSheet: { label: 'شباك نظيفة', pts: 6, kind: 'bool' },
  motm: { label: 'رجل المباراة', pts: 6, kind: 'bool' },
  penSave: { label: 'تصدي ضربة جزاء', pts: 3, kind: 'count' },
  penMiss: { label: 'إضاعة ضربة جزاء', pts: -2, kind: 'count' },
  yellow: { label: 'كارت أصفر', pts: -2, kind: 'count' },
  red: { label: 'كارت أحمر', pts: -6, kind: 'count' },
  ownGoal: { label: 'هدف عكسي', pts: -3, kind: 'count' },
};

export function emptyPlayerStat() {
  const s = { played: false };
  Object.keys(SCORING).forEach((k) => {
    s[k] = SCORING[k].kind === 'bool' ? false : 0;
  });
  return s;
}

export function calcPlayerPoints(pid, statsGW) {
  const s = (statsGW && statsGW[pid]) || {};
  // old records (saved before the detailed scoring system) only ever had a
  // flat "points" number and none of the new fields — keep those exactly as
  // they were instead of recalculating them into 0.
  const hasDetailedFields = Object.keys(SCORING).some((k) => k in s);
  if (!hasDetailedFields && typeof s.points === 'number') {
    return s.points;
  }
  let pts = 0;
  Object.keys(SCORING).forEach((k) => {
    const def = SCORING[k];
    const v = def.kind === 'bool' ? (s[k] ? 1 : 0) : Number(s[k]) || 0;
    pts += v * def.pts;
  });
  return pts;
}

export const SQUAD_SIZE = 7;

export function defaultTeam() {
  return {
    starters: [null, null, null, null],
    bench: [null, null, null],
    captainId: null,
    viceCaptainId: null,
    wildcards: { benchBoost: null, tripleCaptain: null },
  };
}

// upgrades teams saved under the old {gk, p:[...]} shape (before the
// goalkeeper slot was removed) to the flat array shape used now.
export function migrateTeam(team) {
  if (!team) return defaultTeam();
  if (Array.isArray(team.starters) && Array.isArray(team.bench)) {
    return {
      ...team,
      viceCaptainId: team.viceCaptainId ?? null,
      wildcards: {
        benchBoost: null,
        tripleCaptain: null,
        wildcard: null,
        freeHit: null,
        ...(team.wildcards || {}),
      },
    };
  }
  const starters = [team.starters && team.starters.gk, ...((team.starters && team.starters.p) || [])].filter((v) => v !== undefined);
  while (starters.length < 4) starters.push(null);
  const bench = [team.bench && team.bench.gk, ...((team.bench && team.bench.p) || [])].filter((v) => v !== undefined);
  while (bench.length < 3) bench.push(null);
  return {
    starters: starters.slice(0, 4),
    bench: bench.slice(0, 3),
    captainId: team.captainId || null,
    viceCaptainId: team.viceCaptainId || null,
    wildcards: {
      benchBoost: null,
      tripleCaptain: null,
      wildcard: null,
      freeHit: null,
      ...(team.wildcards || {}),
    },
  };
}

export function playerById(players, id) {
  return players.find((p) => p.id === id);
}
export function isValidPlayerId(players, id) {
  return !!(id && playerById(players, id));
}
export function squadIds(team) {
  return [...team.starters, ...team.bench].filter(Boolean);
}
export function squadCost(players, team) {
  return squadIds(team).reduce((sum, id) => {
    const p = playerById(players, id);
    return sum + (p ? Number(p.price) || 0 : 0);
  }, 0);
}
export function squadCount(players, team) {
  return squadIds(team).filter((id) => isValidPlayerId(players, id)).length;
}
export function isSquadComplete(players, team) {
  return team.starters.every((id) => isValidPlayerId(players, id)) && team.bench.every((id) => isValidPlayerId(players, id));
}
export function didPlayerPlay(stat) {
  if (!stat) return false;
  if (stat.played !== undefined) return Boolean(stat.played);
  if (stat.appearance !== undefined) return Boolean(stat.appearance);
  if (stat.minutes !== undefined) return Number(stat.minutes) > 0;
  return false;
}

export function getTransferHitForGW(team, gwNum) {
  const gw = Number(gwNum) || 1;
  const state = team?.transferState || {};
  const historical = Number(state.history?.[String(gw)]?.transferCost);
  if (Number.isFinite(historical)) return Math.max(0, historical);
  return Number(state.gw) === gw ? Math.max(0, Number(state.transferCost) || 0) : 0;
}

export function calcTeamPointsBreakdown(players, stats, rawTeam, gwNum) {
  const team = migrateTeam(rawTeam);
  if (!isSquadComplete(players, team)) {
    return { total: 0, playerPoints: 0, transferCost: 0, scoringIds: [], autosubs: [], captainId: team.captainId };
  }
  const statsGW = stats['gw' + gwNum] || {};
  const bbUsed = team.wildcards.benchBoost === gwNum;
  const tcUsed = team.wildcards.tripleCaptain === gwNum;
  const scoringIds = [...team.starters];
  const autosubs = [];

  if (bbUsed) {
    scoringIds.push(...team.bench);
  } else {
    const availableBench = team.bench.filter((id) => didPlayerPlay(statsGW[id] ?? statsGW[String(id)]));
    team.starters.forEach((starterId, starterIndex) => {
      if (didPlayerPlay(statsGW[starterId] ?? statsGW[String(starterId)])) return;
      const replacementId = availableBench.shift();
      if (!replacementId) return;
      scoringIds[starterIndex] = replacementId;
      autosubs.push({ out: starterId, in: replacementId, benchPriority: team.bench.indexOf(replacementId) + 1 });
    });
  }

  let captainId = team.captainId;
  if (!scoringIds.some((id) => String(id) === String(captainId))) {
    const viceIsScoring = scoringIds.some((id) => String(id) === String(team.viceCaptainId));
    captainId = viceIsScoring ? team.viceCaptainId : null;
  }

  let playerPoints = 0;
  scoringIds.filter(Boolean).forEach((pid) => {
    let pts = calcPlayerPoints(pid, statsGW);
    if (String(pid) === String(captainId)) pts *= tcUsed ? 3 : 2;
    playerPoints += pts;
  });
  const transferCost = getTransferHitForGW(team, gwNum);
  return { total: playerPoints - transferCost, playerPoints, transferCost, scoringIds, autosubs, captainId };
}

export function calcTeamPointsForGW(players, stats, team, gwNum) {
  return calcTeamPointsBreakdown(players, stats, team, gwNum).total;
}

export function rollTeamToNextGameweek(rawTeam, closingGw) {
  let team = migrateTeam(rawTeam || defaultTeam());
  const gw = Number(closingGw) || 1;
  const state = team.transferState || {};
  const snapshot = {
    starters: [...team.starters],
    bench: [...team.bench],
    captainId: team.captainId ?? null,
    viceCaptainId: team.viceCaptainId ?? null,
  };
  const wildcardActive = Number(team.wildcards?.wildcard) === gw;
  const freeHitActive = Number(team.wildcards?.freeHit) === gw;
  const freeAtStart = Math.max(0, Math.min(5, Number(state.freeTransfersAtStart ?? state.freeTransfers ?? 1) || 0));
  const freeRemaining = Math.max(0, Math.min(5, Number(state.freeTransfers ?? 1) || 0));

  if (freeHitActive && state.freeHitSnapshot) {
    team = {
      ...team,
      starters: [...(state.freeHitSnapshot.starters || team.starters)],
      bench: [...(state.freeHitSnapshot.bench || team.bench)],
      captainId: state.freeHitSnapshot.captainId ?? null,
      viceCaptainId: state.freeHitSnapshot.viceCaptainId ?? null,
    };
  }

  const protectedTransfers = wildcardActive || freeHitActive;
  const nextFreeTransfers = protectedTransfers ? freeAtStart : Math.min(5, freeRemaining + 1);
  team.transferState = {
    ...state,
    gw: gw + 1,
    freeTransfers: nextFreeTransfers,
    freeTransfersAtStart: nextFreeTransfers,
    transfersMade: 0,
    transferCost: 0,
    gwStartTeam: {
      starters: [...team.starters],
      bench: [...team.bench],
      captainId: team.captainId ?? null,
      viceCaptainId: team.viceCaptainId ?? null,
    },
    freeHitSnapshot: null,
    chipSnapshot: null,
    history: {
      ...(state.history || {}),
      [String(gw)]: {
        ...(state.history?.[String(gw)] || {}),
        transfersMade: Math.max(0, Number(state.transfersMade) || 0),
        transferCost: protectedTransfers ? 0 : getTransferHitForGW(team, gw),
        freeTransfersStart: freeAtStart,
        freeTransfersEnd: freeRemaining,
        chip: wildcardActive ? 'wildcard' : freeHitActive ? 'freeHit' : null,
        squad: snapshot,
      },
    },
  };
  return team;
}
export function totalPlayerPoints(stats, pid) {
  let total = 0;
  Object.keys(stats).forEach((gwKey) => {
    total += calcPlayerPoints(pid, stats[gwKey]);
  });
  return total;
}
export function gwPlayerPoints(stats, gw, pid) {
  return calcPlayerPoints(pid, stats['gw' + gw]);
}
// If the host deletes a player who's already sitting in someone's squad,
// that squad would otherwise keep pointing at an id that no longer exists.
// Clears those dangling references (and the captain, if it was them).
export function sanitizeTeamAgainstPlayers(players, team) {
  const validIds = new Set(players.map((p) => p.id));
  let changed = false;
  const clean = (id) => {
    if (id && !validIds.has(id)) {
      changed = true;
      return null;
    }
    return id;
  };
  const starters = team.starters.map(clean);
  const bench = team.bench.map(clean);
  let captainId = team.captainId;
  if (captainId && !validIds.has(captainId)) {
    captainId = null;
    changed = true;
  }
  let viceCaptainId = team.viceCaptainId;
  if (viceCaptainId && !validIds.has(viceCaptainId)) {
    viceCaptainId = null;
    changed = true;
  }
  return { team: { ...team, starters, bench, captainId, viceCaptainId }, changed };
}

export async function hashPassword(pw) {
  const enc = new TextEncoder().encode('ffl-salt::' + pw);
  if (globalThis.crypto?.subtle) {
    const buf = await globalThis.crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Web Crypto is unavailable on mobile browsers opened through a plain HTTP
  // LAN address. This produces the same SHA-256 bytes without changing stored hashes.
  const words = [];
  const bitLength = enc.length * 8;
  const paddedLength = Math.ceil((enc.length + 9) / 64) * 64;
  const bytes = new Uint8Array(paddedLength);
  bytes.set(enc);
  bytes[enc.length] = 0x80;
  const view = new DataView(bytes.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);

  const constants = [];
  const initial = [];
  let candidate = 2;
  while (constants.length < 64) {
    let prime = true;
    for (let divisor = 2; divisor * divisor <= candidate; divisor += 1) {
      if (candidate % divisor === 0) { prime = false; break; }
    }
    if (prime) {
      if (initial.length < 8) initial.push((Math.sqrt(candidate) % 1 * 0x100000000) >>> 0);
      constants.push((Math.cbrt(candidate) % 1 * 0x100000000) >>> 0);
    }
    candidate += 1;
  }

  const hash = initial;
  const rotateRight = (value, amount) => (value >>> amount) | (value << (32 - amount));
  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) words[index] = view.getUint32(offset + index * 4);
    for (let index = 16; index < 64; index += 1) {
      const x = words[index - 15];
      const y = words[index - 2];
      const s0 = rotateRight(x, 7) ^ rotateRight(x, 18) ^ (x >>> 3);
      const s1 = rotateRight(y, 17) ^ rotateRight(y, 19) ^ (y >>> 10);
      words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = hash;
    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = (h + sum1 + choice + constants[index] + words[index]) >>> 0;
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (sum0 + majority) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    hash[0] = (hash[0] + a) >>> 0; hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0; hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0; hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0; hash[7] = (hash[7] + h) >>> 0;
  }
  return hash.map((value) => value.toString(16).padStart(8, '0')).join('');
}
