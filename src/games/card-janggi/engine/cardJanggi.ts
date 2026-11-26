export const SIZE = 5;
export const MOVE_CAP = 60; // moves per round before it is called a draw
export const WINS_NEEDED = 2;
export const MAX_ROUNDS = 5; // drawn rounds are replayed, up to this many

export type Side = 0 | 1; // 0 = bottom (1P), 1 = top (AI)
export type Card = 'rat' | 'horse' | 'monkey' | 'elephant' | 'giraffe';
export const CARDS: Card[] = ['rat', 'horse', 'monkey', 'elephant', 'giraffe'];
export const CARD_NAME: Record<Card, string> = {
  rat: '쥐',
  horse: '말',
  monkey: '원숭이',
  elephant: '코끼리',
  giraffe: '기린',
};
export const CARD_DESC: Record<Card, string> = {
  rat: '상하좌우 1칸',
  horse: '나이트 행마',
  monkey: '주변 8칸',
  elephant: '대각선으로 막힐 때까지',
  giraffe: '상하좌우 2칸 (뛰어넘음)',
};

export type AIDifficulty = 'normal' | 'hard' | 'master';

export interface Piece {
  id: string;
  side: Side;
  big: boolean;
  r: number;
  c: number;
}

export interface Move {
  pieceId: string;
  r: number;
  c: number;
}

export interface LogEntry {
  side: Side;
  card: Card;
  text: string;
}

export interface RoundState {
  pieces: Piece[];
  first: Side;
  turn: Side;
  /** Remaining cards of the current set per side; [0] is face-up. */
  queues: [Card[], Card[]];
  /** Cards played from the current set (public). */
  used: [Card[], Card[]];
  /** Sides that must (re)arrange before play continues. */
  needArrange: [boolean, boolean];
  moves: number;
  winner: Side | 'draw' | null;
  winReason: 'capture' | 'reach' | 'cap' | null;
  log: LogEntry[];
}

export interface MatchState {
  difficulty: AIDifficulty;
  aiName: string;
  roundNumber: number;
  wins: [number, number];
  round: RoundState;
  results: (Side | 'draw')[];
  over: boolean;
}

const other = (s: Side): Side => (s === 0 ? 1 : 0);
export { other as otherSide };

/** Back row: small · · big · · small, plus a small piece in front of the big one. */
export function startingPieces(): Piece[] {
  const pieces: Piece[] = [];
  ([0, 1] as Side[]).forEach((side) => {
    const back = side === 0 ? SIZE - 1 : 0;
    const front = side === 0 ? SIZE - 2 : 1;
    pieces.push({ id: `${side}-big`, side, big: true, r: back, c: 2 });
    pieces.push({ id: `${side}-a`, side, big: false, r: back, c: 0 });
    pieces.push({ id: `${side}-b`, side, big: false, r: back, c: SIZE - 1 });
    pieces.push({ id: `${side}-c`, side, big: false, r: front, c: 2 });
  });
  return pieces;
}

/** The square a side's big piece must reach: the opponent big piece's start. */
export function targetSquare(side: Side): [number, number] {
  return side === 0 ? [0, 2] : [SIZE - 1, 2];
}

/** How many cards each side plays per set: first player 5, second player 4 of 5. */
export function setSize(round: RoundState, side: Side): number {
  return side === round.first ? 5 : 4;
}

export function newRound(first: Side): RoundState {
  return {
    pieces: startingPieces(),
    first,
    turn: first,
    queues: [[], []],
    used: [[], []],
    needArrange: [true, true],
    moves: 0,
    winner: null,
    winReason: null,
    log: [],
  };
}

export function newMatch(difficulty: AIDifficulty, aiName: string, rng: () => number = Math.random): MatchState {
  const first: Side = rng() < 0.5 ? 0 : 1; // coin toss
  return { difficulty, aiName, roundNumber: 1, wins: [0, 0], round: newRound(first), results: [], over: false };
}

/* ------------------------------------------------------------------ */
/* Movement                                                            */
/* ------------------------------------------------------------------ */

const inside = (r: number, c: number) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

