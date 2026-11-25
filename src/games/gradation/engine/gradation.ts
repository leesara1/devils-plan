export const TUBE_COUNT = 7;
export const MAX_SUM = 30;
export const COPIES_PER_DIGIT = 2;
export const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export const CHAMPION_STREAK = 2;

export type AIDifficulty = 'normal' | 'hard' | 'master';
export type Side = 0 | 1;

/** A placement is 7 values, non-decreasing left to right (tube 1 -> tube 7). */
export type Placement = number[];

export function placementSum(p: Placement): number {
  return p.reduce((a, b) => a + b, 0);
}

export function digitCounts(values: number[]): number[] {
  const counts = Array(10).fill(0);
  values.forEach((v) => {
    counts[v] += 1;
  });
  return counts;
}

export type PlacementIssue = 'COUNT' | 'ORDER' | 'COPIES' | 'SUM' | 'RANGE';

export function validatePlacement(p: Placement): PlacementIssue | null {
  if (p.length !== TUBE_COUNT) return 'COUNT';
  if (p.some((v) => !Number.isInteger(v) || v < 0 || v > 9)) return 'RANGE';
  for (let i = 1; i < p.length; i += 1) if (p[i] < p[i - 1]) return 'ORDER';
  if (digitCounts(p).some((c) => c > COPIES_PER_DIGIT)) return 'COPIES';
  if (placementSum(p) > MAX_SUM) return 'SUM';
  return null;
}

/* ------------------------------------------------------------------ */
/* Duel                                                                */
/* ------------------------------------------------------------------ */

export interface RoundRecord {
  round: number;
  leader: Side;
  tubes: [number, number]; // tube index per side
  values: [number, number];
  winner: Side | null;
}

export interface DuelState {
  placements: [Placement, Placement];
  used: [boolean[], boolean[]];
  leader: Side;
  /** The tube the leader has put forward this round (value hidden until follow). */
  pendingLead: number | null;
  scores: [number, number];
  history: RoundRecord[];
  finished: boolean;
}

export function createDuel(a: Placement, b: Placement, leader: Side): DuelState {
  return {
    placements: [a, b],
    used: [Array(TUBE_COUNT).fill(false), Array(TUBE_COUNT).fill(false)],
    leader,
    pendingLead: null,
    scores: [0, 0],
    history: [],
    finished: false,
  };
}

export function other(side: Side): Side {
  return side === 0 ? 1 : 0;
}

export function currentRound(duel: DuelState): number {
  return duel.history.length + 1;
}

export function actingSide(duel: DuelState): Side {
  return duel.pendingLead === null ? duel.leader : other(duel.leader);
}

export function remainingTubes(duel: DuelState, side: Side): number[] {
  return duel.used[side].flatMap((u, i) => (u ? [] : [i]));
}

export function playTube(duel: DuelState, side: Side, tube: number): DuelState {
  if (duel.finished || side !== actingSide(duel) || duel.used[side][tube]) return duel;

  if (duel.pendingLead === null) {
    return { ...duel, pendingLead: tube };
  }

  const leader = duel.leader;
  const follower = other(leader);
  const tubes: [number, number] = [0, 0];
  tubes[leader] = duel.pendingLead;
  tubes[follower] = tube;
  const values: [number, number] = [duel.placements[0][tubes[0]], duel.placements[1][tubes[1]]];
  const winner: Side | null = values[0] === values[1] ? null : values[0] > values[1] ? 0 : 1;

  const used: [boolean[], boolean[]] = [[...duel.used[0]], [...duel.used[1]]];
  used[0][tubes[0]] = true;
  used[1][tubes[1]] = true;
  const scores: [number, number] = [...duel.scores];
  if (winner !== null) scores[winner] += 1;

  const history = [
    ...duel.history,
    { round: duel.history.length + 1, leader, tubes, values, winner },
  ];

  return {
    ...duel,
    used,
    scores,
    history,
    pendingLead: null,
    // Previous round's winner leads; on a draw the leader keeps the lead.
    leader: winner ?? leader,
    finished: history.length >= TUBE_COUNT,
  };
}

