/**
 * Authoring model for the derived corpus.
 *
 * These modules are the *source* for the PDFs in corpus/derived/. They are read
 * by scripts/build-corpus.ts at build time and by nothing else — the engine
 * never imports them. The engine only ever sees the generated PDFs, which is
 * the point: the ingestion pipeline has to do real work.
 *
 * To change a value the engine reports, edit the prose here and run
 * `npm run corpus`.
 */

export type DocumentType = 'PROTOCOL' | 'SAP' | 'CSR' | 'CRF' | 'IB';

export type Block =
  | { kind: 'para'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'table'; caption: string; columns: string[]; rows: string[][] }
  | { kind: 'code'; lines: string[] }
  | { kind: 'redaction' };

export type AuthoredSection = {
  /** Numbered heading id ("11.2.3") or appendix id ("APPENDIX 3"). */
  id: string;
  heading: string;
  blocks: Block[];
  /** Force a page break before this section. */
  pageBreak?: boolean;
};

export type AuthoredDocument = {
  id: string;
  type: DocumentType;
  fileName: string;
  title: string;
  shortTitle: string;
  version: string;
  effectiveDate: string;
  author: string;
  /** Rendered as unnumbered leaves before printed page 1 — this is what
   *  creates the printed-page / pdf-page offset the parser has to detect. */
  frontLeaves: AuthoredSection[];
  sections: AuthoredSection[];
};

export const STUDY = {
  protocolNumber: 'CB207-C301',
  title:
    'A Randomised, Double-Blind, Parallel-Group, Multicentre Study to Compare the Efficacy, Safety, Pharmacokinetics and Immunogenicity of CB-207 and the Reference Product in Subjects with HER2-Positive Early Breast Cancer in the Neoadjuvant Setting',
  sponsor: 'Calibra Biologics, Inc.',
  biometricsCro: 'Halcyon Clinical Research Organization',
  dataManagementCro: 'Nordvale Clinical KK',
  product: 'CB-207',
  reference: 'the reference product',
  indication: 'HER2-positive early breast cancer',
} as const;
