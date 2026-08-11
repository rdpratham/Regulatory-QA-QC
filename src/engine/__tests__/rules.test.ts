import { describe, expect, it } from 'vitest';
import { RulesExtractor } from '../extract';
import { RULES, RULE_BY_ID } from '../extract/rules';
import type { Abbreviation, DocumentType, Entity, IndexedParagraph, ParsedDocument, ParsedSection } from '../types';

/**
 * Every rule is exercised twice: on the sentence it is meant to catch, and on a
 * sentence that looks similar and must not fire it. The near-miss half is the
 * half that matters. A rule that fires on everything produces false positives,
 * and false positives are what make a regulatory reviewer stop opening the
 * report.
 */

type Fixture = {
  text: string;
  kind?: 'PROSE' | 'CODE';
  documentType?: DocumentType;
  sectionId?: string;
  sectionHeading?: string;
  /** Extra sections so cross-reference resolution has a tree to resolve into. */
  sections?: { id: string; heading: string }[];
  abbreviations?: [string, string][];
  lines?: string[];
};

function build(fixture: Fixture): { paragraph: IndexedParagraph; document: ParsedDocument } {
  const kind = fixture.kind ?? 'PROSE';
  const sectionId = fixture.sectionId ?? '1.1';
  const lines = fixture.lines ?? fixture.text.split('\n');

  const paragraph: IndexedParagraph = {
    documentId: 'DOC-TEST',
    documentType: fixture.documentType ?? 'SAP',
    documentTitle: 'Test document',
    version: 'v1.0',
    author: 'Test',
    sectionId,
    sectionHeading: fixture.sectionHeading ?? 'Test Section',
    paragraphId: `${sectionId}-p1`,
    printedPage: 12,
    pdfPage: 14,
    text: fixture.text,
    lines,
    kind,
  };

  const primary: ParsedSection = {
    id: sectionId,
    heading: paragraph.sectionHeading,
    printedPage: 12,
    pdfPage: 14,
    paragraphs: [{ id: paragraph.paragraphId, text: fixture.text, lines, kind, printedPage: 12, pdfPage: 14 }],
  };

  const extra: ParsedSection[] = (fixture.sections ?? []).map((s) => ({
    id: s.id,
    heading: s.heading,
    printedPage: 20,
    pdfPage: 22,
    paragraphs: [],
  }));

  const abbreviations: Abbreviation[] = (fixture.abbreviations ?? []).map(([acronym, expansion]) => ({
    acronym,
    expansion,
    paragraphId: paragraph.paragraphId,
  }));

  return {
    paragraph,
    document: {
      id: 'DOC-TEST',
      type: paragraph.documentType,
      fileName: 'test.pdf',
      title: 'Test document',
      version: 'v1.0',
      effectiveDate: '2024-01-01',
      author: 'Test',
      pdfPageCount: 30,
      printedPageCount: 28,
      pageOffset: 2,
      sections: [primary, ...extra],
      abbreviations,
      boilerplate: [],
      rotatedItemsDropped: 0,
    },
  };
}

function fire(ruleId: string, fixture: Fixture): Entity[] {
  const rule = RULE_BY_ID.get(ruleId);
  if (!rule) throw new Error(`unknown rule ${ruleId}`);
  const { paragraph, document } = build(fixture);
  return new RulesExtractor([rule]).extract([paragraph], [document]);
}

function values(ruleId: string, fixture: Fixture, conceptKey?: string): string[] {
  return fire(ruleId, fixture)
    .filter((e) => !conceptKey || e.conceptKey === conceptKey)
    .map((e) => e.normalizedValue);
}

type Case = {
  rule: string;
  label?: string;
  positive: Fixture;
  expect: string[];
  conceptKey?: string;
  nearMiss: Fixture;
  /**
   * Rules that report a verdict rather than only a defect emit a passing value
   * on a clean input. "Silent" for those means "reports the clean verdict",
   * not "reports nothing" — the true negatives are the point of them.
   */
  nearMissExpect?: string[];
};

const APPENDICES = [
  { id: 'APPENDIX 1', heading: 'VISIT NAME' },
  { id: 'APPENDIX 2', heading: 'HANDLING OF PARTIAL AND MISSING DATES' },
  { id: 'APPENDIX 6', heading: 'CTC GRADING PARAMTERS' },
  { id: 'APPENDIX 7', heading: 'PROTOCOL DEVIATION DEFINITION' },
];

