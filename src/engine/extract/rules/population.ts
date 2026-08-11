import { parseGradeRange, tidy, toNumber, normalizeThreshold } from '../normalize';
import { scan, type Rule } from './types';

/**
 * Who may be enrolled, who is analysed, and on what scale they are described.
 */
export const POPULATION_RULES: Rule[] = [
  {
    id: 'population.ecog_eligibility',
    category: 'POPULATION',
    description: 'Permitted ECOG performance status at study entry',
    specificity: 0.84,
    requiresContext: /eligib|inclusion|enrol|permitted|criteri|study entry/i,
    find: (text) =>
      scan(text, /ECOG[^.]{0,180}/gi, (m) => {
        const range = parseGradeRange(m[0]);
        if (!range) return null;
        return {
          conceptKey: 'inclusion.ecog',
          rawText: tidy(m[0]).slice(0, 130),
          normalizedValue: `ECOG ${range}`,
        };
      }),
  },
  {
    id: 'population.ecog_reporting_scale',
    category: 'POPULATION',
    description: 'Scale on which ECOG performance status is reported',
    specificity: 0.88,
    find: (text) => [
      ...scan(text, /ECOG performance status[^.]*?categories \(([^)]+)\)/gi, (m) => ({
        conceptKey: 'reporting.ecog_scale',
        rawText: tidy(m[0]),
        normalizedValue: `ECOG categories ${tidy(m[1])}`,
      })),
      ...scan(
        text,
        /ECOG performance status[^.]*?full scale from (\d)[a-z ]*?to (\d)\b/gi,
        (m) => ({
          conceptKey: 'reporting.ecog_scale',
          rawText: tidy(m[0]),
          normalizedValue: `ECOG categories ${m[1]}-${m[2]}`,
        }),
      ),
    ],
  },
  {
    id: 'population.pk_set_cycle_requirement',
    category: 'POPULATION',
    description: 'Treatment-exposure requirement for the pharmacokinetic population',
    specificity: 0.91,
    requiresContext: /pharmacokinetic/i,
    find: (text) => [
      ...scan(text, /received at least ([a-z]+|\d+) cycles/gi, (m) => {
        const n = toNumber(m[1]);
        return n === null
          ? null
          : {
              conceptKey: 'population.pk_set.cycle_requirement',
              rawText: tidy(m[0]),
              normalizedValue: `GTE ${n} cycles`,
              unit: 'cycles',
            };
      }),
      ...scan(text, /complete all ([a-z]+|\d+) (?:neoadjuvant )?cycles/gi, (m) => {
        const n = toNumber(m[1]);
        return n === null
          ? null
          : {
              conceptKey: 'population.pk_set.cycle_requirement',
              rawText: tidy(m[0]),
              normalizedValue: `ALL ${n} cycles`,
              unit: 'cycles',
            };
      }),
    ],
  },
  {
    id: 'population.pps_site_exclusion',
    category: 'POPULATION',
    description: 'Named-site exclusion applied to the Per-Protocol Set',
    specificity: 0.93,
    find: (text) =>
      scan(
        text,
        /([A-Za-z]+|\d+) subjects enrolled at ([a-z]+|\d+) sites? in ([A-Z][a-z]+)[^.]{0,80}?excluded from the Per-[Pp]rotocol [Ss]et/gi,
        (m) => {
          const subjects = toNumber(m[1]);
          const sites = toNumber(m[2]);
          if (subjects === null || sites === null) return null;
          return {
            conceptKey: 'population.pps_site_exclusion',
            rawText: tidy(m[0]),
            normalizedValue: `${subjects} subjects at ${sites} sites in ${m[3]}`,
            attributes: { subjects, sites, country: m[3] },
          };
        },
      ),
  },
  {
    id: 'population.creatinine_clearance',
    category: 'POPULATION',
    description: 'Renal function threshold for eligibility',
    specificity: 0.94,
    find: (text) =>
      scan(
        text,
        /creatinine clearance\s*(?:of\s+)?(>=|<=|≥|≤|at least)\s*(\d+)\s*(mL\/min)/gi,
        (m) => ({
          conceptKey: 'inclusion.creatinine_clearance',
          rawText: tidy(m[0]),
          normalizedValue: normalizeThreshold(m[1], m[2], m[3]),
          unit: 'mL/min',
        }),
      ),
  },
  {
    id: 'population.lvef_threshold',
    category: 'POPULATION',
    description: 'Baseline cardiac function threshold for eligibility',
    specificity: 0.92,
    requiresContext: /eligib|adequate cardiac function|baseline/i,
    find: (text) =>
      scan(
        text,
        /left ventricular ejection fraction of at least (\d+)\s*%/gi,
        (m) => ({
          conceptKey: 'inclusion.lvef_baseline',
          rawText: tidy(m[0]),
          normalizedValue: `GTE ${toNumber(m[1])} %`,
          unit: '%',
        }),
      ),
  },
  {
    id: 'population.min_age',
    category: 'POPULATION',
    description: 'Minimum age for enrolment',
    specificity: 0.88,
    find: (text) =>
      scan(text, /aged at least (\d+|[a-z]+) years/gi, (m) => {
        const n = toNumber(m[1]);
        return n === null
          ? null
          : {
              conceptKey: 'inclusion.min_age',
              rawText: tidy(m[0]),
              normalizedValue: `GTE ${n} years`,
              unit: 'years',
            };
      }),
  },
];
