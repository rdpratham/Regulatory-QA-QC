import type { AuditLog } from '../audit';
import type { DocumentType, IndexedParagraph, ParsedDocument } from '../types';
import { deboilerplate, dropRotated } from './deboilerplate';
import { detectPagination } from './pagination';
import { extractItems, toLines } from './pdf';
import { buildStructure } from './structure';

export { configurePdfWorker, configurePdfWorkerPort, isPdfWorkerConfigured } from './pdf';
export { detectPagination, printedPageFor } from './pagination';
export { deboilerplate, dropRotated, repairLineBreaks } from './deboilerplate';
export { buildStructure, extractAbbreviations } from './structure';

export type DocumentDescriptor = {
  id: string;
  type: DocumentType;
  fileName: string;
  title: string;
  version: string;
  effectiveDate: string;
  author: string;
};

/**
 * Full ingestion for one PDF: geometry → de-boilerplating → pagination →
 * structure. Nothing about this study is baked in; the only per-document input
 * is the descriptor, which in production comes from the document management
 * system that holds the file.
 */
export async function ingestPdf(
  descriptor: DocumentDescriptor,
  data: Uint8Array,
  audit?: AuditLog,
): Promise<ParsedDocument> {
  const itemPages = await extractItems(data);

  let rotatedDropped = 0;
  const linePages = itemPages.map((items, index) => {
    const { kept, dropped } = dropRotated(items);
    rotatedDropped += dropped;
    return toLines(kept, index + 1);
  });

  // Pagination is read before de-boilerplating, because the page number lives
  // in the running footer that de-boilerplating is about to remove.
  const pagination = detectPagination(linePages);
  const cleaned = deboilerplate(linePages, rotatedDropped);
  const { sections, abbreviations } = buildStructure(cleaned.pages, pagination);

  const document: ParsedDocument = {
    ...descriptor,
    pdfPageCount: itemPages.length,
    printedPageCount: pagination.printedPageCount,
    pageOffset: pagination.offset,
    sections,
    abbreviations,
    boilerplate: cleaned.boilerplate,
    rotatedItemsDropped: rotatedDropped,
  };

  audit?.append({
    eventType: 'DOCUMENT_INGESTED',
    detail:
      `${descriptor.type} ${descriptor.version} (${descriptor.fileName}) — ${document.pdfPageCount} PDF pages, ` +
      `${document.printedPageCount} printed pages, printed-to-PDF offset ${document.pageOffset}${
        pagination.consistent ? '' : ' (INCONSISTENT — offset varies across the file)'
      }; ${sections.length} sections, ` +
      `${sections.reduce((n, s) => n + s.paragraphs.length, 0)} paragraphs, ` +
      `${abbreviations.length} abbreviations; ${rotatedDropped} rotated items and ` +
      `${cleaned.boilerplate.length} repeated header/footer lines removed`,
  });

  return document;
}

/** Flattens the parsed documents into the addressable paragraph index. */
export function indexParagraphs(documents: ParsedDocument[]): IndexedParagraph[] {
  const paragraphs: IndexedParagraph[] = [];
  for (const document of documents) {
    for (const section of document.sections) {
      for (const paragraph of section.paragraphs) {
        paragraphs.push({
          documentId: document.id,
          documentType: document.type,
          documentTitle: document.title,
          version: document.version,
          author: document.author,
          sectionId: section.id,
          sectionHeading: section.heading,
          paragraphId: paragraph.id,
          printedPage: paragraph.printedPage,
          pdfPage: paragraph.pdfPage,
          text: paragraph.text,
          lines: paragraph.lines,
          kind: paragraph.kind,
        });
      }
    }
  }
  return paragraphs;
}
