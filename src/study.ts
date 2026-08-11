/**
 * Study identity and ruleset version.
 *
 * The ruleset version is written into every audit event and printed on the
 * discrepancy report. An inspector's first question about an automated check is
 * "which version of the check ran, and can you show me it ran on this data" —
 * and an answer to that has to be recorded at the time, not reconstructed.
 * Bump it whenever a rule is added, removed, or retuned.
 */
export const RULESET_VERSION = '2.0.0';

export const STUDY = {
  protocolNumber: 'CB207-C301',
  shortTitle: 'CB207-C301 — CB-207 versus reference product in HER2-positive early breast cancer',
  title:
    'A Randomised, Double-Blind, Parallel-Group, Multicentre Study to Compare the Efficacy, Safety, Pharmacokinetics and Immunogenicity of CB-207 and the Reference Product in Subjects with HER2-Positive Early Breast Cancer in the Neoadjuvant Setting',
  sponsor: 'Calibra Biologics, Inc.',
  biometricsCro: 'Halcyon Clinical Research Organization',
  dataManagementCro: 'Nordvale Clinical KK',
  product: 'CB-207',
  indication: 'HER2-positive early breast cancer',
  submissionType: 'Biosimilar marketing application — Module 5 clinical documentation',
} as const;
