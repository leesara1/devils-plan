import { DEFAULT_PLAYER_NAME, pickAiOpponents } from '../../playerProfiles';

export const PLAYER_COUNT = 7;
export const TOTAL_ROUNDS = 7;
export const STARTING_COINS = [1, 1, 1, 2, 2, 2, 3, 3, 5, 10]; // 30 in total

export type Shape = 0 | 1 | 2; // △ ○ ☆
export const SHAPES: Shape[] = [0, 1, 2];
export const SHAPE_SYMBOL = ['△', '○', '☆'] as const;
export const SHAPE_NAME = ['세모', '동그라미', '별'] as const;

/** Shared 3×3 board: △○△ / ○☆○ / ☆○△ */
export const BOARD: Shape[] = [0, 1, 0, 1, 2, 1, 2, 1, 0];
export const BOARD_CAPACITY = SHAPES.map((s) => BOARD.filter((b) => b === s).length); // [3, 4, 2]
export const LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export type AIDifficulty = 'normal' | 'hard' | 'master';
export type Phase = 'CHOOSE' | 'BID' | 'RESULT' | 'FINAL';

export interface Player {
  seat: number;
  id: string;
  name: string;
  isHuman: boolean;
  coins: number[];
  /** Could not bid at least 1 in some round: ranked last. */
  autoLast: boolean;
}

export interface RoundRecord {
  round: number;
  choices: (Shape | null)[];
  /** Secret: what each seat bid (0 = no bid). */
  bids: number[];
  /** Secret: shapes each seat received this round, per shape. */
  awarded: number[][];
  /** Public: winning price per shape (null if nobody chose it). */
  prices: (number | null)[];
  /** Public: the shapes whose price is hidden because it was the highest. */
  secretShapes: Shape[];
}

export interface GameState {
  players: Player[];
  humanSeat: number;
  difficulty: AIDifficulty;
  seatDifficulty?: (AIDifficulty | undefined)[];
  round: number;
  phase: Phase;
  choices: (Shape | null)[];
  bids: (number[] | null)[]; // coins submitted this round
  history: RoundRecord[];
  /** Secret: total shapes held per seat [△, ○, ☆]. */
  holdings: number[][];
}

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function difficultyOf(state: GameState, seat: number): AIDifficulty {
  return state.seatDifficulty?.[seat] ?? state.difficulty;
}

/* ------------------------------------------------------------------ */
/* Board scoring                                                       */
/* ------------------------------------------------------------------ */

function combinations(items: number[], k: number): number[][] {
  if (k <= 0) return [[]];
  if (k > items.length) return [];
  const out: number[][] = [];
  const rec = (start: number, acc: number[]) => {
    if (acc.length === k) {
      out.push([...acc]);
      return;
    }
    for (let i = start; i < items.length; i += 1) {
      acc.push(items[i]);
      rec(i + 1, acc);
      acc.pop();
    }
  };
  rec(0, []);
  return out;
}

export interface Placement {
  filled: boolean[];
  lines: number;
  cells: number;
}

const placementCache = new Map<string, Placement>();

/** Place held shapes on their matching cells to make as many bingo lines as possible. */
export function bestPlacement(holding: number[]): Placement {
  const capped = SHAPES.map((s) => Math.min(holding[s] ?? 0, BOARD_CAPACITY[s]));
  const key = capped.join(',');
  const cached = placementCache.get(key);
  if (cached) return cached;

  const cellsOf = SHAPES.map((s) => BOARD.map((b, i) => (b === s ? i : -1)).filter((i) => i >= 0));
  let best: Placement = { filled: Array(9).fill(false), lines: -1, cells: 0 };
  for (const a of combinations(cellsOf[0], capped[0])) {
    for (const b of combinations(cellsOf[1], capped[1])) {
      for (const c of combinations(cellsOf[2], capped[2])) {
        const filled = Array(9).fill(false);
        [...a, ...b, ...c].forEach((i) => {
          filled[i] = true;
        });
        const lines = LINES.filter((l) => l.every((i) => filled[i])).length;
        if (lines > best.lines) best = { filled, lines, cells: a.length + b.length + c.length };
      }
    }
  }
  placementCache.set(key, best);
  return best;
}

