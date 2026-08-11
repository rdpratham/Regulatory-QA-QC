import type { Abbreviation, ParsedParagraph, ParsedSection, TextLine } from '../types';
import { repairLineBreaks } from './deboilerplate';
import { printedPageFor, type Pagination } from './pagination';

/**
 * Turning a stream of lines back into a document.
 *
 * Headings are recognised geometrically (a larger type size) and then
 * classified by their numbering, so the same code handles "11.2.3 Equivalence
 * Assessment", "APPENDIX 3 ANALYSIS CODE", and an unnumbered front-matter
 * heading like "MODIFICATION HISTORY" without a per-document configuration.
 */

const HEADING_MIN_SIZE = 9.9;

const HEADING_PATTERNS: RegExp[] = [
  /^(\d+(?:\.\d+)*)\s+(.{2,})$/,
  /^(APPENDIX\s+\d+)\s+(.{2,})$/i,
];

function classifyHeading(line: TextLine): { id: string; heading: string } | null {
  if (line.fontSize < HEADING_MIN_SIZE) return null;
  if (line.mono) return null;
  const text = line.text.trim();
  if (text.length < 3 || text.length > 120) return null;

  for (const pattern of HEADING_PATTERNS) {
    const m = text.match(pattern);
    if (m) return { id: m[1].toUpperCase(), heading: m[2].trim() };
  }

  // Unnumbered front matter: the heading is its own identifier.
  if (/^[A-Z][A-Z0-9 ,'()\-/]+$/.test(text)) return { id: text, heading: text };
  return null;
}

/**
 * The tightest line spacing on a page is its body leading. Anything
 * meaningfully looser is a paragraph boundary. Deriving the threshold per page
 * rather than fixing it keeps tables (which are set tighter than prose) from
 * collapsing into a single blob.
 */
function paragraphThreshold(lines: TextLine[]): number {
  const deltas: number[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const delta = lines[i - 1].y - lines[i].y;
    if (delta > 1) deltas.push(delta);
  }
  if (deltas.length === 0) return Number.POSITIVE_INFINITY;
  return Math.min(...deltas) * 1.28;
}

type Pending = { line: TextLine; threshold: number };

function flushParagraphs(sectionId: string, pending: Pending[]): ParsedParagraph[] {
  const paragraphs: ParsedParagraph[] = [];
  let buffer: TextLine[] = [];

  const commit = () => {
    if (buffer.length === 0) return;
    const mono = buffer[0].mono;
    paragraphs.push({
      id: `${sectionId}-p${paragraphs.length + 1}`,
      text: mono ? buffer.map((l) => l.text).join('\n') : repairLineBreaks(buffer.map((l) => l.text)),
      lines: buffer.map((l) => l.text),
      kind: mono ? 'CODE' : 'PROSE',
      printedPage: null,
      pdfPage: buffer[0].pdfPage,
    });
    buffer = [];
  };

  for (const [i, item] of pending.entries()) {
    if (i === 0) {
      buffer.push(item.line);
      continue;
    }
    const previous = pending[i - 1].line;
    const samePage = previous.pdfPage === item.line.pdfPage;
    const delta = previous.y - item.line.y;

    let boundary: boolean;
    if (!samePage) {
      // A paragraph may run over a page break; a finished sentence may not.
      boundary = /[.:;]$/.test(previous.text) || item.line.mono !== previous.mono;
    } else {
      boundary = delta > item.threshold || item.line.mono !== previous.mono;
    }

    if (boundary) commit();
    buffer.push(item.line);
  }
  commit();

  return paragraphs;
}

export function buildStructure(
  pages: TextLine[][],
  pagination: Pagination,
): { sections: ParsedSection[]; abbreviations: Abbreviation[] } {
  const sections: ParsedSection[] = [];
  let current: { section: ParsedSection; pending: Pending[] } | null = null;
  let counter = 0;

  const closeCurrent = () => {
    if (!current) return;
    current.section.paragraphs = flushParagraphs(current.section.id, current.pending).map((p) => ({
      ...p,
      printedPage: printedPageFor(pagination, p.pdfPage),
    }));
    sections.push(current.section);
    current = null;
  };

  for (const [index, lines] of pages.entries()) {
    const pdfPage = index + 1;
    const threshold = paragraphThreshold(lines);

    for (const line of lines) {
      const heading = classifyHeading(line);
      if (heading) {
        closeCurrent();
        counter += 1;
        current = {
          section: {
            id: sections.some((s) => s.id === heading.id) ? `${heading.id}#${counter}` : heading.id,
            heading: heading.heading,
            printedPage: printedPageFor(pagination, pdfPage),
            pdfPage,
            paragraphs: [],
          },
          pending: [],
        };
        continue;
      }

      if (!current) {
        // Text before the first recognised heading belongs to the cover sheet.
        counter += 1;
        current = {
          section: {
            id: 'FRONT MATTER',
            heading: 'Front matter',
            printedPage: printedPageFor(pagination, pdfPage),
            pdfPage,
            paragraphs: [],
          },
          pending: [],
        };
      }
      current.pending.push({ line, threshold });
    }
  }
  closeCurrent();

  return { sections, abbreviations: extractAbbreviations(sections) };
}

/* ------------------------------------------------------------------ */
/* Abbreviations                                                       */
/* ------------------------------------------------------------------ */

const ACRONYM = /^([A-Za-z][A-Za-z0-9]{0,7})\s+(.{4,})$/;

function looksLikeAcronym(token: string): boolean {
  const uppercase = (token.match(/[A-Z]/g) ?? []).length;
  if (uppercase >= 2) return true;
  return uppercase === 1 && token.length <= 4;
}

/**
 * The document's own abbreviation table is used twice downstream: to detect one
 * acronym carrying two expansions, and to recognise that "pCR page" and
 * "Pathological Complete Response page" name the same eCRF page. Reading it out
 * of the document rather than configuring it is what makes both checks portable
 * to the next study.
 */
export function extractAbbreviations(sections: ParsedSection[]): Abbreviation[] {
  const target = sections.filter((s) => /ABBREVIATION|DEFINITION OF TERMS/i.test(s.heading));
  const found: Abbreviation[] = [];

  for (const section of target) {
    for (const paragraph of section.paragraphs) {
      for (const line of paragraph.lines) {
        const m = line.match(ACRONYM);
        if (!m) continue;
        const [, acronym, expansion] = m;
        if (!looksLikeAcronym(acronym)) continue;
        if (/^(table|figure|list|page)$/i.test(acronym)) continue;
        found.push({
          acronym: acronym.trim(),
          expansion: expansion.replace(/\s+/g, ' ').trim(),
          paragraphId: paragraph.id,
        });
      }
    }
  }

  return found;
}
