import type { DocumentType, EntityCategory, Finding, Severity } from '../engine/types';

/**
 * PLAIN LANGUAGE LAYER
 *
 * Everything the engine produces is written for a biostatistician or a
 * regulatory reviewer. This module is the translation for everybody else: a
 * project manager, a client, an exec in a demo, anyone who has to judge whether
 * a document is in trouble without knowing what an equivalence margin is.
 *
 * The rule followed throughout: never remove the technical wording, sit the
 * plain wording next to it. A reader who does know the field must still be able
 * to see the real finding, and a reader who does not must never have to guess.
 */

/* ------------------------------------------------------------------ */
/* Document types                                                      */
/* ------------------------------------------------------------------ */

export type DocPlain = {
  /** Expanded name, spelled out. */
  name: string;
  /** What the document is, in one sentence, no jargon. */
  what: string;
  /** The everyday analogy. Deliberately informal. */
  analogy: string;
  /** Why an error in this document is expensive. */
  stakes: string;
};

export const DOC_PLAIN: Record<DocumentType, DocPlain> = {
  SAP: {
    name: 'Statistical Analysis Plan',
    what: 'The document that fixes, in advance, exactly how the trial results will be analysed — which patients count, which numbers are compared, and what would count as success.',
    analogy: 'The recipe, written and signed before anyone is allowed to taste the dish.',
    stakes:
      'It has to be finalised before the results are unblinded. If it disagrees with itself, a regulator can argue the analysis was chosen after the fact to flatter the result.',
  },
  TFL: {
    name: 'Tables, Figures and Listings',
    what: 'The actual output of the analysis — the numbered tables, charts and patient-level listings that get bound into the final study report.',
    analogy: 'The finished dish, plated. It should match the recipe exactly.',
    stakes:
      'These are the numbers a reviewer reads first. A header that reports a different patient count from the plan is the most visible kind of inconsistency there is.',
  },
  IB: {
    name: "Investigator's Brochure",
    what: 'The safety and background dossier given to every doctor running the trial: what is already known about the drug, its known risks, and how to dose it.',
    analogy: 'The instruction manual handed to everyone operating the machine.',
    stakes:
      'Doctors make dosing and safety decisions from it. If it contradicts the protocol on a dose or a safety threshold, that is a patient-safety issue, not a paperwork issue.',
  },
  PROTOCOL: {
    name: 'Clinical Trial Protocol',
    what: 'The master plan for the trial: who can take part, what they receive, what gets measured and when.',
    analogy: 'The contract everyone works to.',
    stakes:
      'Every other document is supposed to be consistent with it. It is the reference the others are checked against.',
  },
  CSR: {
    name: 'Clinical Study Report',
    what: 'The full written report of the finished trial, submitted to the regulator.',
    analogy: 'The final write-up that goes to the examiner.',
    stakes:
      'It is the submission. Numbers in it must be traceable back to the plan and to the outputs.',
  },
  CRF: {
    name: 'Case Report Form',
    what: 'The data collection forms used at the hospital to record what happened to each patient.',
    analogy: 'The blank forms the nurse fills in at each visit.',
    stakes:
      'If a field the analysis needs was never collected, the analysis cannot be run as written — and that is only discoverable by comparing the forms to the plan.',
  },
};

export const DOC_ORDER: DocumentType[] = ['SAP', 'TFL', 'IB', 'PROTOCOL', 'CSR', 'CRF'];

/* ------------------------------------------------------------------ */
/* Severity                                                           */
/* ------------------------------------------------------------------ */

export type SeverityPlain = {
  /** What to call it when speaking to someone non-clinical. */
  label: string;
  /** What the reader should do about it. */
  meaning: string;
};

export const SEVERITY_PLAIN: Record<Severity, SeverityPlain> = {
  CRITICAL: {
    label: 'Must fix before this goes out',
    meaning:
      'This one can change what the trial concludes, or affects patient safety. A regulator finding it first is a bad day.',
  },
  MAJOR: {
    label: 'Should fix',
    meaning:
      'It will not change the conclusion, but it is the kind of inconsistency that generates a question from a reviewer and costs weeks answering it.',
  },
  MINOR: {
    label: 'Worth tidying',
    meaning: 'Cosmetic or low-risk. Fix it in the next revision; nothing is blocked by it.',
  },
};

/* ------------------------------------------------------------------ */
/* The five kinds of problem                                          */
/* ------------------------------------------------------------------ */

/**
 * A category-by-category list is accurate but does not tell a newcomer what
 * kind of mistake is being hunted. These five do.
 */