const STEPS: Record<Exclude<Card, 'elephant'>, [number, number][]> = {
  rat: [[1, 0], [-1, 0], [0, 1], [0, -1]],
  horse: [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]],
  monkey: [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]],
  giraffe: [[2, 0], [-2, 0], [0, 2], [0, -2]],
};

export function pieceAt(pieces: Piece[], r: number, c: number): Piece | undefined {
  return pieces.find((p) => p.r === r && p.c === c);
}

export function destinations(pieces: Piece[], piece: Piece, card: Card): [number, number][] {
  const out: [number, number][] = [];
  if (card === 'elephant') {
    for (const [dr, dc] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      let r = piece.r + dr;
      let c = piece.c + dc;
      while (inside(r, c)) {
        const occ = pieceAt(pieces, r, c);
        if (occ) {
          if (occ.side !== piece.side) out.push([r, c]);
          break;
        }
        out.push([r, c]);
        r += dr;
        c += dc;
      }
    }
    return out;
  }
  for (const [dr, dc] of STEPS[card]) {
    const r = piece.r + dr;
    const c = piece.c + dc;
    if (!inside(r, c)) continue;
    const occ = pieceAt(pieces, r, c);
    if (occ && occ.side === piece.side) continue;
    out.push([r, c]);
  }
  return out;
}

export function legalMoves(pieces: Piece[], side: Side, card: Card): Move[] {
  return pieces
    .filter((p) => p.side === side)
    .flatMap((p) => destinations(pieces, p, card).map(([r, c]) => ({ pieceId: p.id, r, c })));
}

/** Apply a move to a piece list; returns the new list and what happened. */
export function movePieces(
  pieces: Piece[],
  move: Move,
): { pieces: Piece[]; captured: Piece | null; mover: Piece } {
  const mover = pieces.find((p) => p.id === move.pieceId) as Piece;
  const captured = pieceAt(pieces, move.r, move.c) ?? null;
  const next = pieces
    .filter((p) => p !== captured)
    .map((p) => (p.id === move.pieceId ? { ...p, r: move.r, c: move.c } : p));
  return { pieces: next, captured, mover: { ...mover, r: move.r, c: move.c } };
}

export function winnerAfter(pieces: Piece[], mover: Piece, captured: Piece | null): Side | null {
  if (captured?.big) return mover.side;
  const [tr, tc] = targetSquare(mover.side);
  if (mover.big && mover.r === tr && mover.c === tc) return mover.side;
  return null;
}

const SQUARE = (r: number, c: number) => `${'abcde'[c]}${SIZE - r}`;

/* ------------------------------------------------------------------ */
/* Round flow                                                          */
/* ------------------------------------------------------------------ */

export function arrange(round: RoundState, side: Side, order: Card[]): RoundState {
  if (!round.needArrange[side] || round.winner !== null) return round;
  const n = setSize(round, side);
  if (order.length !== n || new Set(order).size !== n || order.some((c) => !CARDS.includes(c))) return round;
  const queues: [Card[], Card[]] = [[...round.queues[0]], [...round.queues[1]]];
  const used: [Card[], Card[]] = [[...round.used[0]], [...round.used[1]]];
  const needArrange: [boolean, boolean] = [...round.needArrange];
  queues[side] = [...order];
  used[side] = [];
  needArrange[side] = false;
  return { ...round, queues, used, needArrange };
}

export function currentCard(round: RoundState): Card | null {
  return round.queues[round.turn][0] ?? null;
}

export function canPlay(round: RoundState): boolean {
  return round.winner === null && !round.needArrange[0] && !round.needArrange[1];
}

