import type { ArithmeticCheck, Citation, Entity, IndexedParagraph } from './types';

/**
 * Recomputation of derivations the documents state about themselves.
 *
 * The confirmations matter as much as the failures. Being able to say "the
 * region counts do sum to 811, and the power calculation does reproduce — the
 * problem is that 811 is not the 752 the plan asked for" is the difference
 * between a tool that says a document is wrong and a tool that says which of
 * two individually correct numbers the reviewer needs to reconcile. Only the
 * second one survives contact with a statistician.
 */

type Draft = Omit<ArithmeticCheck, 'id'>;

function citationOf(paragraph: IndexedParagraph, snippet: string): Citation {
  return {
    documentId: paragraph.documentId,
    documentType: paragraph.documentType,
    version: paragraph.version,
    author: paragraph.author,
    sectionId: paragraph.sectionId,
    sectionHeading: paragraph.sectionHeading,
    printedPage: paragraph.printedPage,
    pdfPage: paragraph.pdfPage,
    paragraphId: paragraph.paragraphId,
    snippet,
  };
}

function decimalsOf(value: string): number {
  const m = value.match(/\.(\d+)$/);
  return m ? m[1].length : 0;
}

/* ------------------------------------------------------------------ */
/* Individual validators                                               */
/* ------------------------------------------------------------------ */