export const PROBLEM_KINDS: { title: string; plain: string; example: string }[] = [
  {
    title: 'The same fact, stated two different ways',
    plain:
      'A number, a threshold or a name appears in more than one place, and the places disagree. Nobody wrote it wrong on purpose — the plan was revised and one paragraph was missed.',
    example:
      '“264 patients will be randomised” in one section, “the 260 randomised patients” in another.',
  },
  {
    title: 'Arithmetic that does not reproduce',
    plain:
      'The document states a number it also explains how to calculate. We redo the calculation from the document’s own inputs and check we land on the same answer.',
    example:
      '132 per group with a 10% dropout should leave 118 evaluable, not 120. We recompute and flag the gap.',
  },
  {
    title: 'A signpost pointing at the wrong place',
    plain:
      'The text says “see Section 9.4” or “Appendix 3, Analysis Conventions”. We follow every one of those and check the destination exists and is actually called that.',
    example: '“as defined in Section 7.2” where Section 7.2 is about something else entirely.',
  },
  {
    title: 'Something required that is not there',
    plain:
      'Regulators publish an explicit list of what a document must contain. We look for each item and report the ones we could not locate, with where we looked.',
    example: 'No stated rule for handling missing data, which ICH E9 requires the plan to specify.',
  },
  {
    title: 'Wording that quietly changes the meaning',
    plain:
      'One abbreviation used for two different things, a version number of a medical dictionary that differs between documents, a misspelling in a drug name, or a real word used in place of the one that was meant.',
    example: '“ECOG 0–1” for eligibility but results reported on a 0–4 scale; “dose” written as “does”.',
  },
];

/* ------------------------------------------------------------------ */
/* Categories                                                         */
/* ------------------------------------------------------------------ */

export type CategoryPlain = {
  /** Plain heading. */
  label: string;
  /** The question this family of checks asks, phrased for a non-expert. */
  question: string;
};

export const CATEGORY_PLAIN: Record<EntityCategory, CategoryPlain> = {
  NUMERIC: {
    label: 'Counts and doses',
    question: 'Does every patient count, dose and percentage match everywhere it is written?',
  },
  STATISTICAL: {
    label: 'Statistical settings',
    question:
      'Are the settings that decide whether the trial “worked” stated once and stated the same way?',
  },
  POPULATION: {
    label: 'Who is in the study',
    question: 'Are the rules about which patients qualify, and which patients count, consistent?',
  },
  ENDPOINT: {
    label: 'What is being measured',
    question: 'Is the thing the trial is trying to prove described identically in each document?',
  },
  SCHEDULE: {
    label: 'Timings and visits',
    question: 'Do the visit dates, cycle lengths and follow-up windows agree?',
  },
  TERMINOLOGY: {
    label: 'Names and versions',
    question:
      'Is each term, abbreviation and dictionary version used with exactly one meaning throughout?',
  },
  CROSSREF: {
    label: 'Internal signposts',
    question: 'Does every “see Section X” actually lead to X?',
  },
  CRF_MAPPING: {
    label: 'Data collection forms',
    question: 'Do the forms named in the text exist and carry the name the text gives them?',
  },
  DERIVATION: {
    label: 'Calculations and programming',
    question:
      'Do the described calculations and the programming names behind them hold together, step by step?',
  },
  COVERAGE: {
    label: 'Nothing left out',
    question: 'Is every assessment the plan promises paired with a time at which it happens?',
  },
  REGULATORY: {
    label: 'Regulator’s checklist',
    question: 'Is each item the guidelines require present, and can we point at where?',
  },
  EDITORIAL: {
    label: 'Spelling and wrong words',
    question: 'Any misspelled standard terms, or real words used in place of the intended one?',
  },
};

/* ------------------------------------------------------------------ */
/* The check catalogue                                                */
/* ------------------------------------------------------------------ */

/**
 * Plain-English description of every rule in the ruleset, keyed by rule id.
 *
 * This exists so the answer to “what are you actually checking?” is a list a
 * client can read, not a promise. Any rule id missing from this map falls back
 * to the engine's own description, which is honest but technical — so a new rule
 * shows up in the catalogue immediately rather than silently not appearing.
 */
