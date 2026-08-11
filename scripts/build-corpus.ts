/**
 * Renders the authored corpus in corpus/derived/authoring/ to PDFs in
 * corpus/derived/.
 *
 * The PDFs are deliberately awkward to parse, because a demo whose ingestion
 * only works on clean text is a demo that dies on the buyer's first real
 * document. Every generated page carries:
 *
 *   - a diagonal bilingual watermark (rotated text)
 *   - a rotated left-margin provenance stamp (rotated text)
 *   - a running header and a running footer (repeated blocks)
 *   - redaction tokens where a name would be
 *   - "Page N of M" numbering that starts *after* the cover and signature
 *     leaves, so the printed page and the PDF page never agree
 *
 * Run with: npm run corpus
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, degrees, rgb } from 'pdf-lib';
import type { AuthoredDocument, AuthoredSection, Block } from '../corpus/derived/authoring/types';
import { STUDY } from '../corpus/derived/authoring/types';
import { PROTOCOL } from '../corpus/derived/authoring/protocol';
import { SAP } from '../corpus/derived/authoring/sap';
import { CSR } from '../corpus/derived/authoring/csr';
import { CRF } from '../corpus/derived/authoring/crf';
import { IB } from '../corpus/derived/authoring/ib';
import { TFL } from '../corpus/derived/authoring/tfl';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '..', 'corpus', 'derived');

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_LEFT = 68;
const MARGIN_RIGHT = 56;
const TOP_TEXT = 762;
const BOTTOM_TEXT = 78;
const BODY_SIZE = 9.5;
const LEADING = 12.6;
const TEXT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

/** pdf-lib's standard fonts are WinAnsi-encoded; anything outside it throws. */
function sanitize(input: string): string {
  return input
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/–|—/g, '-')
    .replace(/…/g, '...')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/×/g, 'x')
    .replace(/[^\x20-\x7E -ÿ]/g, ' ');
}

type Fonts = { body: PDFFont; bold: PDFFont; mono: PDFFont };

type PageRecord = { page: PDFPage; numbered: boolean };

class Layout {
  readonly pages: PageRecord[] = [];
  private y = 0;
  private numbered = false;

  constructor(
    private readonly doc: PDFDocument,
    private readonly fonts: Fonts,
  ) {}

  startLeaves(): void {
    this.numbered = false;
  }

  startBody(): void {
    this.numbered = true;
    this.newPage();
  }

  newPage(): void {
    const page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.pages.push({ page, numbered: this.numbered });
    this.y = TOP_TEXT;
  }

  private current(): PDFPage {
    if (this.pages.length === 0) this.newPage();
    return this.pages[this.pages.length - 1].page;
  }

  private ensure(height: number): void {
    if (this.y - height < BOTTOM_TEXT) this.newPage();
  }

  gap(height: number): void {
    this.y -= height;
  }

  breakPage(): void {
    if (this.y < TOP_TEXT - 1) this.newPage();
  }

