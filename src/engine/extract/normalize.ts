/**
 * Canonicalization tables.
 *
 * Comparison is only meaningful between normalized values. "twice daily",
 * "BID" and "b.i.d." are one instruction written three ways; an engine that
 * treats them as three values produces noise, and noise is what makes a QC tool
 * get switched off.
 *
 * Every function here is pure and total: given text it cannot canonicalize it
 * returns a predictable fallback rather than throwing.
 */

const UNITS: [RegExp, string][] = [
  [/^(mg|milligram|milligrams)$/i, 'mg'],
  [/^(mg\/kg)$/i, 'mg/kg'],
  [/^(mg\/m2|mg\/m\^2)$/i, 'mg/m2'],
  [/^(ml\/min|millilitres per minute|milliliters per minute)$/i, 'mL/min'],
  [/^(day|days|d)$/i, 'days'],
  [/^(week|weeks|wk|wks)$/i, 'weeks'],
  [/^(cycle|cycles)$/i, 'cycles'],
  [/^(month|months|mo)$/i, 'months'],
  [/^(year|years|yr|yrs)$/i, 'years'],
  [/^(%|percent|per cent|percentage points)$/i, '%'],
];

const SMALL_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19,
};

const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90,
};

/** "forty-eight" → 48, "1,250" → 1250, "Nine" → 9. Null when not a number. */
export function toNumber(raw: string): number | null {
  const cleaned = raw.trim().toLowerCase().replace(/,/g, '');
  if (/^-?\d+(\.\d+)?$/.test(cleaned)) return Number(cleaned);
  if (cleaned in SMALL_WORDS) return SMALL_WORDS[cleaned];
  if (cleaned in TENS) return TENS[cleaned];
  const compound = cleaned.match(/^([a-z]+)[- ]([a-z]+)$/);
  if (compound && compound[1] in TENS && compound[2] in SMALL_WORDS) {
    return TENS[compound[1]] + SMALL_WORDS[compound[2]];
  }
  return null;
}

export function tidy(raw: string): string {
  return raw.replace(/\s+/g, ' ').replace(/[.,;:]+$/, '').trim();
}

export function normalizeUnit(raw: string): string {
  const t = tidy(raw);
  for (const [pattern, canonical] of UNITS) if (pattern.test(t)) return canonical;
  return t;
}

/* ------------------------------------------------------------------ */
/* Comparators                                                         */
/* ------------------------------------------------------------------ */

const COMPARATORS: [RegExp, string][] = [
  [/^(≥|>=|greater than or equal to|at least|of at least|no less than)$/i, 'GTE'],
  [/^(≤|<=|less than or equal to|at most|no more than|not exceeding)$/i, 'LTE'],
  [/^(>|greater than|above|exceeding)$/i, 'GT'],
  [/^(<|less than|below|under)$/i, 'LT'],
  [/^(=|equal to|of)$/i, 'EQ'],
];

export function normalizeComparator(raw: string): string {
  const t = tidy(raw);
  for (const [pattern, canonical] of COMPARATORS) if (pattern.test(t)) return canonical;
  return t.toUpperCase();
}

export function normalizeThreshold(comparator: string, value: string, unit: string): string {
  return `${normalizeComparator(comparator)} ${toNumber(value) ?? value} ${normalizeUnit(unit)}`;
}

/* ------------------------------------------------------------------ */
/* Dosing                                                              */
/* ------------------------------------------------------------------ */

const FREQUENCIES: [RegExp, string][] = [
  [/^(once daily|once a day|daily|q\.?d\.?|od)$/i, 'QD'],
  [/^(twice daily|twice a day|two times daily|b\.?i\.?d\.?)$/i, 'BID'],
  [/^(three times daily|t\.?i\.?d\.?)$/i, 'TID'],
  [/^(once weekly|weekly|q\.?w\.?)$/i, 'QW'],
  [/^(every (\d+) (?:days|weeks))$/i, 'INTERVAL'],
];

export function normalizeFrequency(raw: string): string {
  const t = tidy(raw);
  for (const [pattern, canonical] of FREQUENCIES) {
    if (pattern.test(t)) {
      if (canonical !== 'INTERVAL') return canonical;
      const m = t.match(/every (\d+) (days|weeks)/i);
      return m ? `Q${m[1]}${m[2].toUpperCase().startsWith('W') ? 'W' : 'D'}` : t.toUpperCase();
    }
  }
  return t.toUpperCase();
}

/* ------------------------------------------------------------------ */
/* Versioned scales                                                    */
/* ------------------------------------------------------------------ */

/** Trailing zeros are preserved: CTCAE 4.03 is a real edition, 4.3 is not. */
export function normalizeScaleVersion(scale: string, version: string): string {
  // The scale name is passed in its canonical casing by the rule that knows it
  // — MedDRA is not MEDDRA, and a reviewer notices.
  return `${scale.trim()} ${version.trim()}`;
}

/* ------------------------------------------------------------------ */
/* Statistics                                                          */
/* ------------------------------------------------------------------ */

export function normalizeSidedness(raw: string): 'ONE-SIDED' | 'TWO-SIDED' | 'UNSPECIFIED' {
  const t = tidy(raw).toLowerCase();
  if (/^one/.test(t)) return 'ONE-SIDED';
  if (/^two/.test(t)) return 'TWO-SIDED';
  return 'UNSPECIFIED';
}

