import type {
  Citation,
  DocumentType,
  ParsedDocument,
  Severity,
} from './types';

/**
 * Conformance against published regulatory guidance.
 *
 * This is a different question from the rest of the engine. Everything else
 * asks "do these documents agree with each other?". This asks "does each
 * document contain what the guidance says it must contain?" — and the two
 * failures are unrelated: a perfectly self-consistent protocol can still be
 * missing four of the sixteen elements ICH E6 requires of one.
 *
 * WHAT THIS CHECKS, PRECISELY
 *
 * Presence and pre-specification. For each requirement it looks for the
 * element in the parsed document and reports where it found it, or that it
 * could not find it.
 *
 * WHAT THIS DOES NOT CHECK, AND MUST NOT BE PRESENTED AS CHECKING
 *
 * Adequacy. It cannot tell you whether a statistical section is competent,
 * whether an equivalence margin is justifiable, or whether a safety assessment
 * is sufficient. A satisfied check means the element is present and locatable —
 * nothing more. This is not a regulatory opinion and does not substitute for
 * one.
 *
 * SOURCES
 *
 * Every requirement cites guidance published by the US Food and Drug
 * Administration, including the ICH guidelines FDA has adopted and issues as
 * guidance for industry (E3, E6(R2), E9, E9(R1)), and FDA's own guidances and
 * regulations. The citation travels into the finding so a reviewer can go and
 * read the source rather than take the check on trust.
 */

export type GuidanceSource = {
  /** The issuing body as the reviewer would name it. */
  issuer: 'FDA' | 'ICH (adopted by FDA)';
  /** Document title as published. */
  document: string;
  /** Section reference, where the guidance is numbered. */
  section?: string;
};

export type GuidanceRequirement = {
  id: string;
  source: GuidanceSource;
  /** The element the guidance requires. */
  title: string;
  /** What a reviewer must be able to find, in the reviewer's words. */
  requirement: string;
  /** Why the agency asks for it. */
  rationale: string;
  appliesTo: DocumentType[];
  severity: Severity;
  /** Any one of these matching satisfies the requirement. */
  detect: RegExp[];
};

/* ------------------------------------------------------------------ */
/* The registry                                                        */
/* ------------------------------------------------------------------ */

const E6 = (section: string): GuidanceSource => ({
  issuer: 'ICH (adopted by FDA)',
  document: 'ICH E6(R2) Good Clinical Practice',
  section,
});

const E3 = (section: string): GuidanceSource => ({
  issuer: 'ICH (adopted by FDA)',
  document: 'ICH E3 Structure and Content of Clinical Study Reports',
  section,
});

