import type {
  ConfidenceFactor,
  DocumentType,
  Entity,
  EntityCategory,
  Severity,
} from './types';

/**
 * Severity and confidence answer two different questions and are scored
 * separately on purpose:
 *
 *   severity   — if this is real, how much does it matter?
 *   confidence — how likely is it the engine read the documents correctly?
 *
 * A capitalisation drift can be high-confidence and MINOR. A dose stated for a
 * different study can be low-confidence and, once downgraded, MINOR. Collapsing
 * the two into one number makes "certain but unimportant" indistinguishable
 * from "important but shaky", which is the fastest way to lose a regulatory
 * audience.
 */

/**
 * Concept-level severities. Nothing here names a document, a value, or a
 * study — editing the corpus changes the findings and never changes this table.
 */
const CONCEPT_SEVERITY: Record<string, Severity> = {
  // What the study measured, on whom, and how many — submission-blocking.
  'sample_size.planned': 'CRITICAL',
  'sample_size.planned_per_arm': 'CRITICAL',
  'sample_size.randomised': 'CRITICAL',
  'sample_size.treated': 'CRITICAL',
  'sample_size.per_protocol': 'CRITICAL',
  'sample_size.evaluable_per_arm': 'CRITICAL',
  'stat.alpha': 'CRITICAL',
  'equivalence.ci_level.ratio': 'CRITICAL',
  'equivalence.ci_level.difference': 'CRITICAL',
  'definition.teae_shape': 'CRITICAL',
  'dose.regimen': 'CRITICAL',

  // Design parameters that change the operating characteristics of the test but
  // are reconcilable by a documented amendment before unblinding.
  'stat.power': 'MAJOR',
  'stat.default_ci_level': 'MAJOR',
  'design.dropout_rate': 'MAJOR',

  // A margin stated one decimal short of its own derivation is conservative
  // rather than wrong, and is reported as such.
  'design.equivalence_margin': 'MINOR',

  // Population, safety windows, coding versions.
  'inclusion.ecog': 'MAJOR',
  'inclusion.creatinine_clearance': 'MAJOR',
  'inclusion.lvef_baseline': 'MAJOR',
  'inclusion.min_age': 'MAJOR',
  'reporting.ecog_scale': 'MAJOR',
  'population.pk_set.cycle_requirement': 'MAJOR',
  'population.pps_site_exclusion': 'MAJOR',
  'safety.followup_window': 'MAJOR',
  'safety.ae_grading_scale': 'MAJOR',
  'coding.meddra_version': 'MAJOR',
  'schedule.cycle_interval': 'MAJOR',
  'definition.category_set_integrity': 'MAJOR',
  'derivation.dose_intensity_shape': 'MAJOR',
  'derivation.dataset_consistency': 'MAJOR',
  'practice.statistical_test_on_safety_data': 'MAJOR',

  // Tolerances, hygiene, spelling.
  'schedule.visit_window': 'MINOR',
  'derivation.code_hygiene': 'MINOR',
};

/** Prefix rules for the concept families the extractor generates dynamically. */
const PREFIX_SEVERITY: [string, Severity][] = [
  // Three spellings of one variable in the code that implements the primary
  // analysis is a program that either fails or silently stratifies on nothing.
  ['derivation.identifier.', 'CRITICAL'],
  ['acronym.', 'MAJOR'],
  ['standard.acronym.', 'MAJOR'],
  ['crossref.', 'MAJOR'],
  ['assessment.', 'MAJOR'],
  ['vocabulary.', 'MINOR'],
  ['standard.spelling.', 'MINOR'],
  ['standard.wording.', 'MINOR'],
];

const CATEGORY_SEVERITY: Record<EntityCategory, Severity> = {
  NUMERIC: 'CRITICAL',
  STATISTICAL: 'CRITICAL',
  ENDPOINT: 'CRITICAL',
  POPULATION: 'MAJOR',
  SCHEDULE: 'MAJOR',
  CROSSREF: 'MAJOR',
  CRF_MAPPING: 'MAJOR',
  DERIVATION: 'MAJOR',
  // A required assessment with no capture field means the data do not exist to
  // be filed, monitored, or analysed. That is data integrity, not formatting.
  COVERAGE: 'MAJOR',
  // Severity for a guidance requirement comes from the requirement itself.
  REGULATORY: 'MAJOR',
  TERMINOLOGY: 'MINOR',
  EDITORIAL: 'MINOR',
};

export function severityFor(
  conceptKey: string,
  category: EntityCategory,
  downgraded: boolean,
): Severity {
  // A difference explained by a known-benign pattern cannot be submission
  // blocking by construction — it is retained for review, not escalation.
  if (downgraded) return 'MINOR';
  if (CONCEPT_SEVERITY[conceptKey]) return CONCEPT_SEVERITY[conceptKey];
  for (const [prefix, severity] of PREFIX_SEVERITY) {
    if (conceptKey.startsWith(prefix)) return severity;
  }
  return CATEGORY_SEVERITY[category];
}

export const SEVERITY_ORDER: Record<Severity, number> = {
  CRITICAL: 0,
  MAJOR: 1,
  MINOR: 2,
};

/* ------------------------------------------------------------------ */
/* Confidence                                                          */
/* ------------------------------------------------------------------ */

