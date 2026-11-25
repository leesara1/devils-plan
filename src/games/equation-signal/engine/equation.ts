export const EQUATION_LENGTH = 9;

export const DIGIT_SYMBOLS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;
export const OPERATOR_SYMBOLS = ['+', '-', '×', '÷', '^'] as const;
export const ALL_SYMBOLS = [...DIGIT_SYMBOLS, ...OPERATOR_SYMBOLS, '='] as const;

export type EqSymbol = (typeof ALL_SYMBOLS)[number];
export type Signal = 'green' | 'yellow' | 'red';

export function isDigit(s: string): boolean {
  return s >= '0' && s <= '9' && s.length === 1;
}

export function isOperator(s: string): boolean {
  return (OPERATOR_SYMBOLS as readonly string[]).includes(s);
}

/* ------------------------------------------------------------------ */
/* Exact rational arithmetic                                           */
/* ------------------------------------------------------------------ */

export interface Fraction {
  n: number;
  d: number;
}

const LIMIT = 1e13;

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function frac(n: number, d: number): Fraction | null {
  if (d === 0 || !Number.isFinite(n) || !Number.isFinite(d)) return null;
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  n /= g;
  d /= g;
  if (Math.abs(n) > LIMIT || d > LIMIT) return null;
  return { n, d };
}

const add = (a: Fraction, b: Fraction) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a: Fraction, b: Fraction) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a: Fraction, b: Fraction) => frac(a.n * b.n, a.d * b.d);
const div = (a: Fraction, b: Fraction) => (b.n === 0 ? null : frac(a.n * b.d, a.d * b.n));

function pow(base: Fraction, exp: Fraction): Fraction | null {
  if (exp.d !== 1 || exp.n < 0 || exp.n > 40) return null;
  if (exp.n === 0) return base.n === 0 ? null : { n: 1, d: 1 };
  return frac(base.n ** exp.n, base.d ** exp.n);
}

export function fractionKey(f: Fraction): string {
  return `${f.n}/${f.d}`;
}

/* ------------------------------------------------------------------ */
/* Expression syntax & evaluation                                      */
/* ------------------------------------------------------------------ */

/**
 * Syntax of one side of an equation: numbers joined by binary operators.
 * - starts and ends with a digit, no two operators in a row
 * - no leading zeros on multi-digit numbers ("07" is illegal, "0" is fine)
 */
export function isValidExpressionSyntax(chars: string[]): boolean {
  if (chars.length === 0) return false;
  let prev: 'start' | 'op' | 'digit' = 'start';
  let numberIsLoneZero = false;
  for (const c of chars) {
    if (isDigit(c)) {
      if (prev === 'digit' && numberIsLoneZero) return false;
      numberIsLoneZero = prev !== 'digit' ? c === '0' : false;
      prev = 'digit';
    } else if (isOperator(c)) {
      if (prev !== 'digit') return false;
      prev = 'op';
    } else {
      return false;
    }
  }
  return prev === 'digit';
}

/** Evaluate a syntactically valid expression with ^ > ×÷ > +- precedence (^ right-assoc). */
export function evaluateExpression(chars: string[]): Fraction | null {
  const nums: Fraction[] = [];
  const ops: string[] = [];
  let cur = '';
  for (const c of chars) {
    if (isDigit(c)) cur += c;
    else {
      nums.push({ n: Number(cur), d: 1 });
      ops.push(c);
      cur = '';
    }
  }
  nums.push({ n: Number(cur), d: 1 });

  // ^ (right associative)
  const ns = [...nums];
  const os = [...ops];
  for (let i = os.length - 1; i >= 0; i -= 1) {
    if (os[i] === '^') {
      const r = pow(ns[i], ns[i + 1]);
      if (!r) return null;
      ns.splice(i, 2, r);
      os.splice(i, 1);
    }
  }
  // × ÷
  const ns2: Fraction[] = [ns[0]];
  const os2: string[] = [];
  for (let i = 0; i < os.length; i += 1) {
    const rhs = ns[i + 1];
    if (os[i] === '×' || os[i] === '÷') {
      const lhs = ns2.pop() as Fraction;
      const r = os[i] === '×' ? mul(lhs, rhs) : div(lhs, rhs);
      if (!r) return null;
      ns2.push(r);
    } else {
      ns2.push(rhs);
      os2.push(os[i]);
    }
  }
  // + -
  let acc: Fraction | null = ns2[0];
  for (let i = 0; i < os2.length && acc; i += 1) {
    acc = os2[i] === '+' ? add(acc, ns2[i + 1]) : sub(acc, ns2[i + 1]);
  }
  return acc;
}

