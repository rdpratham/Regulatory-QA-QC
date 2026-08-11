import { normalizeTimepoint, normalizeTolerance, tidy, toNumber } from '../normalize';
import { scan, sentences, type Rule, type RuleHit } from './types';

/**
 * Windows, intervals, and the assessment-to-timepoint pairing that the coverage
 * check compares between the Protocol and the CRF.
 */

const ASSESSMENTS: { key: string; label: string; pattern: RegExp }[] = [
  {
    key: 'lvef',
    label: 'left ventricular ejection fraction',
    pattern: /echocardiogram|left ventricular ejection fraction|\bLVEF\b/i,
  },
  {
    key: 'ecg',
    label: 'twelve-lead electrocardiogram',
    pattern: /electrocardiogram|\bECG\b/i,
  },
];

const TIMEPOINT =
  /\b(?:at|on)\s+(screening|baseline|Cycle\s*\d+\s*Day\s*\d+|the end-of-treatment visit|end[-\s]of[-\s]treatment|the end-of-study visit|surgery)/gi;

export const SCHEDULE_RULES: Rule[] = [
  {
    id: 'schedule.visit_window',
    category: 'SCHEDULE',
    description: 'Permitted visit window tolerance',
    specificity: 0.9,
    find: (text) =>
      scan(text, /(?:\+\/-|±)\s*(\d+)\s*(days?)/gi, (m) => ({
        conceptKey: 'schedule.visit_window',
        rawText: tidy(m[0]),
        normalizedValue: normalizeTolerance(m[1], m[2]),
        unit: 'days',
      })),
  },
  {
    id: 'schedule.safety_followup',
    category: 'SCHEDULE',
    description: 'Safety follow-up window after the last dose',
    specificity: 0.93,
    find: (text) =>
      scan(text, /(\d+)\s*(days?) after the (?:last|final) dose/gi, (m) => ({
        conceptKey: 'safety.followup_window',
        rawText: tidy(m[0]),
        normalizedValue: `${toNumber(m[1])} days`,
        unit: 'days',
      })),
  },
  {
    id: 'schedule.cycle_interval',
    category: 'SCHEDULE',
    description: 'Treatment cycle interval',
    specificity: 0.88,
    find: (text) => [
      ...scan(text, /every (\d+) days/gi, (m) => ({
        conceptKey: 'schedule.cycle_interval',
        rawText: tidy(m[0]),
        normalizedValue: `${toNumber(m[1])} days`,
        unit: 'days',
      })),
      ...scan(text, /at (\d+)-day intervals/gi, (m) => ({
        conceptKey: 'schedule.cycle_interval',
        rawText: tidy(m[0]),
        normalizedValue: `${toNumber(m[1])} days`,
        unit: 'days',
      })),
      ...scan(text, /planned cycle interval of (\d+) days/gi, (m) => ({
        conceptKey: 'schedule.cycle_interval',
        rawText: tidy(m[0]),
        normalizedValue: `${toNumber(m[1])} days`,
        unit: 'days',
      })),
    ],
  },
  {
    id: 'schedule.neoadjuvant_cycles',
    category: 'SCHEDULE',
    description: 'Number of cycles in each treatment period',
    specificity: 0.87,
    find: (text) =>
      scan(text, /(?:a )?(neoadjuvant|adjuvant) period of ([a-z]+|\d+) cycles/gi, (m) => {
        const n = toNumber(m[2]);
        return n === null
          ? null
          : {
              conceptKey: `schedule.cycles.${m[1].toLowerCase()}`,
              rawText: tidy(m[0]),
              normalizedValue: `${n} cycles`,
              unit: 'cycles',
            };
      }),
  },
  {
    id: 'coverage.assessment_timepoint',
    category: 'COVERAGE',
    description: 'A required assessment paired with the timepoint at which it is required',
    specificity: 0.85,
    documentTypes: ['PROTOCOL', 'CRF'],
    find: (text) => {
      const hits: RuleHit[] = [];
      for (const sentence of sentences(text)) {
        for (const assessment of ASSESSMENTS) {
          if (!assessment.pattern.test(sentence.text)) continue;
          const seen = new Set<string>();
          for (const hit of scan(sentence.text, TIMEPOINT, (m) => ({
            conceptKey: `assessment.${assessment.key}.${normalizeTimepoint(m[1])}`,
            rawText: `${assessment.label} ${tidy(m[0])}`,
            normalizedValue: 'REQUIRED',
          }))) {
            if (seen.has(hit.conceptKey)) continue;
            seen.add(hit.conceptKey);
            hits.push({ ...hit, index: sentence.index + hit.index });
          }
        }
      }
      return hits;
    },
  },
];