export function duelWinner(duel: DuelState): Side | null {
  if (!duel.finished) return null;
  if (duel.scores[0] === duel.scores[1]) return null;
  return duel.scores[0] > duel.scores[1] ? 0 : 1;
}

/* ------------------------------------------------------------------ */
/* Tube shades                                                         */
/* ------------------------------------------------------------------ */

/**
 * Tube colour is a gradation that is whitest in the middle (tube 4) and gets
 * darker toward both ends. Tubes 3 & 5, 2 & 6, 1 & 7 share a colour, so when a
 * grey tube is played the opponent cannot tell the smaller side from the larger.
 */
export const CENTER_TUBE = 3;
export const SHADE_COUNT = 4; // 0 = white (centre) … 3 = black (ends)

export function tubeShade(tube: number): number {
  return Math.abs(tube - CENTER_TUBE);
}

export function shadeTubes(shade: number): number[] {
  return shade === 0 ? [CENTER_TUBE] : [CENTER_TUBE - shade, CENTER_TUBE + shade];
}

export const SHADE_NAME_KO = ['흰색', '밝은 회색', '어두운 회색', '검정'] as const;

/** Everything `side` can legitimately see about the opponent's tubes. */
export interface OpponentView {
  /** Revealed values per shade, in the order they were played. */
  revealedByShade: { value: number; round: number }[][];
  /** Shade of the tube the opponent has put forward this round (if they lead). */
  pendingShade: number | null;
}

export function opponentView(duel: DuelState, side: Side): OpponentView {
  const opp = other(side);
  const revealedByShade: OpponentView['revealedByShade'] = Array.from({ length: SHADE_COUNT }, () => []);
  duel.history.forEach((r) => {
    revealedByShade[tubeShade(r.tubes[opp])].push({ value: r.values[opp], round: r.round });
  });
  const pendingShade =
    duel.pendingLead !== null && duel.leader === opp ? tubeShade(duel.pendingLead) : null;
  return { revealedByShade, pendingShade };
}

/**
 * If placement `p` could have produced the revealed values, return which tubes
 * were used (one consistent assignment); otherwise null.
 */
function assignRevealed(p: Placement, view: OpponentView): boolean[] | null {
  const used: boolean[] = Array(TUBE_COUNT).fill(false);
  for (let s = 0; s < SHADE_COUNT; s += 1) {
    const tubes = shadeTubes(s);
    const vals = view.revealedByShade[s].map((r) => r.value);
    if (vals.length > tubes.length) return null;
    for (const v of vals) {
      const t = tubes.find((tube) => !used[tube] && p[tube] === v);
      if (t === undefined) return null;
      used[t] = true;
    }
  }
  if (view.pendingShade !== null && shadeTubes(view.pendingShade).every((t) => used[t])) return null;
  return used;
}

export interface SampledWorld {
  placement: Placement;
  used: boolean[];
  pendingTube: number | null;
}

function viewKey(view: OpponentView): string {
  return `${view.revealedByShade.map((g) => g.map((r) => r.value).join(',')).join('|')}#${view.pendingShade}`;
}

let worldCacheKey = '';
let worldCache: { worlds: { p: Placement; used: boolean[] }[]; cumulative: number[] } | null = null;

function consistentWorlds(view: OpponentView) {
  const key = viewKey(view);
  if (worldCache && worldCacheKey === key) return worldCache;
  const worlds: { p: Placement; used: boolean[] }[] = [];
  allPlacements().forEach((p) => {
    const used = assignRevealed(p, view);
    if (used) worlds.push({ p, used });
  });
  let acc = 0;
  const cumulative = worlds.map((w) => {
    acc += placementWeight(w.p);
    return acc;
  });
  worldCacheKey = key;
  worldCache = { worlds, cumulative };
  return worldCache;
}

