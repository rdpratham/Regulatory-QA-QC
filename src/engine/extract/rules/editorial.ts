import { tidy } from '../normalize';
import { scan, type Rule } from './types';

/**
 * Editorial defects.
 *
 * Individually these are worth very little — nobody rejects a submission over
 * "catgory". In aggregate they are a volume-of-drift metric: a document with
 * fourteen of them has not had a careful read, and that is a fact about the
 * document a QC lead wants before deciding how hard to look at everything else.
 *
 * Both tables are reference data, not findings. A rule fires when the document
 * contains the wrong form; the expected form travels with the entity and the
 * comparison step reports the difference.
 */

export const MISSPELLINGS: { wrong: RegExp; correct: string; slug: string; note?: string }[] = [
  { wrong: /\bcatgory\b/gi, correct: 'category', slug: 'category' },
  { wrong: /\bPARAMTERS\b/g, correct: 'PARAMETERS', slug: 'parameters' },
  { wrong: /\bADDITONAL\b/g, correct: 'ADDITIONAL', slug: 'additional' },
  { wrong: /\bpreformed\b/gi, correct: 'performed', slug: 'performed' },
  { wrong: /\bOwend\b/gi, correct: 'Owned', slug: 'owned' },
  { wrong: /\bbiomial\b/gi, correct: 'binomial', slug: 'binomial' },
  { wrong: /\bseperate\b/gi, correct: 'separate', slug: 'separate' },
  { wrong: /\boccured\b/gi, correct: 'occurred', slug: 'occurred' },
  { wrong: /\bcomparision\b/gi, correct: 'comparison', slug: 'comparison' },
  { wrong: /\badminstration\b/gi, correct: 'administration', slug: 'administration' },
  {
    wrong: /\bMostellar\b/g,
    correct: 'Mosteller',
    slug: 'mosteller',
    note: 'The body surface area formula is Mosteller (Mosteller RD, N Engl J Med 1987). "Mostellar" is not a recognised variant, and a programmer searching the specification for "Mosteller" will not find this instance.',
  },
];

/** Wrong-word substitutions a spell checker passes over. */
export const CONFUSABLES: { pattern: RegExp; correct: string; slug: string }[] = [
  {
    pattern: /\bthere (?=[a-z]+ (?:studies|trials|cycles|subjects|analyses)\b)/gi,
    correct: 'three',
    slug: 'there_three',
  },
  {
    pattern: /\b(?:SAF|FAS|PPS|PKS|[A-Z][a-z]+ Set) consist of\b/g,
    correct: 'consists of',
    slug: 'subject_verb_agreement',
  },
];

export const EDITORIAL_RULES: Rule[] = [
  {
    id: 'editorial.misspelling',
    category: 'EDITORIAL',
    description: 'Known misspellings of standard terms and eponyms',
    specificity: 0.96,
    find: (text) =>
      MISSPELLINGS.flatMap((entry) =>
        scan(text, entry.wrong, (m) => ({
          conceptKey: `standard.spelling.${entry.slug}`,
          rawText: tidy(m[0]),
          normalizedValue: m[0],
          attributes: {
            expected: entry.correct,
            ...(entry.note ? { note: entry.note } : {}),
          },
        })),
      ),
  },
  {
    id: 'editorial.confusable_word',
    category: 'EDITORIAL',
    description: 'Wrong-word substitutions that pass a spell check',
    specificity: 0.88,
    find: (text) =>
      CONFUSABLES.flatMap((entry) =>
        scan(text, entry.pattern, (m) => ({
          conceptKey: `standard.wording.${entry.slug}`,
          rawText: tidy(m[0]),
          normalizedValue: tidy(m[0]),
          attributes: { expected: entry.correct },
        })),
      ),
  },
];
