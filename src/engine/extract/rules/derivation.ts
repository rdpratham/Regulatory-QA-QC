import { identifierRoot, tidy, toNumber } from '../normalize';
import { scan, type Rule, type RuleContext, type RuleHit } from './types';

/**
 * Derivation-specification integrity: the code appendices, and the prose
 * formulas that the code is supposed to implement.
 *
 * Three spellings of one stratification variable in the code that implements
 * the primary analysis is not a typo — it is either a program that will not
 * run or, worse, one that runs and stratifies on something else.
 */

const SAS_KEYWORDS = new Set([
  'proc', 'data', 'set', 'run', 'quit', 'tables', 'weight', 'if', 'then',
  'else', 'keep', 'drop', 'class', 'model', 'lsmeans', 'diff', 'cl', 'alpha',
  'use', 'read', 'all', 'var', 'call', 'missing', 'dist', 'bin', 'link',
  'identity', 'freq', 'genmod', 'mixed', 'iml', 'nlpnra', 'by', 'output',
  'format', 'where', 'do', 'end', 'and', 'or', 'not', 'in', 'cmh', 'merge',
  'sort', 'print', 'means', 'summary', 'label', 'length', 'retain', 'array',
]);

const IDENTIFIER = /\b[a-z][a-z0-9_]{1,15}\b/g;

/** Datasets a block reads from, and datasets it creates along the way. */
function datasetFlow(lines: string[]): { inputs: Set<string>; created: Set<string> } {
  const inputs = new Set<string>();
  const created = new Set<string>();

  for (const line of lines) {
    const dataStep = line.match(/^\s*data\s+([a-z][a-z0-9_]*)\s*;/i);
    if (dataStep) created.add(dataStep[1].toLowerCase());

    for (const m of line.matchAll(/\bdata\s*=\s*([a-z][a-z0-9_]*)/gi)) inputs.add(m[1].toLowerCase());
    for (const m of line.matchAll(/^\s*(?:set|use)\s+([a-z][a-z0-9_]*)/gi)) inputs.add(m[1].toLowerCase());
  }

  return { inputs, created };
}

function sectionOf(context: RuleContext) {
  return context.document.sections.find((s) =>
    s.paragraphs.some((p) => p.id === context.paragraph.paragraphId),
  );
}

/** Normalizes "Cycle(n-9) divided by Cycle(n-8)" to the offset between them. */
function formulaShape(numerator: string, denominator: string): string {
  const offset = (token: string): number => {
    const m = token.match(/n\s*-\s*(\d+)/i);
    return m ? -Number(m[1]) : 0;
  };
  const delta = offset(numerator) - offset(denominator);
  return `numerator Cycle(${numerator.trim()}) is ${delta > 0 ? `${delta} cycle(s) later than` : delta < 0 ? `${-delta} cycle(s) earlier than` : 'the same cycle as'} the denominator`;
}

export const DERIVATION_RULES: Rule[] = [
  {
    id: 'derivation.identifier_spelling',
    category: 'DERIVATION',
    description: 'Programming identifiers grouped by canonical root',
    specificity: 0.87,
    paragraphKind: 'CODE',
    find: (text) => {
      const hits: RuleHit[] = [];
      const seen = new Set<string>();
      const re = new RegExp(IDENTIFIER.source, 'g');
      let m: RegExpExecArray | null;

      while ((m = re.exec(text)) !== null) {
        const identifier = m[0].toLowerCase();
        if (SAS_KEYWORDS.has(identifier)) continue;
        if (identifier.length < 3) continue;
        const key = `${identifierRoot(identifier)}|${identifier}`;
        if (seen.has(key)) continue;
        seen.add(key);
        hits.push({
          conceptKey: `derivation.identifier.${identifierRoot(identifier)}`,
          rawText: identifier,
          normalizedValue: identifier,
          index: m.index,
        });
      }
      return hits;
    },
  },
  {
    id: 'derivation.dataset_flow',
    category: 'DERIVATION',
    description: 'Input datasets referenced within a single analysis block',
    specificity: 0.85,
    paragraphKind: 'CODE',
    find: (_text, context) => {
      const section = sectionOf(context);
      if (!section) return [];
      const codeParagraphs = section.paragraphs.filter((p) => p.kind === 'CODE');
      if (codeParagraphs.length === 0) return [];
      // Fire once per section, on its first code block.
      if (codeParagraphs[0].id !== context.paragraph.paragraphId) return [];

      const lines = codeParagraphs.flatMap((p) => p.lines);
      const { inputs, created } = datasetFlow(lines);
      const external = [...inputs].filter((name) => !created.has(name)).sort();
      const merged = lines.some((l) => /\bmerge\b/i.test(l));

      if (external.length <= 1 || merged) {
        return [
          {
            conceptKey: 'derivation.dataset_consistency',
            rawText: `input dataset(s): ${external.join(', ') || 'none'}`,
            normalizedValue: 'SINGLE INPUT',
            index: 0,
            attributes: { expected: 'SINGLE INPUT', section: section.id },
          },
        ];
      }

      return [
        {
          conceptKey: 'derivation.dataset_consistency',
          rawText: `input dataset(s): ${external.join(', ')}`,
          normalizedValue: `${external.length} UNRELATED INPUTS — ${external.join(', ')}`,
          index: 0,
          attributes: { expected: 'SINGLE INPUT', section: section.id },
        },
      ];
    },
  },
  {
    id: 'derivation.stray_token',
    category: 'DERIVATION',
    description: 'Orphan literals left inside a code block',
    specificity: 0.9,
    paragraphKind: 'CODE',
    find: (_text, context) => {
      const hits: RuleHit[] = [];
      let offset = 0;
      for (const line of context.paragraph.lines) {
        if (/^\s*-?\d+(\.\d+)?\s*$/.test(line)) {
          hits.push({
            conceptKey: 'derivation.code_hygiene',
            rawText: line.trim(),
            normalizedValue: `STRAY LITERAL "${line.trim()}"`,
            index: offset,
            attributes: { expected: 'NO STRAY LITERALS' },
          });
        }
        offset += line.length + 1;
      }
      return hits;
    },
  },
  {
    id: 'derivation.dose_intensity_formula',
    category: 'DERIVATION',
    description: 'Cycle offsets used in the parallel dose-intensity formulas',
    specificity: 0.93,
    paragraphKind: 'PROSE',
    find: (text) =>
      scan(
        text,
        /For the (neoadjuvant|adjuvant|overall)[^.]*?relative dose intensity for cycle n is derived as the administered dose recorded at Cycle\(([^)]+)\) divided by the administered dose recorded at Cycle\(([^)]+)\)/gi,
        (m) => ({
          conceptKey: 'derivation.dose_intensity_shape',
          rawText: tidy(m[0]),
          normalizedValue: formulaShape(m[2], m[3]),
          attributes: { period: m[1].toLowerCase() },
        }),
      ),
  },
  {
    id: 'derivation.teae_definition',
    category: 'DERIVATION',
    description: 'Shape of the treatment-emergent adverse event definition per period',
    specificity: 0.94,
    paragraphKind: 'PROSE',
    find: (text) =>
      scan(
        text,
        /For the (neoadjuvant|adjuvant|overall) period, a treatment-emergent adverse event is defined as an adverse event with onset ([^.]+)\./gi,
        (m) => ({
          conceptKey: 'definition.teae_shape',
          rawText: tidy(m[0]),
          normalizedValue: teaeShape(m[2]),
          attributes: { period: m[1].toLowerCase() },
        }),
      ),
  },
  {
    id: 'derivation.category_set_integrity',
    category: 'DERIVATION',
    description: 'Completeness and uniqueness of a stated set of numeric categories',
    specificity: 0.91,
    paragraphKind: 'PROSE',
    requiresContext: /ejection fraction|categories/i,
    find: (text) =>
      scan(text, /using the categories ([^.]+)\./gi, (m) => {
        const verdict = categorySetIntegrity(m[1]);
        if (!verdict) return null;
        return {
          conceptKey: 'definition.category_set_integrity',
          rawText: tidy(m[0]),
          normalizedValue: verdict,
          attributes: { expected: 'COMPLETE AND DISTINCT' },
        };
      }),
  },
];

