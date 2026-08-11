import type { AuthoredDocument } from './types';
import { STUDY } from './types';

/**
 * CB-207 Investigator's Brochure, Edition 4.
 *
 * Written by a different sponsor function from the Protocol, and carrying the
 * benign cross-study dose reference that the engine must not report as a dosing
 * discrepancy.
 */
export const IB: AuthoredDocument = {
  id: 'DOC-IB-CB207',
  type: 'IB',
  fileName: 'ib.pdf',
  title: "CB-207 Investigator's Brochure, Edition 4",
  shortTitle: 'IB CB-207 Ed.4',
  version: 'v4.0',
  effectiveDate: '2024-02-27',
  author: `${STUDY.sponsor} — Clinical Pharmacology`,

  frontLeaves: [
    {
      id: 'COVER',
      heading: "INVESTIGATOR'S BROCHURE",
      blocks: [
        { kind: 'para', text: 'CB-207 (proposed biosimilar HER2-directed monoclonal antibody)' },
        { kind: 'para', text: 'Edition 4    27 February 2024' },
        { kind: 'para', text: `Sponsor: ${STUDY.sponsor}` },
      ],
    },
  ],

  sections: [
    {
      id: '1',
      heading: 'SUMMARY',
      blocks: [
        {
          kind: 'para',
          text: 'CB-207 is a proposed biosimilar to the reference HER2-directed monoclonal antibody. This edition supersedes Edition 3 and incorporates clinical data available through the data cut-off of 31 December 2023.',
        },
        {
          kind: 'para',
          text: 'CB-207 is not approved for marketing in any jurisdiction and is to be administered only within the context of an approved clinical protocol.',
        },
      ],
    },
    {
      id: '2',
      heading: 'PHYSICAL, CHEMICAL AND PHARMACEUTICAL PROPERTIES',
      blocks: [
        {
          kind: 'para',
          text: 'CB-207 drug product is supplied as a lyophilised powder for reconstitution in single-use vials containing 150 mg and 420 mg of active substance. Reconstituted solution is stable for up to 24 hours at 2 to 8 degrees Celsius.',
        },
      ],
    },
    {
      id: '3',
      heading: 'NON-CLINICAL PHARMACOLOGY',
      blocks: [
        {
          kind: 'para',
          text: 'CB-207 demonstrated binding affinity, antibody-dependent cellular cytotoxicity, and inhibition of proliferation equivalent to the reference product across the analytical comparability programme.',
        },
      ],
    },
    {
      id: '4',
      heading: 'NON-CLINICAL TOXICOLOGY',
      blocks: [
        {
          kind: 'para',
          text: 'Repeat-dose toxicology in cynomolgus monkeys identified no target organ toxicity distinguishable from that of the reference product. Cardiac findings were absent at all dose levels evaluated.',
        },
      ],
    },
    {
      id: '5',
      heading: 'HUMAN PHARMACOKINETICS',
      blocks: [
        {
          kind: 'para',
          text: 'CB-207 exhibits target-mediated disposition with a terminal elimination half-life supporting administration every 21 days. Steady state is reached after approximately four cycles.',
        },
      ],
    },
    {
      id: '6',
      heading: 'CLINICAL EXPERIENCE — DEVELOPMENT PROGRAMME',
      blocks: [
        {
          kind: 'para',
          text: 'The clinical development programme comprises a single-dose comparative pharmacokinetic study in healthy volunteers, a first-in-patient dose-finding study, and the ongoing confirmatory study CB207-C301.',
        },
        {
          kind: 'para',
          text: 'Across the programme, eligible subjects were adults with an Eastern Cooperative Oncology Group (ECOG) performance status of 0 to 2 at study entry and adequate organ function. Requirements applicable to an individual study are specified in the protocol for that study.',
        },
      ],
    },
    {
      id: '7',
      heading: 'CLINICAL EXPERIENCE — STUDY CB207-C101 (DOSE FINDING)',
      blocks: [
        {
          kind: 'para',
          text: 'Study CB207-C101 was an open-label Phase 1 dose-escalation study in subjects with HER2-positive advanced solid tumours. On the basis of the observed tolerability and exposure data from this Phase 1 dose-escalation study, the dose selected for further evaluation was 4 mg/kg administered once weekly.',
        },
        {
          kind: 'para',
          text: 'Adverse events in study CB207-C101 were graded using the Common Terminology Criteria for Adverse Events version 4.03, which was the version in force at the time that study was conducted.',
        },
      ],
    },
    {
      id: '8',
      heading: 'CLINICAL EXPERIENCE — ONGOING CONFIRMATORY STUDY',
      blocks: [
        {
          kind: 'para',
          text: 'Study CB207-C301 is an ongoing randomised, double-blind confirmatory study in the neoadjuvant treatment of HER2-positive early breast cancer. Subjects receive a loading dose of 8 mg/kg followed by a maintenance dose of 6 mg/kg every 21 days.',
        },
      ],
    },
    {
      id: '9',
      heading: 'SUMMARY OF SAFETY',
      blocks: [
        {
          kind: 'para',
          text: 'The most frequently reported adverse reactions are infusion-related reactions, neutropenia, fatigue, and asymptomatic decrease in left ventricular ejection fraction. The safety profile observed to date is consistent with that of the reference product.',
        },
      ],
    },
    {
      id: '10',
      heading: 'IDENTIFIED AND POTENTIAL RISKS',
      blocks: [
        {
          kind: 'para',
          text: 'Cardiac dysfunction is an identified risk of the pharmacological class. Left ventricular ejection fraction should be determined before initiation of treatment and monitored during treatment in accordance with the applicable protocol.',
        },
        {
          kind: 'para',
          text: 'Infusion-related reactions and pulmonary toxicity are identified risks. Immunogenicity has been observed at a low incidence and has not been associated with loss of efficacy.',
        },
      ],
    },
    {
      id: '11',
      heading: 'GUIDANCE FOR THE INVESTIGATOR',
      blocks: [
        {
          kind: 'para',
          text: 'The dose, schedule, permitted modifications, and monitoring requirements applicable to an individual subject are those specified in the protocol under which that subject is enrolled. Where this brochure and the applicable protocol differ, the protocol governs the conduct of the study.',
        },
      ],
    },
    {
      id: '12',
      heading: 'DOCUMENT CONTROL',
      blocks: [
        {
          kind: 'para',
          text: 'This edition was approved by the sponsor Safety Management Team on 27 February 2024 and is distributed to all participating investigators and ethics committees. The next periodic review is due within twelve months.',
        },
      ],
    },
  ],
};