export const CHECK_PLAIN: Record<string, string> = {
  /* Counts and doses ------------------------------------------------ */
  'numeric.sample_size.planned':
    'The planned number of patients to be randomised. Compared against every other place a total appears.',
  'numeric.sample_size.planned_per_arm':
    'The planned number per treatment group, and whether the groups add up to the stated total.',
  'numeric.sample_size.evaluable':
    'The number of patients expected to be analysable after dropouts — the figure the power calculation actually rests on.',
  'numeric.dropout_rate':
    'The assumed percentage of patients who will not complete. Used to recompute the evaluable count.',
  'numeric.sample_size.randomised':
    'The number of patients reported as actually randomised, against the number planned.',
  'numeric.sample_size.treated':
    'The number who received at least one dose — normally lower than randomised, and the gap should be explained.',
  'numeric.sample_size.per_protocol':
    'The size of the Per-Protocol Set: patients who followed the plan closely enough to be included in the strictest analysis.',
  'numeric.dose_regimen':
    'The dose amount and how often it is given. A mismatch here between documents is a safety issue, not a typo.',
  'numeric.sample_size.pk':
    'The size of the subgroup whose blood-level samples are analysed.',
  'tfl.population_header':
    'The patient count printed in the header of each output table, against the count the plan defines for that analysis set.',

  /* Statistical settings -------------------------------------------- */
  'statistical.alpha':
    'The false-positive rate the trial accepts, usually 5%, and whether the test is one-sided or two-sided. Changing this changes how easy the trial is to pass.',
  'statistical.power':
    'The chance of detecting a real effect if there is one, usually 80% or 90%. Stated per objective, and compared across documents.',
  'statistical.default_ci_level':
    'The default confidence level for the plan as a whole, typically 95%.',
  'statistical.equivalence_criterion':
    'The pre-agreed range within which two treatments count as equivalent, and the numeric bounds of that range.',
  'statistical.ci_level_for_statistic':
    'The confidence level used for a specific comparison, checked against the plan-wide default. A 90% interval where the plan says 95% is a real difference in how strict the test is.',
  'statistical.observed_interval':
    'A reported result and its confidence interval, checked for internal consistency and against the criterion it is being judged by.',
  'statistical.equivalence_margin_derivation':
    'The stated justification for how the equivalence range was chosen — regulators require this to be pre-specified, not chosen later.',
  'statistical.test_for_safety_data':
    'A formal statistical test applied to safety or baseline data. This is usually inappropriate and is flagged for a human to confirm.',
  'statistical.no_comparison_policy':
    'A stated policy that no statistical comparison will be made — then checked against whether a comparison appears anyway.',

  /* Who is in the study --------------------------------------------- */
  'population.ecog_eligibility':
    'The fitness score a patient must have to join (ECOG: 0 means fully active, higher means less able to look after themselves).',
  'population.ecog_reporting_scale':
    'The scale that same fitness score is reported on later. Recruiting on 0–1 but reporting on 0–4 means the two documents are not describing the same patients.',
  'population.pk_set_cycle_requirement':
    'How much treatment a patient must have received to be included in the blood-level analysis.',
  'population.pps_site_exclusion':
    'Any named hospital excluded from the strictest analysis set, and whether that exclusion is stated consistently.',
  'population.creatinine_clearance':
    'The kidney-function threshold for joining the trial.',
  'population.lvef_threshold':
    'The heart-function threshold for joining the trial (LVEF: the fraction of blood the heart pumps out per beat).',
  'population.min_age': 'The minimum age for enrolment.',

  /* Timings and visits ---------------------------------------------- */
  'schedule.visit_window':
    'How many days early or late a visit may be and still count as on time.',
  'schedule.safety_followup':
    'How long patients are followed for side effects after their last dose.',
  'schedule.cycle_interval': 'How many days or weeks apart treatment cycles are given.',
  'schedule.neoadjuvant_cycles':
    'How many cycles each phase of treatment consists of.',
  'coverage.assessment_timepoint':
    'Every required assessment is paired with a stated time at which it happens — an assessment with no timepoint cannot be scheduled or programmed.',

  /* Names and versions ---------------------------------------------- */
  'terminology.grading_scale':
    'The scale and version used to rate how severe a side effect is (for example CTCAE v5.0). Two documents on different versions grade the same event differently.',
  'terminology.dictionary_version':
    'The version of the medical coding dictionary used to group side effects (for example MedDRA 26.0). Different versions group them differently, so counts stop matching.',
  'terminology.controlled_vocabulary':
    'A term the study formally defines, then used in a different form later — the same thing under two names is two things to a database.',
  'terminology.acronym_definition':
    'Abbreviations taken from the document’s own abbreviation table, then checked for one abbreviation carrying two different expansions.',
  'tfl.grading_scale':
    'The grading-scale version printed on an output table, against the version the plan specifies.',

  /* Internal signposts ---------------------------------------------- */
  'crossref.reference_resolution':
    'Every internal “see Section 9.4” is followed against the document’s real section list, and reported if the destination does not exist.',
  'crossref.numbered_title_reference':
    'References that name both a number and a title (“Appendix 3, Analysis Conventions”) are checked to confirm the number and the title belong together.',
  'tfl.output_index':
    'The list of output numbers at the front of the tables package, against the outputs actually present — a gap means a table is promised and missing.',

  /* Data collection forms ------------------------------------------- */
  'crf_mapping.page_reference':
    'Names of data collection form pages used in the text, checked so that one page is not referred to by two different names.',

  /* Calculations and programming ------------------------------------ */
  'derivation.identifier_spelling':
    'Programming variable and dataset names grouped by their root, so the same variable spelled two ways is caught before it breaks a program.',
  'derivation.dataset_flow':
    'The input datasets named inside one analysis block, checked for a step that reads from a dataset the block never builds.',
  'derivation.stray_token':
    'Leftover fragments inside code blocks — a value pasted in and never removed, which is how a placeholder reaches production.',
  'derivation.dose_intensity_formula':
    'Two parallel formulas for the same dose-intensity calculation, checked to confirm they use matching cycle numbers.',
  'derivation.teae_definition':
    'The definition of which side effects count as treatment-related, per period, checked for the same definition being given two shapes.',
  'derivation.category_set_integrity':
    'Any stated set of numeric bands (age groups, dose levels) checked for a gap or an overlap — 18–64 and 66+ leaves 65 with nowhere to go.',
  'tfl.source_program':
    'The program footnote on each generated table, checked so an output does say which program produced it.',

  /* Spelling and wrong words ---------------------------------------- */
  'editorial.misspelling':
    'Known misspellings of standard medical terms, drug names and eponyms — the ones a general spell-checker does not hold.',
  'editorial.confusable_word':
    'Real words used in place of the intended one, which is why a spell check passes: “does” for “dose”, “sight” for “site”, “trail” for “trial”.',
};

