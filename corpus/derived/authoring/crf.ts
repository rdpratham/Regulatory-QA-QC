import type { AuthoredDocument } from './types';
import { STUDY } from './types';

/**
 * CB207-C301 Case Report Form specification v3.1, authored by the data
 * management CRO against protocol v1.0. It is the document that carries the
 * eCRF page names the SAP quotes, and the document that quietly omits a
 * protocol-required assessment.
 */
export const CRF: AuthoredDocument = {
  id: 'DOC-CRF-C301',
  type: 'CRF',
  fileName: 'crf.pdf',
  title: `Case Report Form Specification and Completion Guidelines — Study ${STUDY.protocolNumber}`,
  shortTitle: `CRF ${STUDY.protocolNumber}`,
  version: 'v3.1',
  effectiveDate: '2023-06-30',
  author: `${STUDY.dataManagementCro} — Data Management`,

  frontLeaves: [
    {
      id: 'COVER',
      heading: 'CASE REPORT FORM SPECIFICATION',
      blocks: [
        { kind: 'para', text: `Study ${STUDY.protocolNumber} — ${STUDY.sponsor}` },
        { kind: 'para', text: 'Version 3.1    30 June 2023' },
        { kind: 'para', text: `Prepared by ${STUDY.dataManagementCro}` },
      ],
    },
  ],

  sections: [
    {
      id: '1',
      heading: 'PURPOSE AND CONVENTIONS',
      blocks: [
        {
          kind: 'para',
          text: 'This document specifies the electronic case report form for the study and provides completion guidance for site personnel. Each page is identified by a page name and each field by a page-prefixed field code.',
        },
        {
          kind: 'para',
          text: 'Fields marked as required must be completed before a page can be marked complete. Fields left intentionally blank require selection of a coded not-done reason.',
        },
      ],
    },
    {
      id: '2',
      heading: 'INFORMED CONSENT PAGE',
      blocks: [
        {
          kind: 'para',
          text: 'The Informed Consent page records the date on which written consent was obtained and the version of the consent document signed. The consent date must precede any study-specific assessment.',
        },
      ],
    },
    {
      id: '3',
      heading: 'ELIGIBILITY PAGE',
      blocks: [
        {
          kind: 'para',
          text: 'The Eligibility page records investigator confirmation of each inclusion and exclusion criterion as a discrete yes or no field.',
        },
        {
          kind: 'para',
          text: 'Field ELIG-06 captures the ECOG performance status assessed at the screening visit, entered as a single-select field where the permitted responses are 0 and 1.',
        },
        {
          kind: 'para',
          text: 'Field ELIG-11 captures the calculated creatinine clearance in mL/min together with the serum creatinine value and the collection date used in the calculation.',
        },
      ],
    },
    {
      id: '4',
      heading: 'DISEASE STAGE PAGE',
      blocks: [
        {
          kind: 'para',
          text: 'The Disease Stage page captures clinical tumour and nodal stage at screening, hormone receptor status for oestrogen receptor and progesterone receptor, and the central HER2 assay result.',
        },
      ],
    },
    {
      id: '5',
      heading: 'VISIT SCHEDULE MODULE',
      blocks: [
        {
          kind: 'para',
          text: 'The Visit Schedule module defines the visit structure. The visit at which the subject receives the first dose of study treatment is recorded as Day 1.',
        },
        {
          kind: 'para',
          text: 'On-treatment visits are scheduled at 21-day intervals. The system permits a visit window tolerance of +/- 5 days before a visit is flagged as out of window on the data review listing.',
        },
      ],
    },
    {
      id: '6',
      heading: 'IP INFUSION PAGE',
      blocks: [
        {
          kind: 'para',
          text: 'The IP Infusion page records each administration of study treatment, including the planned dose, the administered dose, the infusion start and stop times, and any interruption.',
        },
        {
          kind: 'para',
          text: 'The Non-IP Infusion page records administration of the chemotherapy backbone using the same field structure. The two pages are distinct and must not be used interchangeably.',
        },
      ],
    },
    {
      id: '7',
      heading: 'PHYSICAL EXAMINATION PAGE',
      blocks: [
        {
          kind: 'para',
          text: 'The Physical Examination page records height, weight, and the body system examination outcome at each scheduled visit. Screening values are recorded on the Physical Exam- Screening page.',
        },
      ],
    },
    {
      id: '8',
      heading: 'ECHOCARDIOGRAM PAGE',
      blocks: [
        {
          kind: 'para',
          text: 'The Echocardiogram page captures the left ventricular ejection fraction determined at screening, the imaging modality, and the investigator interpretation.',
        },
        {
          kind: 'para',
          text: 'A clinically significant decrease requires completion of the cardiac abnormality detail fields and the corresponding adverse event record.',
        },
      ],
    },
    {
      id: '9',
      heading: 'ELECTROCARDIOGRAM PAGE',
      blocks: [
        {
          kind: 'para',
          text: 'The Electrocardiogram page captures the twelve-lead electrocardiogram obtained at screening and the twelve-lead electrocardiogram obtained at the end-of-treatment visit, including heart rate and the corrected QT interval.',
        },
      ],
    },
    {
      id: '10',
      heading: 'PATHOLOGICAL COMPLETE RESPONSE PAGE',
      blocks: [
        {
          kind: 'para',
          text: 'The Pathological Complete Response page captures the central pathology determination of residual invasive disease in the breast specimen and in sampled regional lymph nodes at the time of definitive surgery.',
        },
      ],
    },
    {
      id: '11',
      heading: 'CLINICAL RESPONSE PAGE',
      blocks: [
        {
          kind: 'para',
          text: 'The Clinical Response page captures the investigator assessment of overall clinical response at each scheduled assessment during the neoadjuvant period.',
        },
      ],
    },
    {
      id: '12',
      heading: 'ADVERSE EVENT PAGE',
      blocks: [
        {
          kind: 'para',
          text: 'The Adverse Event page captures one event per record, including the verbatim term, onset date, resolution date, outcome, action taken with study treatment, and investigator causality assessment.',
        },
        {
          kind: 'para',
          text: 'Severity is recorded as the maximum grade attained during the event and is graded according to the Common Terminology Criteria for Adverse Events version 4.0.',
        },
      ],
    },
    {
      id: '13',
      heading: 'PROTOCOL DEVIATION PAGE',
      blocks: [
        {
          kind: 'para',
          text: 'The Protocol Deviation page captures the deviation category, the date identified, and the free-text description. Importance is assigned by the sponsor and is not editable at the site.',
        },
      ],
    },
    {
      id: '14',
      heading: 'END OF STUDY PAGE',
      blocks: [
        {
          kind: 'para',
          text: 'The End of Study (EOS) page records the subject end-of-study status and date. The safety follow-up assessment captured on this page is completed 28 days after the last dose of study treatment.',
        },
      ],
    },
    {
      id: '15',
      heading: 'EDIT CHECK SPECIFICATION SUMMARY',
      blocks: [
        {
          kind: 'para',
          text: 'Hard edit checks prevent page completion until resolved and are reserved for values that are not clinically possible. Soft edit checks raise a query for site confirmation.',
        },
        {
          kind: 'para',
          text: 'Cross-page edit checks include date sequence validation between consent, screening, randomisation, and first dose.',
        },
      ],
    },
  ],
};