export const REQUIREMENTS: GuidanceRequirement[] = [
  /* ---------------- Protocol: ICH E6(R2) section 6 ---------------- */
  {
    id: 'E6-6.2',
    source: E6('6.2'),
    title: 'Background information',
    requirement: 'The protocol states the background and rationale for the trial.',
    rationale:
      'A reviewer has to be able to see why the trial is justified before assessing whether its design answers the question.',
    appliesTo: ['PROTOCOL'],
    severity: 'MAJOR',
    detect: [/\bbackground\b/i, /\brationale\b/i],
  },
  {
    id: 'E6-6.3',
    source: E6('6.3'),
    title: 'Trial objectives and purpose',
    requirement: 'The protocol states the trial objectives.',
    rationale: 'The objectives fix what the trial is for and what its endpoints must measure.',
    appliesTo: ['PROTOCOL'],
    severity: 'CRITICAL',
    detect: [/\bobjectives?\b/i],
  },
  {
    id: 'E6-6.4',
    source: E6('6.4'),
    title: 'Trial design',
    requirement: 'The protocol describes the trial design, including measures to minimise bias.',
    rationale:
      'Randomisation and blinding are the design features an inspector checks first, because everything downstream depends on them.',
    appliesTo: ['PROTOCOL'],
    severity: 'CRITICAL',
    detect: [/\b(?:trial|study) design\b/i],
  },
  {
    id: 'E6-6.5',
    source: E6('6.5'),
    title: 'Selection and withdrawal of subjects',
    requirement:
      'The protocol states the inclusion and exclusion criteria and the criteria for withdrawing a subject.',
    rationale:
      'Eligibility defines the population the result applies to; withdrawal criteria decide who leaves and how that is handled.',
    appliesTo: ['PROTOCOL'],
    severity: 'CRITICAL',
    detect: [/\beligibility\b/i, /inclusion criteri/i, /selection of subjects/i],
  },
  {
    id: 'E6-6.5-withdrawal',
    source: E6('6.5'),
    title: 'Subject withdrawal criteria',
    requirement:
      'The protocol states when and how a subject may be withdrawn, and the follow-up that applies after withdrawal.',
    rationale:
      'Without stated withdrawal criteria, discontinuation decisions are made case by case and cannot be reviewed for consistency.',
    appliesTo: ['PROTOCOL'],
    severity: 'MAJOR',
    detect: [/withdraw(?:al|n|s)?\b/i, /discontinuation criteri/i],
  },
  {
    id: 'E6-6.6',
    source: E6('6.6'),
    title: 'Treatment of subjects',
    requirement: 'The protocol states the treatment to be administered, including dose and schedule.',
    rationale: 'The administered regimen is the intervention being evaluated.',
    appliesTo: ['PROTOCOL'],
    severity: 'CRITICAL',
    detect: [/study treatment/i, /treatment of subjects/i],
  },
  {
    id: 'E6-6.7',
    source: E6('6.7'),
    title: 'Assessment of efficacy',
    requirement: 'The protocol specifies the efficacy parameters and how they are assessed.',
    rationale: 'The efficacy assessment defines what the primary endpoint actually measures.',
    appliesTo: ['PROTOCOL'],
    severity: 'CRITICAL',
    detect: [/efficacy (?:assessment|parameter|endpoint|evaluation)/i],
  },
  {
    id: 'E6-6.8',
    source: E6('6.8'),
    title: 'Assessment of safety',
    requirement:
      'The protocol specifies safety parameters, adverse event collection, and reporting requirements.',
    rationale:
      'Safety collection and reporting obligations are the elements an inspector tests against the site records.',
    appliesTo: ['PROTOCOL'],
    severity: 'CRITICAL',
    detect: [/safety (?:assessment|parameter|evaluation)/i, /adverse event/i],
  },
  {
    id: 'E6-6.9',
    source: E6('6.9'),
    title: 'Statistics',
    requirement:
      'The protocol describes the statistical methods and the sample size with its justification.',
    rationale:
      'The sample size justification is what supports the claim that the trial could have detected the effect it was looking for.',
    appliesTo: ['PROTOCOL'],
    severity: 'CRITICAL',
    detect: [/statistical (?:considerations|methods|analysis)/i, /sample size/i],
  },
  {
    id: 'E6-6.10',
    source: E6('6.10'),
    title: 'Direct access to source data and documents',
    requirement:
      'The protocol states that investigators will permit monitoring, audit, IRB or IEC review, and regulatory inspection, with direct access to source data and documents.',
    rationale:
      'This is the provision that gives an inspector the right of access. Its absence is found at inspection, not before.',
    appliesTo: ['PROTOCOL'],
    severity: 'MAJOR',
    detect: [
      /direct access to source/i,
      /source data verification/i,
      /source document verification/i,
      /permit .{0,40}(?:monitoring|audit|inspection)/i,
    ],
  },
  {
    id: 'E6-6.11',
    source: E6('6.11'),
    title: 'Quality control and quality assurance',
    requirement: 'The protocol describes quality control and quality assurance arrangements.',
    rationale: 'These are the arrangements that make the recorded data reviewable.',
    appliesTo: ['PROTOCOL'],
    severity: 'MAJOR',
    detect: [/quality (?:control|assurance)/i],
  },
  {
    id: 'E6-6.12',
    source: E6('6.12'),
    title: 'Ethics',
    requirement:
      'The protocol describes the ethical considerations, including the basis on which the trial is conducted.',
    rationale: 'Ethical conduct and informed consent are the first questions asked at inspection.',
    appliesTo: ['PROTOCOL'],
    severity: 'CRITICAL',
    detect: [/\bethic/i, /Declaration of Helsinki/i, /institutional review board|ethics committee/i],
  },
  {
    id: 'E6-6.13',
    source: E6('6.13'),
    title: 'Data handling and record keeping',
    requirement: 'The protocol describes data handling and record retention arrangements.',
    rationale:
      'Retention obligations outlive the trial; a protocol silent on them leaves the sponsor unable to show how long records are kept and by whom.',
    appliesTo: ['PROTOCOL'],
    severity: 'MAJOR',
    detect: [/data handling/i, /record keeping/i, /record retention/i, /retention of (?:records|data)/i],
  },
  {
    id: 'E6-6.14',
    source: E6('6.14'),
    title: 'Financing and insurance',
    requirement:
      'The protocol addresses financing and insurance, where these are not covered by a separate agreement.',
    rationale:
      'Subject compensation arrangements are reviewed by the ethics committee and are expected to be locatable.',
    appliesTo: ['PROTOCOL'],
    severity: 'MINOR',
    detect: [/financing/i, /insurance/i, /indemnit/i, /compensation for (?:injury|subjects)/i],
  },
  {
    id: 'E6-6.15',
    source: E6('6.15'),
    title: 'Publication policy',
    requirement:
      'The protocol states the publication policy, where it is not covered by a separate agreement.',
    rationale:
      'Publication arrangements bear on selective reporting, which is the reason the element is called out separately.',
    appliesTo: ['PROTOCOL'],
    severity: 'MINOR',
    detect: [/publication (?:policy|of (?:the )?results)/i, /dissemination of results/i],
  },

  /* ---------------- SAP: ICH E9, E9(R1), FDA guidances ---------------- */
  {
    id: 'E9-5.1',
    source: {
      issuer: 'ICH (adopted by FDA)',
      document: 'ICH E9 Statistical Principles for Clinical Trials',
      section: '5.1',
    },
    title: 'Analysis plan finalised before unblinding',
    requirement:
      'The analysis plan states that it is finalised before the blind is broken, or records the date on which it was.',
    rationale:
      'An analysis plan that cannot be shown to predate unblinding cannot be relied on as pre-specification, and every analysis in it is read as post hoc.',
    appliesTo: ['SAP'],
    severity: 'CRITICAL',
    detect: [
      /(?:prior to|before) (?:the )?unblinding/i,
      /(?:prior to|before) breaking the blind/i,
      /finalised .{0,40}(?:prior to|before) .{0,30}unblind/i,
    ],
  },
  {
    id: 'E9R1-estimand',
    source: {
      issuer: 'ICH (adopted by FDA)',
      document: 'ICH E9(R1) Addendum on Estimands and Sensitivity Analysis',
    },
    title: 'Estimand for the primary objective',
    requirement:
      'The analysis plan defines the estimand for the primary objective: the treatment condition, the population, the variable, the handling of intercurrent events, and the population-level summary.',
    rationale:
      'The estimand framework is what makes the treatment effect being estimated unambiguous. FDA reviewers now expect it stated explicitly, and its absence is one of the most common statistical review findings on plans written to the older convention.',
    appliesTo: ['SAP'],
    severity: 'MAJOR',
    detect: [/\bestimand/i],
  },
  {
    id: 'E9R1-intercurrent',
    source: {
      issuer: 'ICH (adopted by FDA)',
      document: 'ICH E9(R1) Addendum on Estimands and Sensitivity Analysis',
    },
    title: 'Handling of intercurrent events',
    requirement:
      'The analysis plan states how intercurrent events — treatment discontinuation, rescue medication, death — are handled in the primary analysis.',
    rationale:
      'Censoring rules alone do not say which strategy is being applied to an intercurrent event, and two plans with identical censoring rules can estimate different quantities.',
    appliesTo: ['SAP'],
    severity: 'MAJOR',
    detect: [/intercurrent event/i, /rescue (?:medication|therapy)/i],
  },
  {
    id: 'E9R1-sensitivity',
    source: {
      issuer: 'ICH (adopted by FDA)',
      document: 'ICH E9(R1) Addendum on Estimands and Sensitivity Analysis',
    },
    title: 'Pre-specified sensitivity analysis',
    requirement:
      'The analysis plan pre-specifies sensitivity analyses testing the assumptions of the primary analysis.',
    rationale:
      'A primary result with no pre-specified sensitivity analysis cannot be shown to be robust to its own assumptions.',
    appliesTo: ['SAP'],
    severity: 'MAJOR',
    detect: [/sensitiv(?:e|ity) analys/i],
  },
  {
    id: 'E9-5.3',
    source: {
      issuer: 'ICH (adopted by FDA)',
      document: 'ICH E9 Statistical Principles for Clinical Trials',
      section: '5.3',
    },
    title: 'Handling of missing data',
    requirement: 'The analysis plan states how missing data are handled.',
    rationale:
      'Missing data handling chosen after the data are seen is the classic route to a result that cannot be reproduced.',
    appliesTo: ['SAP'],
    severity: 'MAJOR',
    detect: [/missing data/i, /imputation/i],
  },
  {
    id: 'FDA-multiple-endpoints',
    source: {
      issuer: 'FDA',
      document: 'Guidance for Industry: Multiple Endpoints in Clinical Trials',
    },
    title: 'Multiplicity strategy',
    requirement:
      'The analysis plan states the strategy for multiplicity across endpoints, including where no adjustment is applied and why.',
    rationale:
      'A submission that tests several endpoints without a stated multiplicity strategy invites the reviewer to assume the type I error rate is not controlled.',
    appliesTo: ['SAP'],
    severity: 'MAJOR',
    detect: [
      /multiplicity/i,
      /multiple comparison/i,
      /family-?wise/i,
      /alpha (?:allocation|spending)/i,
    ],
  },
  {
    id: 'FDA-margin-justification',
    source: {
      issuer: 'FDA',
      document:
        'Guidance for Industry: Non-Inferiority Clinical Trials to Establish Effectiveness',
    },
    title: 'Justification of the comparison margin',
    requirement:
      'The analysis plan states how the equivalence or non-inferiority margin was derived, not only its value.',
    rationale:
      'A margin stated without its derivation cannot be assessed for whether it preserves a clinically meaningful fraction of the reference effect, which is the question the guidance exists to answer.',
    appliesTo: ['SAP', 'PROTOCOL'],
    severity: 'MAJOR',
    detect: [
      /margin is derived/i,
      /margin .{0,30}derived as/i,
      /derived as \d+\s*% of/i,
      /justification of the margin/i,
    ],
  },
  {
    id: 'FDA-sdtcg-define',
    source: {
      issuer: 'FDA',
      document: 'Study Data Technical Conformance Guide',
    },
    title: 'Data definition file',
    requirement:
      'The analysis plan or its programming section states that a data definition file (define.xml) will accompany the submitted analysis datasets.',
    rationale:
      'FDA will not load analysis datasets submitted without a conformant define.xml, and the omission is found at submission rather than at analysis.',
    appliesTo: ['SAP'],
    severity: 'MINOR',
    detect: [/define\.xml/i, /define-xml/i, /data definition file/i],
  },
  {
    id: 'FDA-sdtcg-adam',
    source: {
      issuer: 'FDA',
      document: 'Study Data Technical Conformance Guide',
    },
    title: 'Analysis dataset standard',
    requirement:
      'The analysis plan states the CDISC standard and version the analysis datasets conform to.',
    rationale: 'Submitted analysis datasets must conform to a supported CDISC standard version.',
    appliesTo: ['SAP'],
    severity: 'MAJOR',
    detect: [/\bADaM\b/i, /\bCDISC\b/i],
  },
  {
    id: 'E3-9.8-sap',
    source: E3('9.8'),
    title: 'Changes from planned analyses',
    requirement:
      'Any analysis differing from the protocol is recorded, with the change and its rationale.',
    rationale:
      'Undocumented departures from the protocol-specified analysis are read as post hoc regardless of when they were made.',
    appliesTo: ['SAP', 'CSR'],
    severity: 'MAJOR',
    detect: [/changes? from (?:the )?protocol/i, /deviations? from the planned analys/i],
  },

  /* ---------------- CSR: ICH E3 ---------------- */
  {
    id: 'E3-9.7',
    source: E3('9.7'),
    title: 'Statistical methods and sample size determination',
    requirement:
      'The study report describes the statistical methods planned in the protocol and the determination of sample size.',
    rationale:
      'A report that gives results without the methods that produced them cannot be reviewed; this is a required section of the report structure.',
    appliesTo: ['CSR'],
    severity: 'CRITICAL',
    detect: [/statistical methods/i, /determination of sample size/i],
  },
  {
    id: 'E3-10.1',
    source: E3('10.1'),
    title: 'Disposition of subjects',
    requirement:
      'The study report accounts for all subjects who entered the study, including discontinuations and reasons.',
    rationale:
      'Subject accountability is the first table a reviewer opens, because every denominator in the report depends on it.',
    appliesTo: ['CSR'],
    severity: 'CRITICAL',
    detect: [/disposition/i, /subject accountability/i],
  },
  {
    id: 'E3-10.2',
    source: E3('10.2'),
    title: 'Protocol deviations',
    requirement:
      'The study report describes important protocol deviations and their effect on the results.',
    rationale:
      'Deviations bear directly on whether the analysis populations mean what they claim to mean.',
    appliesTo: ['CSR'],
    severity: 'MAJOR',
    detect: [/protocol deviation/i],
  },
  {
    id: 'E3-12',
    source: E3('12'),
    title: 'Safety evaluation',
    requirement:
      'The study report presents the safety evaluation, including extent of exposure and adverse events.',
    rationale: 'Exposure is the denominator for every adverse event rate reported.',
    appliesTo: ['CSR'],
    severity: 'CRITICAL',
    detect: [/safety (?:evaluation|results|analys)/i, /adverse event/i],
  },
  {
    id: 'E3-16',
    source: E3('16'),
    title: 'Appendices',
    requirement:
      'The study report references the appendices carrying the protocol, sample case report form, and subject data listings.',
    rationale:
      'The appendices carry the material a reviewer needs to verify the report against the source, and their absence blocks that verification.',
    appliesTo: ['CSR'],
    severity: 'MAJOR',
    detect: [/appendi(?:x|ces)/i],
  },

  /* ---------------- Statistical outputs ---------------- */
  {
    id: 'E3-14',
    source: E3('14'),
    title: 'Tables, figures and graphs referred to but not included in the text',
    requirement:
      'The output package presents the tables and figures the report refers to, identified by number.',
    rationale:
      'The report carries the argument; the outputs carry the evidence for it. A reviewer reads them together and cannot check a claim whose table is not there.',
    appliesTo: ['TFL'],
    severity: 'CRITICAL',
    detect: [/\bTable\s+\d+\.\d/i, /\bFigure\s+\d+\.\d/i],
  },
  {
    id: 'E3-16.2',
    source: E3('16.2'),
    title: 'Subject data listings',
    requirement:
      'The output package includes subject data listings supporting the summary tables.',
    rationale:
      'Listings are how a reviewer traces a summary figure back to the individual subjects behind it.',
    appliesTo: ['TFL'],
    severity: 'MAJOR',
    detect: [/\bListing\s+\d/i, /subject data listing/i],
  },
  {
    id: 'FDA-sdtcg-traceability',
    source: {
      issuer: 'FDA',
      document: 'Study Data Technical Conformance Guide',
    },
    title: 'Traceability from output to source',
    requirement:
      'Each generated output identifies the program and dataset that produced it, and when it was produced.',
    rationale:
      'Traceability from a submitted table back to the program that made it is what allows a reviewer to reproduce the number. An output with no stated source cannot be reproduced, and cannot be defended when the reviewer asks.',
    appliesTo: ['TFL'],
    severity: 'MAJOR',
    detect: [/\bSource:\s*\S+/i, /program:\s*\S+/i],
  },
  {
    id: 'E3-9.7-population-headers',
    source: E3('9.7'),
    title: 'Analysis population stated on each output',
    requirement:
      'Each output states the analysis set it is computed on and the number of subjects in it.',
    rationale:
      'The denominator is what every percentage in the table means. An output that does not state its population leaves every rate on it unverifiable.',
    appliesTo: ['TFL'],
    severity: 'MAJOR',
    detect: [/\(N\s*=\s*\d+\)/i, /analysis set/i],
  },

  /* ---------------- Study-wide: further ICH and FDA ---------------- */
  {
    id: 'E2A-sae-definition',
    source: {
      issuer: 'ICH (adopted by FDA)',
      document:
        'ICH E2A Clinical Safety Data Management: Definitions and Standards for Expedited Reporting',
    },
    title: 'Serious adverse event definition and expedited reporting',
    requirement:
      'The protocol defines a serious adverse event and states the expedited reporting obligation and its timeline.',
    rationale:
      'Expedited reporting timelines are a legal obligation on the sponsor. A protocol that does not state them leaves sites without the instruction they are audited against.',
    appliesTo: ['PROTOCOL'],
    severity: 'CRITICAL',
    detect: [
      /serious adverse event/i,
      /expedited report/i,
      /within \d+ hours of/i,
    ],
  },
  {
    id: 'E10-control-group',
    source: {
      issuer: 'ICH (adopted by FDA)',
      document: 'ICH E10 Choice of Control Group and Related Issues in Clinical Trials',
    },
    title: 'Choice and justification of the control group',
    requirement: 'The protocol states the control and the basis for choosing it.',
    rationale:
      'The control determines what the trial can conclude. A comparison against the wrong control cannot be repaired by analysis.',
    appliesTo: ['PROTOCOL'],
    severity: 'MAJOR',
    detect: [/placebo/i, /reference product/i, /active control/i, /comparator/i],
  },
  {
    id: 'E8R1-critical-to-quality',
    source: {
      issuer: 'ICH (adopted by FDA)',
      document: 'ICH E8(R1) General Considerations for Clinical Studies',
    },
    title: 'Quality by design and critical to quality factors',
    requirement:
      'The protocol identifies the factors critical to the quality of the study and the risk-based approach to managing them.',
    rationale:
      'E8(R1) moved quality upstream into design. A protocol with no identified critical-to-quality factors gives the monitoring plan nothing to prioritise.',
    appliesTo: ['PROTOCOL'],
    severity: 'MINOR',
    detect: [/critical to quality/i, /risk-based/i, /quality by design/i, /risk assessment/i],
  },
  {
    id: 'E17-regional',
    source: {
      issuer: 'ICH (adopted by FDA)',
      document: 'ICH E17 General Principles for Planning and Design of Multi-Regional Clinical Trials',
    },
    title: 'Regional considerations in a multi-regional trial',
    requirement:
      'A trial enrolling across regions states how region is handled in the design and the analysis.',
    rationale:
      'Where a submission relies on a multi-regional trial, the agency asks whether the result holds in its own region. That question is answerable only if region was planned for.',
    appliesTo: ['SAP', 'PROTOCOL'],
    severity: 'MAJOR',
    detect: [/geographic region/i, /by region/i, /multi-?regional/i, /stratified by .{0,40}region/i],
  },
  {
    id: 'E6-5.18-monitoring',
    source: E6('5.18'),
    title: 'Monitoring',
    requirement: 'The protocol or an accompanying plan describes how the trial will be monitored.',
    rationale:
      'Monitoring is the sponsor obligation an inspector tests most directly against the site record.',
    appliesTo: ['PROTOCOL'],
    severity: 'MAJOR',
    detect: [/monitoring plan/i, /\bmonitor(?:ing|ed|s)?\b/i],
  },
  {
    id: 'M4E-ctd',
    source: {
      issuer: 'ICH (adopted by FDA)',
      document: 'ICH M4E(R2) Common Technical Document for the Registration of Pharmaceuticals — Efficacy',
    },
    title: 'Synopsis',
    requirement: 'The study report carries a synopsis summarising the study and its results.',
    rationale:
      'The synopsis is what is read first and what is carried into the clinical overview. Its absence is noticed immediately.',
    appliesTo: ['CSR'],
    severity: 'MAJOR',
    detect: [/\bsynopsis\b/i],
  },

  /* ---------------- IB: ICH E6(R2) section 7 ---------------- */
  {
    id: 'E6-7.3.2',
    source: E6('7.3.2'),
    title: "Investigator's Brochure summary",
    requirement:
      'The brochure contains a summary of the significant physical, chemical, pharmaceutical, pharmacological, toxicological, pharmacokinetic and clinical information available.',
    rationale: 'The summary is what an investigator reads before deciding to enrol a subject.',
    appliesTo: ['IB'],
    severity: 'MAJOR',
    detect: [/\bsummary\b/i],
  },
  {
    id: 'E6-7.3.3',
    source: E6('7.3.3'),
    title: "Investigator's Brochure introduction",
    requirement:
      'The brochure contains an introduction giving the chemical or generic name, active ingredients, class, and the rationale for the research.',
    rationale:
      'The introduction is where an investigator confirms what the product is and why it is being studied.',
    appliesTo: ['IB'],
    severity: 'MINOR',
    detect: [/\bintroduction\b/i],
  },
  {
    id: 'E6-7.3.7',
    source: E6('7.3.7'),
    title: 'Summary of data and guidance for the investigator',
    requirement:
      'The brochure gives the investigator guidance on recognising and treating possible overdose and adverse reactions.',
    rationale:
      'This is the section an investigator uses at the bedside, and the reason the brochure is a required document rather than a courtesy.',
    appliesTo: ['IB'],
    severity: 'MAJOR',
    detect: [/guidance for the investigator/i, /guidance to the investigator/i],
  },
];

