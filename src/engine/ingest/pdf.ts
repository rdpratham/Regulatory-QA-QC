import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { TextItem, TextLine } from '../types';

/**
 * Raw text extraction with geometry retained.
 *
 * The only thing this module knows about is where marks sit on a page. It does
 * not decide what is content and what is decoration — that is
 * deboilerplate.ts's job, and keeping the two apart is what lets the same
 * extraction feed a different de-boilerplating strategy for a sponsor whose
 * documents are laid out differently.
 */

let configured = false;

/**
 * Called from the browser entry point with a bundled worker URL. In Node the
 * worker is left unset and pdf.js falls back to its in-process fake worker,
 * which is what the test suite runs on.
 */
export function configurePdfWorker(workerSrc: string): void {
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  configured = true;
}

/**
 * Single-file builds have no separate worker file to point at, so the worker is
 * constructed from an inlined blob and handed over as a port instead.
 *
 * If the host's content security policy refuses a blob-backed worker, the
 * caller leaves this unset and pdf.js falls back to parsing on the main thread.
 * That is slower and, for five documents totalling about 112 KB, imperceptible.
 */
export function configurePdfWorkerPort(port: Worker): void {
  pdfjs.GlobalWorkerOptions.workerPort = port;
  configured = true;
}

export function isPdfWorkerConfigured(): boolean {
  return configured;
}

/** Degrees, in [-180, 180]. */
function rotationOf(transform: number[]): number {
  return Math.round((Math.atan2(transform[1], transform[0]) * 180) / Math.PI);
}

export async function extractItems(data: Uint8Array): Promise<TextItem[][]> {
  // pdf.js takes ownership of the buffer it is given: it transfers it to the
  // worker, which detaches it here and leaves the caller holding a zero-length
  // array. The caller's bytes are not ours to consume — the same file is parsed
  // again by a second run, and again by the cross-document pass — so pdf.js gets
  // a copy and the original survives.
  const task = pdfjs.getDocument({
    data: new Uint8Array(data),
    useSystemFonts: false,
    verbosity: 0,
  });
  const pdf = await task.promise;
  const pages: TextItem[][] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const items: TextItem[] = [];

    for (const raw of content.items) {
      if (!('str' in raw)) continue;
      const text = raw.str;
      if (!text || !text.trim()) continue;
      const style = content.styles?.[raw.fontName];
      items.push({
        text,
        x: raw.transform[4],
        y: raw.transform[5],
        width: raw.width,
        height: raw.height,
        rotation: rotationOf(raw.transform),
        fontFamily: style?.fontFamily ?? 'sans-serif',
      });
    }

    pages.push(items);
    page.cleanup();
  }

  await task.destroy();
  return pages;
}

const Y_TOLERANCE = 2.2;

/**
 * Groups items into visual lines. Two marks belong to the same line when their
 * baselines agree within a couple of points; a space is inserted where the
 * horizontal gap is wide enough to be one. PDF text extraction routinely emits
 * "APPEN" "DIX" as separate marks, and a parser that concatenates blindly
 * produces words no rule will ever match.
 */
export function toLines(items: TextItem[], pdfPage: number): TextLine[] {
  const buckets: TextItem[][] = [];

  for (const item of [...items].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const bucket = buckets.find((b) => Math.abs(b[0].y - item.y) <= Y_TOLERANCE);
    if (bucket) bucket.push(item);
    else buckets.push([item]);
  }

  return buckets.map((bucket) => {
    const sorted = [...bucket].sort((a, b) => a.x - b.x);
    const fontSize = Math.max(...sorted.map((i) => i.height));
    let text = '';
    let cursor: number | null = null;

    for (const item of sorted) {
      if (cursor !== null) {
        const gap = item.x - cursor;
        if (gap > Math.max(1.2, item.height * 0.22)) text += ' ';
      }
      text += item.text;
      cursor = item.x + item.width;
    }

    return {
      text: text.replace(/\s+/g, ' ').trim(),
      x: Math.min(...sorted.map((i) => i.x)),
      y: sorted[0].y,
      fontSize,
      mono: sorted.some((i) => /mono/i.test(i.fontFamily)),
      pdfPage,
    };
  });
}
