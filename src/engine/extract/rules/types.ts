import type { DocumentType, EntityCategory, IndexedParagraph, ParsedDocument } from '../../types';

export type RuleHit = {
  conceptKey: string;
  rawText: string;
  normalizedValue: string;
  unit?: string;
  /** Character offset in the paragraph, used to build the citation snippet. */
  index: number;
  attributes?: Record<string, string | number>;
};

export type BenignPattern = {
  id: string;
  pattern: RegExp;
  /** downgrade — severity drops to MINOR and confidence is capped.
   *  mitigate  — severity is unchanged, confidence is reduced. */
  mode: 'downgrade' | 'mitigate';
  note: string;
};

export type RuleContext = {
  paragraph: IndexedParagraph;
  document: ParsedDocument;
};

export type Rule = {
  id: string;
  category: EntityCategory;
  description: string;
  /**
   * How discriminating this rule is, 0–1. A rule anchored on a full phrase
   * earns a high value; one keyed off a bare token earns a low one. Feeds
   * finding confidence directly.
   */
  specificity: number;
  /** The rule only fires when the paragraph matches. Also sets contextConfirmed. */
  requiresContext?: RegExp;
  /** The rule never fires when the paragraph matches. */
  excludesContext?: RegExp;
  /** Restrict to particular document types, where the concept only exists there. */
  documentTypes?: DocumentType[];
  /** Restrict to prose or to code blocks. */
  paragraphKind?: 'PROSE' | 'CODE';
  /** Skip sections whose heading matches — tables of contents, mostly. */
  excludeSectionHeading?: RegExp;
  /**
   * A paragraph matching this pattern is a known-benign setting for this rule.
   * The entity is still extracted and still shown; the comparison step uses the
   * marker to downgrade or mitigate. Suppressing silently would be faster and
   * would be wrong — a reviewer cannot audit an entity never surfaced.
   */
  benignContext?: BenignPattern;
  find: (text: string, context: RuleContext) => RuleHit[];
};

/** Runs a regex over a paragraph and builds hits, keeping the match offset. */
export function scan(
  text: string,
  pattern: RegExp,
  build: (m: RegExpExecArray) => Omit<RuleHit, 'index'> | null,
): RuleHit[] {
  const hits: RuleHit[] = [];
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const re = new RegExp(pattern.source, flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[0].length === 0) {
      re.lastIndex += 1;
      continue;
    }
    const built = build(m);
    if (built) hits.push({ ...built, index: m.index });
  }
  return hits;
}

/** Splits a paragraph into sentences, keeping each sentence's offset. */
export function sentences(text: string): { text: string; index: number }[] {
  const out: { text: string; index: number }[] = [];
  let cursor = 0;
  for (const piece of text.split(/(?<=\.)\s+/)) {
    out.push({ text: piece, index: cursor });
    cursor += piece.length + 1;
  }
  return out;
}