/** Do the rows of a disposition table sum to the total the table states? */
function tableTotals(paragraphs: IndexedParagraph[]): Draft[] {
  const checks: Draft[] = [];

  for (const paragraph of paragraphs) {
    if (!/subjects by geographic region/i.test(paragraph.text)) continue;

    const rows: { label: string; values: number[] }[] = [];
    let total: { label: string; values: number[] } | null = null;

    for (const line of paragraph.lines) {
      const m = line.match(/^([A-Za-z][A-Za-z \-']*?)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)$/);
      if (!m) continue;
      const values = [m[2], m[3], m[4]].map((v) => Number(v.replace(/,/g, '')));
      if (/^total$/i.test(m[1].trim())) total = { label: m[1].trim(), values };
      else rows.push({ label: m[1].trim(), values });
    }

    if (!total || rows.length < 2) continue;

    for (const [column, label] of [
      [0, 'first treatment column'],
      [1, 'second treatment column'],
      [2, 'total column'],
    ] as const) {
      const sum = rows.reduce((acc, row) => acc + row.values[column], 0);
      checks.push({
        label: `Disposition table — ${label} sums to its stated total`,
        expression: `${rows.map((r) => r.values[column]).join(' + ')}`,
        expected: String(sum),
        stated: String(total.values[column]),
        outcome: sum === total.values[column] ? 'CONFIRMED' : 'FAILED',
        tolerance: 'exact',
        citation: citationOf(paragraph, paragraph.lines.filter((l) => /^total/i.test(l))[0] ?? paragraph.text.slice(0, 160)),
      });
    }
  }

  return checks;
}

/** Does evaluable ÷ (1 − dropout) give the stated per-arm and total figures? */
function sampleSizeInflation(entities: Entity[], paragraphs: IndexedParagraph[]): Draft[] {
  const value = (key: string) =>
    entities.find((e) => e.conceptKey === key && Number.isFinite(Number(e.normalizedValue)));

  const evaluable = value('sample_size.evaluable_per_arm');
  const perArm = value('sample_size.planned_per_arm');
  const planned = value('sample_size.planned');
  const dropout = entities.find((e) => e.conceptKey === 'design.dropout_rate');
  if (!evaluable || !perArm || !dropout) return [];

  const rate = Number(dropout.normalizedValue.replace('%', '')) / 100;
  const inflated = Number(evaluable.normalizedValue) / (1 - rate);
  const stated = Number(perArm.normalizedValue);
  const paragraph =
    paragraphs.find((p) => p.paragraphId === perArm.citation.paragraphId) ?? paragraphs[0];

  const checks: Draft[] = [
    {
      label: 'Sample size inflation for dropout reproduces the stated per-group figure',
      expression: `${evaluable.normalizedValue} evaluable / (1 - ${dropout.normalizedValue}) = ${inflated.toFixed(2)}`,
      expected: String(Math.round(inflated)),
      stated: String(stated),
      outcome: Math.abs(inflated - stated) <= 1 ? 'CONFIRMED' : 'FAILED',
      tolerance: '+/- 1 subject (rounding)',
      citation: citationOf(paragraph, perArm.citation.snippet),
    },
  ];

  if (planned) {
    checks.push({
      label: 'Per-group figure doubles to the stated randomised total',
      expression: `${stated} x 2`,
      expected: String(stated * 2),
      stated: planned.normalizedValue,
      outcome: stated * 2 === Number(planned.normalizedValue) ? 'CONFIRMED' : 'FAILED',
      tolerance: 'exact',
      citation: citationOf(paragraph, planned.citation.snippet),
    });
  }

  return checks;
}

/** Does dose ÷ cycle interval give the stated planned dose intensity? */
function doseIntensity(paragraphs: IndexedParagraph[]): Draft[] {
  const checks: Draft[] = [];

  for (const paragraph of paragraphs) {
    const interval = paragraph.text.match(/cycle interval of (\d+) days/i);
    if (!interval) continue;
    const days = Number(interval[1]);

    const pattern =
      /(?:planned (?:maintenance )?dose is|planned dose is) ([\d.]+) (mg\/kg|mg\/m2), giving (?:a planned dose intensity of )?([\d.]+)/gi;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(paragraph.text)) !== null) {
      const computed = Number(m[1]) / days;
      const stated = Number(m[3]);
      const tolerance = 0.5 * 10 ** -decimalsOf(m[3]);
      checks.push({
        label: `Planned dose intensity for ${m[1]} ${m[2]}`,
        expression: `${m[1]} ${m[2]} / ${days} days`,
        expected: computed.toFixed(Math.max(4, decimalsOf(m[3]))),
        stated: m[3],
        outcome: Math.abs(computed - stated) <= tolerance ? 'CONFIRMED' : 'FAILED',
        tolerance: `+/- ${tolerance}`,
        citation: citationOf(paragraph, m[0]),
      });
    }
  }

  return checks;
}

/** Does the stated equivalence margin reproduce from its own derivation? */
function equivalenceMargin(entities: Entity[], paragraphs: IndexedParagraph[]): Draft[] {
  const margin = entities.find((e) => e.conceptKey === 'design.equivalence_margin');
  if (!margin?.attributes) return [];

  const base = Number(margin.attributes.base);
  const factor = Number(margin.attributes.factor);
  const stated = Number(margin.attributes.stated);
  if (!Number.isFinite(base) || !Number.isFinite(factor)) return [];

  const computed = base * factor;
  const paragraph =
    paragraphs.find((p) => p.paragraphId === margin.citation.paragraphId) ?? paragraphs[0];

  return [
    {
      label: 'Equivalence margin reproduces from its stated derivation',
      // Margins are a regulatory commitment, so this one is checked exactly
      // rather than to the precision the document happens to have used.
      expression: `${base}% x ${factor}`,
      expected: `${computed.toFixed(2)}%`,
      stated: `${stated}%`,
      outcome: Math.abs(computed - stated) < 1e-9 ? 'CONFIRMED' : 'FAILED',
      tolerance: 'exact',
      citation: citationOf(paragraph, margin.citation.snippet),
    },
  ];
}

/** Do reported analysis-set arm counts sum to the reported set total? */
function analysisSetTotals(entities: Entity[], paragraphs: IndexedParagraph[]): Draft[] {
  const checks: Draft[] = [];

  for (const entity of entities) {
    if (!entity.attributes) continue;
    const armA = Number(entity.attributes.armA);
    const armB = Number(entity.attributes.armB);
    if (!Number.isFinite(armA) || !Number.isFinite(armB)) continue;
    const total = Number(entity.normalizedValue);
    if (!Number.isFinite(total)) continue;

    const paragraph =
      paragraphs.find((p) => p.paragraphId === entity.citation.paragraphId) ?? paragraphs[0];

    checks.push({
      label: `Reported arm counts sum to the stated total (${entity.conceptKey.replace('sample_size.', '')})`,
      expression: `${armA} + ${armB}`,
      expected: String(armA + armB),
      stated: String(total),
      outcome: armA + armB === total ? 'CONFIRMED' : 'FAILED',
      tolerance: 'exact',
      citation: citationOf(paragraph, entity.citation.snippet),
    });
  }

  return checks;
}

/* ------------------------------------------------------------------ */

export function runArithmetic(
  entities: Entity[],
  paragraphs: IndexedParagraph[],
): ArithmeticCheck[] {
  const drafts = [
    ...tableTotals(paragraphs),
    ...sampleSizeInflation(entities, paragraphs),
    ...doseIntensity(paragraphs),
    ...equivalenceMargin(entities, paragraphs),
    ...analysisSetTotals(entities, paragraphs),
  ];

  return drafts.map((draft, i) => ({ ...draft, id: `AC-${String(i + 1).padStart(3, '0')}` }));
}
