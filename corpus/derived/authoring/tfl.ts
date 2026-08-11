import type { AuthoredDocument } from './types';
import { STUDY } from './types';

/**
 * CB207-C301 Tables, Figures and Listings — Primary Analysis, v1.0.
 *
 * The statistical output package. This is where a submission's numbers stop
 * being prose and start being denominators, and where the most consequential
 * kind of drift lives: an output header that states a population size the
 * study report does not agree with. Every rate in that table is then computed
 * against a denominator nobody can reconcile.
 *
 * Planted, in the same spirit as the rest of the corpus:
 *   - Table 14.2.1 states a Per-Protocol denominator of 374 + 368 = 742;
 *     the study report says 374 + 370 = 744.
 *   - The output index skips 14.1.3.
 *   - Table 14.2.2 carries no source-program footnote.
 *   - The adverse event table grades to CTCAE 4.03 where the plan's general
 *     convention is 4.0.
 */
export const TFL: AuthoredDocument = {
  id: 'DOC-TFL-C301',
  type: 'TFL',
  fileName: 'tfl.pdf',
  title: `Tables, Figures and Listings — Primary Analysis — Study ${STUDY.protocolNumber}`,
  shortTitle: `TFL ${STUDY.protocolNumber}`,
  version: 'v1.0',
  effectiveDate: '2025-07-11',
  author: `${STUDY.biometricsCro} (Biometrics) for ${STUDY.sponsor}`,

  frontLeaves: [
    {
      id: 'COVER',
      heading: 'TABLES, FIGURES AND LISTINGS',
      blocks: [
        { kind: 'para', text: `Study ${STUDY.protocolNumber} — ${STUDY.sponsor}` },
        { kind: 'para', text: 'Primary Analysis    Version 1.0    11 July 2025' },
        { kind: 'para', text: `Produced by ${STUDY.biometricsCro} from the locked analysis database.` },
      ],
    },
  ],

  sections: [
    {
      id: 'LIST OF OUTPUTS',
      heading: 'LIST OF OUTPUTS',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'Table 14.1.1  Subject Disposition — All Randomised Subjects',
            'Table 14.1.2  Important Protocol Deviations — All Randomised Subjects',
            'Table 14.1.4  Demographic and Baseline Characteristics — All Randomised Subjects',
            'Table 14.2.1  Breast Pathological Complete Response Rate — Per-Protocol Set',
            'Table 14.2.2  Breast Pathological Complete Response Rate, Sensitivity Analysis — Per-Protocol Set',
            'Table 14.3.1  Overview of Treatment-Emergent Adverse Events — Safety Set',
            'Figure 14.2.1  Forest Plot of Subgroup Analyses — Per-Protocol Set',
            'Listing 16.2.1  Subjects Discontinuing Study Treatment',
          ],
        },
      ],
    },

    {
      id: '14.1.1',
      heading: 'TABLE 14.1.1 SUBJECT DISPOSITION — ALL RANDOMISED SUBJECTS',
      pageBreak: true,
      blocks: [
        { kind: 'para', text: 'CB-207 (N=406) Reference product (N=405) Total (N=811)' },
        {
          kind: 'table',
          caption: 'Subject disposition by treatment group',
          columns: ['Disposition', 'CB-207', 'Reference product'],
          rows: [
            ['Randomised', '406', '405'],
            ['Received study treatment', '402', '401'],
            ['Completed neoadjuvant period', '381', '379'],
            ['Underwent definitive surgery', '378', '374'],
            ['Discontinued study treatment', '24', '26'],
          ],
        },
        { kind: 'para', text: 'Source: adsl.sas    Output generated 11JUL2025 09:14' },
      ],
    },

    {
      id: '14.1.2',
      heading: 'TABLE 14.1.2 IMPORTANT PROTOCOL DEVIATIONS — ALL RANDOMISED SUBJECTS',
      pageBreak: true,
      blocks: [
        { kind: 'para', text: 'CB-207 (N=406) Reference product (N=405) Total (N=811)' },
        {
          kind: 'table',
          caption: 'Important protocol deviations by category',
          columns: ['Deviation category', 'CB-207', 'Reference product'],
          rows: [
            ['Any important deviation', '31', '28'],
            ['Eligibility criteria not met', '9', '7'],
            ['Prohibited concomitant medication', '11', '10'],
            ['Assessment outside the visit window', '11', '11'],
          ],
        },
        { kind: 'para', text: 'Source: addv.sas    Output generated 11JUL2025 09:16' },
      ],
    },

    {
      id: '14.1.4',
      heading: 'TABLE 14.1.4 DEMOGRAPHIC AND BASELINE CHARACTERISTICS — ALL RANDOMISED SUBJECTS',
      pageBreak: true,
      blocks: [
        { kind: 'para', text: 'CB-207 (N=406) Reference product (N=405) Total (N=811)' },
        {
          kind: 'table',
          caption: 'Demographic and baseline characteristics',
          columns: ['Characteristic', 'CB-207', 'Reference product'],
          rows: [
            ['Age, median years', '51', '52'],
            ['Hormone receptor positive', '236', '234'],
            ['Clinical stage II', '241', '238'],
            ['Clinical stage III', '165', '167'],
          ],
        },
        { kind: 'para', text: 'Source: adsl.sas    Output generated 11JUL2025 09:21' },
      ],
    },

    {
      id: '14.2.1',
      heading: 'TABLE 14.2.1 BREAST PATHOLOGICAL COMPLETE RESPONSE RATE — PER-PROTOCOL SET',
      pageBreak: true,
      blocks: [
        // The study report gives the Per-Protocol Set as 374 and 370.
        { kind: 'para', text: 'CB-207 (N=374) Reference product (N=368) Total (N=742)' },
        {
          kind: 'table',
          caption: 'Breast pathological complete response rate',
          columns: ['Statistic', 'CB-207', 'Reference product'],
          rows: [
            ['Responders', '186', '152'],
            ['Response rate', '49.8%', '41.3%'],
            ['Ratio of response rates', '1.206', ''],
            ['90% confidence interval for the ratio', '1.068 to 1.362', ''],
          ],
        },
        { kind: 'para', text: 'Source: adeff.sas    Output generated 11JUL2025 10:02' },
      ],
    },

    {
      id: '14.2.2',
      heading:
        'TABLE 14.2.2 BREAST PATHOLOGICAL COMPLETE RESPONSE RATE, SENSITIVITY ANALYSIS — PER-PROTOCOL SET',
      pageBreak: true,
      blocks: [
        { kind: 'para', text: 'CB-207 (N=374) Reference product (N=368) Total (N=742)' },
        {
          kind: 'table',
          caption: 'Sensitivity analysis with missing assessments imputed as non-responders',
          columns: ['Statistic', 'CB-207', 'Reference product'],
          rows: [
            ['Responders', '186', '152'],
            ['Response rate', '48.9%', '40.6%'],
            ['Ratio of response rates', '1.204', ''],
          ],
        },
        // No source-program footnote on this output.
      ],
    },

    {
      id: '14.3.1',
      heading: 'TABLE 14.3.1 OVERVIEW OF TREATMENT-EMERGENT ADVERSE EVENTS — SAFETY SET',
      pageBreak: true,
      blocks: [
        { kind: 'para', text: 'CB-207 (N=402) Reference product (N=401) Total (N=803)' },
        {
          kind: 'para',
          text: 'Adverse events are coded using MedDRA version 27.0 and graded using the Common Terminology Criteria for Adverse Events version 4.03.',
        },
        {
          kind: 'table',
          caption: 'Overview of treatment-emergent adverse events',
          columns: ['Category', 'CB-207', 'Reference product'],
          rows: [
            ['Any treatment-emergent adverse event', '378', '377'],
            ['Grade 3 or higher', '141', '138'],
            ['Serious adverse event', '52', '49'],
            ['Leading to discontinuation', '24', '26'],
          ],
        },
        { kind: 'para', text: 'Source: adae.sas    Output generated 11JUL2025 11:37' },
      ],
    },

    {
      id: 'FIGURE 14.2.1',
      heading: 'FIGURE 14.2.1 FOREST PLOT OF SUBGROUP ANALYSES — PER-PROTOCOL SET',
      pageBreak: true,
      blocks: [
        { kind: 'para', text: 'CB-207 (N=374) Reference product (N=368) Total (N=742)' },
        {
          kind: 'para',
          text: 'Ratios of breast pathological complete response rates with 90% confidence intervals are presented by hormone receptor status, geographic region, and age category. The vertical reference line is drawn at a ratio of 1.000.',
        },
        { kind: 'para', text: 'Source: adeff.sas    Output generated 11JUL2025 10:44' },
      ],
    },

    {
      id: 'LISTING 16.2.1',
      heading: 'LISTING 16.2.1 SUBJECTS DISCONTINUING STUDY TREATMENT',
      pageBreak: true,
      blocks: [
        {
          kind: 'para',
          text: 'Subjects who discontinued study treatment before completing the adjuvant period, with the recorded primary reason and the study day of discontinuation.',
        },
        { kind: 'para', text: 'Source: adsl.sas    Output generated 11JUL2025 12:05' },
      ],
    },
  ],
};
