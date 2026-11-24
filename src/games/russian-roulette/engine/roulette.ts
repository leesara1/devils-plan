import { DEFAULT_PLAYER_NAME, pickAiOpponents } from '../../playerProfiles';

export const SEAT_COUNT = 6;
export const BULLET_COUNT = 2;
export const STARTING_CREDITS = 16;
export const MANIPULATION_TARGET = 6;
export const GAME_END_BROKE_COUNT = 3;

export type AIDifficulty = 'normal' | 'hard' | 'master';

export type RouletteAction =
  | { kind: 'PUBLIC_SCAN'; pairStart: number }
  | { kind: 'PRIVATE_SCAN'; pairStart: number }
  | { kind: 'ROTATE'; steps: 1 | 2 }
  | { kind: 'MANIPULATE'; amount: 1 | 2 | 3; swapPairStart: number | null };

export type RouletteActionKind = RouletteAction['kind'];

export const ACTION_META: Record<
  RouletteActionKind,
  { labelKo: string; descKo: string }
> = {
  PUBLIC_SCAN: { labelKo: '공개 조사', descKo: '인접 약실 2개를 모두에게 공개' },
  PRIVATE_SCAN: { labelKo: '비공개 조사', descKo: '인접 약실 2개를 나만 확인' },
  ROTATE: { labelKo: '회전', descKo: '총구를 시계 방향으로 1칸(3) 또는 2칸(4)' },
  MANIPULATE: { labelKo: '조작', descKo: '1~3 크레딧씩 비공개 적립, 합 6이면 인접 약실 2개 교환' },
};

export function actionCost(action: RouletteAction): number {
  switch (action.kind) {
    case 'PUBLIC_SCAN':
      return 1;
    case 'PRIVATE_SCAN':
      return 2;
    case 'ROTATE':
      return action.steps === 1 ? 3 : 4;
    case 'MANIPULATE':
      return action.amount;
  }
}

export interface ChamberIntel {
  bullet: boolean;
  learnedAtTurn: number;
  round: number;
  source: 'public' | 'private' | 'swap';
}

export interface RoulettePlayer {
  seat: number;
  id: string;
  name: string;
  isHuman: boolean;
  credits: number;
  manipProgress: number;
  manipSpentTotal: number;
  swapsDone: number;
}

export interface RouletteLogEntry {
  id: number;
  turn: number;
  round: number;
  seat: number;
  kind: RouletteActionKind | 'PASS';
  cost: number;
  pairStart?: number;
  steps?: 1 | 2;
  /** Visible to everyone (public scan) */
  publicResult?: [boolean, boolean];
  /** Visible only to the actor (private scan) */
  privateResult?: [boolean, boolean];
  /** Hidden manipulation details (only the actor knows) */
  secretAmount?: number;
  secretSwapPairStart?: number | null;
}

export interface ManipulationEvent {
  turn: number;
  seat: number;
}

export type RoulettePhase = 'PLAYING' | 'FIRING' | 'RESULT';

export interface RouletteState {
  players: RoulettePlayer[]; // index === seat
  humanSeat: number;
  difficulty: AIDifficulty;
  /** chambers[c] === true -> bullet loaded in chamber c */
  chambers: boolean[];
  /** Unbounded rotation counter. Muzzle points at seat (rotation mod 6). */
  rotation: number;
  round: number;
  roundStartSeat: number;
  actedThisRound: number;
  turnSeat: number;
  turnCounter: number;
  intel: (ChamberIntel | null)[][]; // [seat][chamber]
  manipEvents: ManipulationEvent[];
  log: RouletteLogEntry[];
  phase: RoulettePhase;
}

export function mod(n: number, m: number = SEAT_COUNT): number {
  return ((n % m) + m) % m;
}

export function chamberAtSeat(seat: number, rotation: number): number {
  return mod(seat - rotation);
}

export function seatFacingChamber(chamber: number, rotation: number): number {
  return mod(chamber + rotation);
}

export function muzzleSeat(rotation: number): number {
  return mod(rotation);
}

export function pairChambers(pairStart: number): [number, number] {
  return [mod(pairStart), mod(pairStart + 1)];
}

export function brokeCount(state: RouletteState): number {
  return state.players.filter((p) => p.credits <= 0).length;
}