/** Play the face-up card of the side to move. `move` null = pass (only when no legal move). */
export function playCard(round: RoundState, move: Move | null): RoundState {
  if (!canPlay(round)) return round;
  const side = round.turn;
  const card = currentCard(round);
  if (!card) return round;
  const legal = legalMoves(round.pieces, side, card);
  if (move === null && legal.length > 0) return round;
  if (move !== null && !legal.some((m) => m.pieceId === move.pieceId && m.r === move.r && m.c === move.c)) return round;

  let pieces = round.pieces;
  let winner: Side | null = null;
  let text = '이동할 수 없어 넘김';
  if (move) {
    const res = movePieces(round.pieces, move);
    pieces = res.pieces;
    winner = winnerAfter(pieces, res.mover, res.captured);
    text = `${res.mover.big ? '큰 말' : '작은 말'} → ${SQUARE(move.r, move.c)}${res.captured ? (res.captured.big ? ' (큰 말 잡음)' : ' (잡음)') : ''}`;
  }

  const queues: [Card[], Card[]] = [[...round.queues[0]], [...round.queues[1]]];
  const used: [Card[], Card[]] = [[...round.used[0]], [...round.used[1]]];
  const needArrange: [boolean, boolean] = [...round.needArrange];
  queues[side] = queues[side].slice(1);
  used[side] = [...used[side], card];
  if (queues[side].length === 0) needArrange[side] = true; // re-arrange a fresh set

  const moves = round.moves + 1;
  const log = [...round.log, { side, card, text }];
  if (winner !== null) {
    return {
      ...round,
      pieces,
      queues,
      used,
      needArrange,
      moves,
      log,
      winner,
      winReason: move && pieceAt(round.pieces, move.r, move.c)?.big ? 'capture' : 'reach',
    };
  }
  if (moves >= MOVE_CAP) return { ...round, pieces, queues, used, needArrange, moves, log, winner: 'draw', winReason: 'cap' };
  return { ...round, pieces, queues, used, needArrange, moves, log, turn: other(side) };
}

export function finishRound(match: MatchState): MatchState {
  const w = match.round.winner;
  if (w === null) return match;
  const wins: [number, number] = [...match.wins];
  if (w !== 'draw') wins[w] += 1;
  const results = [...match.results, w];
  const over = wins[0] >= WINS_NEEDED || wins[1] >= WINS_NEEDED || results.length >= MAX_ROUNDS;
  if (over) return { ...match, wins, results, over: true };
  return {
    ...match,
    wins,
    results,
    roundNumber: match.roundNumber + 1,
    round: newRound(other(match.round.first)), // first player alternates
  };
}

/* ------------------------------------------------------------------ */
/* AI                                                                  */
/* ------------------------------------------------------------------ */

const WIN = 100000;

function evaluate(pieces: Piece[], side: Side): number {
  let score = 0;
  for (const s of [0, 1] as Side[]) {
    const sign = s === side ? 1 : -1;
    const mine = pieces.filter((p) => p.side === s);
    const big = mine.find((p) => p.big);
    if (!big) {
      score += sign * -WIN;
      continue;
    }
    const [tr, tc] = targetSquare(s);
    if (big.r === tr && big.c === tc) score += sign * WIN;
    score += sign * (mine.length - 1) * 100;
    const dist = Math.abs(big.r - tr) + Math.abs(big.c - tc);
    score += sign * (8 - dist) * 12;
    // small pieces near the centre are more useful
    mine.filter((p) => !p.big).forEach((p) => {
      score += sign * (4 - Math.abs(p.r - 2) - Math.abs(p.c - 2)) * 3;
    });
  }
  return score;
}

function terminal(pieces: Piece[]): Side | null {
  for (const s of [0, 1] as Side[]) {
    const big = pieces.find((p) => p.side === s && p.big);
    if (!big) return other(s);
    const [tr, tc] = targetSquare(s);
    if (big.r === tr && big.c === tc) return s;
  }
  return null;
}

/**
 * Card a side will play at its k-th upcoming turn as far as `viewer` knows:
 * its own queue is known; the opponent's face-up card is known; beyond that
 * we assume the opponent picks whichever remaining card hurts most.
 */
function cardOptions(round: RoundState, viewer: Side, side: Side, k: number): Card[] {
  const q = round.queues[side];
  if (side === viewer) return q[k] ? [q[k]] : CARDS;
  if (k === 0 && q[0]) return [q[0]];
  // Unknown order: the cards of this set not yet played (minus the face-up one).
  const remaining = CARDS.filter((c) => !round.used[side].includes(c) && c !== q[0]);
  return k < q.length ? remaining : CARDS;
}