/** Single number for comparing boards: lines dominate, then filled cells. */
export function boardValue(holding: number[]): number {
  const p = bestPlacement(holding);
  return p.lines * 10 + p.cells;
}

/* ------------------------------------------------------------------ */
/* Flow                                                                */
/* ------------------------------------------------------------------ */

export function createGame(difficulty: AIDifficulty): GameState {
  const humanSeat = 0;
  const names = pickAiOpponents(PLAYER_COUNT - 1, [DEFAULT_PLAYER_NAME]);
  return {
    players: Array.from({ length: PLAYER_COUNT }, (_, seat) => ({
      seat,
      id: seat === humanSeat ? 'human' : `ai-${seat}`,
      name: seat === humanSeat ? DEFAULT_PLAYER_NAME : names[seat - 1],
      isHuman: seat === humanSeat,
      coins: [...STARTING_COINS],
      autoLast: false,
    })),
    humanSeat,
    difficulty,
    round: 1,
    phase: 'CHOOSE',
    choices: Array(PLAYER_COUNT).fill(null),
    bids: Array(PLAYER_COUNT).fill(null),
    history: [],
    holdings: Array.from({ length: PLAYER_COUNT }, () => [0, 0, 0]),
  };
}

export function chooseShape(state: GameState, seat: number, shape: Shape): GameState {
  if (state.phase !== 'CHOOSE' || state.choices[seat] !== null) return state;
  const choices = [...state.choices];
  choices[seat] = shape;
  const all = choices.every((c) => c !== null);
  return { ...state, choices, phase: all ? 'BID' : 'CHOOSE' };
}

/** Submit coins (values) for this round's bid. An empty array means no bid possible. */
export function submitBid(state: GameState, seat: number, coins: number[]): GameState {
  if (state.phase !== 'BID' || state.bids[seat] !== null) return state;
  const player = state.players[seat];
  // Validate: coins must come from the player's purse.
  const purse = [...player.coins];
  for (const c of coins) {
    const i = purse.indexOf(c);
    if (i < 0) return state;
    purse.splice(i, 1);
  }
  if (coins.length === 0 && player.coins.length > 0) return state; // must bid at least 1
  const bids = [...state.bids];
  bids[seat] = [...coins];
  const next = { ...state, bids };
  return bids.every((b) => b !== null) ? resolveRound(next) : next;
}

function resolveRound(state: GameState): GameState {
  const players = state.players.map((p) => ({ ...p, coins: [...p.coins] }));
  const bidTotals = state.bids.map((b) => sum(b ?? []));
  // All-pay: every submitted coin is collected, win or lose.
  state.bids.forEach((b, seat) => {
    const p = players[seat];
    if (!b || b.length === 0) {
      p.autoLast = true;
      return;
    }
    b.forEach((c) => {
      p.coins.splice(p.coins.indexOf(c), 1);
    });
  });

  const awarded = Array.from({ length: PLAYER_COUNT }, () => [0, 0, 0]);
  const prices: (number | null)[] = [null, null, null];
  SHAPES.forEach((shape) => {
    const group = state.choices.map((c, s) => (c === shape ? s : -1)).filter((s) => s >= 0);
    if (group.length === 0) return;
    const bidders = group.filter((s) => bidTotals[s] > 0);
    if (bidders.length === 0) return;
    const top = Math.max(...bidders.map((s) => bidTotals[s]));
    prices[shape] = top;
    const winners = bidders.filter((s) => bidTotals[s] === top);
    // The winner takes as many shapes as people chose it; ties split, leftovers discarded.
    const share = Math.floor(group.length / winners.length);
    winners.forEach((s) => {
      awarded[s][shape] += share;
    });
  });

  // The single most expensive shape keeps its price secret. If several shapes
  // share the top price there is no single "most expensive" one, so all are shown.
  const known = prices.filter((p): p is number => p !== null);
  const maxPrice = known.length ? Math.max(...known) : null;
  const atMax = SHAPES.filter((s) => maxPrice !== null && prices[s] === maxPrice);
  const secretShapes = atMax.length === 1 ? atMax : [];

  const holdings = state.holdings.map((h, seat) => h.map((n, s) => n + awarded[seat][s]));
  const record: RoundRecord = {
    round: state.round,
    choices: state.choices,
    bids: bidTotals,
    awarded,
    prices,
    secretShapes,
  };
  return { ...state, players, holdings, history: [...state.history, record], phase: 'RESULT' };
}