/* ------------------------------------------------------------------ */
/* Glossary                                                           */
/* ------------------------------------------------------------------ */

export const GLOSSARY: { term: string; plain: string }[] = [
  { term: 'SAP', plain: 'Statistical Analysis Plan — how the results will be analysed, fixed in advance.' },
  { term: 'TFL', plain: 'Tables, Figures and Listings — the finished output tables and charts.' },
  { term: 'IB', plain: "Investigator's Brochure — the safety dossier for the doctors running the trial." },
  { term: 'Protocol', plain: 'The master plan for the trial. Everything else should agree with it.' },
  { term: 'Randomised', plain: 'Assigned to a treatment group by chance, so the groups are comparable.' },
  { term: 'Analysis set', plain: 'The defined group of patients a particular table is calculated from.' },
  { term: 'ITT', plain: 'Intention-to-Treat — analyse everyone as assigned, whatever actually happened. The conservative choice.' },
  { term: 'Per-Protocol Set', plain: 'Only the patients who followed the plan closely. Smaller, and flatters the result, so its definition is scrutinised.' },
  { term: 'Endpoint', plain: 'The specific thing being measured to decide whether the treatment worked.' },
  { term: 'Alpha (α)', plain: 'The accepted chance of a false positive — normally 5%.' },
  { term: 'Power', plain: 'The chance of spotting a real effect if one exists — normally 80–90%.' },
  { term: 'Confidence interval', plain: 'The range the true answer is likely to sit in. A 95% interval is wider, and stricter, than a 90% one.' },
  { term: 'Equivalence margin', plain: 'How different two treatments may be and still be called equivalent. Must be agreed before the results are seen.' },
  { term: 'PK', plain: 'Pharmacokinetics — how much drug is in the blood over time.' },
  { term: 'ECOG', plain: 'A 0–4 fitness score. 0 is fully active; 4 is completely bedbound.' },
  { term: 'LVEF', plain: 'Left Ventricular Ejection Fraction — the share of blood the heart pumps out per beat. A heart-function threshold.' },
  { term: 'CTCAE', plain: 'The standard scale for rating side-effect severity, Grade 1 to 5. Versions differ, so the version matters.' },
  { term: 'MedDRA', plain: 'The dictionary used to code and group side effects. Different versions group them differently.' },
  { term: 'TEAE', plain: 'Treatment-Emergent Adverse Event — a side effect that started or worsened after treatment began.' },
  { term: 'eCRF', plain: 'The electronic forms site staff fill in for each patient visit.' },
  { term: 'ICH E6 / E9 / E3', plain: 'International guidelines listing what a trial protocol, an analysis plan and a study report must contain.' },
  { term: 'Citation', plain: 'The exact document, section and page a finding came from, so it can be checked in seconds.' },
];