/** Sample a full hidden state of the opponent consistent with what we can see. */
export function sampleOpponentWorld(view: OpponentView, rng: () => number = Math.random): SampledWorld {
  const { worlds, cumulative } = consistentWorlds(view);
  if (worlds.length === 0) {
    const placement = samplePlacement(undefined, rng);
    return { placement, used: Array(TUBE_COUNT).fill(false), pendingTube: null };
  }
  const target = rng() * cumulative[cumulative.length - 1];
  let lo = 0;
  let hi = cumulative.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cumulative[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  const { p, used } = worlds[lo];
  let pendingTube: number | null = null;
  if (view.pendingShade !== null) {
    const options = shadeTubes(view.pendingShade).filter((t) => !used[t]);
    pendingTube = options[Math.floor(rng() * options.length)];
  }
  return { placement: [...p], used: [...used], pendingTube };
}

/** For each shade: the range of values its still-hidden tubes could hold. */
export function hiddenShadeRanges(view: OpponentView): ([number, number] | null)[] {
  const ranges: ([number, number] | null)[] = Array(SHADE_COUNT).fill(null);
  const { worlds } = consistentWorlds({ ...view, pendingShade: null });
  worlds.forEach(({ p, used }) => {
    for (let s = 0; s < SHADE_COUNT; s += 1) {
      shadeTubes(s).forEach((t) => {
        if (used[t]) return;
        const r = ranges[s];
        ranges[s] = r ? [Math.min(r[0], p[t]), Math.max(r[1], p[t])] : [p[t], p[t]];
      });
    }
  });
  return ranges;
}

/* ------------------------------------------------------------------ */
/* Sampling placements                                                 */
/* ------------------------------------------------------------------ */

function shuffled<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Every valid placement (non-decreasing, ≤2 of each digit, sum ≤ 30). */
let allPlacementsCache: Placement[] | null = null;

export function allPlacements(): Placement[] {
  if (allPlacementsCache) return allPlacementsCache;
  const out: Placement[] = [];
  const cur: number[] = [];
  const walk = (minDigit: number, sum: number) => {
    if (cur.length === TUBE_COUNT) {
      out.push([...cur]);
      return;
    }
    for (let v = minDigit; v <= 9; v += 1) {
      const used = cur.filter((x) => x === v).length;
      if (used >= COPIES_PER_DIGIT) continue;
      // Remaining tubes need at least v each.
      if (sum + v * (TUBE_COUNT - cur.length) > MAX_SUM) break;
      cur.push(v);
      walk(v, sum + v);
      cur.pop();
    }
  };
  walk(0, 0);
  allPlacementsCache = out;
  return out;
}

/** Real players tend to spend most of the 30-point budget. */
function placementWeight(p: Placement): number {
  const sum = placementSum(p);
  return sum >= 27 ? 1 : sum >= 24 ? 0.45 : sum >= 20 ? 0.15 : 0.04;
}

let filterCacheKey = '';
let filterCache: { list: Placement[]; cumulative: number[] } | null = null;

function consistentPool(known: (number | null)[]) {
  const key = known.map((v) => (v === null ? '_' : String(v))).join('');
  if (filterCache && filterCacheKey === key) return filterCache;
  const list = allPlacements().filter((p) => known.every((v, i) => v === null || p[i] === v));
  let acc = 0;
  const cumulative = list.map((p) => {
    acc += placementWeight(p);
    return acc;
  });
  filterCacheKey = key;
  filterCache = { list, cumulative };
  return filterCache;
}

/**
 * Random valid placement that agrees with the known tube values, drawn from the
 * full set of legal placements (weighted toward budget-heavy ones).
 */
export function samplePlacement(
  known: (number | null)[] = Array(TUBE_COUNT).fill(null),
  rng: () => number = Math.random,
): Placement {
  const { list, cumulative } = consistentPool(known);
  if (list.length === 0) return known.map((v, i) => v ?? i);
  const total = cumulative[cumulative.length - 1];
  const target = rng() * total;
  let lo = 0;
  let hi = cumulative.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cumulative[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return [...list[lo]];
}

/* ------------------------------------------------------------------ */
/* AI                                                                  */
/* ------------------------------------------------------------------ */

const PARAMS: Record<AIDifficulty, { samples: number; placementCandidates: number; noise: number }> = {
  normal: { samples: 0, placementCandidates: 1, noise: 0 },
  hard: { samples: 10, placementCandidates: 6, noise: 0.12 },
  master: { samples: 90, placementCandidates: 48, noise: 0 },
};

/** Greedy perfect-information follow: cheapest winning tube, else dump the lowest. */
function greedyFollow(myValues: number[], myRemaining: number[], target: number): number {
  const sorted = [...myRemaining].sort((a, b) => myValues[a] - myValues[b]);
  const winning = sorted.find((t) => myValues[t] > target);
  return winning ?? sorted[0];
}

function greedyLead(myValues: number[], myRemaining: number[]): number {
  const sorted = [...myRemaining].sort((a, b) => myValues[a] - myValues[b]);
  return sorted[Math.floor(sorted.length / 2)];
}

/** Play out the rest of a duel with greedy policies for both sides. */
function rollout(duel: DuelState): DuelState {
  let d = duel;
  let guard = 0;
  while (!d.finished && guard++ < 20) {
    const side = actingSide(d);
    const values = d.placements[side];
    const rem = remainingTubes(d, side);
    const tube =
      d.pendingLead === null
        ? greedyLead(values, rem)
        : greedyFollow(values, rem, d.placements[other(side)][d.pendingLead]);
    d = playTube(d, side, tube);
  }
  return d;
}

function outcomeFor(d: DuelState, side: Side): number {
  const w = duelWinner(d);
  return w === null ? 0.5 : w === side ? 1 : 0;
}

export function chooseAITube(
  duel: DuelState,
  side: Side,
  difficulty: AIDifficulty,
  rng: () => number = Math.random,
): number {
  const params = PARAMS[difficulty];
  const myValues = duel.placements[side];
  const rem = remainingTubes(duel, side);
  if (rem.length === 1) return rem[0];

  // The AI only sees tube shades and revealed values, never the opponent's positions.
  const view = opponentView(duel, side);
  const opp = other(side);

  if (params.samples === 0) {
    // Simple heuristics with a dash of randomness.
    if (duel.pendingLead === null) {
      return rem[Math.floor(rng() * rem.length)];
    }
    const guesses = Array.from({ length: 6 }, () => {
      const w = sampleOpponentWorld(view, rng);
      return w.pendingTube === null ? 4 : w.placement[w.pendingTube];
    });
    const guess = guesses.reduce((a, b) => a + b, 0) / guesses.length;
    return greedyFollow(myValues, rem, Math.round(guess));
  }

  // Deduplicate tubes with identical values (same effect on play).
  const candidates = rem.filter(
    (t, idx) => rem.findIndex((u) => myValues[u] === myValues[t]) === idx,
  );
  const scores = new Map<number, number>();

  for (let s = 0; s < params.samples; s += 1) {
    const sampled = sampleOpponentWorld(view, rng);
    const used: [boolean[], boolean[]] =
      side === 0 ? [duel.used[0], sampled.used] : [sampled.used, duel.used[1]];
    const world: DuelState = {
      ...duel,
      placements: side === 0 ? [myValues, sampled.placement] : [sampled.placement, myValues],
      used,
      pendingLead: duel.pendingLead !== null && duel.leader === opp ? sampled.pendingTube : duel.pendingLead,
    };
    for (const t of candidates) {
      const after = rollout(playTube(world, side, t));
      scores.set(t, (scores.get(t) ?? 0) + outcomeFor(after, side));
    }
  }

  let best = candidates[0];
  let bestScore = -Infinity;
  for (const t of candidates) {
    const score = (scores.get(t) ?? 0) / params.samples + (rng() - 0.5) * params.noise;
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best;
}

export function chooseAIPlacement(
  difficulty: AIDifficulty,
  rng: () => number = Math.random,
): Placement {
  const params = PARAMS[difficulty];
  if (params.placementCandidates <= 1) return samplePlacement(undefined, rng);

  const opponents = Array.from({ length: 30 }, () => samplePlacement(undefined, rng));
  const scored = Array.from({ length: params.placementCandidates }, () => {
    const cand = samplePlacement(undefined, rng);
    let score = 0;
    opponents.forEach((opp, i) => {
      score += outcomeFor(rollout(createDuel(cand, opp, (i % 2) as Side)), 0);
    });
    return { cand, score };
  }).sort((a, b) => b.score - a.score);

  // Pick among the top few so AIs don't all converge on one "optimal" shape
  // (identical placements make AI-vs-AI duels end in endless draws).
  const top = scored.slice(0, Math.max(3, Math.ceil(scored.length / 6)));
  return top[Math.floor(rng() * top.length)].cand;
}

/** Fully simulate an AI-vs-AI duel (used for duels the human only watches). */
export function simulateAIDuel(
  a: { placement: Placement; difficulty: AIDifficulty },
  b: { placement: Placement; difficulty: AIDifficulty },
  leader: Side,
  rng: () => number = Math.random,
): DuelState {
  let d = createDuel(a.placement, b.placement, leader);
  let guard = 0;
  while (!d.finished && guard++ < 20) {
    const side = actingSide(d);
    const diff = side === 0 ? a.difficulty : b.difficulty;
    d = playTube(d, side, chooseAITube(d, side, diff, rng));
  }
  return d;
}

/* ------------------------------------------------------------------ */
/* 3-player survival (king of the hill)                                */
/* ------------------------------------------------------------------ */

export interface SurvivalState {
  participants: string[]; // ids
  /** The pair in the current duel; index 0 leads round 1. */
  pair: [string, string];
  waiting: string | null;
  streaks: Record<string, number>;
  duelNumber: number;
  champion: string | null;
  results: { duelNumber: number; pair: [string, string]; scores: [number, number]; winner: string | null }[];
}

export function createSurvival(ids: string[], rng: () => number = Math.random): SurvivalState {
  const order = shuffled(ids, rng);
  return {
    participants: ids,
    pair: [order[0], order[1]],
    waiting: order[2] ?? null,
    streaks: Object.fromEntries(ids.map((id) => [id, 0])),
    duelNumber: 1,
    champion: null,
    results: [],
  };
}

/**
 * Record a finished duel. Winner stays on and leads the next duel against the
 * waiting player; the first to win CHAMPION_STREAK duels in a row advances.
 * A drawn duel is replayed by the same pair.
 */
export function recordSurvivalDuel(
  state: SurvivalState,
  scores: [number, number],
  winnerSide: Side | null,
): SurvivalState {
  const results = [
    ...state.results,
    {
      duelNumber: state.duelNumber,
      pair: state.pair,
      scores,
      winner: winnerSide === null ? null : state.pair[winnerSide],
    },
  ];

  if (winnerSide === null) {
    return { ...state, results, duelNumber: state.duelNumber + 1 };
  }

  const winner = state.pair[winnerSide];
  const loser = state.pair[other(winnerSide)];
  const streaks = { ...state.streaks, [winner]: state.streaks[winner] + 1, [loser]: 0 };

  if (streaks[winner] >= CHAMPION_STREAK || state.waiting === null) {
    return { ...state, results, streaks, champion: winner, duelNumber: state.duelNumber + 1 };
  }

  return {
    ...state,
    results,
    streaks,
    pair: [winner, state.waiting],
    waiting: loser,
    duelNumber: state.duelNumber + 1,
  };
}