export function nextRound(state: GameState): GameState {
  if (state.phase !== 'RESULT') return state;
  if (state.round >= TOTAL_ROUNDS) return { ...state, phase: 'FINAL' };
  return {
    ...state,
    round: state.round + 1,
    phase: 'CHOOSE',
    choices: Array(PLAYER_COUNT).fill(null),
    bids: Array(PLAYER_COUNT).fill(null),
  };
}

/** Public view of a round: the price shown for a shape, or 'secret'. */
export function shownPrice(rec: RoundRecord, shape: Shape): number | 'secret' | null {
  if (rec.prices[shape] === null) return null;
  return rec.secretShapes.includes(shape) ? 'secret' : (rec.prices[shape] as number);
}

export interface Standing {
  seat: number;
  rank: number;
  lines: number;
  cells: number;
  coins: number;
  placement: Placement;
  autoLast: boolean;
}

export function finalStandings(state: GameState): Standing[] {
  const rows = state.players.map((p) => {
    const placement = bestPlacement(state.holdings[p.seat]);
    return {
      seat: p.seat,
      rank: 0,
      lines: placement.lines,
      cells: placement.cells,
      coins: sum(p.coins),
      placement,
      autoLast: p.autoLast,
    };
  });
  const key = (r: Standing) => [r.autoLast ? 0 : 1, r.lines, r.cells, r.coins];
  const cmp = (a: Standing, b: Standing) => {
    const ka = key(a);
    const kb = key(b);
    for (let i = 0; i < ka.length; i += 1) if (ka[i] !== kb[i]) return kb[i] - ka[i];
    return 0;
  };
  rows.sort(cmp);
  rows.forEach((r, i) => {
    r.rank = i > 0 && cmp(rows[i - 1], r) === 0 ? rows[i - 1].rank : i + 1;
  });
  return rows;
}

/* ------------------------------------------------------------------ */
/* AI                                                                  */
/* ------------------------------------------------------------------ */

/**
 * What a seat can infer about its own shapes from public prices and its own
 * bids: if its bid equals the shown price it (at least co-)won; a hidden price
 * is the round's highest, so a bid above every shown price probably won it.
 */
export function inferredHoldings(state: GameState, seat: number): number[] {
  const h = [0, 0, 0];
  state.history.forEach((rec) => {
    const shape = rec.choices[seat];
    const bid = rec.bids[seat];
    if (shape === null || bid <= 0) return;
    const n = rec.choices.filter((c) => c === shape).length;
    const shown = shownPrice(rec, shape);
    const visible = SHAPES.map((s) => shownPrice(rec, s)).filter((p): p is number => typeof p === 'number');
    const won = shown === 'secret' ? visible.every((p) => bid > p) : shown === bid;
    if (won) h[shape] += n;
  });
  return h;
}

export const PARAMS: Record<AIDifficulty, { greed: number; noise: number; smartShape: boolean; crowdWeight: number }> = {
  normal: { greed: 0.9, noise: 0.6, smartShape: false, crowdWeight: 0 },
  hard: { greed: 0.65, noise: 0.6, smartShape: true, crowdWeight: 0 },
  master: { greed: 0.4, noise: 0.1, smartShape: true, crowdWeight: 0 },
};