/* ------------------------------------------------------------------ */
/* Per-finding plain wording                                          */
/* ------------------------------------------------------------------ */

/**
 * A one-line, jargon-free statement of what went wrong, derived from the
 * finding itself rather than from a lookup table — so it stays correct when the
 * ruleset grows.
 */
export function plainWhatHappened(finding: Finding): string {
  const values = Array.from(new Set(finding.occurrences.map((o) => o.value)));
  const places = Array.from(new Set(finding.occurrences.map((o) => o.entity.citation.documentType)));

  const list = values
    .slice(0, 3)
    .map((v) => `“${v}”`)
    .join(' versus ');

  if (finding.category === 'CROSSREF') {
    return 'The document points somewhere that is not there, or not called what the text says it is called.';
  }
  if (finding.category === 'REGULATORY') {
    return 'Something the guidelines require a document like this to contain could not be found.';
  }
  if (finding.category === 'EDITORIAL') {
    return values.length >= 2
      ? `A word is wrong in a way a spell-checker does not catch: ${list}.`
      : 'A word is wrong in a way a spell-checker does not catch.';
  }
  if (finding.category === 'DERIVATION' && values.length >= 2) {
    return `A name used in the calculations is written more than one way — ${list} — so the same thing is two things to a program.`;
  }
  if (finding.category === 'TERMINOLOGY' && values.length >= 2) {
    return `The same term appears in more than one form: ${list}. A database treats those as different things.`;
  }
  if (finding.category === 'CRF_MAPPING' && values.length >= 2) {
    return `One data collection page is referred to by more than one name: ${list}.`;
  }
  if (finding.category === 'COVERAGE') {
    return 'Something the document promises to do is missing the detail needed to actually do it — usually a time or a definition.';
  }
  if (values.length >= 2) {
    const where =
      places.length > 1
        ? `across ${places.length} documents (${places.join(', ')})`
        : 'in more than one place in the same document';
    return `The same fact is stated two different ways ${where}: ${list}.`;
  }
  return 'A value the document states about itself does not hold up when it is recalculated or cross-checked.';
}

/** Plain answer to “so what?”, one sentence, from the finding's own context. */
export function plainWhyItMatters(finding: Finding): string {
  const bySeverity: Record<Severity, string> = {
    CRITICAL:
      'Left in, this can change what the trial appears to conclude, or it puts the wrong instruction in front of a treating doctor.',
    MAJOR:
      'It will not change the conclusion, but a reviewer will spot it and ask, and answering formally takes weeks.',
    MINOR: 'Low risk. It reads as carelessness rather than as a problem with the science.',
  };
  return bySeverity[finding.severity];
}

/** Which documents a finding touches, spelled out. */
export function plainDocuments(types: DocumentType[]): string {
  const names = types.map((t) => `${t} (${DOC_PLAIN[t].name})`);
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** Headline verdict for one document, in words rather than counts. */
export function plainVerdict(counts: Record<Severity, number>): {
  headline: string;
  detail: string;
  tone: 'bad' | 'watch' | 'ok';
} {
  if (counts.CRITICAL > 0) {
    return {
      tone: 'bad',
      headline: `${counts.CRITICAL} thing${counts.CRITICAL === 1 ? '' : 's'} to fix before this goes out`,
      detail:
        'At least one finding here can affect what the trial concludes or what a doctor is told to do. Start at the top of the list.',
    };
  }
  if (counts.MAJOR > 0) {
    return {
      tone: 'watch',
      headline: `${counts.MAJOR} inconsistenc${counts.MAJOR === 1 ? 'y' : 'ies'} worth resolving`,
      detail:
        'Nothing here changes the result, but each one is a question a reviewer could raise. Cheaper to fix now than to answer later.',
    };
  }
  if (counts.MINOR > 0) {
    return {
      tone: 'ok',
      headline: `${counts.MINOR} minor point${counts.MINOR === 1 ? '' : 's'}`,
      detail: 'Cosmetic only. Nothing is blocked.',
    };
  }
  return {
    tone: 'ok',
    headline: 'No contradictions found in this document',
    detail:
      'Read this as “these checks found nothing”, not as “the document is correct”. The checks that ran are listed below, and cross-document checks need the other documents present.',
  };
}