  private wrap(text: string, font: PDFFont, size: number, width: number): string[] {
    const words = sanitize(text).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > width && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  write(
    text: string,
    options: { font?: PDFFont; size?: number; indent?: number; leading?: number } = {},
  ): void {
    const font = options.font ?? this.fonts.body;
    const size = options.size ?? BODY_SIZE;
    const indent = options.indent ?? 0;
    const leading = options.leading ?? LEADING;
    for (const line of this.wrap(text, font, size, TEXT_WIDTH - indent)) {
      this.ensure(leading);
      this.current().drawText(line, {
        x: MARGIN_LEFT + indent,
        y: this.y,
        size,
        font,
        color: rgb(0.08, 0.09, 0.11),
      });
      this.y -= leading;
    }
  }

  writeRaw(text: string, options: { font?: PDFFont; size?: number; indent?: number } = {}): void {
    const font = options.font ?? this.fonts.mono;
    const size = options.size ?? 8;
    this.ensure(11);
    this.current().drawText(sanitize(text), {
      x: MARGIN_LEFT + (options.indent ?? 0),
      y: this.y,
      size,
      font,
      color: rgb(0.08, 0.09, 0.11),
    });
    this.y -= 11;
  }

  writeColumns(cells: string[], widths: number[], font: PDFFont, size: number): void {
    const wrapped = cells.map((cell, i) => this.wrap(cell, font, size, widths[i] - 8));
    const rows = Math.max(...wrapped.map((w) => w.length));
    this.ensure(rows * (size + 2.6) + 3);
    let x = MARGIN_LEFT;
    const top = this.y;
    for (const [i, column] of wrapped.entries()) {
      let cy = top;
      for (const line of column) {
        this.current().drawText(line, { x, y: cy, size, font, color: rgb(0.08, 0.09, 0.11) });
        cy -= size + 2.6;
      }
      x += widths[i];
    }
    this.y = top - rows * (size + 2.6) - 3;
  }

  get printedPageOf(): number {
    return this.pages.filter((p) => p.numbered).length;
  }
}

function renderBlock(layout: Layout, fonts: Fonts, block: Block): void {
  switch (block.kind) {
    case 'para':
      layout.write(block.text);
      layout.gap(5);
      break;
    case 'bullets':
      for (const item of block.items) layout.write(`- ${item}`, { indent: 12 });
      layout.gap(5);
      break;
    case 'redaction':
      layout.writeRaw('PPD', { font: fonts.body, size: 9 });
      layout.gap(5);
      break;
    case 'code':
      for (const line of block.lines) layout.writeRaw(line || ' ', { indent: 10 });
      layout.gap(6);
      break;
    case 'table': {
      layout.write(block.caption, { font: fonts.bold, size: 9 });
      layout.gap(3);
      const widths = block.columns.map(() => TEXT_WIDTH / block.columns.length);
      // A caption column gets more room when the table is a two-column list.
      if (block.columns.length === 2) {
        widths[0] = TEXT_WIDTH * 0.26;
        widths[1] = TEXT_WIDTH * 0.74;
      } else if (block.columns.length === 3) {
        widths[0] = TEXT_WIDTH * 0.14;
        widths[1] = TEXT_WIDTH * 0.18;
        widths[2] = TEXT_WIDTH * 0.68;
      }
      layout.writeColumns(block.columns, widths, fonts.bold, 8.5);
      for (const row of block.rows) layout.writeColumns(row, widths, fonts.body, 8.5);
      layout.gap(8);
      break;
    }
  }
}

function renderSection(
  layout: Layout,
  fonts: Fonts,
  section: AuthoredSection,
  index: number,
): void {
  // Top-level sections start a new page, as they do in a real submission
  // document — which is also what keeps the printed page index interesting.
  if (section.pageBreak || (index > 0 && !section.id.includes('.'))) layout.breakPage();
  const heading = section.heading.toUpperCase().startsWith(section.id.toUpperCase())
    ? section.heading
    : `${section.id}  ${section.heading}`;
  layout.gap(6);
  layout.write(heading, {
    font: fonts.bold,
    size: section.id.includes('.') ? 10 : 11,
  });
  layout.gap(3);
  for (const block of section.blocks) renderBlock(layout, fonts, block);
}

function decorate(layout: Layout, fonts: Fonts, document: AuthoredDocument): void {
  const numberedTotal = layout.pages.filter((p) => p.numbered).length;
  let printed = 0;

  for (const record of layout.pages) {
    const { page } = record;

    // Diagonal bilingual watermark — rotated, and therefore droppable.
    page.drawText('DERIVED DEMONSTRATION CORPUS', {
      x: 92,
      y: 250,
      size: 26,
      font: fonts.bold,
      color: rgb(0.87, 0.88, 0.9),
      rotate: degrees(38),
    });
    page.drawText('CORPUS DE DEMONSTRATION DERIVE', {
      x: 78,
      y: 210,
      size: 26,
      font: fonts.bold,
      color: rgb(0.87, 0.88, 0.9),
      rotate: degrees(38),
    });

    // Left-margin provenance stamp — rotated 90 degrees.
    page.drawText('Synthetic corpus - generated by cross-doc-qc - not a regulatory document', {
      x: 26,
      y: 150,
      size: 7,
      font: fonts.body,
      color: rgb(0.55, 0.57, 0.6),
      rotate: degrees(90),
    });

    // Running header.
    page.drawText(sanitize(`${document.shortTitle}  |  ${STUDY.sponsor}`), {
      x: MARGIN_LEFT,
      y: 800,
      size: 7.5,
      font: fonts.body,
      color: rgb(0.42, 0.44, 0.47),
    });
    page.drawText(sanitize(`Version ${document.version.replace(/^v/, '')}`), {
      x: PAGE_WIDTH - MARGIN_RIGHT - 60,
      y: 800,
      size: 7.5,
      font: fonts.body,
      color: rgb(0.42, 0.44, 0.47),
    });
    page.drawLine({
      start: { x: MARGIN_LEFT, y: 792 },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: 792 },
      thickness: 0.4,
      color: rgb(0.78, 0.79, 0.81),
    });

    // Running footer.
    page.drawText(sanitize(`Protocol ${STUDY.protocolNumber}`), {
      x: MARGIN_LEFT,
      y: 52,
      size: 7.5,
      font: fonts.body,
      color: rgb(0.42, 0.44, 0.47),
    });
    page.drawText('CONFIDENTIAL', {
      x: PAGE_WIDTH - MARGIN_RIGHT - 52,
      y: 52,
      size: 7.5,
      font: fonts.body,
      color: rgb(0.42, 0.44, 0.47),
    });
    if (record.numbered) {
      printed += 1;
      const label = `Page ${printed} of ${numberedTotal}`;
      page.drawText(label, {
        x: PAGE_WIDTH / 2 - fonts.body.widthOfTextAtSize(label, 7.5) / 2,
        y: 52,
        size: 7.5,
        font: fonts.body,
        color: rgb(0.42, 0.44, 0.47),
      });
    }
  }
}