const CASES: Case[] = [
  /* ---------------- numeric ---------------- */
  {
    rule: 'numeric.sample_size.planned',
    positive: { text: 'A total of 752 subjects will therefore be randomised in a 1:1 ratio.' },
    expect: ['752'],
    nearMiss: { text: 'A total of 811 subjects were randomised across 148 sites.' },
  },
  {
    rule: 'numeric.sample_size.planned_per_arm',
    positive: { text: 'Allowing for dropout, 376 subjects per treatment group are required.' },
    expect: ['376'],
    nearMiss: { text: 'A total of 376 subjects were assigned to the CB-207 group.' },
  },
  {
    rule: 'numeric.sample_size.evaluable',
    positive: { text: 'Under these assumptions, 331 evaluable subjects per treatment group provide 80% power.' },
    expect: ['331'],
    nearMiss: { text: 'The analysis included 331 subjects with an evaluable pathology assessment.' },
  },
  {
    rule: 'numeric.dropout_rate',
    positive: { text: 'Allowing for a dropout rate of 12% between randomisation and the primary assessment.' },
    expect: ['12%'],
    nearMiss: { text: 'The discontinuation rate was 12% in the CB-207 group.' },
  },
  {
    rule: 'numeric.sample_size.randomised',
    positive: { text: 'A total of 811 subjects were randomised, of whom 406 were assigned to CB-207.' },
    expect: ['811'],
    nearMiss: { text: 'A total of 752 subjects will be randomised in a 1:1 ratio.' },
  },
  {
    rule: 'numeric.sample_size.randomised',
    label: 'disposition table total row',
    positive: {
      text: 'Table 3. Randomised subjects by geographic region Region CB-207 Reference product Total Eastern Europe 34 34 68 Total 406 405 811',
      lines: [
        'Table 3. Randomised subjects by geographic region',
        'Region CB-207 Reference product Total',
        'Eastern Europe 34 34 68',
        'Total 406 405 811',
      ],
    },
    expect: ['811'],
    nearMiss: {
      text: 'Table 4. Analysis visit names Analysis visit Recorded visit Target day Total 406 405 811',
      lines: ['Table 4. Analysis visit names', 'Total 406 405 811'],
    },
  },
  {
    rule: 'numeric.sample_size.treated',
    positive: { text: 'Of the randomised subjects, 803 subjects received at least one dose of study treatment.' },
    expect: ['803'],
    nearMiss: { text: 'The Safety Set comprises all subjects who received at least one dose of study treatment.' },
  },
  {
    rule: 'numeric.sample_size.per_protocol',
    positive: { text: 'The Per-Protocol Set comprised 744 subjects, 374 in the CB-207 group and 370 in the reference product group.' },
    expect: ['744'],
    nearMiss: { text: 'The Per-Protocol Set excludes subjects with an important protocol deviation.' },
  },
  {
    rule: 'numeric.dose_regimen',
    positive: { text: 'Subjects receive a loading dose of 8 mg/kg followed by a maintenance dose of 6 mg/kg every 21 days.' },
    expect: ['6 mg/kg Q21D'],
    nearMiss: { text: 'The drug product is supplied in single-use vials containing 150 mg and 420 mg of active substance.' },
  },
  {
    rule: 'numeric.sample_size.pk',
    positive: { text: 'Forty-eight subjects per treatment group provide 90% power to demonstrate equivalence.' },
    expect: ['48'],
    nearMiss: { text: 'A subset of subjects per treatment group will contribute to the pharmacokinetic comparison.' },
  },

  /* ---------------- statistical ---------------- */
  {
    rule: 'statistical.alpha',
    positive: { text: 'The null hypothesis will be tested at a two-sided significance level of 0.05.' },
    expect: ['alpha 0.05 (two-sided)'],
    nearMiss: { text: 'The hypothesis will be tested and the estimate presented with a two-sided 95% confidence interval.' },
  },
  {
    rule: 'statistical.alpha',
    label: 'percentage form',
    positive: { text: 'Unless otherwise specified, all statistical tests will be two-sided and conducted at a significance level of 5%.' },
    expect: ['alpha 0.05 (two-sided)'],
    nearMiss: { text: 'Response rates will be tested and summarised as percentages with a significance assessment deferred.' },
  },
  {
    rule: 'statistical.power',
    positive: { text: '331 evaluable subjects per group provide 80% power to demonstrate equivalence.' },
    expect: ['80%'],
    nearMiss: { text: 'Median relative dose intensity was 92% in the CB-207 group.' },
  },
  {
    rule: 'statistical.default_ci_level',
    positive: { text: 'Unless otherwise specified, all confidence intervals will be two-sided 95% confidence intervals.' },
    expect: ['95% CI (two-sided)'],
    nearMiss: { text: 'The hazard ratio will be presented with a two-sided 95% confidence interval.' },
  },
  {
    rule: 'statistical.equivalence_criterion',
    positive: {
      text: 'Equivalence will be concluded if the two-sided 90% confidence interval for the ratio of response rates lies entirely within [0.760, 1.510].',
    },
    expect: ['90% CI (two-sided)'],
    nearMiss: {
      text: 'As an additional analysis, the two-sided 95% confidence interval for the ratio will be presented against the same acceptance range.',
    },
  },
  {
    rule: 'statistical.ci_level_for_statistic',
    positive: { text: 'The two-sided 90% confidence interval for the ratio will be estimated from a generalised linear model.' },
    expect: ['90% CI (two-sided)'],
    nearMiss: { text: 'The observed ratio was 1.206 with a two-sided 90% confidence interval of 1.068 to 1.362.' },
  },
  {
    rule: 'statistical.observed_interval',
    positive: {
      text: 'The observed ratio of response rates was 1.206 with a two-sided 90% confidence interval of 1.068 to 1.362.',
      documentType: 'CSR',
    },
    expect: ['1.206 (90% CI 1.068 to 1.362)'],
    nearMiss: {
      text: 'Equivalence will be concluded if the two-sided 90% confidence interval for the ratio lies within [0.760, 1.510].',
      documentType: 'CSR',
    },
  },
  {
    rule: 'statistical.equivalence_margin_derivation',
    positive: {
      text: 'The margin is derived as 80% of the lower bound of the estimated treatment effect. The estimated effect is 15.2% and the resulting margin is therefore 12%, applied symmetrically.',
    },
    expect: ['12%'],
    nearMiss: { text: 'The equivalence margin of 12% is applied symmetrically as [-12%, 12%].' },
  },
  {
    rule: 'statistical.test_for_safety_data',
    positive: { text: 'The difference in ADA incidence between treatment groups will be tested using Fisher\'s exact test.' },
    expect: ["Fisher's exact test"],
    nearMiss: { text: 'The primary endpoint will be compared using a stratified Cochran-Mantel-Haenszel approach.' },
  },
  {
    rule: 'statistical.no_comparison_policy',
    positive: { text: 'No statistical comparisons between treatment groups will be performed for safety data.' },
    expect: ['STATED'],
    nearMiss: { text: 'Statistical comparisons between treatment groups will be performed for the primary endpoint only.' },
  },

  /* ---------------- population ---------------- */
  {
    rule: 'population.ecog_eligibility',
    positive: { text: 'Eligible subjects must have an ECOG performance status of 0 or 1 at the screening visit.' },
    expect: ['ECOG 0-1'],
    nearMiss: { text: 'Baseline ECOG performance status was 0 in 41% and 1 in 59% of the randomised population.' },
  },
  {
    rule: 'population.ecog_eligibility',
    label: 'CRF enumeration',
    positive: { text: 'Field ELIG-06 captures the ECOG performance status; the permitted responses are 0 and 1.' },
    expect: ['ECOG 0-1'],
    nearMiss: { text: 'Eligible subjects must have an ECOG performance status recorded in the source document.' },
  },
  {
    rule: 'population.ecog_reporting_scale',
    positive: { text: 'ECOG performance status recorded at screening will be summarised in the categories (0, 1, >1).' },
    expect: ['ECOG categories 0, 1, >1'],
    nearMiss: { text: 'ECOG performance status will be listed for each subject at each scheduled visit.' },
  },
  {
    rule: 'population.pk_set_cycle_requirement',
    positive: { text: 'The Pharmacokinetic Set comprises all subjects who received at least four cycles of study treatment.' },
    expect: ['GTE 4 cycles'],
    nearMiss: { text: 'The Safety Set comprises all subjects who received at least one dose of study treatment.' },
  },
  {
    rule: 'population.pps_site_exclusion',
    positive: { text: 'Nine subjects enrolled at two sites in Ukraine are excluded from the Per-Protocol Set following the sponsor decision.' },
    expect: ['9 subjects at 2 sites in Ukraine'],
    nearMiss: { text: 'Subjects with an important protocol deviation are excluded from the Per-Protocol Set.' },
  },
  {
    rule: 'population.creatinine_clearance',
    positive: { text: 'Adequate renal function is required, defined as a creatinine clearance >= 50 mL/min.' },
    expect: ['GTE 50 mL/min'],
    nearMiss: { text: 'Field ELIG-11 captures the calculated creatinine clearance in mL/min.' },
  },
  {
    rule: 'population.lvef_threshold',
    positive: { text: 'Adequate cardiac function is required, defined as a baseline left ventricular ejection fraction of at least 55%.' },
    expect: ['GTE 55 %'],
    nearMiss: { text: 'A clinically significant decrease is a fall to a left ventricular ejection fraction below 50%.' },
  },
  {
    rule: 'population.min_age',
    positive: { text: 'Subjects must be women aged at least 18 years with histologically confirmed disease.' },
    expect: ['GTE 18 years'],
    nearMiss: { text: 'Subjects must have a life expectancy of at least 12 weeks.' },
  },

  /* ---------------- schedule ---------------- */
  {
    rule: 'schedule.visit_window',
    positive: { text: 'A visit window tolerance of +/- 3 days is permitted for all on-treatment visits.' },
    expect: ['+/-3 days'],
    nearMiss: { text: 'On-treatment visits are scheduled at 21-day intervals.' },
  },
  {
    rule: 'schedule.safety_followup',
    positive: { text: 'All subjects will complete a safety follow-up assessment 30 days after the last dose of study treatment.' },
    expect: ['30 days'],
    nearMiss: { text: 'Deaths occurring within 30 days of the last dose were reported in 4.1% of subjects.' },
  },
  {
    rule: 'schedule.cycle_interval',
    positive: { text: 'CB-207 will be administered every 21 days as an intravenous infusion.' },
    expect: ['21 days'],
    nearMiss: { text: 'Screening assessments must be completed within 28 days prior to randomisation.' },
  },
  {
    rule: 'schedule.neoadjuvant_cycles',
    positive: { text: 'The study consists of a neoadjuvant period of eight cycles administered prior to surgery.' },
    expect: ['8 cycles'],
    nearMiss: { text: 'The neoadjuvant period is followed by definitive surgery and an adjuvant period.' },
  },
  {
    rule: 'coverage.assessment_timepoint',
    positive: {
      text: 'A repeat determination of left ventricular ejection fraction is required at Cycle 9 Day 1.',
      documentType: 'PROTOCOL',
    },
    expect: ['REQUIRED'],
    conceptKey: 'assessment.lvef.c9d1',
    nearMiss: {
      text: 'Vital signs, including seated blood pressure, will be measured at every scheduled visit.',
      documentType: 'PROTOCOL',
    },
  },

  /* ---------------- terminology ---------------- */
  {
    rule: 'terminology.grading_scale',
    positive: { text: 'Adverse events will be graded using the Common Terminology Criteria for Adverse Events version 4.03.' },
    expect: ['CTCAE 4.03'],
    nearMiss: { text: 'Pooled summaries have not been re-graded following the publication of subsequent CTCAE editions.' },
  },
  {
    rule: 'terminology.dictionary_version',
    positive: { text: 'Adverse events will be coded using MedDRA version 27.0.' },
    expect: ['MedDRA 27.0'],
    nearMiss: { text: 'Adverse events will be coded using the current version of MedDRA at database lock.' },
  },
  {
    rule: 'terminology.controlled_vocabulary',
    positive: { text: 'The Full Analysis Set is the primary analysis set. The Full analysis set includes all randomised subjects.' },
    expect: ['Full Analysis Set', 'Full analysis set'],
    conceptKey: 'vocabulary.full_analysis_set',
    nearMiss: { text: 'The analysis set definitions are given in Section 3.1 of this plan.' },
  },
  {
    rule: 'terminology.acronym_definition',
    positive: {
      text: 'PR Progesterone receptor PR Partial response',
      abbreviations: [
        ['PR', 'Progesterone receptor'],
        ['PR', 'Partial response'],
      ],
    },
    expect: ['progesterone receptor', 'partial response'],
    conceptKey: 'acronym.PR',
    nearMiss: { text: 'Abbreviations used in this plan are listed in the front matter.' },
  },
  {
    rule: 'terminology.acronym_definition',
    label: 'non-standard acronym for a standard term',
    positive: {
      text: 'ATCC Anatomical Therapeutic Chemical classification',
      abbreviations: [['ATCC', 'Anatomical Therapeutic Chemical classification']],
    },
    expect: ['ATCC'],
    conceptKey: 'standard.acronym.anatomical_therapeutic_chemical',
    nearMiss: {
      text: 'ATC Anatomical Therapeutic Chemical classification',
      abbreviations: [['ATC', 'Anatomical Therapeutic Chemical classification']],
    },
    nearMissExpect: ['ATC'],
  },

  /* ---------------- cross-references ---------------- */
  {
    rule: 'crossref.reference_resolution',
    label: 'reference that names the wrong target',
    positive: {
      text: 'Where the onset date is partial or missing, see APPENDIX 1 for handling of partial dates for AEs.',
      sections: APPENDICES,
    },
    expect: ['MISMATCH — APPENDIX 1 is "VISIT NAME", but "handling of partial dates for AEs" is APPENDIX 2 "HANDLING OF PARTIAL AND MISSING DATES"'],
    nearMiss: {
      text: 'Where a date is partial, the conventions in APPENDIX 2 will be applied before classification.',
      sections: APPENDICES,
    },
    nearMissExpect: ['RESOLVED'],
  },
  {
    rule: 'crossref.numbered_title_reference',
    positive: {
      text: 'Grading and deviation conventions moved to appendix 4: CTC Grading and appendix 5: Protocol deviation definition.',
      sections: [...APPENDICES, { id: 'APPENDIX 4', heading: 'ANALYSIS CODE FOR THE SENSITIVITY ANALYSIS' }, { id: 'APPENDIX 5', heading: 'ANALYSIS CODE FOR THE PHARMACOKINETIC ENDPOINTS' }],
    },
    expect: [
      'MISMATCH — APPENDIX 4 is "ANALYSIS CODE FOR THE SENSITIVITY ANALYSIS", but "CTC Grading" is APPENDIX 6 "CTC GRADING PARAMTERS"',
      'MISMATCH — APPENDIX 5 is "ANALYSIS CODE FOR THE PHARMACOKINETIC ENDPOINTS", but "Protocol deviation definition" is APPENDIX 7 "PROTOCOL DEVIATION DEFINITION"',
    ],
    nearMiss: {
      text: 'Grading conventions are given in appendix 6: CTC Grading and are applied throughout.',
      sections: APPENDICES,
    },
    nearMissExpect: ['RESOLVED'],
  },

  /* ---------------- eCRF mapping ---------------- */
  {
    rule: 'crf_mapping.page_reference',
    positive: { text: 'Central pathology results will be taken from the pCR page for each subject.' },
    expect: ['pCR'],
    nearMiss: { text: 'Hard edit checks prevent page completion until the query is resolved.' },
  },

  /* ---------------- derivation ---------------- */
  {
    rule: 'derivation.identifier_spelling',
    positive: {
      text: 'proc freq data=eff;\n  tables hrceptor*trt*bpcrfl / cmh;\nrun;',
      kind: 'CODE',
      lines: ['proc freq data=eff;', '  tables hrceptor*trt*bpcrfl / cmh;', 'run;'],
    },
    expect: ['hrceptor'],
    conceptKey: 'derivation.identifier.hrcptr',
    nearMiss: {
      text: 'proc freq data=eff;\n  tables sex*age / chisq;\nrun;',
      kind: 'CODE',
      lines: ['proc freq data=eff;', '  tables sex*age / chisq;', 'run;'],
    },
  },
  {
    rule: 'derivation.dataset_flow',
    positive: {
      text: 'proc freq data=eff;\nrun;\nproc iml;\n  use adpc;\nquit;',
      kind: 'CODE',
      lines: ['proc freq data=eff;', 'run;', 'proc iml;', '  use adpc;', 'quit;'],
    },
    expect: ['2 UNRELATED INPUTS — adpc, eff'],
    nearMiss: {
      text: 'data sens;\n  set adef;\nrun;\nproc genmod data=sens;\nrun;',
      kind: 'CODE',
      lines: ['data sens;', '  set adef;', 'run;', 'proc genmod data=sens;', 'run;'],
    },
    nearMissExpect: ['SINGLE INPUT'],
  },
  {
    rule: 'derivation.stray_token',
    positive: {
      text: 'proc iml;\n  8\nquit;',
      kind: 'CODE',
      lines: ['proc iml;', '  8', 'quit;'],
    },
    expect: ['STRAY LITERAL "8"'],
    nearMiss: {
      text: 'proc iml;\n  x = 8;\nquit;',
      kind: 'CODE',
      lines: ['proc iml;', '  x = 8;', 'quit;'],
    },
  },
  {
    rule: 'derivation.dose_intensity_formula',
    positive: {
      text: 'For the adjuvant period, relative dose intensity for cycle n is derived as the administered dose recorded at Cycle(n-9) divided by the administered dose recorded at Cycle(n-8), expressed as a percentage.',
    },
    expect: ['numerator Cycle(n-9) is 1 cycle(s) earlier than the denominator'],
    nearMiss: {
      text: 'For the adjuvant period, relative dose intensity is derived as the cumulative administered dose divided by the cumulative planned dose.',
    },
  },
  {
    rule: 'derivation.teae_definition',
    positive: {
      text: 'For the adjuvant period, a treatment-emergent adverse event is defined as an adverse event with onset on or after the date of first administration of IP and the date of surgery.',
    },
    expect: ['GTE(FIRST_IP) + UNQUALIFIED(SURGERY)'],
    nearMiss: {
      text: 'For the adjuvant period, treatment-emergent adverse events will be summarised by system organ class and preferred term.',
    },
  },
  {
    rule: 'derivation.category_set_integrity',
    positive: {
      text: 'Left ventricular ejection fraction will be summarised using the categories >=60, >=50 and <60, >=45 and <50, and >=45 and <50.',
    },
    expect: ['INCOMPLETE — the category ">=45 and <50" is listed twice; values below 45 have no category'],
    nearMiss: {
      text: 'Left ventricular ejection fraction will be summarised using the categories >=60, >=50 and <60, >=45 and <50, and <45.',
    },
    nearMissExpect: ['COMPLETE AND DISTINCT'],
  },

  /* ---------------- tables, figures and listings ---------------- */
  {
    rule: 'tfl.population_header',
    positive: {
      text: 'CB-207 (N=374) Reference product (N=368) Total (N=742)',
      documentType: 'TFL',
      sectionId: '14.2.1',
      sectionHeading: 'RESPONSE RATE - PER-PROTOCOL SET',
    },
    expect: ['742'],
    conceptKey: 'sample_size.per_protocol',
    nearMiss: {
      text: 'CB-207 (N=374) Reference product (N=368) Total (N=742)',
      documentType: 'TFL',
      sectionId: '14.9.9',
      sectionHeading: 'CONCOMITANT MEDICATION BY PREFERRED TERM',
    },
  },
  {
    rule: 'tfl.output_index',
    positive: {
      text: 'Table 14.1.1 Disposition Table 14.1.2 Deviations Table 14.1.4 Demographics',
      documentType: 'TFL',
      sectionId: 'LIST OF OUTPUTS',
      sectionHeading: 'LIST OF OUTPUTS',
    },
    expect: ['GAPS - 14.1.3 not indexed'.replace('-', '\u2014')],
    nearMiss: {
      text: 'Table 14.1.1 Disposition Table 14.1.2 Deviations Table 14.1.3 Demographics',
      documentType: 'TFL',
      sectionId: 'LIST OF OUTPUTS',
      sectionHeading: 'LIST OF OUTPUTS',
    },
    nearMissExpect: ['CONTIGUOUS'],
  },
  {
    rule: 'tfl.source_program',
    positive: {
      text: 'CB-207 (N=374) Reference product (N=368). Responders 186 152.',
      documentType: 'TFL',
      sectionId: '14.2.2',
      sectionHeading: 'TABLE 14.2.2 SENSITIVITY ANALYSIS',
    },
    expect: ['NO SOURCE PROGRAM CITED'],
    nearMiss: {
      text: 'CB-207 (N=374) Reference product (N=368). Source: adeff.sas Output generated 11JUL2025 10:02',
      documentType: 'TFL',
      sectionId: '14.2.3',
      sectionHeading: 'TABLE 14.2.3 SUPPORTIVE ANALYSIS',
    },
    nearMissExpect: ['TRACEABLE - adeff.sas'.replace('-', '\u2014')],
  },
  {
    rule: 'tfl.grading_scale',
    positive: {
      text: 'Adverse events are graded using the Common Terminology Criteria for Adverse Events version 4.03.',
      documentType: 'TFL',
      sectionHeading: 'TABLE 14.3.1 OVERVIEW OF ADVERSE EVENTS',
    },
    expect: ['CTCAE 4.03'],
    nearMiss: {
      text: 'Adverse events are graded using the Common Terminology Criteria for Adverse Events.',
      documentType: 'TFL',
      sectionHeading: 'TABLE 14.3.2 ADVERSE EVENTS BY PREFERRED TERM',
    },
  },

  /* ---------------- editorial ---------------- */
  {
    rule: 'editorial.misspelling',
    positive: { text: 'Body surface area will be calculated using the Mostellar formula.' },
    expect: ['Mostellar'],
    conceptKey: 'standard.spelling.mosteller',
    nearMiss: { text: 'Body surface area will be calculated using the Mosteller formula.' },
  },
  {
    rule: 'editorial.confusable_word',
    positive: { text: 'Based on there neoadjuvant studies of the reference product, the response rate is assumed to be 40.5%.' },
    expect: ['there'],
    conceptKey: 'standard.wording.there_three',
    nearMiss: { text: 'Based on three neoadjuvant studies of the reference product, the response rate is assumed to be 40.5%.' },
  },
];

