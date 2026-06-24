/**
 * Dice-notation parser + evaluator. Supports:
 *   NdM                multiple like dice            e.g. 2d6
 *   +/- constants      flat modifiers                e.g. 2d6 + 3
 *   multiple groups    mixed dice                    e.g. 2d6 + 1d4 + 3
 *   keep / drop        kh/kl/dh/dl + count           e.g. 4d6kl1, 2d20kh1
 *
 * Advantage/disadvantage are expressed as 2d20kh1 / 2d20kl1 so they reuse the
 * keep mechanism. The operator set is deliberately small and table-driven so
 * exploding/reroll dice can be added later without touching the evaluator.
 */
import type { DieGroup, Rng } from './types.js';

type Selector = { type: 'kh' | 'kl' | 'dh' | 'dl'; n: number };

interface DiceTerm { kind: 'dice'; sign: 1 | -1; count: number; sides: number; selector?: Selector }
interface ConstTerm { kind: 'const'; sign: 1 | -1; value: number }
type Term = DiceTerm | ConstTerm;

export interface EvalResult {
  expression: string;   // normalized
  groups: DieGroup[];
  modifier: number;     // signed sum of constants
  total: number;
}

const TERM_RE = /([+-]?)\s*(?:(\d*)d(\d+)(?:(kh|kl|dh|dl)(\d+))?|(\d+))/gi;

export function parse(expression: string): Term[] {
  const compact = expression.trim();
  if (!compact) throw new Error('Empty dice expression');
  const terms: Term[] = [];
  let m: RegExpExecArray | null;
  TERM_RE.lastIndex = 0;
  while ((m = TERM_RE.exec(compact)) !== null) {
    const sign: 1 | -1 = m[1] === '-' ? -1 : 1;
    if (m[3] !== undefined) {
      const count = m[2] === '' ? 1 : parseInt(m[2], 10);
      const sides = parseInt(m[3], 10);
      if (count < 1 || count > 1000 || sides < 1) throw new Error(`Invalid dice term: ${m[0].trim()}`);
      const selector: Selector | undefined = m[4] ? { type: m[4].toLowerCase() as Selector['type'], n: parseInt(m[5], 10) } : undefined;
      terms.push({ kind: 'dice', sign, count, sides, selector });
    } else {
      terms.push({ kind: 'const', sign, value: parseInt(m[6], 10) });
    }
  }
  // Reject leftover garbage (anything the term regex didn't account for).
  const stripped = compact.replace(TERM_RE, '').replace(/\s+/g, '');
  if (stripped !== '') throw new Error(`Unrecognized dice notation near "${stripped}"`);
  if (terms.length === 0) throw new Error(`Could not parse "${expression}"`);
  return terms;
}

function rollDie(sides: number, rng: Rng): number {
  return Math.floor(rng() * sides) + 1;
}

/** Apply a keep/drop selector, returning a kept[] mask aligned to `rolls`. */
function applySelector(rolls: number[], selector: Selector | undefined): boolean[] {
  const kept = rolls.map(() => true);
  if (!selector) return kept;
  const order = rolls.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v); // ascending
  const n = Math.min(selector.n, rolls.length);
  let dropIdx: number[];
  switch (selector.type) {
    case 'kh': dropIdx = order.slice(0, rolls.length - n).map((o) => o.i); break;          // drop all but n highest
    case 'kl': dropIdx = order.slice(n).map((o) => o.i); break;                            // drop all but n lowest
    case 'dl': dropIdx = order.slice(0, n).map((o) => o.i); break;                         // drop n lowest
    case 'dh': dropIdx = order.slice(rolls.length - n).map((o) => o.i); break;             // drop n highest
  }
  for (const i of dropIdx) kept[i] = false;
  return kept;
}

function normalize(terms: Term[]): string {
  return terms
    .map((t, i) => {
      const op = t.sign === -1 ? '-' : '+';
      const body = t.kind === 'dice'
        ? `${t.count}d${t.sides}${t.selector ? t.selector.type + t.selector.n : ''}`
        : String(t.value);
      return i === 0 ? `${t.sign === -1 ? '-' : ''}${body}` : ` ${op} ${body}`;
    })
    .join('');
}

/** Double every dice term's count (constants untouched) — used for critical hits. */
export function doubleDiceExpression(expression: string): string {
  const terms = parse(expression).map((t) =>
    t.kind === 'dice' ? { ...t, count: t.count * 2 } : t
  );
  return normalize(terms);
}

export function evaluate(expression: string, rng: Rng = Math.random): EvalResult {
  const terms = parse(expression);
  const groups: DieGroup[] = [];
  let modifier = 0;
  let total = 0;

  for (const term of terms) {
    if (term.kind === 'const') {
      modifier += term.sign * term.value;
      total += term.sign * term.value;
      continue;
    }
    const rolls = Array.from({ length: term.count }, () => rollDie(term.sides, rng));
    const kept = applySelector(rolls, term.selector);
    const sum = rolls.reduce((acc, v, i) => acc + (kept[i] ? v : 0), 0);
    total += term.sign * sum;
    groups.push({ sides: term.sides, count: term.count, rolls, kept });
  }

  return { expression: normalize(terms), groups, modifier, total };
}
