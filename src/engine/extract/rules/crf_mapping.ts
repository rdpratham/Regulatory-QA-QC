import { contentTokens, tidy } from '../normalize';
import type { Rule, RuleContext, RuleHit } from './types';

/**
 * eCRF page names quoted in prose.
 *
 * A statistical analysis plan names the pages it will read data from. Where it
 * names the same page two ways — "pCR page" in one section and "Pathological
 * Complete Response page" in another — a programmer has to guess, and a
 * reviewer cannot confirm the mapping without opening the database.
 *
 * Extraction only lifts the names out. Deciding which names denote the same
 * page is a clustering problem that needs every name at once, so it happens in
 * compare.ts; the tokens each name reduces to travel along in the entity.
 */

const PAGE_REFERENCE = /((?:[A-Za-z(][A-Za-z0-9()\-]*\s+){1,5})(?:eCRF\s+)?page\b/g;

const ARTICLES = new Set(['the', 'a', 'an', 'this', 'that', 'these', 'those', 'each']);

/**
 * Walks back from the word "page" and keeps the run of words that names it.
 *
 * In this register a page is always introduced by an article — "the RESPONSE
 * page", "on the End of Study eCRF page" — so the name is everything after the
 * last article. Anchoring on the article rather than on capitalisation is what
 * stops "Where the RESPONSE page has not been completed" yielding "Where the
 * RESPONSE": the sentence's first word is capitalised too.
 *
 * Where no article appears (a bare "page completion"), leading lower-case words
 * are stripped instead, which leaves nothing and the candidate is discarded.
 */
function extractName(prefix: string): string | null {
  let tokens = prefix.trim().split(/\s+/).filter(Boolean);
  tokens = tokens.filter((t) => !/^ecrf$/i.test(t));

  let lastArticle = -1;
  tokens.forEach((token, i) => {
    if (ARTICLES.has(token.toLowerCase())) lastArticle = i;
  });

  // No article means this is not a page being named — "prevent page completion",
  // "a page-prefixed field code". Discard rather than guess.
  if (lastArticle < 0) return null;
  tokens = tokens.slice(lastArticle + 1);

  if (tokens.length === 0) return null;
  const name = tokens.join(' ').replace(/[,;:]$/, '').trim();
  return name.length >= 2 ? name : null;
}

/**
 * Replaces acronyms with the expansion the document itself declares — but only
 * where the acronym stands for the whole page name ("pCR page", "CRDAT page")
 * or is parenthesised ("End of Study (EOS) page").
 *
 * Expanding acronyms that merely appear inside a longer name would be worse
 * than not expanding at all: "IP infusion" would become "investigational
 * product infusion" in the document that happens to carry an abbreviation table
 * and stay "IP infusion" in the one that does not, and the two would stop
 * clustering with each other.
 */
function expandAcronyms(name: string, context: RuleContext): string {
  const table = new Map(
    context.document.abbreviations.map((a) => [a.acronym.toLowerCase(), a.expansion]),
  );
  const tokens = name.split(/\s+/);

  return tokens
    .map((token) => {
      const parenthesised = /^\(.*\)$/.test(token);
      if (tokens.length > 1 && !parenthesised) return token;
      const expansion = table.get(token.replace(/[()]/g, '').toLowerCase());
      return expansion ?? token;
    })
    .join(' ');
}

export const CRF_MAPPING_RULES: Rule[] = [
  {
    id: 'crf_mapping.page_reference',
    category: 'CRF_MAPPING',
    description: 'Named eCRF page referenced in prose',
    specificity: 0.8,
    paragraphKind: 'PROSE',
    excludeSectionHeading: /TABLE OF CONTENTS|ABBREVIATION/i,
    find: (text, context) => {
      const hits: RuleHit[] = [];
      const seen = new Set<string>();
      const re = new RegExp(PAGE_REFERENCE.source, 'g');
      let m: RegExpExecArray | null;

      while ((m = re.exec(text)) !== null) {
        const name = extractName(m[1]);
        if (!name) continue;
        if (seen.has(name)) continue;
        seen.add(name);

        const tokens = [...new Set(contentTokens(expandAcronyms(name, context)))];
        if (tokens.length === 0) continue;

        hits.push({
          conceptKey: 'crf_page.reference',
          rawText: tidy(m[0]),
          normalizedValue: name,
          index: m.index,
          attributes: { tokens: tokens.join('|') },
        });
      }
      return hits;
    },
  },
];