/**
 * "on or after the date of first administration of IP and on or before the date
 * of definitive surgery" reduces to GTE(FIRST_IP) + LTE(SURGERY). A clause that
 * names an anchor without a comparator reduces to UNQUALIFIED(anchor), which is
 * how a dropped "on or before" shows up as a shape difference rather than as
 * two sentences a reader has to hold side by side.
 */
export function teaeShape(condition: string): string {
  const clauses = condition.split(/\s+and\s+/i);
  const parts = clauses.map((clause) => {
    const anchor = /surgery/i.test(clause)
      ? 'SURGERY'
      : /first administration|first dose/i.test(clause)
        ? 'FIRST_IP'
        : 'OTHER';
    const comparator = /on or after|after/i.test(clause)
      ? 'GTE'
      : /on or before|before|up to/i.test(clause)
        ? 'LTE'
        : 'UNQUALIFIED';
    return `${comparator}(${anchor})`;
  });
  return parts.join(' + ');
}

/**
 * Parses a stated list of numeric categories and reports duplicates and gaps.
 * ">=45 and <50" appearing twice is a copy-paste error that leaves everything
 * below 45 with nowhere to be counted.
 */
export function categorySetIntegrity(list: string): string | null {
  // Split on commas only: "and" inside ">=45 and <50" joins the two bounds of
  // one category, and splitting there would invent categories nobody wrote.
  const raw = list
    .split(',')
    .map((part) => part.trim().replace(/^and\s+/i, ''))
    .filter(Boolean);

  const parsed: { label: string; lower: number | null; upper: number | null }[] = [];
  for (const part of raw) {
    const lower = part.match(/>=\s*(\d+(?:\.\d+)?)/);
    const upper = part.match(/<\s*(\d+(?:\.\d+)?)/);
    if (!lower && !upper) continue;
    parsed.push({
      label: part.replace(/^and\s+/i, '').trim(),
      lower: lower ? Number(lower[1]) : null,
      upper: upper ? Number(upper[1]) : null,
    });
  }
  if (parsed.length < 2) return null;

  const problems: string[] = [];

  const labels = parsed.map((p) => `${p.lower ?? '-inf'}..${p.upper ?? 'inf'}`);
  const duplicates = labels.filter((label, i) => labels.indexOf(label) !== i);
  for (const duplicate of [...new Set(duplicates)]) {
    const original = parsed.find((p) => `${p.lower ?? '-inf'}..${p.upper ?? 'inf'}` === duplicate);
    problems.push(`the category "${original?.label}" is listed twice`);
  }

  const floor = Math.min(...parsed.map((p) => p.lower ?? Number.POSITIVE_INFINITY));
  if (Number.isFinite(floor) && !parsed.some((p) => p.lower === null && p.upper !== null && p.upper <= floor)) {
    problems.push(`values below ${floor} have no category`);
  }

  return problems.length === 0
    ? 'COMPLETE AND DISTINCT'
    : `INCOMPLETE — ${problems.join('; ')}`;
}

/** Exposed for the arithmetic validator, which reads the same numeric lists. */
export function parseCount(raw: string): number | null {
  return toNumber(raw);
}
