import { humanizeTimepoint } from './extract/normalize';
import type { EntityCategory } from './types';

/**
 * What a finding means and what a human should do about it.
 *
 * This is metadata about concepts, not about findings. Nothing here knows which
 * documents disagree or what values they hold — that comes from the entities.
 * Keeping the two apart is what stops "write the explanation" turning into
 * "write the finding".
 */
export type ConceptProfile = {
  label: string;
  regulatoryContext: string;
  suggestedAction: string;
};

const CONCEPT_PROFILES: Record<string, ConceptProfile> = {
  'sample_size.planned': {
    label: 'Planned randomised sample size',
    regulatoryContext:
      'The planned sample size is the basis of the power calculation and of the reviewer\'s judgement that the study was adequately sized. Where a plan states one number and a table in the same plan states another, an inspector will ask which one the study was actually designed around.',
    suggestedAction:
      'Confirm which planned figure was in force when each document was finalised, and confirm whether the analysis plan was written against a superseded protocol version.',
  },
  'sample_size.randomised': {
    label: 'Randomised subjects',
    regulatoryContext:
      'The randomised count is the denominator of every efficacy analysis and the population the intent-to-treat principle applies to.',
    suggestedAction: 'Reconcile the reported count against the randomisation system export and the disposition table.',
  },
  'sample_size.per_protocol': {
    label: 'Per-Protocol Set size',
    regulatoryContext:
      'The Per-Protocol Set is the primary analysis population for an equivalence study, so its size and composition determine the primary result.',
    suggestedAction: 'Confirm the set membership derivation against the analysis dataset specification.',
  },
  'sample_size.treated': {
    label: 'Treated (Safety Set) size',
    regulatoryContext: 'The treated count is the denominator of every adverse event rate in the submission.',
    suggestedAction: 'Confirm the treated count against the disposition table and the derived safety population flag.',
  },
  'dose.regimen': {
    label: 'Dose and administration frequency',
    regulatoryContext:
      'The administered regimen is the most consequential fact in a submission. A regimen stated inconsistently raises an immediate question about what subjects actually received, and every exposure and safety conclusion downstream of it is unverified until the question is answered.',
    suggestedAction:
      'Confirm the regimen in force for this study against the pharmacy manual and the drug accountability records, and confirm that any differing figure is labelled as belonging to a different study.',
  },
  'stat.alpha': {
    label: 'Type I error rate',
    regulatoryContext:
      'A change in the stated significance convention reads to a reviewer as a possible change in the pre-specified hypothesis, and prompts the question of when the change was made relative to unblinding.',
    suggestedAction: 'Confirm the convention in force at analysis plan finalisation and align the documents.',
  },
  'stat.power': {
    label: 'Statistical power',
    regulatoryContext:
      'Power and sample size are two views of one calculation. Two power figures alongside two sample sizes indicate two different design calculations in circulation.',
    suggestedAction:
      'Re-run the sample size calculation from the design assumptions and confirm which combination of size, power, and alpha reproduces it.',
  },
  'stat.default_ci_level': {
    label: 'Default confidence interval level',
    regulatoryContext:
      'A plan that sets a default and then departs from it for the primary analysis is not wrong, but the departure has to be visible. A reviewer reading the two sections in isolation will reach two different conclusions about the primary result.',
    suggestedAction:
      'Confirm that the departure from the default is intentional and that the analysis programs use the interval specified for the primary analysis rather than the default.',
  },
  'equivalence.ci_level.ratio': {
    label: 'Confidence level for the ratio-based equivalence criterion',
    regulatoryContext:
      'The confidence level applied to the equivalence assessment is the acceptance criterion. Changing it after the protocol was approved changes the probability of concluding equivalence, and a reviewer will want the change dated relative to unblinding and supported by a rationale.',
    suggestedAction:
      'Confirm the change against the analysis plan modification history and the protocol amendment record. If the change is intentional and documented, dispose of this finding as intentional and record the rationale — do not dismiss it.',
  },
  'equivalence.ci_level.difference': {
    label: 'Confidence level for the difference-based equivalence criterion',
    regulatoryContext: 'The confidence level applied to the difference criterion is part of the acceptance criterion.',
    suggestedAction: 'Confirm the level against the protocol and the analysis plan.',
  },
  'design.equivalence_margin': {
    label: 'Equivalence margin',
    regulatoryContext:
      'The equivalence margin is a regulatory commitment agreed before the study begins. A margin that does not reproduce from its own stated derivation invites a reviewer to recompute everything downstream of it.',
    suggestedAction:
      'Confirm whether the stated margin or its derivation is authoritative, and confirm that the analysis programs use the stated value.',
  },
  'design.dropout_rate': {
    label: 'Assumed dropout rate',
    regulatoryContext: 'The dropout assumption drives the inflation from evaluable to randomised sample size.',
    suggestedAction: 'Confirm the assumption used in the sample size calculation.',
  },
  'inclusion.ecog': {
    label: 'Permitted ECOG performance status',
    regulatoryContext:
      'Performance status defines the population in which the result may be interpreted. Where one document permits a status another excludes, ineligible subjects can be enrolled and no system will prevent it.',
    suggestedAction:
      'Confirm the permitted range against the current protocol and query enrolled data for any subject recorded outside it.',
  },
  'reporting.ecog_scale': {
    label: 'ECOG reporting scale',
    regulatoryContext:
      'A plan that summarises performance status on one scale and lists it on another produces tables and listings that cannot be reconciled by a reviewer, and obscures whether any subject was enrolled outside the protocol-permitted range.',
    suggestedAction:
      'Adopt one scale for both summaries and listings, and confirm that the summary categories can represent every value the eligibility criterion permits.',
  },
  'population.pk_set.cycle_requirement': {
    label: 'Pharmacokinetic population exposure requirement',
    regulatoryContext:
      'Revising an analysis-set definition after the protocol changes who is analysed. Where the revision is documented it is acceptable; where it is not, the pharmacokinetic conclusion rests on a population nobody agreed to.',
    suggestedAction:
      'Confirm the revision against the analysis plan modification history, and confirm it was agreed before unblinding.',
  },
  'population.pps_site_exclusion': {
    label: 'Named-site exclusion from the Per-Protocol Set',
    regulatoryContext:
      'Excluding named sites from the primary analysis population is a substantive change to the pre-specified analysis. Regulators accept it when it is documented, dated, and blinded; they scrutinise it heavily when it is not visible in the protocol.',
    suggestedAction:
      'Confirm the date of the exclusion decision relative to unblinding and confirm it is reflected in the protocol or a documented amendment. Dispose of this finding as intentional with the rationale, rather than dismissing it.',
  },
  'safety.followup_window': {
    label: 'Safety follow-up window',
    regulatoryContext:
      'The follow-up window decides which adverse events are treatment-emergent. A form that closes the window early omits events from the safety database, and the omission is invisible in the summary tables.',
    suggestedAction:
      'Confirm the protocol window and assess whether any event with onset between the two windows was excluded from the analysis.',
  },
  'safety.ae_grading_scale': {
    label: 'Adverse event grading scale version',
    regulatoryContext:
      'Grading scale versions differ in the definitions for specific terms. Pooling data graded under more than one version without saying so makes severity distributions non-comparable across the submission.',
    suggestedAction:
      'Confirm the version applied to each dataset. Where an earlier version was used for legacy data, state that explicitly rather than leaving it to be discovered.',
  },
  'coding.meddra_version': {
    label: 'Coding dictionary version',
    regulatoryContext: 'Preferred terms move between dictionary versions; summaries coded under two versions do not pool cleanly.',
    suggestedAction: 'Confirm the dictionary version used for the reporting database.',
  },
  'schedule.visit_window': {
    label: 'Visit window tolerance',
    regulatoryContext:
      'A data capture system that accepts a wider window than the protocol permits will not raise the deviation, and the deviation listing will understate the true rate.',
    suggestedAction: 'Align the edit check with the protocol tolerance and re-review visits falling between the two.',
  },
  'schedule.cycle_interval': {
    label: 'Treatment cycle interval',
    regulatoryContext: 'The cycle interval is the denominator of every dose intensity derivation.',
    suggestedAction: 'Confirm the interval against the protocol.',
  },
  'definition.teae_shape': {
    label: 'Treatment-emergent adverse event definition',
    regulatoryContext:
      'Two parallel period definitions written to different shapes do not define the same thing. A clause that names a date without a comparator cannot be implemented: the programmer must guess whether the surgery date opens or closes the window, and the safety database will reflect the guess.',
    suggestedAction:
      'Confirm the intended window for each period and restate both definitions in the same form. Confirm which reading the analysis programs implemented.',
  },
  'definition.category_set_integrity': {
    label: 'Category set completeness',
    regulatoryContext:
      'A summary whose categories do not cover the range leaves values with nowhere to be counted. Subjects in the uncovered band disappear from the table without appearing as missing.',
    suggestedAction: 'Restate the category set so that it is exhaustive and mutually exclusive, and confirm the table shells against it.',
  },
  'derivation.dose_intensity_shape': {
    label: 'Dose intensity formula shape',
    regulatoryContext:
      'Parallel derivations for parallel study periods should have the same shape. Where they do not, at least one is wrong, and the exposure summaries for that period cannot be interpreted.',
    suggestedAction:
      'Confirm the intended cycle offsets for each period against the exposure analysis specification and restate all three formulas consistently.',
  },
  'derivation.dataset_consistency': {
    label: 'Input datasets within one analysis block',
    regulatoryContext:
      'An analysis block that reads from more than one unrelated dataset without a documented merge either analyses the wrong data or does not run at all.',
    suggestedAction: 'Confirm the intended input dataset for this analysis and reconcile the code against the dataset specification.',
  },
  'derivation.code_hygiene': {
    label: 'Code block hygiene',
    regulatoryContext:
      'An orphan literal in a specification code block is a fragment of an edit that was never finished. It is minor in itself and a reliable signal that the block was not reviewed.',
    suggestedAction: 'Remove the fragment or restore the statement it belonged to.',
  },
  'practice.statistical_test_on_safety_data': {
    label: 'Statistical testing of safety data',
    regulatoryContext:
      'A plan that states no statistical comparison will be performed on safety data, and then specifies tests on safety and baseline data, leaves the reader unable to tell which summaries carry a p-value. Reviewers read unplanned safety testing as post-hoc.',
    suggestedAction:
      'Confirm the intended scope of the no-comparison statement and either narrow it or list the tests it does not cover.',
  },
  'crossref.integrity': {
    label: 'Internal reference integrity',
    regulatoryContext:
      'A reference that points at the wrong section sends a reviewer to a page that does not answer the question, and is the standard consequence of renumbering appendices between drafts. Inspectors follow references.',
    suggestedAction: 'Correct the reference and re-check every other reference introduced or renumbered in the same revision.',
  },
  'crf_page.reference': {
    label: 'eCRF page naming',
    regulatoryContext:
      'Where an analysis plan names the same data capture page more than one way, a programmer has to guess the mapping and a reviewer cannot confirm it without opening the database.',
    suggestedAction:
      'Adopt the page name exactly as it appears in the case report form specification, and reconcile the analysis plan against that specification.',
  },
};

