import type { Entity, IndexedParagraph, ParsedDocument } from '../types';
import { RULES, type Rule } from './rules';

/**
 * ── THE SWAP POINT ────────────────────────────────────────────────────────
 *
 * Everything downstream of this interface — comparison, arithmetic, severity,
 * confidence, citations, audit — consumes `Entity[]` and knows nothing about
 * how those entities were produced.
 *
 * In this demo the only implementation is `RulesExtractor`: deterministic
 * regular expressions, normalization tables, and structural checks over the
 * parsed document. No network, no model.
 *
 * In production the intended implementation is a hybrid:
 *   - rules retained for high-precision work — numerics, version strings,
 *     cross-reference resolution, code identifiers — where a pattern is faster,
 *     cheaper, and far easier to validate than a model, and
 *   - an LLM extractor for the semantic concepts a pattern cannot reach:
 *     endpoint definitions expressed in prose, analysis-set definitions written
 *     three different ways, terminology drift across paraphrase rather than
 *     spelling.
 *
 * `class LlmExtractor implements Extractor` drops in here without touching a
 * line of compare.ts, arithmetic.ts, severity.ts, audit.ts, or the UI. The
 * Entity contract — a conceptKey, a normalized value, and a citation a human can
 * open — is the whole integration surface. See PRODUCTION.md.
 * ─────────────────────────────────────────────────────────────────────────
 */
export interface Extractor {
  readonly name: string;
  extract(paragraphs: IndexedParagraph[], documents: ParsedDocument[]): Entity[];
}

const SNIPPET_PADDING = 120;

/** Builds the verbatim evidence string shown beside every finding. */
function buildSnippet(text: string, index: number, length: number): string {
  const start = Math.max(0, index - SNIPPET_PADDING);
  const end = Math.min(text.length, index + length + SNIPPET_PADDING);
  let snippet = text.slice(start, end);
  if (start > 0) {
    const firstSpace = snippet.indexOf(' ');
    if (firstSpace > 0) snippet = `…${snippet.slice(firstSpace + 1)}`;
  }
  if (end < text.length) {
    const lastSpace = snippet.lastIndexOf(' ');
    if (lastSpace > 0) snippet = `${snippet.slice(0, lastSpace)}…`;
  }
  return snippet.trim();
}

function applicability(
  rule: Rule,
  paragraph: IndexedParagraph,
): { applies: boolean; contextConfirmed: boolean } {
  const no = { applies: false, contextConfirmed: false };

  if (rule.documentTypes && !rule.documentTypes.includes(paragraph.documentType)) return no;
  if (rule.paragraphKind && rule.paragraphKind !== paragraph.kind) return no;
  if (rule.excludeSectionHeading && rule.excludeSectionHeading.test(paragraph.sectionHeading)) return no;
  if (rule.excludesContext && rule.excludesContext.test(paragraph.text)) return no;

  if (rule.requiresContext) {
    const matched = rule.requiresContext.test(paragraph.text);
    return { applies: matched, contextConfirmed: matched };
  }
  // No declared context expectation: the rule's own pattern is the evidence.
  return { applies: true, contextConfirmed: true };
}

/**
 * Deterministic, offline extractor. Same input, same output, every run — which
 * is what makes the audit trail meaningful and the demo repeatable.
 */
export class RulesExtractor implements Extractor {
  readonly name = 'RulesExtractor';

  constructor(private readonly rules: Rule[] = RULES) {}

  extract(paragraphs: IndexedParagraph[], documents: ParsedDocument[]): Entity[] {
    const byId = new Map(documents.map((d) => [d.id, d]));
    const entities: Entity[] = [];
    const seen = new Set<string>();
    let counter = 0;

    for (const paragraph of paragraphs) {
      const document = byId.get(paragraph.documentId);
      if (!document) continue;

      for (const rule of this.rules) {
        const { applies, contextConfirmed } = applicability(rule, paragraph);
        if (!applies) continue;

        for (const hit of rule.find(paragraph.text, { paragraph, document })) {
          // One paragraph asserting the same value twice is one fact, not two.
          const dedupeKey = `${paragraph.documentId}|${paragraph.paragraphId}|${hit.conceptKey}|${hit.normalizedValue}`;
          if (seen.has(dedupeKey)) continue;
          seen.add(dedupeKey);

          const benign =
            rule.benignContext && rule.benignContext.pattern.test(paragraph.text)
              ? {
                  patternId: rule.benignContext.id,
                  mode: rule.benignContext.mode,
                  note: rule.benignContext.note,
                }
              : undefined;

          entities.push({
            id: `ENT-${String(++counter).padStart(4, '0')}`,
            conceptKey: hit.conceptKey,
            category: rule.category,
            rawText: hit.rawText,
            normalizedValue: hit.normalizedValue,
            unit: hit.unit,
            extractorRule: rule.id,
            ruleSpecificity: rule.specificity,
            contextConfirmed,
            benign,
            attributes: hit.attributes,
            citation: {
              documentId: paragraph.documentId,
              documentType: paragraph.documentType,
              version: paragraph.version,
              author: paragraph.author,
              sectionId: paragraph.sectionId,
              sectionHeading: paragraph.sectionHeading,
              printedPage: paragraph.printedPage,
              pdfPage: paragraph.pdfPage,
              paragraphId: paragraph.paragraphId,
              snippet: buildSnippet(paragraph.text, hit.index, hit.rawText.length),
            },
          });
        }
      }
    }

    return entities;
  }
}

export { RULES, RULE_BY_ID } from './rules';
export type { Rule } from './rules';