function search(
  round: RoundState,
  pieces: Piece[],
  viewer: Side,
  toMove: Side,
  depth: number,
  plyIndex: [number, number],
  alpha: number,
  beta: number,
): number {
  const t = terminal(pieces);
  if (t !== null) return t === viewer ? WIN + depth : -WIN - depth;
  if (depth === 0) return evaluate(pieces, viewer);

  const options = cardOptions(round, viewer, toMove, plyIndex[toMove]);
  const nextPly: [number, number] = [...plyIndex];
  nextPly[toMove] += 1;
  const maximizing = toMove === viewer;
  let best = maximizing ? -Infinity : Infinity;

  for (const card of options) {
    const moves = legalMoves(pieces, toMove, card);
    const children = moves.length ? moves : [null];
    for (const m of children) {
      const after = m ? movePieces(pieces, m).pieces : pieces;
      const v = search(round, after, viewer, other(toMove), depth - 1, nextPly, alpha, beta);
      if (maximizing) {
        best = Math.max(best, v);
        alpha = Math.max(alpha, v);
      } else {
        best = Math.min(best, v);
        beta = Math.min(beta, v);
      }
      if (beta <= alpha) return best;
    }
  }
  return best;
}

const PARAMS: Record<AIDifficulty, { depth: number; noise: number; planOrder: boolean }> = {
  normal: { depth: 1, noise: 60, planOrder: false },
  hard: { depth: 3, noise: 8, planOrder: true },
  master: { depth: 5, noise: 0, planOrder: true },
};

export function chooseAIMove(round: RoundState, difficulty: AIDifficulty, rng: () => number = Math.random): Move | null {
  const side = round.turn;
  const card = currentCard(round);
  if (!card) return null;
  const moves = legalMoves(round.pieces, side, card);
  if (moves.length === 0) return null;
  const { depth, noise } = PARAMS[difficulty];
  let best = moves[0];
  let bestScore = -Infinity;
  for (const m of moves) {
    const after = movePieces(round.pieces, m).pieces;
    const ply: [number, number] = [0, 0];
    ply[side] = 1;
    const v = search(round, after, side, other(side), depth - 1, ply, -Infinity, Infinity) + (rng() - 0.5) * 2 * noise;
    if (v > bestScore) {
      bestScore = v;
      best = m;
    }
  }
  return best;
}

function permutations<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]];
  return items.flatMap((x, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)], k - 1).map((p) => [x, ...p]));
}

/** Pick a card order by playing each candidate order greedily against a cautious opponent. */
export function chooseAIOrder(round: RoundState, side: Side, difficulty: AIDifficulty, rng: () => number = Math.random): Card[] {
  const n = setSize(round, side);
  const all = permutations(CARDS, n);
  if (!PARAMS[difficulty].planOrder) return all[Math.floor(rng() * all.length)];

  const opp = other(side);
  let best = all[0];
  let bestScore = -Infinity;
  for (const order of all) {
    let pieces = round.pieces;
    let turn = round.turn;
    let k = 0;
    let oppK = 0;
    let score = 0;
    for (let step = 0; step < n * 2 && terminal(pieces) === null; step += 1) {
      if (turn === side) {
        if (k >= order.length) break;
        const moves = legalMoves(pieces, side, order[k]);
        if (moves.length) {
          let pick = moves[0];
          let pv = -Infinity;
          for (const m of moves) {
            const v = evaluate(movePieces(pieces, m).pieces, side);
            if (v > pv) {
              pv = v;
              pick = m;
            }
          }
          pieces = movePieces(pieces, pick).pieces;
        }
        k += 1;
      } else {
        // Opponent: face-up card if known, otherwise its most dangerous remaining card.
        const options = cardOptions(round, side, opp, oppK);
        let worst = Infinity;
        let worstPieces = pieces;
        for (const card of options) {
          for (const m of legalMoves(pieces, opp, card)) {
            const after = movePieces(pieces, m).pieces;
            const v = evaluate(after, side);
            if (v < worst) {
              worst = v;
              worstPieces = after;
            }
          }
        }
        pieces = worstPieces;
        oppK += 1;
      }
      turn = other(turn);
      score = evaluate(pieces, side);
    }
    score += (rng() - 0.5) * PARAMS[difficulty].noise;
    if (score > bestScore) {
      bestScore = score;
      best = order;
    }
  }
  return best;
}