const CATEGORY_PROFILES: Record<EntityCategory, ConceptProfile> = {
  NUMERIC: {
    label: 'Numeric value',
    regulatoryContext: 'Numeric values stated differently across a submission require reconciliation.',
    suggestedAction: 'Confirm the correct value and align the documents.',
  },
  STATISTICAL: {
    label: 'Statistical parameter',
    regulatoryContext: 'Statistical design parameters must be identical wherever they are stated.',
    suggestedAction: 'Confirm the pre-specified parameter and align the documents.',
  },
  ENDPOINT: {
    label: 'Endpoint definition',
    regulatoryContext: 'Endpoint definitions must be identical across a submission.',
    suggestedAction: 'Confirm the pre-specified definition and align the documents.',
  },
  POPULATION: {
    label: 'Population criterion',
    regulatoryContext: 'Population criteria define who may be enrolled and who is analysed.',
    suggestedAction: 'Confirm the criterion against the current protocol.',
  },
  SCHEDULE: {
    label: 'Schedule or window',
    regulatoryContext: 'Schedules and windows determine what data are collected and when.',
    suggestedAction: 'Confirm the window against the current protocol.',
  },
  TERMINOLOGY: {
    label: 'Defined term',
    regulatoryContext: 'Defined terms should appear in one form across a submission.',
    suggestedAction: 'Adopt a single form across the submission.',
  },
  CROSSREF: {
    label: 'Internal reference',
    regulatoryContext: 'Internal references must resolve to the section they describe.',
    suggestedAction: 'Correct the reference.',
  },
  CRF_MAPPING: {
    label: 'eCRF page reference',
    regulatoryContext: 'Data capture pages must be named consistently between the plan and the form specification.',
    suggestedAction: 'Reconcile the page name against the case report form specification.',
  },
  DERIVATION: {
    label: 'Derivation specification',
    regulatoryContext: 'Derivation specifications are implemented literally by programmers.',
    suggestedAction: 'Confirm the intended derivation and restate it unambiguously.',
  },
  COVERAGE: {
    label: 'Coverage',
    regulatoryContext:
      'A required item with no counterpart in the document that implements it cannot be captured, monitored, or analysed.',
    suggestedAction: 'Confirm whether the item is covered elsewhere; if it is not, the data do not exist.',
  },
  EDITORIAL: {
    label: 'Editorial',
    regulatoryContext:
      'Editorial defects carry little weight individually. Their volume is a reliable indication of how carefully a document was reviewed.',
    suggestedAction: 'Correct at the next revision.',
  },
};

