import { DEFAULT_PLAYER_NAME, pickAiOpponents } from '../../playerProfiles';

export const PLAYER_COUNT = 5;
export const STARTING_CHIPS = 30;
export const DEAL_COUNT = 3;
export const ROUNDS_PER_BET_STEP = 10;
export const LIMIT_MIN = 5; // 8-sided die: 5..12
export const LIMIT_MAX = 12;
export const MAX_RAISES_PER_STREET = 4;

/** value -> copies: 7×1, 6×2, 5×3, 4×4, 3×5, 2×6, 1×7, -1×7 (35 cards). */
export const DECK_COMPOSITION: [number, number][] = [
  [7, 1],
  [6, 2],
  [5, 3],
  [4, 4],
  [3, 5],
  [2, 6],
  [1, 7],
  [-1, 7],
];

export type AIDifficulty = 'normal' | 'hard' | 'master';
export type Phase = 'REVEAL' | 'BET1' | 'HIT' | 'BET2' | 'SHOWDOWN' | 'GAME_OVER';

export interface HCard {
  id: number;
  value: number;
}

export interface Player {
  seat: number;
  id: string;
  name: string;
  isHuman: boolean;
  chips: number;
  /** Final placing once eliminated (or 1 for the winner). */
  finishRank: number | null;
  eliminatedRound: number | null;
}

export interface Hand {
  cards: HCard[]; // the 3 dealt cards
  revealedIndex: number | null;
  hits: HCard[];
  folded: boolean;
  stayed: boolean;
  committedRound: number;
  committedStreet: number;
  acted: boolean;
}

export type BetAction = { type: 'fold' } | { type: 'call' } | { type: 'raise'; amount: number };

export interface LogEntry {
  id: number;
  round: number;
  seat: number | null;
  text: string;
}

export interface RoundResult {
  winners: number[];
  payouts: Record<number, number>;
  sums: Record<number, number>;
  byFold: boolean;
  allBusted: boolean;
  pot: number;
}