describe('extraction rules', () => {
  for (const testCase of CASES) {
    const name = testCase.label ? `${testCase.rule} (${testCase.label})` : testCase.rule;

    it(`${name} fires on its positive case`, () => {
      expect(values(testCase.rule, testCase.positive, testCase.conceptKey)).toEqual(testCase.expect);
    });

    it(`${name} stays silent on the near miss`, () => {
      expect(values(testCase.rule, testCase.nearMiss, testCase.conceptKey)).toEqual(
        testCase.nearMissExpect ?? [],
      );
    });
  }

  it('every registered rule is covered by at least one case', () => {
    const covered = new Set(CASES.map((c) => c.rule));
    expect(RULES.map((r) => r.id).filter((id) => !covered.has(id))).toEqual([]);
  });

  it('every rule declares a specificity that feeds confidence', () => {
    for (const rule of RULES) {
      expect(rule.specificity).toBeGreaterThan(0);
      expect(rule.specificity).toBeLessThanOrEqual(1);
      expect(rule.description.length).toBeGreaterThan(10);
    }
  });
});

describe('benign context marking', () => {
  it('marks a dose stated for a different study in the programme', () => {
    const [entity] = fire('numeric.dose_regimen', {
      text: 'On the basis of this Phase 1 dose-escalation study, the dose selected for further evaluation was 4 mg/kg administered once weekly.',
    });
    expect(entity.benign?.patternId).toBe('benign.cross_study_reference');
    expect(entity.benign?.mode).toBe('downgrade');
  });

  it('does not mark the regimen of the study under review', () => {
    const [entity] = fire('numeric.dose_regimen', {
      text: 'Subjects in study CB207-C301 receive a maintenance dose of 6 mg/kg every 21 days.',
    });
    expect(entity.benign).toBeUndefined();
  });

  it('marks a confidence level stated for a labelled additional analysis', () => {
    const [entity] = fire('statistical.ci_level_for_statistic', {
      text: 'As an additional analysis, the two-sided 95% confidence interval for the ratio will be presented. This analysis is descriptive.',
    });
    expect(entity.benign?.patternId).toBe('benign.descriptive_additional_analysis');
  });
});

describe('citations', () => {
  it('retains both page numbers and a verbatim snippet', () => {
    const [entity] = fire('population.creatinine_clearance', {
      text: 'Adequate renal function is required for enrolment, defined as a creatinine clearance >= 50 mL/min calculated using the Cockcroft-Gault formula.',
    });
    expect(entity.citation).toMatchObject({
      documentId: 'DOC-TEST',
      version: 'v1.0',
      printedPage: 12,
      pdfPage: 14,
      sectionId: '1.1',
      paragraphId: '1.1-p1',
    });
    expect(entity.citation.snippet).toContain('creatinine clearance >= 50 mL/min');
    expect(entity.extractorRule).toBe('population.creatinine_clearance');
  });
});
