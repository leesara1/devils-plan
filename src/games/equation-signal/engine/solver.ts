import {
  ALL_SYMBOLS,
  EQUATION_LENGTH,
  Signal,
  evaluateExpression,
  fractionKey,
  isDigit,
  isOperator,
  randomEquation,
  validateEquation,
} from './equation';

export type AIDifficulty = 'normal' | 'hard' | 'master';

export interface GuessRecord {
  guess: string[];
  signals: Signal[];
}

export interface Constraints {
  allowed: Set<string>[];
  minCount: Map<string, number>;
  maxCount: Map<string, number>;
}

/**
 * Turn the signal history into constraints, modelling imperfect memory:
 * guesses before `fullFrom` contribute only their greens; guesses before
 * `yellowFrom` contribute greens and reds but not their yellows.
 */
export function buildConstraints(
  history: GuessRecord[],
  yellowFrom = 0,
  fullFrom = 0,
): Constraints {
  const allowed = Array.from({ length: EQUATION_LENGTH }, () => new Set<string>(ALL_SYMBOLS));
  const minCount = new Map<string, number>();
  const maxCount = new Map<string, number>([['=', 1]]);
  minCount.set('=', 1);

  for (const [index, { guess, signals }] of history.entries()) {
    // Guesses before `yellowFrom` are remembered without their yellow information.
    const useYellow = index >= yellowFrom;
    if (index < fullFrom) {
      guess.forEach((g, i) => {
        if (signals[i] === 'green') allowed[i] = new Set([g]);
      });
      continue;
    }
    const seen = new Map<string, { hits: number; red: boolean }>();
    guess.forEach((g, i) => {
      const s = signals[i];
      const entry = seen.get(g) ?? { hits: 0, red: false };
      if (s === 'green') {
        allowed[i] = new Set([g]);
        entry.hits += 1;
      } else if (s === 'yellow') {
        if (useYellow) allowed[i].delete(g);
        entry.hits += 1;
      } else {
        allowed[i].delete(g);
        entry.red = true;
      }
      seen.set(g, entry);
    });
    seen.forEach(({ hits, red }, sym) => {
      // Without yellow reading, only greens count toward the minimum.
      const greens = guess.filter((g, i) => g === sym && signals[i] === 'green').length;
      const effectiveHits = useYellow ? hits : greens;
      minCount.set(sym, Math.max(minCount.get(sym) ?? 0, effectiveHits));
      if (red && useYellow) {
        maxCount.set(sym, Math.min(maxCount.get(sym) ?? Infinity, hits));
      } else if (red && hits === 0) {
        maxCount.set(sym, 0);
      }
    });
  }

  // Absent symbols vanish everywhere (except where already pinned green).
  maxCount.forEach((max, sym) => {
    if (max === 0) allowed.forEach((set) => set.size > 1 && set.delete(sym));
  });
  // The ends of each equation are always digits.
  [0, EQUATION_LENGTH - 1].forEach((i) => {
    allowed[i].forEach((s) => {
      if (!isDigit(s)) allowed[i].delete(s);
    });
  });

  return { allowed, minCount, maxCount };
}

interface SideEntry {
  chars: string[];
}

interface SearchBudget {
  deadline: number;
}

/**
 * Enumerate syntactically valid expressions for positions [start, start+len)
 * under per-position constraints, calling `visit` for each complete one.
 * Returning true from `visit` stops the walk.
 */
function walkSide(
  start: number,
  len: number,
  c: Constraints,
  counts: Map<string, number>,
  rng: () => number,
  budget: SearchBudget,
  visit: (chars: string[]) => boolean,
): boolean {
  const chars: string[] = [];
  let nodes = 0;

  const rec = (i: number, prev: 'start' | 'op' | 'digit', loneZero: boolean): boolean => {
    nodes += 1;
    if ((nodes & 1023) === 0 && Date.now() > budget.deadline) return true;
    if (i === len) return prev === 'digit' ? visit(chars) : false;

    const pos = start + i;
    const last = i === len - 1;
    const options = [...c.allowed[pos]].filter((s) => s !== '=');
    // Randomise order so repeated searches explore different regions.
    for (let k = options.length - 1; k > 0; k -= 1) {
      const j = Math.floor(rng() * (k + 1));
      [options[k], options[j]] = [options[j], options[k]];
    }

    for (const s of options) {
      const used = counts.get(s) ?? 0;
      if (used >= (c.maxCount.get(s) ?? Infinity)) continue;
      let nextPrev: 'op' | 'digit';
      let nextLoneZero = false;
      if (isDigit(s)) {
        if (prev === 'digit' && loneZero) continue;
        nextLoneZero = prev !== 'digit' ? s === '0' : false;
        nextPrev = 'digit';
      } else if (isOperator(s)) {
        if (prev !== 'digit' || last) continue;
        nextPrev = 'op';
      } else continue;

      counts.set(s, used + 1);
      chars.push(s);
      const stop = rec(i + 1, nextPrev, nextLoneZero);
      chars.pop();
      counts.set(s, used);
      if (stop) return true;
    }
    return false;
  };

  return rec(0, 'start', false);
}