function shuffleIndices(count: number, rng: () => number): number[] {
  const arr = Array.from({ length: count }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createInitialRouletteState(
  difficulty: AIDifficulty,
  rng: () => number = Math.random,
): RouletteState {
  const humanSeat = Math.floor(rng() * SEAT_COUNT);
  const aiNames = pickAiOpponents(SEAT_COUNT - 1, [DEFAULT_PLAYER_NAME]);
  let aiIdx = 0;

  const players: RoulettePlayer[] = Array.from({ length: SEAT_COUNT }, (_, seat) => {
    const isHuman = seat === humanSeat;
    return {
      seat,
      id: isHuman ? 'human' : `ai-${seat}`,
      name: isHuman ? DEFAULT_PLAYER_NAME : aiNames[aiIdx++],
      isHuman,
      credits: STARTING_CREDITS,
      manipProgress: 0,
      manipSpentTotal: 0,
      swapsDone: 0,
    };
  });

  const bulletChambers = shuffleIndices(SEAT_COUNT, rng).slice(0, BULLET_COUNT);
  const chambers = Array.from({ length: SEAT_COUNT }, (_, c) => bulletChambers.includes(c));

  return {
    players,
    humanSeat,
    difficulty,
    chambers,
    rotation: Math.floor(rng() * SEAT_COUNT),
    round: 1,
    roundStartSeat: 0,
    actedThisRound: 0,
    turnSeat: 0,
    turnCounter: 0,
    intel: Array.from({ length: SEAT_COUNT }, () => Array(SEAT_COUNT).fill(null)),
    manipEvents: [],
    log: [],
    phase: 'PLAYING',
  };
}

export function isActionAffordable(player: RoulettePlayer, action: RouletteAction): boolean {
  return player.credits >= actionCost(action);
}

export function manipulationWouldComplete(player: RoulettePlayer, amount: number): boolean {
  return player.manipProgress + amount >= MANIPULATION_TARGET;
}

/** Number of manipulation submissions by OTHER players after `turn`. */
export function othersManipulationsSince(
  state: RouletteState,
  seat: number,
  turn: number,
): number {
  return state.manipEvents.filter((e) => e.seat !== seat && e.turn > turn).length;
}

/**
 * Advance to the next player who still has credits, logging automatic passes
 * for players who have spent everything.
 */
function advanceTurn(state: RouletteState): RouletteState {
  let { turnSeat, actedThisRound, round, roundStartSeat, turnCounter } = state;
  const log = [...state.log];

  for (let guard = 0; guard < SEAT_COUNT * 3; guard += 1) {
    actedThisRound += 1;
    if (actedThisRound >= SEAT_COUNT) {
      round += 1;
      roundStartSeat = mod(roundStartSeat + 1);
      turnSeat = roundStartSeat;
      actedThisRound = 0;
    } else {
      turnSeat = mod(turnSeat + 1);
    }

    if (state.players[turnSeat].credits > 0) break;

    log.push({
      id: log.length + 1,
      turn: turnCounter,
      round,
      seat: turnSeat,
      kind: 'PASS',
      cost: 0,
    });
  }

  return { ...state, turnSeat, actedThisRound, round, roundStartSeat, log };
}

export function applyRouletteAction(
  state: RouletteState,
  seat: number,
  action: RouletteAction,
): RouletteState {
  if (state.phase !== 'PLAYING' || seat !== state.turnSeat) return state;
  const actor = state.players[seat];
  const cost = actionCost(action);
  if (actor.credits < cost || cost <= 0) return state;

  const turn = state.turnCounter + 1;
  let chambers = state.chambers;
  let rotation = state.rotation;
  let intel = state.intel;
  let manipEvents = state.manipEvents;
  const players = state.players.map((p) => ({ ...p }));
  const me = players[seat];
  me.credits -= cost;

  const entry: RouletteLogEntry = {
    id: state.log.length + 1,
    turn,
    round: state.round,
    seat,
    kind: action.kind,
    cost,
  };

  switch (action.kind) {
    case 'PUBLIC_SCAN':
    case 'PRIVATE_SCAN': {
      const [a, b] = pairChambers(action.pairStart);
      const result: [boolean, boolean] = [chambers[a], chambers[b]];
      const isPublic = action.kind === 'PUBLIC_SCAN';
      const source = isPublic ? 'public' : 'private';
      intel = intel.map((row, s) => {
        if (!isPublic && s !== seat) return row;
        const next = [...row];
        next[a] = { bullet: result[0], learnedAtTurn: turn, round: state.round, source };
        next[b] = { bullet: result[1], learnedAtTurn: turn, round: state.round, source };
        return next;
      });
      entry.pairStart = mod(action.pairStart);
      if (isPublic) entry.publicResult = result;
      else entry.privateResult = result;
      break;
    }
    case 'ROTATE': {
      rotation += action.steps;
      entry.steps = action.steps;
      break;
    }
    case 'MANIPULATE': {
      me.manipProgress += action.amount;
      me.manipSpentTotal += action.amount;
      entry.secretAmount = action.amount;
      manipEvents = [...manipEvents, { turn, seat }];
      if (me.manipProgress >= MANIPULATION_TARGET) {
        me.manipProgress = 0; // excess credits vanish
        const pairStart = mod(action.swapPairStart ?? 0);
        const [a, b] = pairChambers(pairStart);
        chambers = [...chambers];
        [chambers[a], chambers[b]] = [chambers[b], chambers[a]];
        me.swapsDone += 1;
        intel = intel.map((row, s) => {
          if (s !== seat) return row;
          const next = [...row];
          const ia = next[a];
          const ib = next[b];
          next[a] = ib ? { ...ib, source: 'swap' } : null;
          next[b] = ia ? { ...ia, source: 'swap' } : null;
          return next;
        });
        entry.secretSwapPairStart = pairStart;
      } else {
        entry.secretSwapPairStart = null;
      }
      break;
    }
  }

  let next: RouletteState = {
    ...state,
    players,
    chambers,
    rotation,
    intel,
    manipEvents,
    turnCounter: turn,
    log: [...state.log, entry],
  };

  if (brokeCount(next) >= GAME_END_BROKE_COUNT) {
    return { ...next, phase: 'FIRING' };
  }

  next = advanceTurn(next);
  return next;
}

export interface FiringShot {
  order: number;
  seat: number;
  chamber: number;
  bullet: boolean;
}

/** Fire from the muzzle seat clockwise; seat s receives the chamber facing it. */
export function computeFiringSequence(state: RouletteState): FiringShot[] {
  const start = muzzleSeat(state.rotation);
  return Array.from({ length: SEAT_COUNT }, (_, i) => {
    const seat = mod(start + i);
    const chamber = chamberAtSeat(seat, state.rotation);
    return { order: i + 1, seat, chamber, bullet: state.chambers[chamber] };
  });
}

export function eliminatedSeats(state: RouletteState): number[] {
  return computeFiringSequence(state)
    .filter((s) => s.bullet)
    .map((s) => s.seat);
}

/* ------------------------------------------------------------------ */
/* AI                                                                  */
/* ------------------------------------------------------------------ */

const DIFFICULTY_PARAMS: Record<
  AIDifficulty,
  { noise: number; naiveIntel: boolean; endgameAware: boolean }
> = {
  normal: { noise: 14, naiveIntel: true, endgameAware: false },
  hard: { noise: 5, naiveIntel: false, endgameAware: true },
  master: { noise: 1.5, naiveIntel: false, endgameAware: true },
};

/**
 * Bayesian estimate over the 15 possible bullet layouts, discounting intel that
 * may have been invalidated by other players' (secret) manipulations.
 */
export function estimateBulletProbabilities(
  state: RouletteState,
  seat: number,
  naive: boolean = false,
): number[] {
  const row = state.intel[seat];
  const reliabilities = row.map((info) => {
    if (!info) return null;
    const k = naive ? 0 : othersManipulationsSince(state, seat, info.learnedAtTurn);
    return k === 0 ? 0.995 : Math.max(0.55, 0.88 - 0.1 * (k - 1));
  });

  const weights = Array(SEAT_COUNT).fill(0);
  let total = 0;
  for (let i = 0; i < SEAT_COUNT; i += 1) {
    for (let j = i + 1; j < SEAT_COUNT; j += 1) {
      let w = 1;
      for (let c = 0; c < SEAT_COUNT; c += 1) {
        const info = row[c];
        const conf = reliabilities[c];
        if (!info || conf === null) continue;
        const isBullet = c === i || c === j;
        w *= isBullet === info.bullet ? conf : 1 - conf;
      }
      total += w;
      weights[i] += w;
      weights[j] += w;
    }
  }
  if (total <= 0) return Array(SEAT_COUNT).fill(BULLET_COUNT / SEAT_COUNT);
  return weights.map((w) => w / total);
}

interface ScoredAction {
  action: RouletteAction;
  score: number;
}

export function chooseAIAction(
  state: RouletteState,
  seat: number,
  rng: () => number = Math.random,
): RouletteAction {
  const params = DIFFICULTY_PARAMS[state.difficulty];
  const me = state.players[seat];
  const p = estimateBulletProbabilities(state, seat, params.naiveIntel);
  const r = state.rotation;
  const m0 = chamberAtSeat(seat, r);
  const danger = (rot: number) => p[chamberAtSeat(seat, rot)];
  const d0 = danger(r);

  const safe = d0 < 0.12;
  let lambda = 2.2;
  if (safe) lambda = params.endgameAware ? -1.2 : 0.8;
  if (!safe && me.credits <= 5) lambda += 2.5;
  if (params.endgameAware && !safe && brokeCount(state) >= GAME_END_BROKE_COUNT - 1) {
    // One more broke player ends the game: fixing danger now is urgent.
    lambda -= 1.5;
  }

  const relevance: Record<number, number> = {
    [m0]: 1,
    [mod(m0 - 1)]: 0.5,
    [mod(m0 - 2)]: 0.35,
    [mod(m0 + 1)]: 0.3,
  };
  const infoValue = (pairStart: number) =>
    pairChambers(pairStart).reduce((sum, c) => {
      const w = relevance[c] ?? 0.1;
      return sum + w * p[c] * (1 - p[c]) * 4 * 28;
    }, 0);

  const candidates: ScoredAction[] = [];
  const push = (action: RouletteAction, base: number) => {
    if (!isActionAffordable(me, action)) return;
    const noise = (rng() - 0.5) * 2 * params.noise;
    candidates.push({ action, score: base - actionCost(action) * lambda + noise });
  };

  for (let c = 0; c < SEAT_COUNT; c += 1) {
    const info = infoValue(c);
    push({ kind: 'PUBLIC_SCAN', pairStart: c }, info * 0.7);
    push({ kind: 'PRIVATE_SCAN', pairStart: c }, info);
  }

  push({ kind: 'ROTATE', steps: 1 }, (d0 - danger(r + 1)) * 100);
  push({ kind: 'ROTATE', steps: 2 }, (d0 - danger(r + 2)) * 100);

  const swapGain = Math.max(0, d0 - Math.min(p[mod(m0 - 1)], p[mod(m0 + 1)])) * 100;
  const needed = MANIPULATION_TARGET - me.manipProgress;
  for (const amount of [1, 2, 3] as const) {
    if (amount > me.credits) continue;
    const completes = amount >= needed;
    // A finished swap also has hedge value (it silently corrupts rivals' intel),
    // and credits already sunk into the counter make finishing more attractive.
    const hedge = params.endgameAware ? 6 : 3;
    const sunk = me.manipProgress * 1.5;
    const base = completes
      ? hedge + sunk + swapGain * 0.85 - (amount - needed) * 1.5
      : (hedge * 0.5 + swapGain * 0.35) * (amount / needed) + sunk * 0.5;
    push(
      {
        kind: 'MANIPULATE',
        amount,
        swapPairStart: completes ? chooseAISwapPair(p, m0, rng) : null,
      },
      base,
    );
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.action ?? { kind: 'PUBLIC_SCAN', pairStart: m0 };
}

function chooseAISwapPair(p: number[], myChamber: number, rng: () => number): number {
  const left = mod(myChamber - 1);
  const right = mod(myChamber + 1);
  const d0 = p[myChamber];
  const best = p[left] <= p[right] ? left : right;
  if (d0 > p[best] + 0.02) {
    // pairStart is the lower index of the clockwise pair
    return best === left ? left : myChamber;
  }
  // Already safe: shuffle a pair that does not touch my chamber
  const options = Array.from({ length: SEAT_COUNT }, (_, c) => c).filter(
    (c) => c !== myChamber && mod(c + 1) !== myChamber,
  );
  return options[Math.floor(rng() * options.length)];
}
