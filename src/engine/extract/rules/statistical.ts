import { normalizeAlpha, normalizeCiLevel, normalizeInterval, tidy, toNumber } from '../normalize';
import { scan, type BenignPattern, type Rule } from './types';

/**
 * Statistical design parameters, and the acceptance criteria that decide
 * whether the study succeeded.
 *
 * The acceptance-criteria rule is the one that matters: it captures the
 * statistic, the confidence level, the bounds, and which regulator each
 * criterion was written for, so that the comparison step can later evaluate the
 * reported intervals against them and notice when two pre-specified criteria
 * return opposite verdicts.
 */

const DESCRIPTIVE_ANALYSIS: BenignPattern = {
  id: 'benign.descriptive_additional_analysis',
  pattern: /additional analysis|is descriptive|not part of the equivalence assessment/i,
  mode: 'downgrade',
  note:
    'This interval is stated for an analysis the document itself labels as additional and descriptive, and explicitly excludes from the equivalence assessment. A confidence level that differs for a clearly labelled supportive analysis is not a discrepancy.',
};

const DIFFERENT_OBJECTIVE: BenignPattern = {
  id: 'benign.different_objective',
  pattern: /pharmacokinetic|bioequivalence|immunogenicity/i,
  mode: 'downgrade',
  note:
    'This figure is stated for a different study objective from the one it is being compared against. Efficacy and pharmacokinetic objectives are powered separately and are expected to differ.',
};

function regulatorIn(text: string): string | undefined {
  if (/European Medicines Agency|\bEMA\b/i.test(text)) return 'EMA';
  if (/Food and Drug Administration|\bFDA\b/i.test(text)) return 'FDA';
  return undefined;
}