/** How much `k` more of `shape` would improve this board. */
function marginal(holding: number[], shape: Shape, k: number): number {
  const after = [...holding];
  after[shape] += k;
  return boardValue(after) - boardValue(holding);
}

export function chooseAIShape(state: GameState, seat: number, rng: () => number = Math.random): Shape {
  const params = PARAMS[difficultyOf(state, seat)];
  if (!params.smartShape) return SHAPES[Math.floor(rng() * 3)];
  const mine = inferredHoldings(state, seat);
  // Past popularity of each shape: crowded boxes cost more to win.
  const crowd = SHAPES.map(
    (s) => state.history.reduce((a, r) => a + r.choices.filter((c) => c === s).length, 0) / Math.max(1, state.history.length),
  );
  const scored = SHAPES.map((s) => {
    const gain = marginal(mine, s, 2);
    const crowdPenalty = crowd[s] * params.crowdWeight; // >0 avoids popular boxes, <0 seeks them
    return { s, score: gain - crowdPenalty + (rng() - 0.5) * 6 * params.noise };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].s;
}

/** Pick coins summing as close to `target` as possible without exceeding it (at least one coin). */
function coinsFor(target: number, spendable: number[]): number[] {
  const sorted = [...spendable].sort((a, b) => a - b);
  let best: number[] = [];
  let bestSum = 0;
  const n = sorted.length;
  for (let mask = 1; mask < 1 << n; mask += 1) {
    let s = 0;
    const pick: number[] = [];
    for (let i = 0; i < n; i += 1) {
      if (mask & (1 << i)) {
        s += sorted[i];
        pick.push(sorted[i]);
      }
    }
    if (s <= target && (s > bestSum || (s === bestSum && pick.length < best.length))) {
      best = pick;
      bestSum = s;
    }
  }
  return best.length ? best : sorted.length ? [sorted[0]] : [];
}

export function chooseAIBid(state: GameState, seat: number, rng: () => number = Math.random): number[] {
  const player = state.players[seat];
  if (player.coins.length === 0) return [];
  const params = PARAMS[difficultyOf(state, seat)];
  const shape = state.choices[seat] as Shape;
  const group = state.choices.filter((c) => c === shape).length;
  const roundsLeftAfter = TOTAL_ROUNDS - state.round;

  // Keep the smallest coins in reserve so every later round can still be bid.
  const sorted = [...player.coins].sort((a, b) => a - b);
  const reserve = sorted.slice(0, Math.min(roundsLeftAfter, sorted.length - 1));
  const spendable = sorted.slice(reserve.length);

  if (group === 1) return [spendable[0]]; // uncontested: cheapest coin wins it

  const mine = inferredHoldings(state, seat);
  const value = marginal(mine, shape, group);
  if (value <= 0) return [spendable[0]];

  const budget = sum(spendable);
  const urgency = 1 + (TOTAL_ROUNDS - roundsLeftAfter) / TOTAL_ROUNDS; // spend more as the game ends
  const raw = budget * params.greed * (value / 12) * urgency * (1 + (rng() - 0.5) * 2 * params.noise);
  const target = Math.max(1, Math.min(budget, Math.round(raw)));
  return coinsFor(target, spendable);
}

/** Let every AI seat act for the current phase. */
export function stepAI(state: GameState, rng: () => number = Math.random, controlAll = false): GameState {
  // Act only for the phase we started in, so a phase change mid-loop
  // (e.g. the last choice opening bidding) doesn't let AIs act early.
  const phase = state.phase;
  let next = state;
  next.players.forEach((p) => {
    if (!controlAll && p.isHuman) return;
    if (phase === 'CHOOSE' && next.phase === 'CHOOSE' && next.choices[p.seat] === null) {
      next = chooseShape(next, p.seat, chooseAIShape(next, p.seat, rng));
    } else if (phase === 'BID' && next.phase === 'BID' && next.bids[p.seat] === null) {
      next = submitBid(next, p.seat, chooseAIBid(next, p.seat, rng));
    }
  });
  return next;
}
