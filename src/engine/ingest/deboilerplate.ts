import type { TextItem, TextLine } from '../types';

/**
 * Removing what is on the page but is not the document.
 *
 * Three classes of non-content, handled three different ways:
 *
 *   Rotated text     — watermarks and margin stamps are not horizontal. Drop.
 *   Repeated blocks  — a line that appears at the same height on most pages is
 *                      a running header or footer. Derive the set, do not
 *                      hardcode the strings: the same code has to work on the
 *                      next sponsor's template.
 *   Redaction tokens — replaced with a visible [REDACTED] marker rather than
 *                      deleted, because the fact that something was redacted is
 *                      itself information a reviewer needs.
 */

/** Anything more than a couple of degrees off horizontal is decoration. */
const MAX_ROTATION = 3;

/** A line has to appear on this share of pages to count as boilerplate. */
const REPEAT_THRESHOLD = 0.6;

/** Vertical band within which two occurrences count as "the same place". */
const Y_BAND = 6;

const REDACTION_TOKENS = /^(PPD|CCI|\[?REDACTED\]?|X{3,})$/i;

export type DeboilerplateResult = {
  pages: TextLine[][];
  boilerplate: string[];
  rotatedItemsDropped: number;
};

export function dropRotated(items: TextItem[]): { kept: TextItem[]; dropped: number } {
  const kept = items.filter((item) => Math.abs(item.rotation) <= MAX_ROTATION);
  return { kept, dropped: items.length - kept.length };
}

/**
 * Digits are masked before the repetition key is computed, so that "Page 3 of
 * 29" and "Page 17 of 29" are recognised as the same running footer. Without
 * this the page number defeats the whole detector.
 */
function repetitionKey(line: TextLine): string {
  const normalized = maskDigits(line.text);
  const band = Math.round(line.y / Y_BAND);
  return `${band}|${normalized}`;
}

export function deboilerplate(pages: TextLine[][], rotatedItemsDropped = 0): DeboilerplateResult {
  const counts = new Map<string, { pages: Set<number>; sample: string }>();

  for (const [index, lines] of pages.entries()) {
    for (const line of lines) {
      const key = repetitionKey(line);
      const entry = counts.get(key) ?? { pages: new Set<number>(), sample: line.text };
      entry.pages.add(index);
      counts.set(key, entry);
    }
  }

  const minimum = Math.max(2, Math.ceil(pages.length * REPEAT_THRESHOLD));
  const boilerplateKeys = new Set(
    [...counts.entries()].filter(([, v]) => v.pages.size >= minimum).map(([k]) => k),
  );
  const boilerplate = [...counts.entries()]
    .filter(([k]) => boilerplateKeys.has(k))
    .map(([, v]) => v.sample);

  /**
   * Front matter carries a shortened footer: the same running text without the
   * page number, because cover and signature leaves are not numbered. Those
   * variants appear on too few pages to clear the repetition threshold on their
   * own, so a line is also boilerplate when its words are an ordered subset of
   * a detected boilerplate line sitting at the same height.
   */
  const variantsByBand = new Map<number, string[][]>();
  for (const [key, value] of counts) {
    if (!boilerplateKeys.has(key)) continue;
    const [band] = key.split('|');
    const words = maskDigits(value.sample).split(' ').filter(Boolean);
    variantsByBand.set(Number(band), [...(variantsByBand.get(Number(band)) ?? []), words]);
  }

  const isFooterVariant = (line: TextLine): boolean => {
    const words = maskDigits(line.text).split(' ').filter(Boolean);
    if (words.length < 2) return false;
    const candidates = variantsByBand.get(Math.round(line.y / Y_BAND)) ?? [];
    return candidates.some((full) => full.length > words.length && isSubsequence(words, full));
  };

  const cleaned = pages.map((lines) =>
    lines
      .filter((line) => !boilerplateKeys.has(repetitionKey(line)) && !isFooterVariant(line))
      .map((line) =>
        REDACTION_TOKENS.test(line.text) ? { ...line, text: '[REDACTED]' } : line,
      ),
  );

  return { pages: cleaned, boilerplate, rotatedItemsDropped };
}

function maskDigits(text: string): string {
  return text.replace(/\d+/g, '#').replace(/\s+/g, ' ').trim().toLowerCase();
}

function isSubsequence(needle: string[], haystack: string[]): boolean {
  let i = 0;
  for (const word of haystack) {
    if (word === needle[i]) i += 1;
    if (i === needle.length) return true;
  }
  return false;
}

/**
 * Repairs the two damage patterns text extraction reliably produces: words
 * broken across a line by a hyphen, and words fused because the extractor
 * emitted no space between marks that were only kerned apart.
 */
export function repairLineBreaks(lines: string[]): string {
  let out = '';
  for (const [i, line] of lines.entries()) {
    if (i === 0) {
      out = line;
      continue;
    }
    if (/[A-Za-z]-$/.test(out)) out = `${out.slice(0, -1)}${line}`;
    else out = `${out} ${line}`;
  }
  return out.replace(/\s+/g, ' ').trim();
}
