import type { AuthoredDocument } from './types';
import { STUDY } from './types';

/**
 * CB207-C301 Statistical Analysis Plan v1.0 — derived demonstration corpus.
 *
 * Structure, prose register, and failure modes are modelled on a real Phase III
 * biosimilar SAP released through a public clinical-information portal. Every
 * sponsor name, molecule, site, number, and sentence here is invented. See
 * corpus/source/README.md for why the derived-not-displayed split exists.
 *
 * Planted items are labelled with their ANSWER_KEY id in a trailing comment so
 * that editing this file and re-running `npm run corpus` stays traceable.
 */
export const SAP: AuthoredDocument = {
  id: 'DOC-SAP-C301',
  type: 'SAP',
  fileName: 'sap.pdf',
  title: `Statistical Analysis Plan — Study ${STUDY.protocolNumber}`,
  shortTitle: `SAP ${STUDY.protocolNumber}`,
  version: 'v1.0',
  effectiveDate: '2024-09-12',
  author: `${STUDY.biometricsCro} (Biometrics) for ${STUDY.sponsor}`,

  frontLeaves: [
    {
      id: 'COVER',
      heading: 'STATISTICAL ANALYSIS PLAN',
      blocks: [
        { kind: 'para', text: STUDY.title },
        { kind: 'para', text: `Protocol Number: ${STUDY.protocolNumber}` },
        { kind: 'para', text: `Sponsor: ${STUDY.sponsor}, 4400 Harbour Point Parkway, Cambridge, MA 02142, United States` },
        { kind: 'para', text: `Prepared by: ${STUDY.biometricsCro}, Biometrics Department` },
        { kind: 'para', text: 'Version: 1.0            Date: 12 September 2024' },
        { kind: 'para', text: 'CONFIDENTIAL — This document contains proprietary information and is provided for the conduct of the above study only.' },
      ],
    },
    {
      id: 'APPROVAL',
      heading: 'APPROVAL PAGE',
      blocks: [
        { kind: 'para', text: 'By signing below, the undersigned confirm that they have reviewed this Statistical Analysis Plan and that it is consistent with the clinical study protocol.' },
        { kind: 'para', text: 'Owend by: Biometrics Department, Halcyon Clinical Research Organization' }, // H-typo
        { kind: 'para', text: 'Lead Statistician' },
        { kind: 'redaction' },
        { kind: 'para', text: 'Sponsor Biostatistics Representative' },
        { kind: 'redaction' },
        { kind: 'para', text: 'Sponsor Clinical Representative' },
        { kind: 'redaction' },
      ],
    },
  ],

  sections: [
    /* ---------------------------------------------------------------- */
    {
      id: 'MODIFICATION HISTORY',
      heading: 'MODIFICATION HISTORY',
      blocks: [
        {
          kind: 'table',
          caption: 'Table 1. Modification history of this Statistical Analysis Plan',
          columns: ['Version', 'Date', 'Summary of change'],
          rows: [
            ['0.1', '04 Jan 2024', 'First draft prepared from protocol version 2.0.'],
            ['0.2', '29 Jan 2024', 'Comments from sponsor biostatistics incorporated. Section 7 tables restructured.'],
            ['0.3', '18 Feb 2024', 'Primary equivalence assessment for the ratio of response rates changed from a 95% confidence interval to a 90% confidence interval, replacing the interval specified in the protocol. Agreed with sponsor 14 Feb 2024.'], // B1
            ['0.4', '11 Mar 2024', 'Grading and deviation conventions moved to appendix 4: CTC Grading and appendix 5: Protocol deviation definition.'], // D2 (they are Appendices 6 and 7 in v1.0)
            ['0.5', '02 Apr 2024', 'Pharmacokinetic analysis set definition revised following sponsor clinical pharmacology review.'], // B2
            ['0.6', '27 May 2024', 'Nine subjects enrolled at two sites in Ukraine excluded from the Per-Protocol Set following the sponsor decision of 20 May 2024 regarding site data reliability.'], // B3
            ['0.7', '19 Jun 2024', 'Immunogenicity summaries expanded. Section 14 restructured.'],
            ['0.8', '30 Jul 2024', 'Editorial revision throughout. Appendices renumbered following insertion of the visit-name appendix.'],
            ['0.9', '26 Aug 2024', 'Sponsor quality review comments incorporated.'],
            ['1.0', '12 Sep 2024', 'Final version. No analytical changes from version 0.9.'],
          ],
        },
      ],
    },

    /* ---------------------------------------------------------------- */
    {
      id: 'TABLE OF CONTENTS',
      heading: 'TABLE OF CONTENTS',
      pageBreak: true,
      blocks: [
        {
          kind: 'bullets',
          items: [
            '1  INTRODUCTION',
            '2  STUDY OBJECTIVES AND DESIGN',
            '2.1  Study Objectives',
            '2.2  Study Endpoints',
            '2.3  Sample Size and Power',
            '3  ANALYSIS SETS AND GENERAL CONVENTIONS',
            '3.1  Analysis Sets',
            '3.2  Protocol Deviations',
            '3.3  General Statistical Conventions',
            '4  INTERIM ANALYSIS AND DATA MONITORING',
            '5  PRIMARY EFFICACY ASSESSMENT',
            '5.1  Statistical Hypotheses',
            '5.2  Subject Disposition',
            '5.5  Equivalence Acceptance Criteria',
            '6  STUDY COMPLETION AND DISCONTINUATION',
            '7  DEMOGRAPHICS AND BASELINE CHARACTERISTICS',
            '8  MEDICAL HISTORY',
            '9  PRIOR AND CONCOMITANT MEDICATIONS',
            '10  STUDY TREATMENT',
            '10.1  Extent of Exposure',
            '10.2  Dose Intensity',
            '11  EFFICACY ANALYSES',
            '11.1  Primary Endpoint',
            '11.2  Analysis of the Primary Endpoint',
            '11.2.2  Analysis in the Full Analysis Set',
            '11.2.3  Equivalence Assessment of the Ratio',
            '11.2.4  Sensitive Analysis',
            '11.2.5  Additional Analyses of the Primary Endpoint',
            '11.3  Secondary Efficacy Endpoints',
            '11.3.1  Clinical Response and Surgical Outcome',
            '12  SAFETY ANALYSES',
            '12.1  Adverse Events',
            '12.2  Deaths and Serious Adverse Events',
            '12.4  Cardiac and Laboratory Assessments',
            '13  PHARMACOKINETIC ANALYSES',
            '14  IMMUNOGENICITY ANALYSES',
            '15  CHANGES FROM PROTOCOL-SPECIFIED ANALYSES',
            '16  PROGRAMMING CONSIDERATIONS',
            '17  REFERENCES',
            'APPENDIX 1  VISIT NAME',
            'APPENDIX 2  HANDLING OF PARTIAL AND MISSING DATES',
            'APPENDIX 3  ANALYSIS CODE FOR THE PRIMARY ENDPOINT',
            'APPENDIX 4  ANALYSIS CODE FOR THE SENSITIVITY ANALYSIS',
            'APPENDIX 5  ANALYSIS CODE FOR THE PHARMACOKINETIC ENDPOINTS',
            'APPENDIX 6  CTC GRADING PARAMTERS', // H-typo, mirrors source
            'APPENDIX 7  PROTOCOL DEVIATION DEFINITION',
            'APPENDIX 8  ADDITONAL ANALYSES', // H-typo
            'APPENDIX 9  DERIVATION REFERENCES',
          ],
        },
      ],
    },

    /* ---------------------------------------------------------------- */
    {
      id: 'ABBREVIATIONS',
      heading: 'ABBREVIATIONS AND DEFINITIONS OF TERMS',
      pageBreak: true,
      blocks: [
        {
          kind: 'table',
          caption: 'Table 2. Abbreviations used in this plan',
          columns: ['Abbreviation', 'Definition'],
          rows: [
            ['ADA', 'Anti-drug antibody'],
            ['AE', 'Adverse event'],
            ['ATCC', 'Anatomical Therapeutic Chemical classification'], // E4 — standard acronym is ATC
            ['bpCR', 'Breast pathologic complete response'],
            ['CI', 'Confidence interval'],
            ['CRDAT', 'Clinical Response data page'],
            ['CTC', 'Common Terminology Criteria for Adverse Events'],
            ['ECOG', 'Eastern Cooperative Oncology Group'],
            ['EOS', 'End of Study'],
            ['FAS', 'Full Analysis Set'],
            ['IP', 'Investigational product'],
            ['LVEF', 'Left ventricular ejection fraction'],
            ['MedDRA', 'Medical Dictionary for Regulatory Activities'],
            ['PD', 'Progression of disease'], // E3
            ['PDs', 'Protocol deviations'], // E3
            ['pCR', 'Pathologic complete response'], // E6
            ['PKS', 'Pharmacokinetic Set'],
            ['PPS', 'Per-Protocol Set'],
            ['PR', 'Progesterone receptor'], // E2
            ['PR', 'Partial response'], // E2
            ['RP', 'Reference product'],
            ['SAF', 'Safety Set'],
            ['TEAE', 'Treatment-emergent adverse event'],
            ['tpCR', 'Total pathologic complete response'],
          ],
        },
      ],
    },

    /* ---------------------------------------------------------------- */
    {
      id: '1',
      heading: 'INTRODUCTION',
      pageBreak: true,
      blocks: [
        {
          kind: 'para',
          text: `This Statistical Analysis Plan describes the statistical methods to be applied to data collected in study ${STUDY.protocolNumber}, a randomised, double-blind, parallel-group, multicentre study comparing ${STUDY.product} with ${STUDY.reference} in subjects with ${STUDY.indication} receiving neoadjuvant therapy. The plan expands upon the statistical considerations described in the clinical study protocol and, in respect of analytical detail, takes precedence over it.`,
        },
        {
          kind: 'para',
          text: `This plan has been prepared by ${STUDY.biometricsCro} on behalf of ${STUDY.sponsor} and will be finalised prior to unblinding of treatment assignment. Data management activities are conducted by ${STUDY.dataManagementCro}. Any deviation from the analyses specified in this plan will be described together with its rationale in the clinical study report.`,
        },
      ],
    },

    /* ---------------------------------------------------------------- */
    {
      id: '2',
      heading: 'STUDY OBJECTIVES AND DESIGN',
      blocks: [
        {
          kind: 'para',
          text: 'The study consists of a neoadjuvant period of eight cycles administered prior to surgery, followed by an adjuvant period of ten cycles administered after surgery, and a follow-up period extending to the end-of-study visit.',
        },
      ],
    },
    {
      id: '2.1',
      heading: 'Study Objectives',
      blocks: [
        {
          kind: 'para',
          text: `The primary objective is to demonstrate equivalence of ${STUDY.product} and ${STUDY.reference} in terms of the breast pathologic complete response rate at the time of definitive surgery in subjects with ${STUDY.indication}.`,
        },
        {
          kind: 'para',
          text: 'Secondary objectives are to compare the total pathologic complete response rate, the overall clinical response rate, event-free survival, safety and tolerability, pharmacokinetics, and immunogenicity between the two treatment groups.',
        },
      ],
    },
    {
      id: '2.2',
      heading: 'Study Endpoints',
      blocks: [
        {
          kind: 'para',
          text: 'The primary endpoint is the breast pathological complete response rate, defined as the proportion of subjects in the analysis set with no evidence of invasive tumour cells in the resected breast specimen at the time of definitive surgery, irrespective of nodal involvement.', // E6 "pathological" vs abbreviation list "Pathologic"
        },
        {
          kind: 'para',
          text: 'The key secondary endpoint is the total pathological complete response rate, defined as the absence of invasive tumour cells in the resected breast specimen and in all sampled regional lymph nodes.',
        },
      ],
    },
    {
      id: '2.3',
      heading: 'Sample Size and Power',
      blocks: [
        {
          kind: 'para',
          text: 'The sample size is derived to demonstrate equivalence in the breast pathological complete response rate. Based on there neoadjuvant studies of the reference product, the response rate in both treatment groups is assumed to be 40.5%.', // H-typo "there neoadjuvant studies"
        },
        {
          kind: 'para',
          text: 'The equivalence margin for the difference in response rates is derived as 80% of the lower bound of the estimated treatment effect of the reference product. The estimated effect is 15.2% and the resulting margin is therefore 12%, applied symmetrically as [-12%, 12%].', // A5 — 15.2 x 0.8 = 12.16
        },
        {
          kind: 'para',
          text: 'Under these assumptions, 331 evaluable subjects per treatment group provide 80% power to demonstrate equivalence at a two-sided significance level of 0.05.', // A3, A6
        },
        {
          kind: 'para',
          text: 'Allowing for a dropout rate of 12% between randomisation and the assessment of the primary endpoint, 376 subjects per treatment group are required. A total of 752 subjects will therefore be randomised in a 1:1 ratio.', // A1, A3
        },
        {
          kind: 'para',
          text: 'A subset of subjects will contribute to the pharmacokinetic comparison. Forty-eight subjects per treatment group provide 90% power to demonstrate equivalence of the primary pharmacokinetic endpoint within the standard bioequivalence limits.', // A6 decoy — different objective
        },
        {
          kind: 'table',
          caption: 'Figure 1. Planned study design and subject numbers',
          columns: ['Period', 'CB-207 group', 'Reference product group', 'Total'],
          rows: [
            ['Randomised', 'n = 376', 'n = 376', 'n = 752'],
            ['Neoadjuvant period, 8 cycles', 'n = 376', 'n = 376', 'n = 752'],
            ['Definitive surgery', 'n = 331', 'n = 331', 'n = 662'],
            ['Adjuvant period, 10 cycles', 'n = 331', 'n = 331', 'n = 662'],
          ],
        },
      ],
    },

    /* ---------------------------------------------------------------- */
    {
      id: '3',
      heading: 'ANALYSIS SETS AND GENERAL CONVENTIONS',
      blocks: [],
    },
    {
      id: '3.1',
      heading: 'Analysis Sets',
      blocks: [
        {
          kind: 'para',
          text: 'The Full Analysis Set comprises all randomised subjects, classified according to the treatment group to which they were randomised. The Full analysis set is the primary analysis set for all efficacy endpoints.', // E9 capitalisation
        },
        {
          kind: 'para',
          text: 'The Per-Protocol Set comprises all subjects in the Full Analysis Set who received at least six cycles of neoadjuvant study treatment, underwent definitive surgery, and had no important protocol deviation affecting the primary endpoint. Nine subjects enrolled at two sites in Ukraine are excluded from the Per-protocol set following the sponsor decision of 20 May 2024 regarding site data reliability.', // B3, E9
        },
        {
          kind: 'para',
          text: 'The Safety Set consist of all subjects who received at least one dose of study treatment, classified according to the treatment actually received.', // H-typo "consist of"
        },
        {
          kind: 'para',
          text: 'The Pharmacokinetic Set comprises all subjects in the Safety Set who received at least four cycles of study treatment without a dose interruption exceeding seven days and for whom at least one evaluable pre-dose and one evaluable post-dose concentration are available in the cycle designated for intensive sampling. This definition revises the definition given in the protocol, which required completion of all eight neoadjuvant cycles.', // B2
        },
      ],
    },
    {
      id: '3.2',
      heading: 'Protocol Deviations',
      blocks: [
        {
          kind: 'para',
          text: 'Protocol deviations will be classified as important or not important prior to unblinding. PDs will be summarised by category and by treatment group for the Full Analysis Set, and important PDs will additionally be listed. The categories are defined in APPENDIX 7.', // E3, D3 correct crossref
        },
      ],
    },
    {
      id: '3.3',
      heading: 'General Statistical Conventions',
      blocks: [
        {
          kind: 'para',
          text: 'Unless otherwise specified, all statistical tests will be two-sided and conducted at a significance level of 5%, and all confidence intervals will be two-sided 95% confidence intervals.', // A7
        },
        {
          kind: 'para',
          text: 'Continuous variables will be summarised using the number of non-missing observations, mean, standard deviation, median, minimum, and maximum. Categorical variables will be summarised using frequency counts and percentages. All analyses will be performed using SAS version 9.4 or higher.',
        },
      ],
    },

    /* ---------------------------------------------------------------- */
    {
      id: '4',
      heading: 'INTERIM ANALYSIS AND DATA MONITORING',
      blocks: [
        {
          kind: 'para',
          text: 'No interim analysis of the primary endpoint is planned. An independent Data Monitoring Committee will review unblinded safety data at approximately four-monthly intervals under a charter finalised prior to randomisation of the first subject.',
        },
      ],
    },

    /* ---------------------------------------------------------------- */
    {
      id: '5',
      heading: 'PRIMARY EFFICACY ASSESSMENT',
      blocks: [],
    },
    {
      id: '5.1',
      heading: 'Statistical Hypotheses',
      blocks: [
        {
          kind: 'para',
          text: 'The null hypothesis is that the breast pathological complete response rates of the two treatment groups differ by more than the equivalence margin. Equivalence will be concluded if the relevant confidence interval lies entirely within the pre-specified acceptance range.',
        },
      ],
    },
    {
      id: '5.2',
      heading: 'Subject Disposition',
      blocks: [
        {
          kind: 'para',
          text: 'Subject disposition will be summarised for all randomised subjects by treatment group and overall, and by geographic region. The regional distribution of randomised subjects is given in Table 3.',
        },
        {
          kind: 'table',
          caption: 'Table 3. Randomised subjects by geographic region',
          columns: ['Region', 'CB-207', 'Reference product', 'Total'],
          rows: [
            ['Eastern Europe', '34', '34', '68'],
            ['Western Europe', '42', '42', '84'],
            ['Republic of Korea', '81', '80', '161'],
            ['Japan', '37', '37', '74'],
            ['Latin America', '66', '67', '133'],
            ['North America', '49', '48', '97'],
            ['Rest of world', '97', '97', '194'],
            ['Total', '406', '405', '811'], // A1 vs planned 752; A2 rows sum correctly
          ],
        },
      ],
    },
    {
      id: '5.5',
      heading: 'Equivalence Acceptance Criteria',
      blocks: [
        {
          kind: 'para',
          text: 'Two acceptance criteria are pre-specified, reflecting the differing requirements of the reviewing authorities.',
        },
        {
          kind: 'para',
          text: 'For the European Medicines Agency, equivalence will be concluded if the two-sided 95% confidence interval for the difference in breast pathological complete response rates between CB-207 and the reference product lies entirely within [-12%, 12%].',
        },
        {
          kind: 'para',
          text: 'For the United States Food and Drug Administration, equivalence will be concluded if the two-sided 90% confidence interval for the ratio of breast pathological complete response rates lies entirely within [0.760, 1.510]. The 90% confidence interval replaces the 95% confidence interval as specified in the protocol.', // B1, A7
        },
      ],
    },

    /* ---------------------------------------------------------------- */
    {
      id: '6',
      heading: 'STUDY COMPLETION AND DISCONTINUATION',
      blocks: [
        {
          kind: 'para',
          text: 'Study completion status and the primary reason for discontinuation are recorded on the End of Study eCRF page and will be summarised by treatment group for the Full Analysis Set.', // F5
        },
      ],
    },

    /* ---------------------------------------------------------------- */
    {
      id: '7',
      heading: 'DEMOGRAPHICS AND BASELINE CHARACTERISTICS',
      blocks: [
        {
          kind: 'para',
          text: 'Demographic and baseline characteristics will be summarised by treatment group for the Full Analysis Set and the Safety Set. Continuous variables will be compared between treatment groups using an F-test and categorical variables using a chi-squared test.', // C5
        },
        {
          kind: 'para',
          text: 'Body surface area will be calculated using the Mostellar formula from height and weight recorded at screening.', // E5 — Mosteller
        },
        {
          kind: 'para',
          text: 'ECOG performance status recorded at screening will be summarised in the categories (0, 1, >1). Hormone receptor status, taken from the Disease stage page, will be summarised as positive or negative for oestrogen receptor and for PR.', // E8, F3, E2
        },
        {
          kind: 'para',
          text: 'Baseline tumour staging, taken from the Disease Stage page, will be summarised by clinical stage. Central pathology results will be taken from the pCR page where the local and central assessments were preformed on the same specimen.', // F3, F1, H-typo "preformed"
        },
      ],
    },

    /* ---------------------------------------------------------------- */
    {
      id: '8',
      heading: 'MEDICAL HISTORY',
      blocks: [
        {
          kind: 'para',
          text: 'Medical history will be coded using MedDRA version 27.0 and summarised by system organ class and preferred term for the Safety Set.',
        },
      ],
    },

    /* ---------------------------------------------------------------- */
    {
      id: '9',
      heading: 'PRIOR AND CONCOMITANT MEDICATIONS',
      blocks: [
        {
          kind: 'para',
          text: 'Prior and concomitant medications will be coded using the World Health Organization Drug Dictionary and summarised by ATCC level 2 term and preferred name for the Safety Set.', // E4
        },
        {
          kind: 'para',
          text: 'Where the start or stop date of a medication is partial or missing, the conventions in APPENDIX 2 will be applied before classification as prior or concomitant.', // D3 true negative
        },
      ],
    },

    /* ---------------------------------------------------------------- */
    {
      id: '10',
      heading: 'STUDY TREATMENT',
      blocks: [],
    },
    {
      id: '10.1',
      heading: 'Extent of Exposure',
      blocks: [
        {
          kind: 'para',
          text: 'The number of cycles administered, the cumulative dose, and the duration of exposure will be summarised by treatment group and by study period for the Safety Set.',
        },
      ],
    },
    {
      id: '10.2',
      heading: 'Dose Intensity',
      blocks: [
        {
          kind: 'para',
          text: 'Planned dose intensity is defined as the planned dose divided by the planned cycle interval of 21 days. For CB-207 the planned maintenance dose is 6 mg/kg, giving a planned dose intensity of 0.2857 mg/kg/day. For docetaxel the planned dose is 75 mg/m2, giving 3.5714 mg/m2/day. For cyclophosphamide the planned dose is 600 mg/m2, giving 28.5714 mg/m2/day.', // A4 true negatives
        },
        {
          kind: 'para',
          text: 'Body surface area used in the dose intensity derivation is recalculated at each cycle using the Mosteller formula from the weight recorded on the Physical Examination page.', // E5 pair, F4
        },
        {
          kind: 'para',
          text: 'For the neoadjuvant period, relative dose intensity for cycle n is derived as the administered dose recorded at Cycle(n) divided by the administered dose recorded at Cycle(n-1), expressed as a percentage.', // C3 reference shape
        },
        {
          kind: 'para',
          text: 'For the adjuvant period, relative dose intensity for cycle n is derived as the administered dose recorded at Cycle(n-9) divided by the administered dose recorded at Cycle(n-8), expressed as a percentage.', // C3 asymmetry
        },
        {
          kind: 'para',
          text: 'For the overall treatment period, relative dose intensity for cycle n is derived as the administered dose recorded at Cycle(n-2) divided by the administered dose recorded at Cycle(n), expressed as a percentage.', // C4
        },
        {
          kind: 'para',
          text: 'Administrations of non-investigational chemotherapy are taken from the Non-IP Infusion page and are excluded from the dose intensity derivation for study treatment.', // F6
        },
        {
          kind: 'para',
          text: 'Weight recorded at screening is taken from the Physical Exam- Screening page where the cycle 1 value is missing.', // F4
        },
      ],
    },

    /* ---------------------------------------------------------------- */
    {
      id: '11',
      heading: 'EFFICACY ANALYSES',
      blocks: [],
    },
    {
      id: '11.1',
      heading: 'Primary Endpoint',
      blocks: [
        {
          kind: 'para',
          text: 'The breast pathological complete response status of each subject will be derived from the central pathology assessment recorded on the Pathological Complete Response page. Subjects who do not undergo definitive surgery will be counted as non-responders in the Full Analysis Set.', // F1
        },
      ],
    },
    {
      id: '11.2',
      heading: 'Analysis of the Primary Endpoint',
      blocks: [
        {
          kind: 'para',
          text: 'The primary analysis will be performed in the Per-Protocol Set and repeated in the Full Analysis Set. Both analyses adjust for the randomisation stratification factors.',
        },
      ],
    },
    {
      id: '11.2.2',
      heading: 'Analysis in the Full Analysis Set',
      blocks: [
        {
          kind: 'para',
          text: 'The difference in response rates and its confidence interval will be estimated from a stratified analysis using the Cochran-Mantel-Haenszel weights, with hormone receptor status and geographic region as strata. The analysis code is given in APPENDIX 3.', // D3 true negative
        },
      ],
    },
    {
      id: '11.2.3',
      heading: 'Equivalence Assessment of the Ratio',
      blocks: [
        {
          kind: 'para',
          text: 'The ratio of breast pathological complete response rates and its two-sided 90% confidence interval will be estimated from a generalised linear model with an identity link on the log scale, stratified by hormone receptor status. Equivalence against the acceptance range specified in Section 5.5 will be concluded if the interval lies entirely within that range.', // A7 chain
        },
      ],
    },
    {
      id: '11.2.4',
      heading: 'Sensitive Analysis',
      blocks: [
        {
          kind: 'para',
          text: 'A sensitivity analysis of the primary endpoint will be performed in which subjects with a missing pathology assessment are imputed as responders and, separately, as non-responders. The analysis code is given in APPENDIX 4.', // E7 heading/body drift, D3
        },
      ],
    },
    {
      id: '11.2.5',
      heading: 'Additional Analyses of the Primary Endpoint',
      blocks: [
        {
          kind: 'para',
          text: 'As an additional analysis, the two-sided 95% confidence interval for the ratio of breast pathological complete response rates will be presented against the same acceptance range. This analysis is descriptive and is not part of the equivalence assessment.', // A8 decoy
        },
      ],
    },
    {
      id: '11.3',
      heading: 'Secondary Efficacy Endpoints',
      blocks: [
        {
          kind: 'para',
          text: 'Secondary efficacy endpoints will be summarised by treatment group in the Full Analysis Set and the Per-Protocol Set. No multiplicity adjustment is applied to secondary endpoints.',
        },
      ],
    },
    {
      id: '11.3.1',
      heading: 'Clinical Response and Surgical Outcome',
      blocks: [
        {
          kind: 'para',
          text: 'Overall clinical response will be derived from the investigator assessment recorded on the Clinical Response page and summarised by response catgory, including complete response, PR, stable disease and PD.', // F2, H-typo "catgory", E2, E3
        },
        {
          kind: 'para',
          text: 'Where the RESPONSE page has not been completed for a scheduled assessment, the corresponding record on the CRDAT page will be used, provided that the assessment date is within the visit window.', // F2
        },
        {
          kind: 'para',
          text: 'Surgical outcome and the extent of residual disease will be summarised using the pathologic response categories recorded at the time of definitive surgery. Subjects with PDs affecting the surgical assessment will be excluded from the Per-Protocol Set analysis.', // E6, E3
        },
      ],
    },

    /* ---------------------------------------------------------------- */
    {
      id: '12',
      heading: 'SAFETY ANALYSES',
      blocks: [
        {
          kind: 'para',
          text: 'All safety analyses will be performed in the Safety Set. No statistical comparisons between treatment groups will be performed for safety data; all safety data will be summarised descriptively.', // C5
        },
      ],
    },
    {
      id: '12.1',
      heading: 'Adverse Events',
      blocks: [
        {
          kind: 'para',
          text: 'Adverse events will be coded using MedDRA version 27.0 and graded using the Common Terminology Criteria for Adverse Events version 4.0.', // E1
        },
        {
          kind: 'para',
          text: 'For the neoadjuvant period, a treatment-emergent adverse event is defined as an adverse event with onset on or after the date of first administration of IP and on or before the date of definitive surgery.',
        },
        {
          kind: 'para',
          text: 'For the adjuvant period, a treatment-emergent adverse event is defined as an adverse event with onset on or after the date of first administration of IP and the date of surgery.', // C1 drafting slip
        },
        {
          kind: 'para',
          text: 'Where the onset date of an adverse event is partial or missing, see APPENDIX 1 for handling of partial dates for AEs.', // D1 — partial dates are APPENDIX 2
        },
      ],
    },
    {
      id: '12.2',
      heading: 'Deaths and Serious Adverse Events',
      blocks: [
        {
          kind: 'para',
          text: 'Deaths, serious adverse events, and adverse events leading to discontinuation of study treatment will be summarised by treatment group and by preferred term.',
        },
        {
          kind: 'para',
          text: 'Febrile neutropenia will be identified using the standardised MedDRA query and graded using the Common Terminology Criteria for Adverse Events version 4.03.', // E1
        },
      ],
    },
    {
      id: '12.4',
      heading: 'Cardiac and Laboratory Assessments',
      blocks: [
        {
          kind: 'para',
          text: 'Left ventricular ejection fraction will be summarised at each scheduled assessment using the categories >=60, >=50 and <60, >=45 and <50, and >=45 and <50.', // C2 duplicate category, <45 uncovered
        },
        {
          kind: 'para',
          text: 'A clinically significant decrease is defined as an absolute decrease of at least 10 percentage points from baseline to a value below 50%. Echocardiograms preformed outside the protocol window will be listed.', // H-typo "preformed"
        },
        {
          kind: 'para',
          text: 'For subject listings, ECOG performance status will be presented using the full scale from 0 fully active to 5 dead as recorded by the investigator.', // E8
        },
        {
          kind: 'para',
          text: 'Infusion-related reactions will be identified from the IP infusion page and summarised by grade.', // F6
        },
      ],
    },

    /* ---------------------------------------------------------------- */
    {
      id: '13',
      heading: 'PHARMACOKINETIC ANALYSES',
      blocks: [
        {
          kind: 'para',
          text: 'Pharmacokinetic parameters will be derived by non-compartmental analysis in the Pharmacokinetic Set. The primary pharmacokinetic endpoint is the area under the serum concentration-time curve over the dosing interval in the cycle designated for intensive sampling. The analysis code is given in APPENDIX 5.', // D3
        },
      ],
    },

    /* ---------------------------------------------------------------- */
    {
      id: '14',
      heading: 'IMMUNOGENICITY ANALYSES',
      blocks: [
        {
          kind: 'para',
          text: 'The incidence of anti-drug antibodies will be summarised by treatment group in the Safety Set. The difference in ADA incidence between treatment groups will be tested using Fisher\'s exact test.', // C5 contradiction
        },
      ],
    },

    /* ---------------------------------------------------------------- */
    {
      id: '15',
      heading: 'CHANGES FROM PROTOCOL-SPECIFIED ANALYSES',
      blocks: [
        {
          kind: 'para',
          text: 'Changes from the analyses specified in the clinical study protocol are recorded in the modification history of this plan and comprise the confidence interval applied to the ratio of response rates and the definition of the Pharmacokinetic Set.',
        },
      ],
    },

    /* ---------------------------------------------------------------- */
    {
      id: '16',
      heading: 'PROGRAMMING CONSIDERATIONS',
      blocks: [
        {
          kind: 'para',
          text: 'Analysis datasets will conform to the CDISC ADaM implementation guide version 1.1. Derived variables are specified in APPENDIX 9. Output will be produced in accordance with the sponsor reporting standards.', // D3
        },
      ],
    },

    /* ---------------------------------------------------------------- */
    {
      id: '17',
      heading: 'REFERENCES',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'Mosteller RD. Simplified calculation of body-surface area. N Engl J Med. 1987.',
            'International Council for Harmonisation. E9 Statistical Principles for Clinical Trials.',
            'International Council for Harmonisation. E9(R1) Addendum on Estimands and Sensitivity Analysis.',
          ],
        },
      ],
    },

    /* ---------------------------------------------------------------- */
    {
      id: 'APPENDIX 1',
      heading: 'VISIT NAME',
      pageBreak: true,
      blocks: [
        {
          kind: 'para',
          text: 'Analysis visit names and their mapping to the scheduled visits recorded in the clinical database are given below. Unscheduled visits are assigned to the nearest preceding scheduled visit for the purpose of by-visit summaries.',
        },
        {
          kind: 'table',
          caption: 'Table 4. Analysis visit names',
          columns: ['Analysis visit', 'Recorded visit', 'Target day'],
          rows: [
            ['Screening', 'SCR', '-28 to -1'],
            ['Cycle 1', 'C1', '1'],
            ['Cycle 4', 'C4', '64'],
            ['Surgery', 'SURG', '190'],
            ['End of Study', 'EOS', '540'],
          ],
        },
      ],
    },
    {
      id: 'APPENDIX 2',
      heading: 'HANDLING OF PARTIAL AND MISSING DATES',
      pageBreak: true,
      blocks: [
        {
          kind: 'para',
          text: 'Where the day of a partial date is missing, the first day of the month is imputed for start dates and the last day of the month is imputed for stop dates. Where the month is also missing, January is imputed for start dates and December for stop dates.',
        },
        {
          kind: 'para',
          text: 'Where imputation would place an adverse event start date before the date of first administration of IP, the date of first administration is imputed instead. Imputed dates are used for classification only and are not presented in listings.',
        },
      ],
    },
    {
      id: 'APPENDIX 3',
      heading: 'ANALYSIS CODE FOR THE PRIMARY ENDPOINT',
      pageBreak: true,
      blocks: [
        {
          kind: 'para',
          text: 'The following code implements the stratified analysis of the difference in breast pathological complete response rates described in Section 11.2.2.',
        },
        {
          kind: 'code',
          lines: [
            'proc freq data=eff;',
            '  tables hrceptor*trt*bpcrfl / cmh;',
            '  weight count;',
            'run;',
            '',
            'data adef;',
            '  set eff;',
            '  if hreceptor = 1 then stratum = 1;',
            '  else stratum = 2;',
            '  keep usubjid trt01pn stratum bpcrfl;',
            'run;',
            '',
            'proc iml;',
            '  use adpc;',
            '  read all var {hrecptor trtn bpcrfl};',
            '  8',
            '  * biomial identity-linked model for the ratio;',
            '  call nlpnra(rc, xres, "loglik", x0);',
            'quit;',
          ],
        },
      ],
    },
    {
      id: 'APPENDIX 4',
      heading: 'ANALYSIS CODE FOR THE SENSITIVITY ANALYSIS',
      pageBreak: true,
      blocks: [
        {
          kind: 'para',
          text: 'The following code implements the imputation-based sensitivity analysis described in Section 11.2.4.',
        },
        {
          kind: 'code',
          lines: [
            'data sens;',
            '  set adef;',
            '  if missing(bpcrfl) then bpcrfl = imputefl;',
            'run;',
            '',
            'proc genmod data=sens;',
            '  class trtn hreceptor;',
            '  model bpcrfl = trtn hreceptor / dist=bin link=identity;',
            '  lsmeans trtn / diff cl alpha=0.10;',
            'run;',
          ],
        },
      ],
    },
    {
      id: 'APPENDIX 5',
      heading: 'ANALYSIS CODE FOR THE PHARMACOKINETIC ENDPOINTS',
      pageBreak: true,
      blocks: [
        {
          kind: 'para',
          text: 'The following code implements the analysis of the primary pharmacokinetic endpoint described in Section 13.',
        },
        {
          kind: 'code',
          lines: [
            'proc mixed data=adpk;',
            '  class trtn usubjid;',
            '  model logauc = trtn;',
            '  lsmeans trtn / diff cl alpha=0.10;',
            'run;',
          ],
        },
      ],
    },
    {
      id: 'APPENDIX 6',
      heading: 'CTC GRADING PARAMTERS',
      pageBreak: true,
      blocks: [
        {
          kind: 'para',
          text: 'Laboratory values will be graded against the Common Terminology Criteria for Adverse Events version 4.0 with the exception of left ventricular systolic dysfunction, which will be graded using the Common Terminology Criteria for Adverse Events version 3.0 to maintain comparability with the historical reference dataset.', // E1
        },
      ],
    },
    {
      id: 'APPENDIX 7',
      heading: 'PROTOCOL DEVIATION DEFINITION',
      pageBreak: true,
      blocks: [
        {
          kind: 'para',
          text: 'An important protocol deviation is a deviation that may materially affect the completeness, accuracy, or reliability of the study data, or that may materially affect a subject\'s rights, safety, or wellbeing. Categories are agreed at the blinded data review meeting prior to unblinding.',
        },
      ],
    },
    {
      id: 'APPENDIX 8',
      heading: 'ADDITONAL ANALYSES',
      pageBreak: true,
      blocks: [
        {
          kind: 'para',
          text: 'Additional analyses of the primary endpoint by subgroup will be produced for hormone receptor status, geographic region, and age category. Subgroup analyses are descriptive and no adjustment for multiplicity is applied.',
        },
      ],
    },
    {
      id: 'APPENDIX 9',
      heading: 'DERIVATION REFERENCES',
      pageBreak: true,
      blocks: [
        {
          kind: 'para',
          text: 'Derived variable specifications, including the derivation of study day, analysis visit, and baseline value, are maintained in the analysis dataset specification and are referenced here for completeness.',
        },
      ],
    },
  ],
};