export type EquationIssue =
  | 'LENGTH'
  | 'EQUALS_COUNT'
  | 'SYNTAX'
  | 'UNDEFINED'
  | 'NOT_EQUAL';

export const EQUATION_ISSUE_TEXT: Record<EquationIssue, string> = {
  LENGTH: '9칸을 모두 채워야 합니다.',
  EQUALS_COUNT: '= 는 정확히 1개 있어야 합니다.',
  SYNTAX: '기호를 연속으로 쓰거나, 양 끝에 기호를 두거나, 0으로 시작하는 두 자리 이상 수는 쓸 수 없습니다.',
  UNDEFINED: '계산할 수 없는 식입니다(0으로 나누기, 너무 큰 수 등).',
  NOT_EQUAL: '등식이 성립하지 않습니다.',
};

export function validateEquation(chars: string[]): EquationIssue | null {
  if (chars.length !== EQUATION_LENGTH) return 'LENGTH';
  const eqAt = chars.indexOf('=');
  if (eqAt < 0 || chars.lastIndexOf('=') !== eqAt) return 'EQUALS_COUNT';
  const left = chars.slice(0, eqAt);
  const right = chars.slice(eqAt + 1);
  if (!isValidExpressionSyntax(left) || !isValidExpressionSyntax(right)) return 'SYNTAX';
  const lv = evaluateExpression(left);
  const rv = evaluateExpression(right);
  if (!lv || !rv) return 'UNDEFINED';
  return lv.n === rv.n && lv.d === rv.d ? null : 'NOT_EQUAL';
}

/* ------------------------------------------------------------------ */
/* Signals                                                             */
/* ------------------------------------------------------------------ */

/**
 * Green: right symbol, right spot. Yellow: in the answer elsewhere. Red: not in
 * the answer (or already accounted for — duplicates beyond the answer's count are red).
 */
export function scoreGuess(guess: string[], answer: string[]): Signal[] {
  const result: Signal[] = Array(guess.length).fill('red');
  const remaining = new Map<string, number>();
  guess.forEach((g, i) => {
    if (g === answer[i]) result[i] = 'green';
    else remaining.set(answer[i], (remaining.get(answer[i]) ?? 0) + 1);
  });
  guess.forEach((g, i) => {
    if (result[i] === 'green') return;
    const left = remaining.get(g) ?? 0;
    if (left > 0) {
      result[i] = 'yellow';
      remaining.set(g, left - 1);
    }
  });
  return result;
}

/* ------------------------------------------------------------------ */
/* Random equations                                                    */
/* ------------------------------------------------------------------ */

function randomExpression(length: number, rng: () => number): string[] | null {
  const out: string[] = [];
  let prev: 'start' | 'op' | 'digit' = 'start';
  let loneZero = false;
  for (let i = 0; i < length; i += 1) {
    const last = i === length - 1;
    const canOp = prev === 'digit' && !last;
    const useOp = canOp && rng() < 0.38;
    if (useOp) {
      const op = OPERATOR_SYMBOLS[Math.floor(rng() * (rng() < 0.85 ? 4 : 5))];
      out.push(op);
      prev = 'op';
      continue;
    }
    if (prev === 'digit' && loneZero) {
      if (!canOp) return null;
      out.push(OPERATOR_SYMBOLS[Math.floor(rng() * 4)]);
      prev = 'op';
      continue;
    }
    const startsNumber = prev !== 'digit';
    const d = String(Math.floor(rng() * 10));
    loneZero = startsNumber ? d === '0' : false;
    out.push(d);
    prev = 'digit';
  }
  return isValidExpressionSyntax(out) ? out : null;
}

/** A random valid equation, mostly of the form "expression = number". */
export function randomEquation(rng: () => number = Math.random): string[] {
  for (let attempt = 0; attempt < 20000; attempt += 1) {
    const eqAt = 3 + Math.floor(rng() * 5); // left side 3..7 chars
    const rightLen = EQUATION_LENGTH - eqAt - 1;
    const left = randomExpression(eqAt, rng);
    if (!left || !left.some(isOperator)) continue;
    const value = evaluateExpression(left);
    if (!value || value.d !== 1 || value.n < 0) continue;
    const right = String(value.n).split('');
    if (right.length !== rightLen) continue;
    const eq = rng() < 0.25 ? [...right, '=', ...left] : [...left, '=', ...right];
    if (validateEquation(eq) === null) return eq;
  }
  return ['1', '3', '×', '4', '+', '8', '=', '6', '0']; // 13×4+8=60
}