/* ------------------------------------------------------------------ */
/* The check                                                           */
/* ------------------------------------------------------------------ */

export type GuidanceCheck = {
  requirement: GuidanceRequirement;
  documentType: DocumentType;
  documentId: string;
  outcome: 'SATISFIED' | 'NOT_LOCATED';
  /** Where the element was found, when it was. */
  citation?: Citation;
};

function citationFor(document: ParsedDocument, sectionIndex: number, snippet: string): Citation {
  const section = document.sections[sectionIndex];
  return {
    documentId: document.id,
    documentType: document.type,
    version: document.version,
    author: document.author,
    sectionId: section.id,
    sectionHeading: section.heading,
    printedPage: section.printedPage,
    pdfPage: section.pdfPage,
    paragraphId: section.paragraphs[0]?.id ?? section.id,
    snippet,
  };
}

/**
 * Sections that cite other documents rather than saying anything themselves.
 *
 * A bibliography naming "ICH E9(R1) Addendum on Estimands" is not a document
 * that defines an estimand, and a table of contents lists every heading whether
 * or not the section under it has content. Counting either as evidence turns
 * this check into one that can only ever pass.
 */
const NON_EVIDENTIAL = /^(REFERENCES?|BIBLIOGRAPHY|TABLE OF CONTENTS|LIST OF (?:TABLES|FIGURES|ABBREVIATIONS))\b/i;

