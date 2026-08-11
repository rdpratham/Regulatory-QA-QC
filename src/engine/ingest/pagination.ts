import type { TextLine } from '../types';

/**
 * Reconciling the two page-number systems.
 *
 * A submission PDF almost never starts its printed numbering on PDF page 1 —
 * cover sheets, signature leaves, and approval pages come first. The document
 * says "Page 21 of 58" on the sheet that the PDF reader calls page 23.
 *
 * An inspector cites the printed page. A reviewer opening the file navigates by
 * the PDF page. A citation that carries only one of them sends somebody to the
 * wrong sheet, and a citation that sends somebody to the wrong sheet is worse
 * than no citation at all — it looks precise and is not.
 *
 * The offset is measured from the footers, not assumed.
 */

const FOOTER_PATTERNS = [
  /\bpage\s+(\d+)\s+of\s+(\d+)\b/i,
  /\bpage\s+(\d+)\s*\/\s*(\d+)\b/i,
  /^\s*-\s*(\d+)\s*-\s*$/,
];

export type Pagination = {
  /** PDF page number (1-based) → printed page number, where one was found. */
  printedByPdfPage: Map<number, number>;
  /** Modal pdfPage - printedPage. */
  offset: number;
  printedPageCount: number;
  /** True when every page that carries a number agrees with the modal offset. */
  consistent: boolean;
};

export function detectPagination(pages: TextLine[][]): Pagination {
  const printedByPdfPage = new Map<number, number>();
  let declaredTotal = 0;

  for (const [index, lines] of pages.entries()) {
    const pdfPage = index + 1;
    // Footers live at the bottom of the sheet; searching the whole page invites
    // a table cell reading "page 3" to be mistaken for pagination.
    const candidates = lines.filter((line) => line.y < 110);
    for (const line of candidates) {
      let matched = false;
      for (const pattern of FOOTER_PATTERNS) {
        const m = line.text.match(pattern);
        if (!m) continue;
        printedByPdfPage.set(pdfPage, Number(m[1]));
        if (m[2]) declaredTotal = Math.max(declaredTotal, Number(m[2]));
        matched = true;
        break;
      }
      if (matched) break;
    }
  }

  const offsets = new Map<number, number>();
  for (const [pdfPage, printed] of printedByPdfPage) {
    const delta = pdfPage - printed;
    offsets.set(delta, (offsets.get(delta) ?? 0) + 1);
  }

  let offset = 0;
  let best = -1;
  for (const [delta, count] of offsets) {
    if (count > best) {
      best = count;
      offset = delta;
    }
  }

  return {
    printedByPdfPage,
    offset,
    printedPageCount: declaredTotal || printedByPdfPage.size,
    consistent: offsets.size <= 1,
  };
}

export function printedPageFor(pagination: Pagination, pdfPage: number): number | null {
  const direct = pagination.printedByPdfPage.get(pdfPage);
  if (direct !== undefined) return direct;
  // Front matter carries no printed number, and inventing one would be worse
  // than admitting there isn't one.
  const inferred = pdfPage - pagination.offset;
  return inferred >= 1 ? inferred : null;
}