/** "5%" and "0.05" are the same alpha. */
export function normalizeAlpha(value: string, sidedness: string, asPercent = false): string {
  const n = toNumber(value);
  const alpha = n === null ? value : String(asPercent ? n / 100 : n);
  return `alpha ${alpha} (${normalizeSidedness(sidedness).toLowerCase()})`;
}

export function normalizeCiLevel(level: string, sidedness = 'two'): string {
  return `${toNumber(level) ?? level}% CI (${normalizeSidedness(sidedness).toLowerCase()})`;
}

export function normalizeInterval(lower: string, upper: string): string {
  const lo = toNumber(lower);
  const hi = toNumber(upper);
  return `[${lo ?? lower}, ${hi ?? upper}]`;
}

/* ------------------------------------------------------------------ */
/* Population                                                          */
/* ------------------------------------------------------------------ */

/**
 * Reads a permitted-grade range out of the words following a scale name.
 * Handles "0 or 1", "0 to 2", "0, 1, and 2", and the checkbox enumerations that
 * appear in CRF specifications, without a pattern per surface form. Field codes
 * such as "ELIG-06" are stripped first so their digits are not read as grades.
 */
export function parseGradeRange(window: string, maxGrade = 5): string | null {
  const withoutCodes = window.replace(/\b[A-Z]{2,6}-\d+\b/g, ' ');
  const digits = (withoutCodes.match(/(?<![\w.])\d(?![\w.%])/g) ?? [])
    .map(Number)
    .filter((d) => d >= 0 && d <= maxGrade);
  if (digits.length === 0) return null;
  const lo = Math.min(...digits);
  const hi = Math.max(...digits);
  return lo === hi ? String(lo) : `${lo}-${hi}`;
}

/* ------------------------------------------------------------------ */
/* Schedule                                                            */
/* ------------------------------------------------------------------ */

export function normalizeTimepoint(raw: string): string {
  const t = tidy(raw).toLowerCase();
  const cycle = t.match(/cycle\s*(\d+)\s*day\s*(\d+)/);
  if (cycle) return `c${cycle[1]}d${cycle[2]}`;
  if (/end[- ]of[- ]treatment|end of treatment/.test(t)) return 'eot';
  if (/end[- ]of[- ]study/.test(t)) return 'eos';
  if (/screening/.test(t)) return 'screening';
  if (/baseline/.test(t)) return 'baseline';
  if (/surgery/.test(t)) return 'surgery';
  return t.replace(/[^a-z0-9]+/g, '_');
}

export function humanizeTimepoint(token: string): string {
  const cycle = token.match(/^c(\d+)d(\d+)$/);
  if (cycle) return `Cycle ${cycle[1]} Day ${cycle[2]}`;
  if (token === 'eot') return 'end of treatment';
  if (token === 'eos') return 'end of study';
  return token.replace(/_/g, ' ');
}

export function normalizeTolerance(value: string, unit: string): string {
  return `+/-${toNumber(value) ?? value} ${normalizeUnit(unit)}`;
}

/* ------------------------------------------------------------------ */
/* Terminology and clustering                                          */
/* ------------------------------------------------------------------ */

export function normalizeTerm(raw: string): string {
  return tidy(raw).toLowerCase();
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'of', 'and', 'or', 'for', 'to', 'in', 'on', 'at', 'by',
  'this', 'that', 'these', 'those', 'page', 'ecrf', 'crf', 'data', 'form',
]);

/**
 * Light morphological stem. Enough to see that "pathologic" and "pathological"
 * are one word and that "Sensitive Analysis" and "sensitivity analysis" are one
 * heading, without dragging in a stemming library whose behaviour a regulatory
 * reviewer would have to take on trust.
 */
export function stem(token: string): string {
  let t = token.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const suffix of ['ically', 'ical', 'ivity', 'ity', 'ive', 'ies', 'ing', 'ed', 'al', 'ic', 's']) {
    if (t.length > suffix.length + 2 && t.endsWith(suffix)) {
      t = t.slice(0, -suffix.length);
      break;
    }
  }
  return t;
}

export function contentTokens(phrase: string): string[] {
  return phrase
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t))
    .map(stem);
}

/** True when every token of `inner` prefix-matches some token of `outer`. */
export function tokensContained(inner: string[], outer: string[]): boolean {
  if (inner.length === 0) return false;
  return inner.every((token) =>
    outer.some((other) => other.startsWith(token) || token.startsWith(other)),
  );
}

/**
 * Canonical key for a programming identifier.
 *
 * Strips digits and the numeric-suffix conventions ADaM encourages (trt, trtn,
 * trt01pn all name the treatment), then removes vowels so that a transposition
 * or a dropped letter (hrceptor / hreceptor / hrecptor) still lands on one key.
 * Vowel removal is crude and deliberate: it is deterministic, explainable in one
 * sentence to a statistician, and does not need a distance threshold anybody
 * would then have to defend.
 */
export function identifierRoot(identifier: string): string {
  const base = identifier
    .toLowerCase()
    .replace(/[0-9_]/g, '')
    .replace(/(p?n)$/, '');
  const devowelled = base.replace(/[aeiou]/g, '');
  return devowelled.length >= 2 ? devowelled : base;
}

/** Case- and punctuation-insensitive comparison, used to grade drift severity. */
export function differsOnlyByCaseOrPunctuation(values: string[]): boolean {
  const flattened = new Set(values.map((v) => v.toLowerCase().replace(/[^a-z0-9]/g, '')));
  return flattened.size === 1;
}
