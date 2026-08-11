import { tidy, toNumber } from '../normalize';
import { scan, type Rule, type RuleContext, type RuleHit } from './types';

/**
 * Tables, figures and listings.
 *
 * The output package is where a submission's prose becomes denominators. An
 * output header that states a population size the study report does not agree
 * with makes every rate in that table uncheckable — and unlike a prose
 * discrepancy, nobody reads a table header twice.
 *
 * The population rules deliberately emit into the same concept keys the study
 * report and the analysis plan use. A TFL that says the Per-Protocol Set is 742
 * and a report that says 744 is then an ordinary cross-document disagreement,
 * caught by the same comparison as everything else, with no special case.
 */

/** Which analysis set an output is computed on, read from its own title. */
const POPULATION_BY_TITLE: { pattern: RegExp; conceptKey: string; label: string }[] = [
  { pattern: /per-?protocol/i, conceptKey: 'sample_size.per_protocol', label: 'Per-Protocol Set' },
  { pattern: /safety set/i, conceptKey: 'sample_size.treated', label: 'Safety Set' },
  { pattern: /all randomised|randomized|full analysis/i, conceptKey: 'sample_size.randomised', label: 'randomised' },
];

const OUTPUT_ID = /\b(Table|Figure|Listing)\s+(\d+(?:\.\d+)*)/gi;

function sectionOf(context: RuleContext) {
  return context.document.sections.find((s) =>
    s.paragraphs.some((p) => p.id === context.paragraph.paragraphId),
  );
}

export const TFL_RULES: Rule[] = [
  {
    id: 'tfl.population_header',
    category: 'NUMERIC',
    description: 'Analysis set size stated in an output header',
    specificity: 0.9,
    documentTypes: ['TFL'],
    find: (text, context) => {
      const section = sectionOf(context);
      if (!section) return [];

      // The population is named in the output title, not in the header line.
      const population = POPULATION_BY_TITLE.find((p) => p.pattern.test(section.heading));
      if (!population) return [];

      // "CB-207 (N=374) Reference product (N=368) Total (N=742)"
      const arms = [...text.matchAll(/\(N\s*=\s*([\d,]+)\)/gi)].map((m) => toNumber(m[1]) ?? 0);
      if (arms.length < 2) return [];

      // A stated total is the document's own claim; otherwise sum the arms.
      const total = /total\s*\(N/i.test(text) ? arms[arms.length - 1] : arms.reduce((a, b) => a + b, 0);
      if (!total) return [];

      return [
        {
          conceptKey: population.conceptKey,
          rawText: tidy(text).slice(0, 120),
          normalizedValue: String(total),
          index: 0,
          attributes: { output: section.id, population: population.label },
        },
      ];
    },
  },
  {
    id: 'tfl.output_index',
    category: 'CROSSREF',
    description: 'Output numbers listed in the index',
    specificity: 0.88,
    documentTypes: ['TFL'],
    paragraphKind: 'PROSE',
    find: (text, context) => {
      const section = sectionOf(context);
      if (!section || !/LIST OF OUTPUTS|TABLE OF CONTENTS/i.test(section.heading)) return [];

      const numbers = [...text.matchAll(new RegExp(OUTPUT_ID.source, 'gi'))].map((m) => ({
        kind: m[1],
        number: m[2],
      }));
      if (numbers.length < 3) return [];

      // Within one series (14.1.x), a skipped number means an output that was
      // planned and is not here, or one that is here and is not indexed.
      const gaps: string[] = [];
      const bySeries = new Map<string, number[]>();
      for (const entry of numbers) {
        const parts = entry.number.split('.');
        if (parts.length < 3) continue;
        const series = parts.slice(0, -1).join('.');
        const leaf = Number(parts[parts.length - 1]);
        if (!Number.isFinite(leaf)) continue;
        bySeries.set(series, [...(bySeries.get(series) ?? []), leaf]);
      }
      for (const [series, leaves] of bySeries) {
        const sorted = [...new Set(leaves)].sort((a, b) => a - b);
        for (let n = sorted[0]; n < sorted[sorted.length - 1]; n += 1) {
          if (!sorted.includes(n)) gaps.push(`${series}.${n}`);
        }
      }

      return [
        {
          conceptKey: 'tfl.output_numbering',
          rawText: `${numbers.length} outputs indexed`,
          normalizedValue: gaps.length === 0 ? 'CONTIGUOUS' : `GAPS — ${gaps.join(', ')} not indexed`,
          index: 0,
          attributes: { expected: 'CONTIGUOUS' },
        },
      ];
    },
  },
  {
    id: 'tfl.source_program',
    category: 'DERIVATION',
    description: 'Source program footnote on a generated output',
    specificity: 0.92,
    documentTypes: ['TFL'],
    find: (_text, context) => {
      const section = sectionOf(context);
      if (!section) return [];
      // Only outputs carry a source footnote; the index and cover do not.
      if (!/^(TABLE|FIGURE|LISTING)\s+\d/i.test(section.heading)) return [];
      // Fire once per output, on its first paragraph.
      if (section.paragraphs[0]?.id !== context.paragraph.paragraphId) return [];

      const body = section.paragraphs.map((p) => p.text).join(' ');
      const source = body.match(/Source:\s*([A-Za-z0-9_.-]+)/i);

      return [
        {
          conceptKey: 'tfl.source_traceability',
          rawText: source ? tidy(source[0]) : `${section.heading.slice(0, 60)} — no source footnote`,
          normalizedValue: source ? `TRACEABLE — ${source[1]}` : 'NO SOURCE PROGRAM CITED',
          index: 0,
          attributes: { expected: `TRACEABLE — ${source ? source[1] : ''}`.trim(), output: section.id },
        },
      ];
    },
  },
  {
    id: 'tfl.grading_scale',
    category: 'TERMINOLOGY',
    description: 'Grading scale version stated on an output',
    specificity: 0.94,
    documentTypes: ['TFL'],
    find: (text) =>
      scan(
        text,
        /Common Terminology Criteria for Adverse Events version (\d+(?:\.\d+)?)/gi,
        (m) => ({
          conceptKey: 'safety.ae_grading_scale',
          rawText: tidy(m[0]),
          normalizedValue: `CTCAE ${m[1]}`,
        }),
      ),
  },
];

/**
 * The source-program check compares each output against the expectation that
 * one is cited. An output with a footnote satisfies it trivially; one without
 * carries an expected value it cannot match, and becomes a finding.
 */
export function normalizeSourceExpectation(hits: RuleHit[]): RuleHit[] {
  return hits.map((hit) =>
    hit.normalizedValue === 'NO SOURCE PROGRAM CITED'
      ? { ...hit, attributes: { ...hit.attributes, expected: 'A SOURCE PROGRAM CITED' } }
      : hit,
  );
}
