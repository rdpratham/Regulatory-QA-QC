import { normalizeFrequency, normalizeUnit, tidy, toNumber } from '../normalize';
import { scan, type BenignPattern, type Rule, type RuleHit } from './types';

/**
 * A dose stated for a different study in the same development programme is
 * correct where it stands. Flagging it as a dosing discrepancy at full
 * confidence is the fastest way to lose a clinical pharmacologist.
 */
const CROSS_STUDY_CONTEXT: BenignPattern = {
  id: 'benign.cross_study_reference',
  pattern: /\bphase\s*1\b|dose[-\s]escalation|first-in-(?:human|patient)|CB207-C101/i,
  mode: 'downgrade',
  note:
    'This dose is stated in the context of a different study in the development programme — a dose-finding study, not the confirmatory study under review. A value that legitimately differs because it describes a different study is not a submission discrepancy.',
};

/**
 * Subject counts. Planned, randomised, treated, analysed — four different
 * numbers that are all correct, which is precisely why they drift apart across
 * a submission without anybody noticing.
 */
export const NUMERIC_RULES: Rule[] = [
  {
    id: 'numeric.sample_size.planned',
    category: 'NUMERIC',
    description: 'Planned number of randomised subjects',
    specificity: 0.93,
    find: (text) => [
      ...scan(
        text,
        /A total of ([\d,]+) subjects will (?:therefore )?be randomised/gi,
        (m) => ({
          conceptKey: 'sample_size.planned',
          rawText: tidy(m[0]),
          normalizedValue: String(toNumber(m[1])),
        }),
      ),
      ...scan(text, /planned sample size (?:is|of) ([\d,]+)/gi, (m) => ({
        conceptKey: 'sample_size.planned',
        rawText: tidy(m[0]),
        normalizedValue: String(toNumber(m[1])),
      })),
      // Figure 1 flattens to "Randomised n = 376 n = 376 n = 752".
      ...scan(
        text,
        /Randomised\s+n\s*=\s*(\d+)\s+n\s*=\s*(\d+)\s+n\s*=\s*(\d+)/gi,
        (m) => ({
          conceptKey: 'sample_size.planned',
          rawText: tidy(m[0]),
          normalizedValue: String(toNumber(m[3])),
          attributes: { perArm: Number(m[1]) },
        }),
      ),
    ],
  },
  {
    id: 'numeric.sample_size.planned_per_arm',
    category: 'NUMERIC',
    description: 'Planned subjects per treatment group',
    specificity: 0.9,
    find: (text) =>
      scan(text, /([\d,]+) subjects per treatment group are required/gi, (m) => ({
        conceptKey: 'sample_size.planned_per_arm',
        rawText: tidy(m[0]),
        normalizedValue: String(toNumber(m[1])),
      })),
  },
  {
    id: 'numeric.sample_size.evaluable',
    category: 'NUMERIC',
    description: 'Evaluable subjects per group used in the power calculation',
    specificity: 0.9,
    find: (text) =>
      scan(text, /([\d,]+) evaluable subjects per treatment group/gi, (m) => ({
        conceptKey: 'sample_size.evaluable_per_arm',
        rawText: tidy(m[0]),
        normalizedValue: String(toNumber(m[1])),
      })),
  },
  {
    id: 'numeric.dropout_rate',
    category: 'NUMERIC',
    description: 'Assumed dropout rate between randomisation and the primary assessment',
    specificity: 0.92,
    find: (text) =>
      scan(text, /dropout rate of (\d+(?:\.\d+)?)\s*%/gi, (m) => ({
        conceptKey: 'design.dropout_rate',
        rawText: tidy(m[0]),
        normalizedValue: `${toNumber(m[1])}%`,
        unit: '%',
      })),
  },
  {
    id: 'numeric.sample_size.randomised',
    category: 'NUMERIC',
    description: 'Number of subjects actually randomised',
    specificity: 0.92,
    find: (text, context) => {
      const hits: RuleHit[] = scan(
        text,
        /A total of ([\d,]+) subjects were randomised/gi,
        (m) => ({
          conceptKey: 'sample_size.randomised',
          rawText: tidy(m[0]),
          normalizedValue: String(toNumber(m[1])),
        }),
      );

      // The regional disposition table reduces to one line per row. The total
      // row is the study's actual randomised count, and it is the number that
      // most often fails to agree with the plan two sections earlier.
      if (/randomised subjects by geographic region/i.test(text)) {
        for (const line of context.paragraph.lines) {
          const m = line.match(/^Total\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)$/i);
          if (!m) continue;
          hits.push({
            conceptKey: 'sample_size.randomised',
            rawText: tidy(line),
            normalizedValue: String(toNumber(m[3])),
            index: Math.max(0, text.indexOf(line.slice(0, 20))),
            attributes: { armA: Number(m[1]), armB: Number(m[2]) },
          });
        }
      }
      return hits;
    },
  },
  {
    id: 'numeric.sample_size.treated',
    category: 'NUMERIC',
    description: 'Number of subjects who received at least one dose',
    specificity: 0.9,
    find: (text) =>
      scan(text, /([\d,]+) subjects received at least one dose/gi, (m) => ({
        conceptKey: 'sample_size.treated',
        rawText: tidy(m[0]),
        normalizedValue: String(toNumber(m[1])),
      })),
  },
  {
    id: 'numeric.sample_size.per_protocol',
    category: 'NUMERIC',
    description: 'Size of the Per-Protocol Set',
    specificity: 0.9,
    find: (text) =>
      scan(
        text,
        /Per-Protocol Set comprised ([\d,]+) subjects,\s*([\d,]+) in the [^,]+ and ([\d,]+)/gi,
        (m) => ({
          conceptKey: 'sample_size.per_protocol',
          rawText: tidy(m[0]),
          normalizedValue: String(toNumber(m[1])),
          attributes: { armA: Number(m[2]), armB: Number(m[3]) },
        }),
      ),
  },
  {
    id: 'numeric.dose_regimen',
    category: 'NUMERIC',
    description: 'Administered dose amount and frequency',
    specificity: 0.94,
    benignContext: CROSS_STUDY_CONTEXT,
    find: (text) => [
      ...scan(
        text,
        /(?:maintenance dose of|dose of|dose is) (-?\d+(?:\.\d+)?)\s*(mg\/kg|mg\/m2)(?:\s+administered)?\s+(once weekly|once daily|twice daily|every \d+ days)/gi,
        (m) => ({
          conceptKey: 'dose.regimen',
          rawText: tidy(m[0]),
          normalizedValue: `${toNumber(m[1])} ${normalizeUnit(m[2])} ${normalizeFrequency(m[3])}`,
          unit: normalizeUnit(m[2]),
        }),
      ),
      ...scan(
        text,
        /\bwas (-?\d+(?:\.\d+)?)\s*(mg\/kg|mg\/m2) administered (once weekly|once daily|twice daily)/gi,
        (m) => ({
          conceptKey: 'dose.regimen',
          rawText: tidy(m[0]),
          normalizedValue: `${toNumber(m[1])} ${normalizeUnit(m[2])} ${normalizeFrequency(m[3])}`,
          unit: normalizeUnit(m[2]),
        }),
      ),
    ],
  },
  {
    id: 'numeric.sample_size.pk',
    category: 'NUMERIC',
    description: 'Pharmacokinetic subset size per group',
    specificity: 0.88,
    find: (text) =>
      scan(
        text,
        /([A-Za-z-]+|[\d,]+) subjects per treatment group provide (\d+)\s*% power/gi,
        (m) => {
          const n = toNumber(m[1]);
          if (n === null) return null;
          return {
            conceptKey: 'sample_size.pk_per_arm',
            rawText: tidy(m[0]),
            normalizedValue: String(n),
          };
        },
      ),
  },
];
