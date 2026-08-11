import { contentTokens, tidy } from '../normalize';
import type { Rule, RuleContext, RuleHit } from './types';

/**
 * Internal reference integrity.
 *
 * Two failures, one mechanism. A reference can point at a target that does not
 * exist, or — far more common and far harder to spot by reading — at a target
 * that exists but is not the one described. "See APPENDIX 1 for handling of
 * partial dates" resolves perfectly well; Appendix 1 is the visit-name table.
 *
 * The check compares the words of the reference's own description against the
 * heading it points at, and against every other heading in the document. If
 * some other section matches the description better than the cited one does,
 * the reference is stale — which is what happens to every cross-reference in a
 * document whose appendices were renumbered between drafts.
 *
 * References that resolve cleanly are emitted too. They are the true negatives,
 * and being able to say "we checked 23 internal references and 21 resolve" is
 * worth as much in the room as the two that do not.
 */

const REFERENCE = /\b(APPENDIX\s+\d+|Section\s+\d+(?:\.\d+)*)\b/gi;
const SUBJECT_CLAUSE = /\b(?:see|refer to)\s+(?:APPENDIX\s+\d+|Section\s+\d+(?:\.\d+)*)\s+for\s+([^.]{4,90})/gi;
/** "appendix 4: CTC Grading" — the form modification histories use. */
const NUMBERED_WITH_TITLE = /\bappendix\s+(\d+)\s*:\s*([A-Za-z][^,;.]{2,60}?)(?=\s+and\s+appendix\b|[,;.]|$)/gi;

function canonicalTarget(reference: string): string {
  const appendix = reference.match(/APPENDIX\s+(\d+)/i);
  if (appendix) return `APPENDIX ${appendix[1]}`;
  const section = reference.match(/Section\s+(\d+(?:\.\d+)*)/i);
  return section ? section[1] : reference.toUpperCase();
}

function headingFor(context: RuleContext, target: string): string | null {
  const section = context.document.sections.find(
    (s) => s.id.replace(/#\d+$/, '').toUpperCase() === target.toUpperCase(),
  );
  return section ? section.heading : null;
}

function overlap(subject: string[], heading: string): number {
  const headingTokens = contentTokens(heading);
  return subject.filter((token) =>
    headingTokens.some((other) => other.startsWith(token) || token.startsWith(other)),
  ).length;
}

function bestMatchingSection(
  context: RuleContext,
  subject: string[],
): { id: string; heading: string; score: number } | null {
  let best: { id: string; heading: string; score: number } | null = null;
  for (const section of context.document.sections) {
    const score = overlap(subject, section.heading);
    if (score === 0) continue;
    if (!best || score > best.score) {
      best = { id: section.id.replace(/#\d+$/, ''), heading: section.heading, score };
    }
  }
  return best;
}

function evaluate(
  context: RuleContext,
  target: string,
  subjectText: string | null,
  raw: string,
  index: number,
): RuleHit {
  const heading = headingFor(context, target);
  const base = {
    conceptKey: 'crossref.integrity',
    rawText: tidy(raw),
    index,
  };

  if (heading === null) {
    return {
      ...base,
      normalizedValue: `UNRESOLVED — ${target} does not exist in this document`,
      attributes: { expected: 'RESOLVED', target },
    };
  }

  if (subjectText) {
    const subject = contentTokens(subjectText);
    const citedScore = overlap(subject, heading);
    const best = bestMatchingSection(context, subject);
    if (best && best.score > citedScore && best.id.toUpperCase() !== target.toUpperCase()) {
      return {
        ...base,
        normalizedValue: `MISMATCH — ${target} is "${heading}", but "${tidy(subjectText)}" is ${best.id} "${best.heading}"`,
        attributes: { expected: 'RESOLVED', target, actualTarget: best.id },
      };
    }
  }

  return { ...base, normalizedValue: 'RESOLVED', attributes: { expected: 'RESOLVED', target } };
}

export const CROSSREF_RULES: Rule[] = [
  {
    id: 'crossref.reference_resolution',
    category: 'CROSSREF',
    description: 'Internal references resolved against the document section tree',
    specificity: 0.92,
    paragraphKind: 'PROSE',
    excludeSectionHeading: /TABLE OF CONTENTS/i,
    find: (text, context) => {
      const described = new Map<number, string>();
      const subjectRe = new RegExp(SUBJECT_CLAUSE.source, 'gi');
      let s: RegExpExecArray | null;
      while ((s = subjectRe.exec(text)) !== null) described.set(s.index, s[1]);

      const hits: RuleHit[] = [];
      const re = new RegExp(REFERENCE.source, 'gi');
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        // "appendix 4: CTC Grading" is handled by the rule below, which also
        // knows the title the author expected to find there.
        if (text[m.index + m[0].length] === ':') continue;

        let subject: string | null = null;
        for (const [start, clause] of described) {
          if (m.index >= start && m.index <= start + 40) subject = clause;
        }
        hits.push(evaluate(context, canonicalTarget(m[1]), subject, m[0], m.index));
      }
      return hits;
    },
  },
  {
    id: 'crossref.numbered_title_reference',
    category: 'CROSSREF',
    description: 'References naming both an appendix number and the title expected there',
    specificity: 0.94,
    paragraphKind: 'PROSE',
    find: (text, context) => {
      const hits: RuleHit[] = [];
      const re = new RegExp(NUMBERED_WITH_TITLE.source, 'gi');
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        hits.push(evaluate(context, `APPENDIX ${m[1]}`, m[2], m[0], m.index));
      }
      return hits;
    },
  },
];
