import type { GuidanceCheck } from './guidance';

/**
 * Core data model for the Cross-Document Consistency QC engine.
 *
 *   ParsedDocument — a PDF after ingestion: section tree, paragraphs, both page
 *                    indices, abbreviation table, boilerplate that was removed
 *   Entity         — one extracted fact, with the citation that proves it
 *   Finding        — a disagreement between entities that share a conceptKey
 *   AuditEvent     — an append-only record that any of the above happened
 *
 * These survive unchanged when the rules-based extractor is swapped for a
 * hybrid rules+LLM extractor. See PRODUCTION.md.
 */

export type DocumentType = 'PROTOCOL' | 'SAP' | 'CSR' | 'CRF' | 'IB' | 'TFL';

/* ------------------------------------------------------------------ */
/* Ingestion                                                           */
/* ------------------------------------------------------------------ */

export type TextItem = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Degrees. Anything not close to 0 is decoration, not content. */
  rotation: number;
  fontFamily: string;
};

export type TextLine = {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  mono: boolean;
  pdfPage: number;
};

export type ParsedParagraph = {
  id: string;
  text: string;
  /** Preserved for code and table blocks, where line structure is the data. */
  lines: string[];
  kind: 'PROSE' | 'CODE';
  printedPage: number | null;
  pdfPage: number;
};

export type ParsedSection = {
  id: string;
  heading: string;
  printedPage: number | null;
  pdfPage: number;
  paragraphs: ParsedParagraph[];
};

export type Abbreviation = {
  acronym: string;
  expansion: string;
  paragraphId: string;
};

export type ParsedDocument = {
  id: string;
  type: DocumentType;
  fileName: string;
  title: string;
  version: string;
  effectiveDate: string;
  author: string;
  pdfPageCount: number;
  printedPageCount: number;
  /** pdfPage - printedPage. Detected from the footers, never assumed. */
  pageOffset: number;
  sections: ParsedSection[];
  abbreviations: Abbreviation[];
  /** Header/footer lines the de-boilerplater derived and removed. */
  boilerplate: string[];
  rotatedItemsDropped: number;
};

export type IndexedParagraph = {
  documentId: string;
  documentType: DocumentType;
  documentTitle: string;
  version: string;
  author: string;
  sectionId: string;
  sectionHeading: string;
  paragraphId: string;
  printedPage: number | null;
  pdfPage: number;
  text: string;
  lines: string[];
  kind: 'PROSE' | 'CODE';
};

/* ------------------------------------------------------------------ */
/* Entities                                                            */
/* ------------------------------------------------------------------ */

export type EntityCategory =
  | 'NUMERIC'
  | 'STATISTICAL'
  | 'POPULATION'
  | 'ENDPOINT'
  | 'SCHEDULE'
  | 'TERMINOLOGY'
  | 'CROSSREF'
  | 'CRF_MAPPING'
  | 'DERIVATION'
  | 'COVERAGE'
  | 'REGULATORY'
  | 'EDITORIAL';

export type Citation = {
  documentId: string;
  documentType: DocumentType;
  version: string;
  author: string;
  sectionId: string;
  sectionHeading: string;
  printedPage: number | null;
  pdfPage: number;
  paragraphId: string;
  snippet: string;
};

export type BenignContext = {
  patternId: string;
  /** downgrade — severity drops to MINOR and confidence is capped.
   *  mitigate  — severity is unchanged, confidence is reduced. */
  mode: 'downgrade' | 'mitigate';
  note: string;
};

export type Entity = {
  id: string;
  conceptKey: string;
  category: EntityCategory;
  rawText: string;
  normalizedValue: string;
  unit?: string;
  citation: Citation;
  extractorRule: string;
  ruleSpecificity: number;
  contextConfirmed: boolean;
  benign?: BenignContext;
  /** Structured extras consumed by the arithmetic and cross-document checks.
   *  Never rendered directly — the normalized value is what a reviewer reads. */
  attributes?: Record<string, string | number>;
};

/* ------------------------------------------------------------------ */
/* Arithmetic                                                          */
/* ------------------------------------------------------------------ */

export type ArithmeticCheck = {
  id: string;
  label: string;
  /** The derivation as stated in the document, in readable form. */
  expression: string;
  expected: string;
  stated: string;
  outcome: 'CONFIRMED' | 'FAILED';
  tolerance: string;
  citation: Citation;
};

/* ------------------------------------------------------------------ */
/* Findings                                                            */
/* ------------------------------------------------------------------ */

export type Severity = 'CRITICAL' | 'MAJOR' | 'MINOR';

export type DispositionStatus =
  | 'CONFIRMED'
  | 'DISMISSED'
  | 'RESOLVED'
  | 'INTENTIONAL_DOCUMENTED';

export type Disposition = {
  status: DispositionStatus;
  reviewer: string;
  comment: string; // mandatory, min 10 chars — enforced in the store
  timestamp: string;
};

export type ConfidenceFactor = {
  label: string;
  contribution: number;
  detail: string;
};

export type Occurrence = {
  entity: Entity;
  value: string;
};

export type FindingScope = 'INTRA_DOCUMENT' | 'CROSS_DOCUMENT';

export type Finding = {
  id: string;
  conceptKey: string;
  category: EntityCategory;
  severity: Severity;
  confidence: number;
  confidenceFactors: ConfidenceFactor[];
  scope: FindingScope;
  title: string;
  description: string;
  occurrences: Occurrence[];
  documentTypes: DocumentType[];
  regulatoryContext: string;
  suggestedAction: string;
  benignNote?: string;
  /** ANSWER_KEY id, when the finding corresponds to a catalogued item. */
  answerKeyId?: string;
  disposition: Disposition | null;
};

/* ------------------------------------------------------------------ */
/* Audit                                                               */
/* ------------------------------------------------------------------ */

export type AuditEventType =
  | 'SESSION_STARTED'
  | 'SESSION_ENDED'
  | 'DOCUMENT_INGESTED'
  | 'EXTRACTION_COMPLETED'
  | 'COMPARISON_RUN'
  | 'FINDING_REVIEWED'
  | 'REPORT_EXPORTED'
  | 'QC_SIGNED_OFF';

export type AuditEvent = {
  id: string;
  timestamp: string;
  actor: string;
  eventType: AuditEventType;
  detail: string;
  rulesetVersion: string;
};

/* ------------------------------------------------------------------ */
/* Pipeline result                                                     */
/* ------------------------------------------------------------------ */

export type PipelineResult = {
  documents: ParsedDocument[];
  paragraphs: IndexedParagraph[];
  entities: Entity[];
  findings: Finding[];
  arithmetic: ArithmeticCheck[];
  guidance: GuidanceCheck[];
  conceptsCompared: number;
  rulesetVersion: string;
  runTimestamp: string;
};