export function profileFor(conceptKey: string, category: EntityCategory): ConceptProfile {
  const explicit = CONCEPT_PROFILES[conceptKey];
  if (explicit) return explicit;

  const assessment = conceptKey.match(/^assessment\.([a-z_]+)\.(.+)$/);
  if (assessment) {
    const readable = `${assessment[1].replace(/_/g, ' ')} at ${humanizeTimepoint(assessment[2])}`;
    return {
      label: `Assessment coverage — ${readable}`,
      regulatoryContext: CATEGORY_PROFILES.COVERAGE.regulatoryContext,
      suggestedAction: `Confirm whether the ${readable} is captured on any form. If no field exists the assessment cannot be recorded, and every subject is a data capture deviation.`,
    };
  }

  const identifier = conceptKey.match(/^derivation\.identifier\.(.+)$/);
  if (identifier) {
    return {
      label: 'Programming identifier spelling',
      regulatoryContext:
        'One variable spelled more than one way in the code that implements an analysis either fails to run or runs against a variable that does not hold what the analyst intended. In a stratified analysis the second outcome is silent.',
      suggestedAction:
        'Confirm the intended variable name against the analysis dataset specification and correct every occurrence in the code appendices.',
    };
  }

  const acronym = conceptKey.match(/^acronym\.(.+)$/);
  if (acronym) {
    return {
      label: `Acronym collision — ${acronym[1]}`,
      regulatoryContext:
        'One acronym carrying two expansions in a single document means every use of it is ambiguous. A reviewer encountering it in a table cannot tell which is meant, and neither can a programmer.',
      suggestedAction: 'Assign a distinct acronym to each term and update every use in the document.',
    };
  }

  const standardAcronym = conceptKey.match(/^standard\.acronym\.(.+)$/);
  if (standardAcronym) {
    return {
      label: 'Non-standard acronym',
      regulatoryContext:
        'An acronym that does not match the standard for the term it expands sends a reader to the wrong reference. The expansion is correct and the acronym is not, which is exactly the case a spell check cannot catch.',
      suggestedAction: 'Adopt the standard acronym for this term throughout the document.',
    };
  }

  if (conceptKey.startsWith('standard.spelling.') || conceptKey.startsWith('standard.wording.')) {
    return {
      label: 'Editorial defect',
      regulatoryContext: CATEGORY_PROFILES.EDITORIAL.regulatoryContext,
      suggestedAction: 'Correct at the next revision.',
    };
  }

  const vocabulary = conceptKey.match(/^vocabulary\.(.+)$/);
  if (vocabulary) {
    return {
      label: `Defined term — ${vocabulary[1].replace(/_/g, ' ')}`,
      regulatoryContext:
        'A defined term written more than one way invites a reviewer to ask whether more than one thing is meant. Individually trivial; in aggregate it is what makes a submission read as unreviewed.',
      suggestedAction: 'Adopt the form used in the protocol and apply it throughout.',
    };
  }

  return CATEGORY_PROFILES[category];
}

export { CATEGORY_PROFILES };