/**
 * Searches headings first, then paragraph text. A heading match is the better
 * evidence — the document has a section for the element rather than a passing
 * mention of the word — so it is preferred when both are present.
 */
function locate(
  document: ParsedDocument,
  patterns: RegExp[],
): { citation: Citation } | null {
  const evidential = document.sections
    .map((section, index) => ({ section, index }))
    .filter(({ section }) => !NON_EVIDENTIAL.test(section.heading));

  for (const { section, index } of evidential) {
    if (patterns.some((pattern) => pattern.test(section.heading))) {
      return { citation: citationFor(document, index, `§${section.id} ${section.heading}`) };
    }
  }

  for (const { section, index } of evidential) {
    for (const paragraph of section.paragraphs) {
      for (const pattern of patterns) {
        const match = paragraph.text.match(pattern);
        if (!match) continue;
        const start = Math.max(0, (match.index ?? 0) - 90);
        const snippet = paragraph.text.slice(start, start + 260).trim();
        return {
          citation: {
            ...citationFor(document, index, start > 0 ? `…${snippet}…` : `${snippet}…`),
            paragraphId: paragraph.id,
            printedPage: paragraph.printedPage,
            pdfPage: paragraph.pdfPage,
          },
        };
      }
    }
  }

  return null;
}

export function checkGuidance(documents: ParsedDocument[]): GuidanceCheck[] {
  const checks: GuidanceCheck[] = [];

  for (const document of documents) {
    for (const requirement of REQUIREMENTS) {
      if (!requirement.appliesTo.includes(document.type)) continue;
      const found = locate(document, requirement.detect);
      checks.push({
        requirement,
        documentType: document.type,
        documentId: document.id,
        outcome: found ? 'SATISFIED' : 'NOT_LOCATED',
        citation: found?.citation,
      });
    }
  }

  return checks;
}
