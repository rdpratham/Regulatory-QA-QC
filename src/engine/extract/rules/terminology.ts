import { normalizeScaleVersion, normalizeTerm, tidy } from '../normalize';
import { scan, type Rule, type RuleHit } from './types';

/**
 * Controlled-vocabulary drift.
 *
 * Three different failures live here and are detected three different ways:
 *
 *   grading scale versions  — a value comparison across a normalized version
 *   acronym collisions      — read out of the document's own abbreviation table
 *   defined-term spellings  — a declared vocabulary of terms that must be
 *                             written identically wherever they appear
 *
 * The abbreviation table is the document's own; nothing about this study is
 * configured here, which is what lets the same checks run on the next sponsor's
 * submission.
 */

/** Terms that must appear in one form across a submission. */
const CONTROLLED_VOCABULARY: {
  slug: string;
  label: string;
  pattern: RegExp;
  /** Preserve case when capitalisation itself is the drift being detected. */
  caseSensitive: boolean;
}[] = [
  { slug: 'full_analysis_set', label: 'Full Analysis Set', pattern: /\bFull [Aa]nalysis [Ss]et\b/g, caseSensitive: true },
  { slug: 'per_protocol_set', label: 'Per-Protocol Set', pattern: /\bPer-[Pp]rotocol [Ss]et\b/g, caseSensitive: true },
  { slug: 'safety_set', label: 'Safety Set', pattern: /\bSafety [Ss]et\b/g, caseSensitive: true },
  { slug: 'pharmacokinetic_set', label: 'Pharmacokinetic Set', pattern: /\bPharmacokinetic [Ss]et\b/g, caseSensitive: true },
  {
    slug: 'pathological_complete_response',
    label: 'pathological complete response',
    pattern: /\bpatholog(?:ic|ical) (?:complete response|response categories)\b/gi,
    caseSensitive: false,
  },
  {
    slug: 'sensitivity_analysis',
    label: 'sensitivity analysis',
    pattern: /\b[Ss]ensitiv(?:e|ity) [Aa]nalysis\b/g,
    caseSensitive: false,
  },
];

/**
 * Acronyms whose expansion is fixed by an external standard. When a document
 * defines the right expansion under the wrong acronym, the acronym is wrong —
 * and a reviewer who looks up ATCC finds a cell-culture collection.
 */
export const STANDARD_ACRONYMS: { acronym: string; expansion: RegExp; slug: string; source: string }[] = [
  {
    acronym: 'ATC',
    expansion: /^anatomical therapeutic chemical/i,
    slug: 'anatomical_therapeutic_chemical',
    source: 'WHO Collaborating Centre for Drug Statistics Methodology',
  },
  {
    acronym: 'MedDRA',
    expansion: /^medical dictionary for regulatory activities/i,
    slug: 'medical_dictionary_for_regulatory_activities',
    source: 'ICH',
  },
  {
    acronym: 'CTCAE',
    expansion: /^common terminology criteria for adverse events/i,
    slug: 'common_terminology_criteria',
    source: 'US National Cancer Institute',
  },
];

function singular(acronym: string): string {
  return /^[A-Z]{2,}s$/.test(acronym) ? acronym.slice(0, -1) : acronym;
}

export const TERMINOLOGY_RULES: Rule[] = [
  {
    id: 'terminology.grading_scale',
    category: 'TERMINOLOGY',
    description: 'Adverse event severity grading scale and version',
    specificity: 0.95,
    find: (text) => [
      ...scan(
        text,
        /Common Terminology Criteria for Adverse Events version (\d+(?:\.\d+)?)/gi,
        (m) => ({
          conceptKey: 'safety.ae_grading_scale',
          rawText: tidy(m[0]),
          normalizedValue: normalizeScaleVersion('CTCAE', m[1]),
        }),
      ),
      ...scan(text, /\bCTCAE\b\)?\s*(?:v(?:ersion)?\.?\s*)(\d+(?:\.\d+)?)/gi, (m) => ({
        conceptKey: 'safety.ae_grading_scale',
        rawText: tidy(m[0]),
        normalizedValue: normalizeScaleVersion('CTCAE', m[1]),
      })),
    ],
  },
  {
    id: 'terminology.dictionary_version',
    category: 'TERMINOLOGY',
    description: 'Coding dictionary and version',
    specificity: 0.94,
    find: (text) =>
      scan(text, /MedDRA version (\d+(?:\.\d+)?)/gi, (m) => ({
        conceptKey: 'coding.meddra_version',
        rawText: tidy(m[0]),
        normalizedValue: normalizeScaleVersion('MedDRA', m[1]),
      })),
  },
  {
    id: 'terminology.controlled_vocabulary',
    category: 'TERMINOLOGY',
    description: 'Surface form of a defined study term',
    specificity: 0.76,
    find: (text) =>
      CONTROLLED_VOCABULARY.flatMap((term) =>
        scan(text, term.pattern, (m) => ({
          conceptKey: `vocabulary.${term.slug}`,
          rawText: tidy(m[0]),
          normalizedValue: term.caseSensitive ? tidy(m[0]) : normalizeTerm(m[0]),
        })),
      ),
  },
  {
    id: 'terminology.acronym_definition',
    category: 'TERMINOLOGY',
    description: 'Acronym expansions declared in the document abbreviation table',
    specificity: 0.9,
    find: (_text, context) => {
      const { document, paragraph } = context;
      if (document.abbreviations.length === 0) return [];
      // Fire once, on the paragraph the abbreviation table was read from.
      if (document.abbreviations[0].paragraphId !== paragraph.paragraphId) return [];

      const hits: RuleHit[] = [];
      for (const abbreviation of document.abbreviations) {
        const key = singular(abbreviation.acronym);
        hits.push({
          conceptKey: `acronym.${key}`,
          rawText: `${abbreviation.acronym} — ${abbreviation.expansion}`,
          normalizedValue: normalizeTerm(abbreviation.expansion),
          index: Math.max(0, paragraph.text.indexOf(abbreviation.acronym)),
          attributes: { acronym: abbreviation.acronym },
        });

        for (const standard of STANDARD_ACRONYMS) {
          if (!standard.expansion.test(abbreviation.expansion)) continue;
          hits.push({
            conceptKey: `standard.acronym.${standard.slug}`,
            rawText: `${abbreviation.acronym} — ${abbreviation.expansion}`,
            normalizedValue: abbreviation.acronym,
            index: Math.max(0, paragraph.text.indexOf(abbreviation.acronym)),
            attributes: { expected: standard.acronym, source: standard.source },
          });
        }
      }
      return hits;
    },
  },
];