export type ConfidenceKind =
  | 'VALUE_MISMATCH'
  | 'EXPECTED_VALUE'
  | 'COVERAGE_GAP'
  | 'RELATED_PAIR'
  | 'CLUSTER'
  | 'ARITHMETIC'
  | 'GUIDANCE';

export type ConfidenceInput = {
  kind: ConfidenceKind;
  entities: Entity[];
  /** Normalized value → the document types asserting it. */
  variants: Map<string, DocumentType[]>;
  benign: 'none' | 'downgrade' | 'mitigate';
};

const BASE: Record<ConfidenceKind, number> = {
  VALUE_MISMATCH: 0.3,
  EXPECTED_VALUE: 0.38,
  COVERAGE_GAP: 0.3,
  RELATED_PAIR: 0.32,
  CLUSTER: 0.28,
  ARITHMETIC: 0.45,
  GUIDANCE: 0.4,
};

const W_SPECIFICITY = 0.3;
const W_CONTEXT = 0.15;
const W_CORROBORATION = 0.15;
const W_BREADTH = 0.1;

const DOWNGRADE_CEILING = 0.3;
const DOWNGRADE_MULTIPLIER = 0.25;
const MITIGATE_MULTIPLIER = 0.7;

export function scoreConfidence(input: ConfidenceInput): {
  score: number;
  factors: ConfidenceFactor[];
} {
  const { entities, variants, benign, kind } = input;
  const factors: ConfidenceFactor[] = [];

  factors.push({
    label: 'Baseline',
    contribution: BASE[kind],
    detail: baselineDetail(kind),
  });

  const avgSpecificity =
    entities.reduce((sum, e) => sum + e.ruleSpecificity, 0) / Math.max(1, entities.length);
  const rules = [...new Set(entities.map((e) => e.extractorRule))];
  factors.push({
    label: 'Rule specificity',
    contribution: round(W_SPECIFICITY * avgSpecificity),
    detail: `Mean specificity ${avgSpecificity.toFixed(2)} across ${rules.length} rule${
      rules.length === 1 ? '' : 's'
    }: ${rules.join(', ')}.`,
  });

  const contextRatio =
    entities.filter((e) => e.contextConfirmed).length / Math.max(1, entities.length);
  factors.push({
    label: 'Context confirmation',
    contribution: round(W_CONTEXT * contextRatio),
    detail: `${Math.round(contextRatio * 100)}% of occurrences appeared in the surrounding context the rule expects.`,
  });

  const bestSupport = Math.max(0, ...[...variants.values()].map((docs) => new Set(docs).size));
  factors.push({
    label: 'Cross-document corroboration',
    contribution: round(bestSupport >= 2 ? W_CORROBORATION : 0),
    detail:
      bestSupport >= 2
        ? `One value is stated independently in ${bestSupport} documents, so the disagreement is unlikely to be a single transcription error.`
        : 'No value is corroborated by a second document; a single-source error cannot be ruled out.',
  });

  const documentCount = new Set(entities.map((e) => e.citation.documentType)).size;
  factors.push({
    label: 'Breadth of evidence',
    contribution: round(documentCount >= 3 ? W_BREADTH : 0),
    detail: `${documentCount} document${documentCount === 1 ? '' : 's'} contribute evidence to this finding.`,
  });

  let score = factors.reduce((sum, f) => sum + f.contribution, 0);

  if (benign === 'downgrade') {
    const capped = Math.min(score * DOWNGRADE_MULTIPLIER, DOWNGRADE_CEILING);
    factors.push({
      label: 'Known-benign pattern',
      contribution: round(capped - score),
      detail:
        'A benign-context pattern accounts for the difference. Confidence is capped below the review threshold and severity is downgraded, but the finding is retained so a reviewer can audit the judgement rather than take a suppression on trust.',
    });
    score = capped;
  } else if (benign === 'mitigate') {
    const reduced = score * MITIGATE_MULTIPLIER;
    factors.push({
      label: 'Mitigating context',
      contribution: round(reduced - score),
      detail:
        'The document contains language that may resolve this difference. Severity is unchanged because the resolution has to be confirmed by a reviewer, not assumed by the engine.',
    });
    score = reduced;
  }

  return { score: clamp(round(score)), factors };
}

function baselineDetail(kind: ConfidenceKind): string {
  switch (kind) {
    case 'EXPECTED_VALUE':
      return 'A stated value disagrees with an external reference standard or with the document’s own structure.';
    case 'COVERAGE_GAP':
      return 'A required item in one document has no counterpart in the document that must implement it.';
    case 'RELATED_PAIR':
      return 'Two related concepts hold values that a declared consistency check does not accept.';
    case 'CLUSTER':
      return 'Two or more surface forms were clustered as naming the same thing.';
    case 'ARITHMETIC':
      return 'A derivation stated in the document does not reproduce when recomputed.';
    case 'GUIDANCE':
      return 'An element required by published regulatory guidance was not located in the document.';
    default:
      return 'Two or more sources assert different normalized values for the same concept.';
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number): number {
  return Math.max(0.05, Math.min(0.95, n));
}

/** Findings at or above this confidence are presented for active review. */
export const REVIEW_THRESHOLD = 0.5;
