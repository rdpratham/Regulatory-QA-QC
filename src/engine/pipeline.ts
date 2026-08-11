import { RULESET_VERSION } from '../study';
import { runArithmetic } from './arithmetic';
import { AuditLog } from './audit';
import { compare } from './compare';
import { checkGuidance } from './guidance';
import { RulesExtractor, type Extractor } from './extract';
import { indexParagraphs, ingestPdf, type DocumentDescriptor } from './ingest';
import type { PipelineResult } from './types';

export type CorpusFile = { descriptor: DocumentDescriptor; data: Uint8Array };

export type PipelineOptions = {
  extractor?: Extractor;
  audit?: AuditLog;
  actor?: string;
  /** Injected for tests so a run is reproducible down to the timestamp. */
  now?: () => string;
  /** Called after each stage so the UI can show the work as it happens. */
  onStage?: (stage: PipelineStage) => void | Promise<void>;
};

export type PipelineStage = {
  key: 'INGEST' | 'DEBOILERPLATE' | 'STRUCTURE' | 'EXTRACT' | 'COMPARE' | 'SCORE';
  label: string;
  detail: string;
};

/**
 * The whole engine, in the order an inspector would expect to see it: parse the
 * files that were actually supplied, strip what is on the page but is not the
 * document, rebuild the structure, extract deterministically, recompute what
 * the documents claim about themselves, compare, score.
 */
export async function runPipeline(
  files: CorpusFile[],
  options: PipelineOptions = {},
): Promise<{ result: PipelineResult; audit: AuditLog }> {
  const now = options.now ?? (() => new Date().toISOString());
  const audit = options.audit ?? new AuditLog(options.actor ?? 'system', now);
  const extractor = options.extractor ?? new RulesExtractor();
  const stage = async (s: PipelineStage) => {
    await options.onStage?.(s);
  };

  const documents = [];
  for (const file of files) {
    documents.push(await ingestPdf(file.descriptor, file.data, audit));
  }

  const pdfPages = documents.reduce((n, d) => n + d.pdfPageCount, 0);
  await stage({
    key: 'INGEST',
    label: 'Extracting text with coordinates',
    detail: `${documents.length} documents, ${pdfPages} PDF pages`,
  });

  const rotated = documents.reduce((n, d) => n + d.rotatedItemsDropped, 0);
  const boilerplate = documents.reduce((n, d) => n + d.boilerplate.length, 0);
  await stage({
    key: 'DEBOILERPLATE',
    label: 'Removing watermarks, headers and footers',
    detail: `${rotated} rotated items and ${boilerplate} repeated header/footer lines removed`,
  });

  const paragraphs = indexParagraphs(documents);
  const sections = documents.reduce((n, d) => n + d.sections.length, 0);
  await stage({
    key: 'STRUCTURE',
    label: 'Indexing sections and reconciling page numbers',
    detail: `${sections} sections, ${paragraphs.length} paragraphs, printed-to-PDF offsets ${documents
      .map((d) => `${d.type} ${d.pageOffset}`)
      .join(', ')}`,
  });

  const entities = extractor.extract(paragraphs, documents);
  audit.append({
    eventType: 'EXTRACTION_COMPLETED',
    detail: `${extractor.name} extracted ${entities.length} entities across ${
      new Set(entities.map((e) => e.conceptKey)).size
    } concepts from ${paragraphs.length} paragraphs`,
  });
  await stage({
    key: 'EXTRACT',
    label: 'Extracting entities',
    detail: `${entities.length} entities across ${new Set(entities.map((e) => e.conceptKey)).size} concepts`,
  });

  const arithmetic = runArithmetic(entities, paragraphs);
  const guidance = checkGuidance(documents);
  await stage({
    key: 'COMPARE',
    label: 'Recomputing derivations and checking guidance conformance',
    detail:
      `${arithmetic.filter((a) => a.outcome === 'CONFIRMED').length} of ${arithmetic.length} derivations reproduce; ` +
      `${guidance.filter((g) => g.outcome === 'SATISFIED').length} of ${guidance.length} guidance requirements located`,
  });

  const { findings, conceptsCompared } = compare(entities, arithmetic, guidance, documents, audit);
  await stage({
    key: 'SCORE',
    label: 'Scoring findings',
    detail: `${findings.length} findings from ${conceptsCompared} concepts and declared checks`,
  });

  return {
    result: {
      documents,
      paragraphs,
      entities,
      findings,
      arithmetic,
      guidance,
      conceptsCompared,
      rulesetVersion: RULESET_VERSION,
      runTimestamp: now(),
    },
    audit,
  };
}