async function build(document: AuthoredDocument): Promise<{
  file: string;
  pdfPages: number;
  printedPages: number;
  pageOffset: number;
}> {
  const doc = await PDFDocument.create();
  doc.setTitle(sanitize(document.title));
  doc.setAuthor(sanitize(document.author));
  doc.setSubject(sanitize(`${document.type} ${document.version}`));

  const fonts: Fonts = {
    body: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    mono: await doc.embedFont(StandardFonts.Courier),
  };

  const layout = new Layout(doc, fonts);

  layout.startLeaves();
  layout.newPage();
  for (const [i, leaf] of document.frontLeaves.entries()) {
    if (i > 0) layout.breakPage();
    layout.gap(80);
    layout.write(leaf.heading, { font: fonts.bold, size: 15 });
    layout.gap(14);
    for (const block of leaf.blocks) renderBlock(layout, fonts, block);
  }

  layout.startBody();
  document.sections.forEach((section, i) => renderSection(layout, fonts, section, i));

  decorate(layout, fonts, document);

  const bytes = await doc.save();
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, document.fileName), bytes);

  const pdfPages = layout.pages.length;
  const printedPages = layout.pages.filter((p) => p.numbered).length;
  return {
    file: document.fileName,
    pdfPages,
    printedPages,
    pageOffset: pdfPages - printedPages,
  };
}

const DOCUMENTS = [PROTOCOL, SAP, CSR, TFL, CRF, IB];

const summary: Record<string, unknown> = {};
for (const document of DOCUMENTS) {
  const stats = await build(document);
  summary[document.id] = {
    type: document.type,
    version: document.version,
    ...stats,
  };
  // eslint-disable-next-line no-console
  console.log(
    `${document.type.padEnd(9)} ${document.fileName.padEnd(14)} ${stats.pdfPages} pdf pages, ${stats.printedPages} printed, offset ${stats.pageOffset}`,
  );
}

writeFileSync(join(OUT_DIR, 'page-map.json'), `${JSON.stringify(summary, null, 2)}\n`);

/**
 * Document descriptors for the ingestion pipeline. In production this is what
 * the document management system supplies alongside the file; here it is
 * emitted next to the PDFs so the two can never drift apart.
 */
writeFileSync(
  join(OUT_DIR, 'documents.json'),
  `${JSON.stringify(
    DOCUMENTS.map((d) => ({
      id: d.id,
      type: d.type,
      fileName: d.fileName,
      title: d.title,
      version: d.version,
      effectiveDate: d.effectiveDate,
      author: d.author,
    })),
    null,
    2,
  )}\n`,
);