function satisfiesCounts(eq: string[], c: Constraints): boolean {
  const counts = new Map<string, number>();
  eq.forEach((s) => counts.set(s, (counts.get(s) ?? 0) + 1));
  for (const [sym, min] of c.minCount) if ((counts.get(sym) ?? 0) < min) return false;
  for (const [sym, max] of c.maxCount) if ((counts.get(sym) ?? 0) > max) return false;
  return true;
}

const SHORT_SIDE_CAP = 40000;

/**
 * Find up to `want` equations consistent with the constraints within `timeMs`.
 * Splits at '=', enumerates the shorter side into a value map, then walks the
 * longer side and joins on equal value.
 */
export function findCandidates(
  c: Constraints,
  want: number,
  timeMs: number,
  rng: () => number = Math.random,
  exclude: Set<string> = new Set(),
): string[][] {
  const deadline = Date.now() + timeMs;
  const found: string[][] = [];
  const seen = new Set<string>(exclude);

  const eqPositions = Array.from({ length: EQUATION_LENGTH }, (_, i) => i).filter(
    (i) => i >= 1 && i <= EQUATION_LENGTH - 2 && c.allowed[i].has('='),
  );
  // Favour '=' toward the right (expression = number is most common), randomised.
  const eqOrderKey = new Map(eqPositions.map((p) => [p, p + rng() * 3]));
  eqPositions.sort((a, b) => (eqOrderKey.get(b) as number) - (eqOrderKey.get(a) as number));

  for (const eqAt of eqPositions) {
    if (Date.now() > deadline || found.length >= want) break;
    const leftLen = eqAt;
    const rightLen = EQUATION_LENGTH - eqAt - 1;
    const shortIsLeft = leftLen <= rightLen;
    const [sStart, sLen] = shortIsLeft ? [0, leftLen] : [eqAt + 1, rightLen];
    const [lStart, lLen] = shortIsLeft ? [eqAt + 1, rightLen] : [0, leftLen];

    // Each slice of the per-position budget is shared fairly across '=' spots.
    const sliceDeadline = Math.min(deadline, Date.now() + timeMs / Math.max(1, eqPositions.length) + 30);
    const budget = { deadline: sliceDeadline };

    const byValue = new Map<string, SideEntry[]>();
    let stored = 0;
    walkSide(sStart, sLen, c, new Map([['=', 1]]), rng, budget, (chars) => {
      const v = evaluateExpression(chars);
      if (!v) return false;
      const key = fractionKey(v);
      const list = byValue.get(key) ?? [];
      list.push({ chars: [...chars] });
      byValue.set(key, list);
      stored += 1;
      return stored >= SHORT_SIDE_CAP;
    });
    if (byValue.size === 0) continue;

    walkSide(lStart, lLen, c, new Map([['=', 1]]), rng, budget, (chars) => {
      const v = evaluateExpression(chars);
      if (!v) return false;
      const matches = byValue.get(fractionKey(v));
      if (!matches) return false;
      for (const m of matches) {
        const eq = shortIsLeft ? [...m.chars, '=', ...chars] : [...chars, '=', ...m.chars];
        if (!satisfiesCounts(eq, c)) continue;
        const key = eq.join('');
        if (seen.has(key)) continue;
        seen.add(key);
        found.push(eq);
        if (found.length >= want) return true;
      }
      return false;
    });
  }
  return found;
}

/** How many recent guesses keep their yellow information (Infinity = all). */
const PARAMS: Record<AIDifficulty, { yellowMemory: number; fullMemory: number; timeMs: number }> = {
  normal: { yellowMemory: 0, fullMemory: 2, timeMs: 300 },
  hard: { yellowMemory: 0, fullMemory: Infinity, timeMs: 500 },
  master: { yellowMemory: Infinity, fullMemory: Infinity, timeMs: 700 },
};

export function chooseAIGuess(
  history: GuessRecord[],
  difficulty: AIDifficulty,
  rng: () => number = Math.random,
): string[] {
  if (history.length === 0) {
    // Opening: a valid equation that touches many different symbols.
    let best = randomEquation(rng);
    for (let i = 0; i < 30; i += 1) {
      const cand = randomEquation(rng);
      if (new Set(cand).size > new Set(best).size) best = cand;
    }
    return best;
  }

  const params = PARAMS[difficulty];
  const yellowFrom = Math.max(0, history.length - params.yellowMemory);
  const fullFrom = Math.max(0, history.length - params.fullMemory);
  const constraints = buildConstraints(history, yellowFrom, fullFrom);
  const tried = new Set(history.map((h) => h.guess.join('')));
  const candidates = findCandidates(constraints, 1, params.timeMs, rng, tried);

  if (candidates.length === 0) {
    // Nothing consistent found in time: keep the greens, fill the rest validly.
    return fallbackGuess(constraints, rng);
  }
  return candidates[0];
}

function fallbackGuess(c: Constraints, rng: () => number): string[] {
  for (let i = 0; i < 300; i += 1) {
    const eq = randomEquation(rng);
    if (eq.every((s, idx) => c.allowed[idx].has(s))) return eq;
  }
  return randomEquation(rng).map((s, idx) => (c.allowed[idx].size === 1 ? [...c.allowed[idx]][0] : s));
}

export function isValidSecret(eq: string[]): boolean {
  return validateEquation(eq) === null;
}
