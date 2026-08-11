import type { AuthoredDocument } from './types';
import { STUDY } from './types';

/**
 * CB207-C301 Clinical Study Report — Summary of Results, v1.0.
 *
 * This is the document that turns the SAP's pre-specification into a testable
 * claim. It reports what actually happened: the enrolled total against the
 * planned total, and the two observed confidence intervals against the two
 * pre-specified acceptance criteria — which return opposite verdicts.
 */
export const CSR: AuthoredDocument = {
  id: 'DOC-CSR-C301',
  type: 'CSR',
  fileName: 'csr.pdf',
  title: `Clinical Study Report, Summary of Results — Study ${STUDY.protocolNumber}`,
  shortTitle: `CSR ${STUDY.protocolNumber}`,
  version: 'v1.0',
  effectiveDate: '2025-07-18',
  author: `${STUDY.biometricsCro} (Biometrics) for ${STUDY.sponsor}`,

  frontLeaves: [
    {
      id: 'COVER',
      heading: 'CLINICAL STUDY REPORT — SUMMARY OF RESULTS',
      blocks: [
        { kind: 'para', text: `Study ${STUDY.protocolNumber} — ${STUDY.sponsor}` },
        { kind: 'para', text: 'Version 1.0    18 July 2025' },
        { kind: 'para', text: `Prepared by ${STUDY.biometricsCro}` },
      ],
    },
    {
      id: 'SIGNATURE',
      heading: 'APPROVAL',
      blocks: [
        { kind: 'para', text: 'Sponsor Head of Clinical Development' },
        { kind: 'redaction' },
      ],
    },
  ],

  sections: [
    {
      id: '1',
      heading: 'SYNOPSIS',
      blocks: [
        {
          kind: 'para',
          text: `Study ${STUDY.protocolNumber} was a randomised, double-blind, parallel-group, multicentre study comparing CB-207 with the reference product in the neoadjuvant treatment of HER2-positive early breast cancer. The study was conducted at 148 sites in 21 countries between February 2022 and March 2025.`,
        },
      ],
    },
    {
      id: '2',
      heading: 'SUBJECT DISPOSITION',
      blocks: [
        {
          kind: 'para',
          text: 'A total of 811 subjects were randomised, of whom 406 were assigned to CB-207 and 405 to the reference product. Enrolment completed in November 2023.',
        },
        {
          kind: 'para',
          text: 'Of the randomised subjects, 803 subjects received at least one dose of study treatment and constituted the Safety Set. The Per-Protocol Set comprised 744 subjects, 374 in the CB-207 group and 370 in the reference product group.',
        },
        {
          kind: 'para',
          text: 'Nine subjects enrolled at two sites in Ukraine were excluded from the Per-Protocol Set in accordance with the analysis plan.',
        },
      ],
    },
    {
      id: '3',
      heading: 'DEMOGRAPHICS AND BASELINE CHARACTERISTICS',
      blocks: [
        {
          kind: 'para',
          text: 'Demographic and baseline characteristics were balanced between treatment groups. Median age was 51 years and hormone receptor positive disease was documented in 58% of randomised subjects.',
        },
      ],
    },
    {
      id: '4',
      heading: 'PRIMARY EFFICACY RESULT',
      blocks: [
        {
          kind: 'para',
          text: 'In the Per-Protocol Set, the breast pathological complete response rate was 49.8% in the CB-207 group and 41.3% in the reference product group.',
        },
        {
          kind: 'para',
          text: 'The observed ratio of breast pathological complete response rates was 1.206 with a two-sided 90% confidence interval of 1.068 to 1.362.',
        },
        {
          kind: 'para',
          text: 'The observed difference in breast pathological complete response rates was 8.50% with a two-sided 95% confidence interval of 1.93 to 15.07.',
        },
      ],
    },
    {
      id: '5',
      heading: 'EQUIVALENCE ASSESSMENT',
      blocks: [
        {
          kind: 'para',
          text: 'The equivalence assessment was performed against the two acceptance criteria pre-specified in the statistical analysis plan. The outcome of each assessment is reported in Section 4 and discussed in Section 9.',
        },
      ],
    },
    {
      id: '6',
      heading: 'SECONDARY EFFICACY RESULTS',
      blocks: [
        {
          kind: 'para',
          text: 'The total pathological complete response rate was 43.6% in the CB-207 group and 36.8% in the reference product group. Overall clinical response rates were comparable between groups.',
        },
      ],
    },
    {
      id: '7',
      heading: 'SAFETY RESULTS',
      blocks: [
        {
          kind: 'para',
          text: 'Adverse events were graded using the Common Terminology Criteria for Adverse Events version 4.0. Treatment-emergent adverse events of any grade were reported in 94% of subjects in each treatment group.',
        },
        {
          kind: 'para',
          text: 'Asymptomatic decreases in left ventricular ejection fraction were reported in 4.1% of subjects in the CB-207 group and 3.8% in the reference product group.',
        },
        {
          kind: 'para',
          text: 'All subjects who received study treatment were scheduled for a safety follow-up assessment 30 days after the last dose of study treatment.',
        },
      ],
    },
    {
      id: '8',
      heading: 'IMMUNOGENICITY RESULTS',
      blocks: [
        {
          kind: 'para',
          text: 'Treatment-emergent anti-drug antibodies were detected in 1.2% of subjects in the CB-207 group and 1.5% in the reference product group. No neutralising antibody was associated with loss of response.',
        },
      ],
    },
    {
      id: '9',
      heading: 'DISCUSSION AND CONCLUSIONS',
      blocks: [
        {
          kind: 'para',
          text: 'The study enrolled more subjects than the number planned in the analysis plan. The primary analysis was performed as pre-specified and the observed treatment effect was consistent across the pre-specified subgroups.',
        },
        {
          kind: 'para',
          text: 'The safety and immunogenicity profiles of CB-207 and the reference product were comparable. The sponsor considers the totality of evidence to support biosimilarity.',
        },
      ],
    },
  ],
};