export interface GameState {
  players: Player[];
  humanSeat: number;
  difficulty: AIDifficulty;
  /** Optional per-seat override (used for testing mixed tables). */
  seatDifficulty?: (AIDifficulty | undefined)[];
  round: number;
  dealerSeat: number;
  limit: number;
  baseBet: number;
  pot: number;
  deck: HCard[];
  hands: (Hand | null)[]; // null = eliminated
  phase: Phase;
  turnSeat: number | null;
  currentBet: number;
  streetCap: number;
  raisesThisStreet: number;
  result: RoundResult | null;
  log: LogEntry[];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function handSum(hand: Hand): number {
  return [...hand.cards, ...hand.hits].reduce((s, c) => s + c.value, 0);
}

export function cardCount(hand: Hand): number {
  return hand.cards.length + hand.hits.length;
}

export function isActive(state: GameState, seat: number): boolean {
  return state.hands[seat] !== null;
}

export function inHand(state: GameState, seat: number): boolean {
  const h = state.hands[seat];
  return !!h && !h.folded;
}

export function inHandSeats(state: GameState): number[] {
  return state.players.map((p) => p.seat).filter((s) => inHand(state, s));
}

export function activeSeats(state: GameState): number[] {
  return state.players.map((p) => p.seat).filter((s) => isActive(state, s));
}

/** Seats in clockwise order starting with `from` (inclusive). */
function clockwise(from: number): number[] {
  return Array.from({ length: PLAYER_COUNT }, (_, i) => (from + i) % PLAYER_COUNT);
}

function nextSeat(state: GameState, after: number, pred: (seat: number) => boolean): number | null {
  for (let i = 1; i <= PLAYER_COUNT; i += 1) {
    const s = (after + i) % PLAYER_COUNT;
    if (pred(s)) return s;
  }
  return null;
}

function buildDeck(rng: () => number): HCard[] {
  const deck: HCard[] = [];
  let id = 0;
  DECK_COMPOSITION.forEach(([value, copies]) => {
    for (let i = 0; i < copies; i += 1) deck.push({ id: id++, value });
  });
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function addLog(state: GameState, seat: number | null, text: string): LogEntry[] {
  return [...state.log, { id: state.log.length + 1, round: state.round, seat, text }].slice(-200);
}

function cloneHands(state: GameState): (Hand | null)[] {
  return state.hands.map((h) => (h ? { ...h, cards: [...h.cards], hits: [...h.hits] } : null));
}

/* ------------------------------------------------------------------ */
/* Game flow                                                           */
/* ------------------------------------------------------------------ */

export function createGame(difficulty: AIDifficulty, rng: () => number = Math.random): GameState {
  const humanSeat = 0;
  const names = pickAiOpponents(PLAYER_COUNT - 1, [DEFAULT_PLAYER_NAME]);
  const players: Player[] = Array.from({ length: PLAYER_COUNT }, (_, seat) => ({
    seat,
    id: seat === humanSeat ? 'human' : `ai-${seat}`,
    name: seat === humanSeat ? DEFAULT_PLAYER_NAME : names[seat - 1],
    isHuman: seat === humanSeat,
    chips: STARTING_CHIPS,
    finishRank: null,
    eliminatedRound: null,
  }));
  const base: GameState = {
    players,
    humanSeat,
    difficulty,
    round: 0,
    dealerSeat: Math.floor(rng() * PLAYER_COUNT), // drawn by lottery ball
    limit: LIMIT_MIN,
    baseBet: 1,
    pot: 0,
    deck: [],
    hands: Array(PLAYER_COUNT).fill(null),
    phase: 'SHOWDOWN',
    turnSeat: null,
    currentBet: 0,
    streetCap: 0,
    raisesThisStreet: 0,
    result: null,
    log: [],
  };
  return startRound(base, rng, true);
}

/** Roll the limit die, collect the base bet, deal 3 cards each. */
export function startRound(prev: GameState, rng: () => number = Math.random, first = false): GameState {
  const alive = prev.players.filter((p) => p.finishRank === null);
  if (alive.length <= 1) return { ...prev, phase: 'GAME_OVER', turnSeat: null };

  const round = prev.round + 1;
  // First round keeps the drawn first player; afterwards it passes to the left.
  const dealerSeat = first
    ? prev.dealerSeat
    : (nextSeat(prev, prev.dealerSeat, (s) => prev.players[s].finishRank === null) as number);
  const baseBet = 1 + Math.floor((round - 1) / ROUNDS_PER_BET_STEP);
  const limit = LIMIT_MIN + Math.floor(rng() * (LIMIT_MAX - LIMIT_MIN + 1));
  const deck = buildDeck(rng);

  let pot = 0;
  const players = prev.players.map((p) => ({ ...p }));
  const hands: (Hand | null)[] = players.map((p) => {
    if (p.finishRank !== null) return null;
    const ante = Math.min(baseBet, p.chips);
    p.chips -= ante;
    pot += ante;
    return {
      cards: deck.splice(0, DEAL_COUNT),
      revealedIndex: null,
      hits: [],
      folded: false,
      stayed: false,
      committedRound: ante,
      committedStreet: 0,
      acted: false,
    };
  });

  const state: GameState = {
    ...prev,
    players,
    round,
    dealerSeat,
    baseBet,
    limit,
    deck,
    pot,
    hands,
    phase: 'REVEAL',
    turnSeat: null,
    currentBet: 0,
    streetCap: 0,
    raisesThisStreet: 0,
    result: null,
  };
  return {
    ...state,
    log: addLog(state, null, `${round}라운드 · 한계 숫자 ${limit} · 기본 베팅 ${baseBet}`),
  };
}

/** Each player picks one of their 3 cards to show everyone. */
export function setReveal(state: GameState, seat: number, index: number): GameState {
  if (state.phase !== 'REVEAL') return state;
  const hands = cloneHands(state);
  const h = hands[seat];
  if (!h || h.revealedIndex !== null || index < 0 || index >= h.cards.length) return state;
  h.revealedIndex = index;
  let next: GameState = { ...state, hands };
  if (hands.every((x) => !x || x.revealedIndex !== null)) {
    next = beginStreet(next, 'BET1');
  }
  return next;
}

function beginStreet(state: GameState, phase: 'BET1' | 'BET2'): GameState {
  const hands = cloneHands(state);
  const seats = inHandSeats(state);
  seats.forEach((s) => {
    const h = hands[s] as Hand;
    h.committedStreet = 0;
    h.acted = false;
  });
  // Bets are capped by the smallest stack still in the hand, so everyone can always call.
  const streetCap = Math.min(...seats.map((s) => state.players[s].chips));
  const first = clockwise(state.dealerSeat).find((s) => seats.includes(s)) ?? null;
  const next: GameState = {
    ...state,
    hands,
    phase,
    currentBet: 0,
    streetCap,
    raisesThisStreet: 0,
    turnSeat: first,
    log: addLog(state, null, phase === 'BET1' ? '1차 베팅' : '2차 베팅'),
  };
  if (streetCap <= 0) return endStreet(next);
  return next;
}

export function legalRaiseMax(state: GameState): number {
  if (state.raisesThisStreet >= MAX_RAISES_PER_STREET) return 0;
  return Math.max(0, state.streetCap - state.currentBet);
}

export function toCall(state: GameState, seat: number): number {
  const h = state.hands[seat];
  return h ? state.currentBet - h.committedStreet : 0;
}

export function applyBet(state: GameState, seat: number, action: BetAction): GameState {
  if ((state.phase !== 'BET1' && state.phase !== 'BET2') || state.turnSeat !== seat) return state;
  const hands = cloneHands(state);
  const players = state.players.map((p) => ({ ...p }));
  const h = hands[seat] as Hand;
  const p = players[seat];
  let { pot, currentBet, raisesThisStreet } = state;
  let text: string;

  if (action.type === 'fold') {
    h.folded = true;
    text = `${p.name} 포기`;
  } else if (action.type === 'call') {
    const pay = currentBet - h.committedStreet;
    p.chips -= pay;
    pot += pay;
    h.committedStreet += pay;
    h.committedRound += pay;
    text = pay === 0 ? `${p.name} 체크` : `${p.name} 콜 (${pay})`;
  } else {
    const amount = Math.max(1, Math.min(action.amount, legalRaiseMax(state)));
    if (legalRaiseMax(state) <= 0) return applyBet(state, seat, { type: 'call' });
    currentBet += amount;
    const pay = currentBet - h.committedStreet;
    p.chips -= pay;
    pot += pay;
    h.committedStreet += pay;
    h.committedRound += pay;
    raisesThisStreet += 1;
    // Everyone else must respond to the raise.
    inHandSeats(state).forEach((s) => {
      if (s !== seat) (hands[s] as Hand).acted = false;
    });
    text = `${p.name} 레이즈 +${amount} (총 ${currentBet})`;
  }
  h.acted = true;

  let next: GameState = {
    ...state,
    hands,
    players,
    pot,
    currentBet,
    raisesThisStreet,
    log: addLog(state, seat, text),
  };

  const remaining = inHandSeats(next);
  if (remaining.length === 1) return resolveShowdown(next, true);

  const done = remaining.every((s) => {
    const x = next.hands[s] as Hand;
    return x.acted && x.committedStreet === next.currentBet;
  });
  if (done) return endStreet(next);

  next = {
    ...next,
    turnSeat: nextSeat(next, seat, (s) => {
      const x = next.hands[s];
      return !!x && !x.folded && (!x.acted || x.committedStreet !== next.currentBet);
    }),
  };
  return next;
}

function endStreet(state: GameState): GameState {
  if (state.phase === 'BET1') return beginHitPhase(state);
  return resolveShowdown(state, false);
}

function beginHitPhase(state: GameState): GameState {
  const first = clockwise(state.dealerSeat).find((s) => inHand(state, s)) ?? null;
  return { ...state, phase: 'HIT', turnSeat: first, log: addLog(state, null, 'HIT / STAY') };
}

export function applyHit(state: GameState, seat: number, hit: boolean): GameState {
  if (state.phase !== 'HIT' || state.turnSeat !== seat) return state;
  const hands = cloneHands(state);
  const h = hands[seat] as Hand;
  const deck = [...state.deck];
  const name = state.players[seat].name;
  let text: string;
  if (hit && deck.length > 0) {
    const card = deck.shift() as HCard;
    h.hits.push(card);
    text = `${name} HIT → ${card.value}`;
  } else {
    h.stayed = true;
    text = `${name} STAY`;
  }
  const next: GameState = { ...state, hands, deck, log: addLog(state, seat, text) };
  const waiting = (s: number) => {
    const x = next.hands[s];
    return !!x && !x.folded && !x.stayed;
  };
  const anyWaiting = inHandSeats(next).some(waiting);
  if (!anyWaiting || deck.length === 0) return beginStreet(next, 'BET2');
  return { ...next, turnSeat: nextSeat(next, seat, waiting) };
}

/** Closest to the limit without going over wins; ties: more cards, then split. */
export function decideWinners(state: GameState, seats: number[]): { winners: number[]; allBusted: boolean } {
  const sums = new Map(seats.map((s) => [s, handSum(state.hands[s] as Hand)]));
  const under = seats.filter((s) => (sums.get(s) as number) <= state.limit);
  const allBusted = under.length === 0;
  const pool = allBusted ? seats : under;
  // All busted: the smallest total (closest to the limit) takes it.
  const key = (s: number) => (allBusted ? -(sums.get(s) as number) : (sums.get(s) as number));
  const best = Math.max(...pool.map(key));
  let winners = pool.filter((s) => key(s) === best);
  if (winners.length > 1) {
    const most = Math.max(...winners.map((s) => cardCount(state.hands[s] as Hand)));
    winners = winners.filter((s) => cardCount(state.hands[s] as Hand) === most);
  }
  return { winners, allBusted };
}

function resolveShowdown(state: GameState, byFold: boolean): GameState {
  const seats = inHandSeats(state);
  const { winners, allBusted } = byFold ? { winners: seats, allBusted: false } : decideWinners(state, seats);
  const players = state.players.map((p) => ({ ...p }));
  const payouts: Record<number, number> = {};
  const share = Math.floor(state.pot / winners.length);
  let remainder = state.pot - share * winners.length;
  // Remainder goes to the winner closest to the first player (clockwise).
  const ordered = clockwise(state.dealerSeat).filter((s) => winners.includes(s));
  ordered.forEach((s) => {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    payouts[s] = share + extra;
    players[s].chips += share + extra;
  });

  const sums: Record<number, number> = {};
  activeSeats(state).forEach((s) => {
    sums[s] = handSum(state.hands[s] as Hand);
  });

  // Eliminations: chips at 0. Among same-round eliminations, more chips committed = worse.
  const alive = players.filter((p) => p.finishRank === null);
  const busted = alive.filter((p) => p.chips <= 0);
  const survivors = alive.length - busted.length;
  busted
    .sort((a, b) => (state.hands[a.seat]?.committedRound ?? 0) - (state.hands[b.seat]?.committedRound ?? 0))
    .forEach((p, i) => {
      p.finishRank = survivors + 1 + i;
      p.eliminatedRound = state.round;
    });
  const stillAlive = players.filter((p) => p.finishRank === null);
  if (stillAlive.length === 1) stillAlive[0].finishRank = 1;

  const winnerNames = winners.map((s) => state.players[s].name).join(', ');
  let log = addLog(
    state,
    null,
    byFold
      ? `${winnerNames} 판돈 ${state.pot} 획득 (나머지 포기)`
      : `${winnerNames} 판돈 ${state.pot} 획득${allBusted ? ' (전원 초과)' : ''}`,
  );
  busted.forEach((p) => {
    log = [...log, { id: log.length + 1, round: state.round, seat: p.seat, text: `${p.name} 칩 소진 · 탈락` }];
  });

  return {
    ...state,
    players,
    pot: 0,
    phase: stillAlive.length <= 1 ? 'GAME_OVER' : 'SHOWDOWN',
    turnSeat: null,
    result: { winners, payouts, sums, byFold, allBusted, pot: state.pot },
    log,
  };
}

export function nextRound(state: GameState, rng: () => number = Math.random): GameState {
  if (state.phase !== 'SHOWDOWN') return state;
  return startRound(state, rng);
}

/* ------------------------------------------------------------------ */
/* Information & AI                                                    */
/* ------------------------------------------------------------------ */

/** Cards `viewer` can see: own 3 cards, others' revealed card and all hits. */
function visibleCardIds(state: GameState, viewer: number): Set<number> {
  const ids = new Set<number>();
  state.hands.forEach((h, s) => {
    if (!h) return;
    if (s === viewer) h.cards.forEach((c) => ids.add(c.id));
    else if (h.revealedIndex !== null) ids.add(h.cards[h.revealedIndex].id);
    h.hits.forEach((c) => ids.add(c.id));
  });
  return ids;
}

function unknownPool(state: GameState, viewer: number): number[] {
  const seen = visibleCardIds(state, viewer);
  const all: number[] = [];
  let id = 0;
  DECK_COMPOSITION.forEach(([value, copies]) => {
    for (let i = 0; i < copies; i += 1) {
      if (!seen.has(id)) all.push(value);
      id += 1;
    }
  });
  return all;
}

/**
 * hitSafe: hit while at least this share of unseen cards keeps you at or under
 * the limit. Self-play showed lower (bolder) thresholds win, down to ~0.3, so
 * difficulty mostly comes from how bold the AI is, plus betting accuracy.
 * (A simulated hit-vs-stay decision was tried and lost to the plain 0.3 rule.)
 */
export const PARAMS: Record<
  AIDifficulty,
  { samples: number; noise: number; hitSafe: number; bluff: number }
> = {
  normal: { samples: 40, noise: 0.15, hitSafe: 0.62, bluff: 0 },
  hard: { samples: 120, noise: 0.06, hitSafe: 0.45, bluff: 0.02 },
  master: { samples: 260, noise: 0.02, hitSafe: 0.3, bluff: 0.04 },
};

export function difficultyOf(state: GameState, seat: number): AIDifficulty {
  return state.seatDifficulty?.[seat] ?? state.difficulty;
}

/** Simple hit rule shared by the AI and its simulations. */
function wantsHit(sum: number, limit: number, pool: number[], safeThreshold: number): boolean {
  if (pool.length === 0) return false;
  if (sum > limit) return pool.some((v) => v < 0); // only a -1 can rescue a bust
  if (sum === limit) return false;
  const need = limit - sum;
  const safe = pool.filter((v) => v <= need).length / pool.length;
  return safe >= safeThreshold;
}

function shuffled<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface SampledWorld {
  sums: Map<number, number>;
  counts: Map<number, number>;
  draw: number[];
}

/** Deal the hidden cards `seat` can't see, consistent with everything it can see. */
function sampleWorld(state: GameState, seat: number, seats: number[], pool: number[], rng: () => number): SampledWorld {
  const draw = shuffled(pool, rng);
  const sums = new Map<number, number>();
  const counts = new Map<number, number>();
  seats.forEach((s) => {
    const h = state.hands[s] as Hand;
    let sum: number;
    if (s === seat) sum = handSum(h);
    else {
      const known =
        (h.revealedIndex !== null ? h.cards[h.revealedIndex].value : 0) + h.hits.reduce((a, c) => a + c.value, 0);
      const hidden = h.cards.length - (h.revealedIndex !== null ? 1 : 0);
      sum = known + draw.splice(0, hidden).reduce((a, v) => a + v, 0);
    }
    sums.set(s, sum);
    counts.set(s, cardCount(h));
  });
  return { sums, counts, draw };
}

/** Rule-of-thumb threshold the AI assumes everyone (including itself, later) plays by. */
const SIM_HIT_SAFE = 0.3;

/**
 * Play out the rest of the HIT phase on a sampled world and return `seat`'s
 * share of the pot.
 */
function playOut(
  state: GameState,
  seat: number,
  seats: number[],
  world: SampledWorld,
): number {
  const sums = new Map(world.sums);
  const counts = new Map(world.counts);
  const draw = [...world.draw];

  if (state.phase === 'BET1' || state.phase === 'REVEAL' || state.phase === 'HIT') {
    const stayed = new Set(seats.filter((s) => (state.hands[s] as Hand).stayed));
    const start = state.phase === 'HIT' && state.turnSeat !== null ? state.turnSeat : state.dealerSeat;
    let guard = 0;
    while (stayed.size < seats.length && draw.length > 0 && guard++ < 60) {
      for (const s of clockwise(start)) {
        if (!seats.includes(s) || stayed.has(s) || draw.length === 0) continue;
        if (wantsHit(sums.get(s) as number, state.limit, draw, SIM_HIT_SAFE)) {
          sums.set(s, (sums.get(s) as number) + (draw.shift() as number));
          counts.set(s, (counts.get(s) as number) + 1);
        } else stayed.add(s);
      }
    }
  }

  const under = seats.filter((s) => (sums.get(s) as number) <= state.limit);
  const poolSeats = under.length ? under : seats;
  const key = (s: number) => (under.length ? (sums.get(s) as number) : -(sums.get(s) as number));
  const best = Math.max(...poolSeats.map(key));
  let winners = poolSeats.filter((s) => key(s) === best);
  if (winners.length > 1) {
    const most = Math.max(...winners.map((s) => counts.get(s) as number));
    winners = winners.filter((s) => counts.get(s) === most);
  }
  return winners.includes(seat) ? 1 / winners.length : 0;
}

/** Monte Carlo estimate of `seat`'s share of the pot. */
export function estimateEquity(state: GameState, seat: number, samples: number, rng: () => number): number {
  const seats = inHandSeats(state);
  if (seats.length <= 1) return 1;
  const pool = unknownPool(state, seat);
  let total = 0;
  for (let n = 0; n < samples; n += 1) {
    total += playOut(state, seat, seats, sampleWorld(state, seat, seats, pool, rng));
  }
  return total / samples;
}

export function chooseAIReveal(state: GameState, seat: number, rng: () => number = Math.random): number {
  const h = state.hands[seat] as Hand;
  if (difficultyOf(state, seat) === 'normal') return Math.floor(rng() * h.cards.length);
  // Show the least informative card: the one closest to the average card (~2.5).
  let best = 0;
  h.cards.forEach((c, i) => {
    if (Math.abs(c.value - 2.5) < Math.abs(h.cards[best].value - 2.5)) best = i;
  });
  return best;
}

export function chooseAIBet(state: GameState, seat: number, rng: () => number = Math.random): BetAction {
  const params = PARAMS[difficultyOf(state, seat)];
  const n = inHandSeats(state).length;
  const equity = Math.min(1, Math.max(0, estimateEquity(state, seat, params.samples, rng) + (rng() - 0.5) * 2 * params.noise));
  const owe = toCall(state, seat);
  const raiseRoom = legalRaiseMax(state);
  const potOdds = owe / (state.pot + owe);

  if (owe > 0 && equity < potOdds * 0.9) {
    if (rng() < params.bluff && raiseRoom > 0) return { type: 'raise', amount: 1 };
    return { type: 'fold' };
  }
  const strong = equity > 1.5 / n + 0.12;
  if (raiseRoom > 0 && (strong || rng() < params.bluff)) {
    const size = equity > 0.65 ? Math.max(2, Math.round(state.pot * 0.6)) : 1 + Math.floor(rng() * 2);
    return { type: 'raise', amount: Math.min(raiseRoom, size) };
  }
  return { type: 'call' };
}

export function chooseAIHit(state: GameState, seat: number): boolean {
  const h = state.hands[seat] as Hand;
  return wantsHit(handSum(h), state.limit, unknownPool(state, seat), PARAMS[difficultyOf(state, seat)].hitSafe);
}

/** Drive every AI decision for the current phase (used for auto-play and tests). */
export function stepAI(state: GameState, rng: () => number = Math.random, controlAll = false): GameState {
  const isAI = (s: number) => controlAll || !state.players[s].isHuman;
  if (state.phase === 'REVEAL') {
    let next = state;
    state.hands.forEach((h, s) => {
      if (h && h.revealedIndex === null && isAI(s)) next = setReveal(next, s, chooseAIReveal(next, s, rng));
    });
    return next;
  }
  if (state.turnSeat === null || !isAI(state.turnSeat)) return state;
  if (state.phase === 'BET1' || state.phase === 'BET2') return applyBet(state, state.turnSeat, chooseAIBet(state, state.turnSeat, rng));
  if (state.phase === 'HIT') return applyHit(state, state.turnSeat, chooseAIHit(state, state.turnSeat));
  return state;
}
