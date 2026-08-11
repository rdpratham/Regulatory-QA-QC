import type { AuthoredDocument } from './types';
import { STUDY } from './types';

/**
 * CB207-C301 Clinical Study Protocol v2.0.
 *
 * Carries the pre-amendment values the SAP diverges from: the 95% confidence
 * interval for the ratio, the original Pharmacokinetic Set definition, and the
 * ECOG eligibility range.
 */
export const PROTOCOL: AuthoredDocument = {
  id: 'DOC-PROT-C301',
  type: 'PROTOCOL',
  fileName: 'protocol.pdf',
  title: `Clinical Study Protocol — Study ${STUDY.protocolNumber}`,
  shortTitle: `Protocol ${STUDY.protocolNumber}`,
  version: 'v2.0',
  effectiveDate: '2023-11-08',
  author: STUDY.sponsor,

  frontLeaves: [
    {
      id: 'COVER',
      heading: 'CLINICAL STUDY PROTOCOL',
      blocks: [
        { kind: 'para', text: STUDY.title },
        { kind: 'para', text: `Protocol Number: ${STUDY.protocolNumber}    Version 2.0    08 November 2023` },
        { kind: 'para', text: `Sponsor: ${STUDY.sponsor}` },
        { kind: 'para', text: 'CONFIDENTIAL' },
      ],
    },
    {
      id: 'SIGNATURE',
      heading: 'SPONSOR SIGNATURE PAGE',
      blocks: [
        { kind: 'para', text: 'The sponsor representatives below confirm approval of this protocol.' },
        { kind: 'para', text: 'Sponsor Medical Monitor' },
        { kind: 'redaction' },
        { kind: 'para', text: 'Sponsor Head of Biostatistics' },
        { kind: 'redaction' },
      ],
    },
  ],

  sections: [
    {
      id: '1',
      heading: 'PROTOCOL SYNOPSIS',
      blocks: [
        {
          kind: 'para',
          text: `Study ${STUDY.protocolNumber} is a randomised, double-blind, parallel-group, multicentre study comparing ${STUDY.product} with ${STUDY.reference} in subjects with ${STUDY.indication} receiving neoadjuvant therapy followed by definitive surgery and adjuvant therapy.`,
        },
        {
          kind: 'para',
          text: 'A total of 752 subjects will be randomised in a 1:1 ratio to receive CB-207 or the reference product, each administered in combination with the same chemotherapy backbone. Randomisation is stratified by hormone receptor status, clinical stage, and geographic region.',
        },
        {
          kind: 'para',
          text: 'The primary endpoint is the breast pathological complete response rate at the time of definitive surgery, determined by central pathology review.',
        },
      ],
    },
    {
      id: '2',
      heading: 'BACKGROUND AND RATIONALE',
      blocks: [
        {
          kind: 'para',
          text: `${STUDY.product} is a proposed biosimilar to the reference HER2-directed monoclonal antibody. Analytical and non-clinical comparability have been established. This study is designed to confirm clinical equivalence in a sensitive population.`,
        },
        {
          kind: 'para',
          text: 'The neoadjuvant setting is selected because the pathological complete response rate is a sensitive and objectively measured endpoint for the detection of differences in efficacy between a proposed biosimilar and its reference product.',
        },
      ],
    },
    {
      id: '3',
      heading: 'STUDY OBJECTIVES',
      blocks: [
        {
          kind: 'para',
          text: 'The primary objective is to demonstrate equivalence of CB-207 and the reference product in terms of the breast pathological complete response rate. Secondary objectives address total pathological complete response, clinical response, safety, pharmacokinetics, and immunogenicity.',
        },
      ],
    },
    {
      id: '4',
      heading: 'STUDY DESIGN',
      blocks: [
        {
          kind: 'para',
          text: 'Following a screening period of up to 28 days, eligible subjects will be randomised and will receive eight cycles of neoadjuvant study treatment at 21-day intervals, undergo definitive surgery, and receive ten cycles of adjuvant study treatment.',
        },
        {
          kind: 'para',
          text: 'A visit window tolerance of +/- 3 days is permitted for all on-treatment visits. Visits conducted outside this tolerance are protocol deviations and must be reported to the sponsor within five business days.',
        },
      ],
    },
    {
      id: '5',
      heading: 'ELIGIBILITY CRITERIA',
      blocks: [
        {
          kind: 'para',
          text: 'Subjects must be women aged at least 18 years with histologically confirmed, HER2-positive, non-metastatic invasive breast cancer with a primary tumour of at least 2 cm in diameter.',
        },
        {
          kind: 'para',
          text: 'Eligible subjects must have an Eastern Cooperative Oncology Group (ECOG) performance status of 0 or 1 at the screening visit.',
        },
        {
          kind: 'para',
          text: 'Adequate cardiac function is required, defined as a baseline left ventricular ejection fraction of at least 55% measured by echocardiography or multigated acquisition scan.',
        },
        {
          kind: 'para',
          text: 'Adequate renal function is required, defined as a creatinine clearance >= 50 mL/min calculated using the Cockcroft-Gault formula.',
        },
      ],
    },
    {
      id: '6',
      heading: 'STUDY TREATMENT',
      blocks: [
        {
          kind: 'para',
          text: 'CB-207 or the reference product will be administered as an intravenous infusion at a loading dose of 8 mg/kg followed by a maintenance dose of 6 mg/kg every 21 days. The chemotherapy backbone comprises docetaxel 75 mg/m2 and cyclophosphamide 600 mg/m2, each administered every 21 days.',
        },
        {
          kind: 'para',
          text: 'Dose reductions of study treatment are not permitted. Dose reductions of the chemotherapy backbone are permitted in accordance with the dose modification guidance in Section 7.',
        },
      ],
    },
    {
      id: '7',
      heading: 'DOSE MODIFICATION',
      blocks: [
        {
          kind: 'para',
          text: 'Study treatment must be interrupted for any adverse event of Grade 3 or higher considered related to study treatment, and may resume once the event has resolved to Grade 1 or baseline. An interruption exceeding 42 days requires permanent discontinuation.',
        },
      ],
    },
    {
      id: '8',
      heading: 'SCHEDULE OF ASSESSMENTS',
      blocks: [
        {
          kind: 'para',
          text: 'The day on which the subject receives the first dose of study treatment is designated Study Day 1. All subsequent visit windows are calculated relative to Study Day 1.',
        },
        {
          kind: 'para',
          text: 'An echocardiogram for the determination of left ventricular ejection fraction will be obtained at screening for all subjects.',
        },
        {
          kind: 'para',
          text: 'A repeat determination of left ventricular ejection fraction is required at Cycle 9 Day 1, prior to the first adjuvant administration of study treatment.',
        },
        {
          kind: 'para',
          text: 'A twelve-lead electrocardiogram will be obtained at screening and repeated at the end-of-treatment visit.',
        },
      ],
    },
    {
      id: '9',
      heading: 'EFFICACY ASSESSMENTS',
      blocks: [
        {
          kind: 'para',
          text: 'Pathological response will be determined by central review of the resected specimen. Clinical response will be assessed by the investigator at each scheduled visit during the neoadjuvant period.',
        },
      ],
    },
    {
      id: '10',
      heading: 'SAFETY ASSESSMENTS',
      blocks: [
        {
          kind: 'para',
          text: 'Adverse events will be graded using the Common Terminology Criteria for Adverse Events version 4.0. Adverse events of special interest are cardiac dysfunction, infusion-related reactions, and febrile neutropenia.',
        },
        {
          kind: 'para',
          text: 'All subjects will complete a safety follow-up assessment 30 days after the last dose of study treatment.',
        },
      ],
    },
    {
      id: '11',
      heading: 'PHARMACOKINETIC ASSESSMENTS',
      blocks: [
        {
          kind: 'para',
          text: 'A subset of subjects will undergo intensive pharmacokinetic sampling. The Pharmacokinetic population comprises all subjects who complete all eight neoadjuvant cycles of study treatment and for whom a complete concentration-time profile is available in the cycle designated for intensive sampling.',
        },
      ],
    },
    {
      id: '12',
      heading: 'IMMUNOGENICITY ASSESSMENTS',
      blocks: [
        {
          kind: 'para',
          text: 'Serum samples for the determination of anti-drug antibodies will be collected at baseline, at Cycle 5, at surgery, and at the end-of-study visit.',
        },
      ],
    },
    {
      id: '13',
      heading: 'STATISTICAL CONSIDERATIONS',
      blocks: [
        {
          kind: 'para',
          text: 'A total of 752 subjects will be randomised. Assuming a breast pathological complete response rate of 40.5% in both groups, 331 evaluable subjects per group provide 80% power at a two-sided significance level of 0.05.',
        },
        {
          kind: 'para',
          text: 'Equivalence will be concluded if the two-sided 95% confidence interval for the difference in breast pathological complete response rates lies entirely within [-12%, 12%].',
        },
        {
          kind: 'para',
          text: 'For the assessment based on the ratio of response rates, equivalence will be concluded if the two-sided 95% confidence interval for the ratio lies entirely within [0.760, 1.510].',
        },
      ],
    },
    {
      id: '14',
      heading: 'ANALYSIS POPULATIONS',
      blocks: [
        {
          kind: 'para',
          text: 'The Full Analysis Set comprises all randomised subjects. The Per-Protocol Set comprises all subjects in the Full Analysis Set without an important protocol deviation affecting the primary endpoint. The Safety Set comprises all subjects who received at least one dose of study treatment.',
        },
      ],
    },
    {
      id: '15',
      heading: 'DATA QUALITY ASSURANCE',
      blocks: [
        {
          kind: 'para',
          text: 'Study data will be captured in a validated electronic data capture system. Every assessment specified as required in this protocol must have a corresponding field in the case report form, and the case report form specification must be reconciled against this protocol prior to first subject enrolment.',
        },
      ],
    },
    {
      id: '16',
      heading: 'ETHICS AND REGULATORY CONSIDERATIONS',
      blocks: [
        {
          kind: 'para',
          text: 'The study will be conducted in accordance with the Declaration of Helsinki and ICH E6(R2). Written informed consent will be obtained from every subject prior to any study-specific procedure.',
        },
      ],
    },
  ],
};