export const STATISTICAL_RULES: Rule[] = [
  {
    id: 'statistical.alpha',
    category: 'STATISTICAL',
    description: 'Type I error rate and hypothesis direction',
    specificity: 0.94,
    requiresContext: /hypothes|significance|tested|type I error|power/i,
    find: (text) => [
      ...scan(text, /(one|two)[-\s]sided significance level of (0?\.\d+)/gi, (m) => ({
        conceptKey: 'stat.alpha',
        rawText: tidy(m[0]),
        normalizedValue: normalizeAlpha(m[2], m[1]),
      })),
      ...scan(
        text,
        /(one|two)[-\s]sided and conducted at a significance level of (\d+(?:\.\d+)?)\s*%/gi,
        (m) => ({
          conceptKey: 'stat.alpha',
          rawText: tidy(m[0]),
          normalizedValue: normalizeAlpha(m[2], m[1], true),
        }),
      ),
    ],
  },
  {
    id: 'statistical.power',
    category: 'STATISTICAL',
    description: 'Statistical power of a pre-specified objective',
    specificity: 0.9,
    benignContext: DIFFERENT_OBJECTIVE,
    find: (text) =>
      scan(text, /(\d{2,3})\s*% power/gi, (m) => ({
        conceptKey: 'stat.power',
        rawText: tidy(m[0]),
        normalizedValue: `${toNumber(m[1])}%`,
        unit: '%',
      })),
  },
  {
    id: 'statistical.default_ci_level',
    category: 'STATISTICAL',
    description: 'Default confidence interval level stated for the plan as a whole',
    specificity: 0.93,
    find: (text) =>
      scan(
        text,
        /all confidence intervals will be (one|two)[-\s]sided (\d+)\s*% confidence intervals/gi,
        (m) => ({
          conceptKey: 'stat.default_ci_level',
          rawText: tidy(m[0]),
          normalizedValue: normalizeCiLevel(m[2], m[1]),
          attributes: { ciLevel: Number(m[2]) },
        }),
      ),
  },
  {
    id: 'statistical.equivalence_criterion',
    category: 'STATISTICAL',
    description: 'Pre-specified equivalence acceptance criterion with its bounds',
    specificity: 0.96,
    find: (text) =>
      scan(
        text,
        /(one|two)[-\s]sided (\d+)\s*% confidence interval for the (difference|ratio)[^.]*?within \[\s*(-?[\d.]+)\s*%?\s*,\s*(-?[\d.]+)\s*%?\s*\]/gi,
        (m) => {
          const statistic = m[3].toUpperCase();
          return {
            conceptKey: `equivalence.ci_level.${m[3].toLowerCase()}`,
            rawText: tidy(m[0]),
            normalizedValue: normalizeCiLevel(m[2], m[1]),
            attributes: {
              statistic,
              ciLevel: Number(m[2]),
              lower: Number(m[4]),
              upper: Number(m[5]),
              bounds: normalizeInterval(m[4], m[5]),
              ...(regulatorIn(text) ? { regulator: regulatorIn(text) as string } : {}),
            },
          };
        },
      ),
  },
  {
    id: 'statistical.ci_level_for_statistic',
    category: 'STATISTICAL',
    description: 'Confidence level applied to the difference or the ratio of response rates',
    specificity: 0.88,
    benignContext: DESCRIPTIVE_ANALYSIS,
    excludesContext: /observed (?:ratio|difference)/i,
    find: (text) =>
      scan(
        text,
        /(one|two)[-\s]sided (\d+)\s*% confidence interval for the (difference|ratio)/gi,
        (m) => ({
          conceptKey: `equivalence.ci_level.${m[3].toLowerCase()}`,
          rawText: tidy(m[0]),
          normalizedValue: normalizeCiLevel(m[2], m[1]),
          attributes: { statistic: m[3].toUpperCase(), ciLevel: Number(m[2]) },
        }),
      ),
  },
  {
    id: 'statistical.observed_interval',
    category: 'STATISTICAL',
    description: 'Reported point estimate and confidence interval',
    specificity: 0.95,
    documentTypes: ['CSR'],
    find: (text) =>
      scan(
        text,
        /observed (difference|ratio)[^.]*?was (-?\d+(?:\.\d+)?)\s*%? with a (?:one|two)[-\s]sided (\d+)\s*% confidence interval of (-?\d+(?:\.\d+)?) to (-?\d+(?:\.\d+)?)/gi,
        (m) => ({
          conceptKey: `equivalence.observed.${m[1].toLowerCase()}`,
          rawText: tidy(m[0]),
          normalizedValue: `${m[2]} (${m[3]}% CI ${m[4]} to ${m[5]})`,
          attributes: {
            statistic: m[1].toUpperCase(),
            ciLevel: Number(m[3]),
            estimate: Number(m[2]),
            lower: Number(m[4]),
            upper: Number(m[5]),
          },
        }),
      ),
  },
  {
    id: 'statistical.equivalence_margin_derivation',
    category: 'STATISTICAL',
    description: 'Stated derivation of the equivalence margin',
    specificity: 0.94,
    find: (text) =>
      scan(
        text,
        /derived as (\d+)\s*% of the lower bound[^.]*?\.\s*The estimated effect is (-?\d+(?:\.\d+)?)\s*% and the resulting margin is therefore (-?\d+(?:\.\d+)?)\s*%/gi,
        (m) => ({
          conceptKey: 'design.equivalence_margin',
          rawText: tidy(m[0]),
          normalizedValue: `${toNumber(m[3])}%`,
          unit: '%',
          attributes: {
            factor: Number(m[1]) / 100,
            base: Number(m[2]),
            stated: Number(m[3]),
          },
        }),
      ),
  },
  {
    id: 'statistical.test_for_safety_data',
    category: 'STATISTICAL',
    description: 'A named statistical test applied to safety or baseline data',
    specificity: 0.86,
    requiresContext: /Safety Set|safety data|demographic|baseline|anti-drug|ADA/i,
    find: (text) =>
      scan(
        text,
        /(Fisher's exact test|chi-squared test|chi-square test|F-test|t-test|Wilcoxon(?: rank-sum)? test)/gi,
        (m) => ({
          conceptKey: 'practice.statistical_test_on_safety_data',
          rawText: tidy(m[0]),
          normalizedValue: tidy(m[0]),
        }),
      ),
  },
  {
    id: 'statistical.no_comparison_policy',
    category: 'STATISTICAL',
    description: 'A stated policy that no statistical comparison will be performed',
    specificity: 0.95,
    find: (text) =>
      scan(
        text,
        /No statistical comparisons? between treatment groups will be performed for (safety|efficacy) data/gi,
        (m) => ({
          conceptKey: `policy.no_statistical_comparison.${m[1].toLowerCase()}`,
          rawText: tidy(m[0]),
          normalizedValue: 'STATED',
        }),
      ),
  },
];
