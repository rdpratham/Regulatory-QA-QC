import type {
  Citation,
  DocumentType,
  Entity,
  Finding,
  PipelineResult,
  Severity,
} from '../engine/types';
import { RULES } from '../engine/extract';
import { REQUIREMENTS } from '../engine/guidance';
import { CATEGORY_PLAIN, CHECK_PLAIN, DOC_PLAIN, GLOSSARY, SEVERITY_PLAIN } from './plain';

/**
 * THE ASSISTANT
 *
 * A question box over the run that has actually happened.
 *
 * There is no language model behind this and there is not going to be one: the
 * page runs offline inside a content security policy that forbids network
 * calls, and — more to the point — a regulatory reviewer cannot act on a
 * sentence that was generated rather than found. Every answer below is
 * assembled from the pipeline's own output, and every value it states carries
 * the document, section and page it was read from.
 *
 * The consequence is a hard limit and the interface says so: this understands
 * the vocabulary of the ruleset, not English. When it cannot match a question
 * it says it cannot, and shows what it does know how to answer, rather than
 * producing a fluent paragraph that happens to be wrong.
 */

/* ------------------------------------------------------------------ */
/* Shapes                                                              */
/* ------------------------------------------------------------------ */

export type ValueRow = {
  value: string;
  raw: string;
  citation: Citation;
};

export type AnswerBlock =
  | { kind: 'text'; text: string }
  /** A caveat. Always rendered quieter than the answer, never omitted. */
  | { kind: 'note'; text: string }
  | { kind: 'findings'; findings: Finding[]; total: number }
  | { kind: 'values'; concept: string; rows: ValueRow[]; agree: boolean }
  | { kind: 'checks'; ids: string[]; total: number }
  | { kind: 'stats'; rows: { label: string; value: string }[] };

export type Answer = {
  blocks: AnswerBlock[];
  /** Follow-up questions, offered as chips. */
  suggestions: string[];
  /** Which handler answered. Shown so the reader can see how it was derived. */
  source: string;
};

export type AssistantContext = {
  /** Per-document results, keyed by the slot they came from. */
  perDocument: { key: DocumentType; result: PipelineResult | null }[];
  /** The cross-document pass, once all three have been compared. */
  cross: PipelineResult | null;
};

/* ------------------------------------------------------------------ */
/* Query preparation                                                   */
/* ------------------------------------------------------------------ */

/**
 * Words that carry no signal in a question. Kept short on purpose: an
 * over-eager stop list throws away "not", "no" and "any", which are exactly
 * the words that flip a question's meaning.
 */
const NOISE = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'do', 'does', 'did', 'of', 'in',
  'on', 'for', 'to', 'and', 'or', 'me', 'my', 'i', 'you', 'it', 'this', 'that',
  'please', 'can', 'could', 'would', 'should', 'tell', 'show', 'give', 'about',
]);

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9%.\- ]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0 && !NOISE.has(token));
}

function has(query: string, ...patterns: (string | RegExp)[]): boolean {
  const lower = query.toLowerCase();
  return patterns.some((pattern) =>
    typeof pattern === 'string' ? lower.includes(pattern) : pattern.test(lower),
  );
}

/** Which document the question is about, if it named one. */
function scopeOf(query: string): DocumentType | null {
  if (has(query, /\bsap\b/, 'analysis plan', 'statistical plan')) return 'SAP';
  if (has(query, /\btfls?\b/, 'table', 'figure', 'listing', 'output')) return 'TFL';
  if (has(query, /\bib\b/, 'brochure', 'investigator')) return 'IB';
  if (has(query, 'protocol')) return 'PROTOCOL';
  return null;
}

/** Which severity the question is about, if it named one. */
function severityOf(query: string): Severity | null {
  if (has(query, 'critical', /must (be )?fix/, 'serious', 'worst', 'blocker', 'urgent', 'first'))
    return 'CRITICAL';
  if (has(query, 'major', /should (be )?fix/)) return 'MAJOR';
  if (has(query, 'minor', 'cosmetic', 'tidy', 'small')) return 'MINOR';
  return null;
}

/** Words that make a question about problems rather than about meanings. */
const FINDING_WORDS = /\b(wrong|problem|problems|issue|issues|finding|findings|error|errors|broken|risk|fix)\b/;

/**
 * A question asking what something *means*, as opposed to what is wrong with
 * it. "What is a TFL" and "what is wrong with the TFL" differ by one word and
 * want completely different answers, so the distinction is made once, here.
 */
function isDefinition(query: string): boolean {
  const lower = query.toLowerCase();
  if (FINDING_WORDS.test(lower)) return false;
  return (
    /\bwhat (is|are|was|were)\b/.test(lower) ||
    /\bwhat does\b[\s\S]*\bmean\b/.test(lower) ||
    /\b(define|meaning of|explain)\b/.test(lower)
  );
}

/**
 * Everyday words for things the ruleset names differently.
 *
 * This is the whole of the "natural language understanding": someone asking
 * about the kidney threshold will not type "creatinine clearance", and someone
 * asking how many people were in the trial will not type "sample_size".
 */
const SYNONYMS: Record<string, string[]> = {
  patient: ['sample_size', 'randomised', 'treated'],
  patients: ['sample_size', 'randomised', 'treated'],
  people: ['sample_size'],
  subjects: ['sample_size'],
  enrolled: ['sample_size', 'randomised'],
  size: ['sample_size'],
  many: ['sample_size'],
  dropout: ['dropout_rate'],
  dropouts: ['dropout_rate'],
  kidney: ['creatinine'],
  renal: ['creatinine'],
  heart: ['lvef'],
  cardiac: ['lvef'],
  fitness: ['ecog'],
  performance: ['ecog'],
  dictionary: ['dictionary_version', 'meddra'],
  meddra: ['dictionary_version'],
  ctcae: ['grading_scale'],
  grading: ['grading_scale'],
  severity: ['grading_scale'],
  significance: ['alpha'],
  'false-positive': ['alpha'],
  confidence: ['ci_level', 'default_ci_level', 'observed_interval'],
  interval: ['ci_level', 'observed_interval'],
  margin: ['equivalence'],
  equivalence: ['equivalence'],
  dose: ['dose_regimen', 'dose_intensity'],
  dosing: ['dose_regimen'],
  visit: ['visit_window'],
  window: ['visit_window'],
  windows: ['visit_window'],
  followup: ['safety_followup'],
  'follow-up': ['safety_followup'],
  cycle: ['cycle_interval', 'cycles'],
  cycles: ['cycle_interval', 'neoadjuvant_cycles'],
  age: ['min_age'],
  old: ['min_age'],
  blood: ['pk'],
  pharmacokinetic: ['pk'],
  'side-effect': ['teae', 'grading_scale'],
  adverse: ['teae', 'grading_scale'],
  program: ['source_program', 'identifier'],
  variable: ['identifier_spelling'],
  spelling: ['identifier_spelling', 'misspelling'],
  typo: ['misspelling', 'confusable'],
};

/** Splits an identifier into its words: `sample_size.planned` -> sample, size, planned. */
function segments(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter((part) => part.length >= 3);
}

function conceptTerms(tokens: string[]): string[] {
  const terms = new Set<string>();
  for (const token of tokens) {
    for (const part of segments(token)) terms.add(part);
    for (const expansion of SYNONYMS[token] ?? []) {
      for (const part of segments(expansion)) terms.add(part);
    }
  }
  return [...terms];
}

/* ------------------------------------------------------------------ */
/* Data helpers                                                        */
/* ------------------------------------------------------------------ */

function allFindings(context: AssistantContext): Finding[] {
  const byId = new Map<string, Finding>();
  for (const entry of context.perDocument) {
    for (const finding of entry.result?.findings ?? []) byId.set(finding.id, finding);
  }
  for (const finding of context.cross?.findings ?? []) byId.set(finding.id, finding);
  return [...byId.values()];
}

function allEntities(context: AssistantContext): Entity[] {
  const source = context.cross ?? null;
  if (source) return source.entities;
  return context.perDocument.flatMap((entry) => entry.result?.entities ?? []);
}

function hasRun(context: AssistantContext): boolean {
  return context.perDocument.some((entry) => entry.result) || context.cross !== null;
}

const SEVERITY_ORDER: Severity[] = ['CRITICAL', 'MAJOR', 'MINOR'];

function bySeverity(findings: Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );
}

function countSeverities(findings: Finding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { CRITICAL: 0, MAJOR: 0, MINOR: 0 };
  for (const finding of findings) counts[finding.severity] += 1;
  return counts;
}

function plainCounts(counts: Record<Severity, number>): string {
  return SEVERITY_ORDER.map(
    (severity) => `${counts[severity]} ${SEVERITY_PLAIN[severity].label.toLowerCase()}`,
  ).join(', ');
}

const NOT_RUN: Answer = {
  source: 'no run yet',
  blocks: [
    {
      kind: 'text',
      text: 'Nothing has been checked yet, so there is nothing for me to read. Add the documents on the dashboard and press “Check all three” — then ask me again.',
    },
  ],
  suggestions: ['What do you check?', 'What is a SAP?', 'What kinds of mistake do you look for?'],
};

/* ------------------------------------------------------------------ */
/* Handlers                                                            */
/* ------------------------------------------------------------------ */

type Handler = {
  id: string;
  /** 0 means "not this one". Higher wins. */
  score: (query: string, tokens: string[], context: AssistantContext) => number;
  run: (query: string, tokens: string[], context: AssistantContext) => Answer;
};

const HANDLERS: Handler[] = [
  /* ---------------- What do you check? ---------------------------- */
  {
    id: 'catalogue',
    score: (query) =>
      has(
        query,
        'what do you check',
        'what are you checking',
        'which errors',
        'what errors',
        'what checks',
        'what can you check',
        'what do you look',
        'capabilities',
        'coverage',
      )
        ? 10
        : 0,
    run: () => ({
      source: 'the ruleset',
      blocks: [
        {
          kind: 'text',
          text: `I run ${RULES.length} consistency checks and look for ${REQUIREMENTS.length} elements the published guidelines require. Every check runs against every paragraph of every document — nothing is sampled.`,
        },
        {
          kind: 'text',
          text: 'They all come down to five kinds of mistake: the same fact stated two different ways; arithmetic that does not reproduce when I redo it; a “see Section X” that leads somewhere else; something the guidelines require that I cannot find; and wording that quietly changes the meaning, like one abbreviation carrying two expansions.',
        },
        { kind: 'checks', ids: RULES.slice(0, 8).map((rule) => rule.id), total: RULES.length },
        {
          kind: 'note',
          text: 'The full catalogue, with what each check means in plain English, is on the “What we check” screen — including an honest list of what I do not check.',
        },
      ],
      suggestions: ['What do you not check?', 'What is wrong with the SAP?', 'Show me what must be fixed'],
    }),
  },

  /* ---------------- Limits ---------------------------------------- */
  {
    id: 'limits',
    score: (query) =>
      has(query, 'not check', "don't check", 'cannot check', 'limitation', 'what do you miss', 'weakness')
        ? 10
        : 0,
    run: () => ({
      source: 'stated limits',
      blocks: [
        {
          kind: 'text',
          text: 'I do not judge the science. Whether the trial design is sensible, whether the dose is right, whether the conclusion follows from the data — none of that is checked. I find places where the documents disagree with each other or with themselves.',
        },
        {
          kind: 'text',
          text: 'I read text, not pictures. A number that exists only inside a chart image is invisible to me.',
        },
        {
          kind: 'text',
          text: 'Some checks are keyed to particular phrasing. The structural ones — broken cross-references, one acronym with two meanings, gaps in a set of bands — work on any document. Checks looking for a specific claim will not match a document phrased differently, which is why every run reports how many checks matched. A short findings list is a coverage figure, not a clean bill of health.',
        },
        {
          kind: 'note',
          text: 'And I am not a language model. I match your question against the vocabulary of the ruleset and answer from the run. If I cannot match it, I will say so rather than guess.',
        },
      ],
      suggestions: ['What do you check?', 'How many checks matched?'],
    }),
  },

  /* ---------------- Overall status -------------------------------- */
  {
    id: 'status',
    score: (query, _tokens, context) => {
      if (!hasRun(context)) return 0;
      return has(
        query,
        'summary', 'summarise', 'summarize', 'overall', 'status', 'how did it go',
        'how bad', 'ready', 'submit', 'result', 'verdict', 'overview', 'how many findings',
      )
        ? 8
        : 0;
    },
    run: (_query, _tokens, context) => {
      if (!hasRun(context)) return NOT_RUN;
      const findings = allFindings(context);
      const counts = countSeverities(findings);
      const cross = (context.cross?.findings ?? []).filter((f) => f.scope === 'CROSS_DOCUMENT');
      const worst = bySeverity(findings).slice(0, 3);

      const headline =
        counts.CRITICAL > 0
          ? `${counts.CRITICAL} thing${counts.CRITICAL === 1 ? '' : 's'} must be fixed before this goes out.`
          : counts.MAJOR > 0
            ? 'Nothing here blocks a submission, but there are inconsistencies a reviewer would raise.'
            : 'No contradictions of consequence in what I read.';

      return {
        source: 'this run',
        blocks: [
          { kind: 'text', text: headline },
          {
            kind: 'stats',
            rows: [
              { label: 'Findings in total', value: String(findings.length) },
              { label: 'By severity', value: plainCounts(counts) },
              { label: 'Between documents', value: String(cross.length) },
              {
                label: 'Documents read',
                value: context.perDocument.filter((e) => e.result).map((e) => e.key).join(', ') || 'none',
              },
            ],
          },
          ...(worst.length > 0
            ? [{ kind: 'findings' as const, findings: worst, total: findings.length }]
            : []),
          {
            kind: 'note',
            text: 'Read a low count as “these checks found nothing”, not as “the documents are correct”. Ask me what I do not check.',
          },
        ],
        suggestions: [
          'What is wrong with the SAP?',
          'What disagrees between the documents?',
          'Show me what must be fixed',
        ],
      };
    },
  },

  /* ---------------- Cross-document -------------------------------- */
  {
    id: 'cross',
    score: (query, _tokens, context) => {
      if (!context.cross) return 0;
      return has(
        query,
        'between', 'disagree', 'differ', 'difference', 'compare', 'against each other',
        'match', 'conflict', 'contradict', 'inconsist',
      )
        ? 9
        : 0;
    },
    run: (_query, _tokens, context) => {
      const cross = (context.cross?.findings ?? []).filter((f) => f.scope === 'CROSS_DOCUMENT');
      if (cross.length === 0) {
        return {
          source: 'the cross-document pass',
          blocks: [
            {
              kind: 'text',
              text: 'Every fact that appears in more than one of these documents agreed. That is the check that matters most, and it passed.',
            },
            {
              kind: 'note',
              text: 'The findings in the per-document windows are internal to each file — a document contradicting itself rather than contradicting another.',
            },
          ],
          suggestions: ['What is wrong with the SAP?', 'How many checks matched?'],
        };
      }
      return {
        source: 'the cross-document pass',
        blocks: [
          {
            kind: 'text',
            text: `${cross.length} fact${cross.length === 1 ? ' is' : 's are'} stated one way in one document and another way in another. These cannot be found by reading any single document, which is the reason for comparing them.`,
          },
          { kind: 'findings', findings: bySeverity(cross), total: cross.length },
        ],
        suggestions: ['Show me what must be fixed', 'What is wrong with the TFL?'],
      };
    },
  },

  /* ---------------- One document ---------------------------------- */
  {
    id: 'document',
    score: (query) => {
      if (!scopeOf(query)) return 0;
      // "what is a SAP" wants the glossary, not a findings list.
      if (isDefinition(query)) return 0;
      return 7;
    },
    run: (query, _tokens, context) => {
      const scope = scopeOf(query)!;
      const entry = context.perDocument.find((e) => e.key === scope);
      if (!entry?.result) {
        return {
          source: 'this run',
          blocks: [
            {
              kind: 'text',
              text: `The ${scope} was not part of this run, so I have not read it. Add it on the dashboard and check again.`,
            },
          ],
          suggestions: ['What did you find overall?', `What is a ${scope}?`],
        };
      }

      const severity = severityOf(query);
      const findings = entry.result.findings.filter((f) => !severity || f.severity === severity);
      const counts = countSeverities(entry.result.findings);
      const document = entry.result.documents[0];

      return {
        source: `the ${scope} run`,
        blocks: [
          {
            kind: 'text',
            text:
              entry.result.findings.length === 0
                ? `Nothing contradictory inside the ${scope} on its own.`
                : `In the ${scope} (${DOC_PLAIN[scope].name}) I found ${plainCounts(counts)}.`,
          },
          {
            kind: 'stats',
            rows: [
              { label: 'Pages read', value: String(document?.pdfPageCount ?? 0) },
              { label: 'Sections found', value: String(document?.sections.length ?? 0) },
              { label: 'Facts pulled out', value: String(entry.result.entities.length) },
              {
                label: 'Checks that matched',
                value: `${new Set(entry.result.entities.map((e) => e.extractorRule)).size} of ${RULES.length}`,
              },
            ],
          },
          ...(findings.length > 0
            ? [{ kind: 'findings' as const, findings: bySeverity(findings), total: findings.length }]
            : severity
              ? [
                  {
                    kind: 'text' as const,
                    text: `Nothing at that level in the ${scope}.`,
                  },
                ]
              : []),
        ],
        suggestions: [
          `What is a ${scope}?`,
          'What disagrees between the documents?',
          'Show me what must be fixed',
        ],
      };
    },
  },

  /* ---------------- By severity ----------------------------------- */
  {
    id: 'severity',
    score: (query, _tokens, context) => (hasRun(context) && severityOf(query) ? 6 : 0),
    run: (query, _tokens, context) => {
      const severity = severityOf(query)!;
      const findings = allFindings(context).filter((f) => f.severity === severity);
      const plain = SEVERITY_PLAIN[severity];
      return {
        source: 'this run',
        blocks: [
          {
            kind: 'text',
            text:
              findings.length === 0
                ? `Nothing at that level. Nothing in this run is marked “${plain.label}”.`
                : `${findings.length} finding${findings.length === 1 ? '' : 's'} marked “${plain.label}”. ${plain.meaning}`,
          },
          ...(findings.length > 0
            ? [{ kind: 'findings' as const, findings, total: findings.length }]
            : []),
        ],
        suggestions: ['What did you find overall?', 'What disagrees between the documents?'],
      };
    },
  },

  /* ---------------- A specific value ------------------------------ */
  {
    id: 'concept',
    score: (_query, tokens, context) => {
      if (!hasRun(context)) return 0;
      const terms = conceptTerms(tokens);
      if (terms.length === 0) return 0;
      return matchEntities(allEntities(context), terms).length > 0 ? 5 : 0;
    },
    run: (_query, tokens, context) => {
      const terms = conceptTerms(tokens);
      const matches = matchEntities(allEntities(context), terms);

      // One block per concept, so "sample size" does not merge the planned
      // total with the number actually randomised — those are different facts
      // and showing them as one list would manufacture a disagreement.
      const byConcept = new Map<string, Entity[]>();
      for (const entity of matches) {
        const list = byConcept.get(entity.conceptKey) ?? [];
        list.push(entity);
        byConcept.set(entity.conceptKey, list);
      }

      const blocks: AnswerBlock[] = [];
      let disagreements = 0;

      for (const [concept, entities] of [...byConcept.entries()].slice(0, 4)) {
        const rows: ValueRow[] = entities.slice(0, 8).map((entity) => ({
          value: entity.normalizedValue,
          raw: entity.rawText,
          citation: entity.citation,
        }));
        const agree = new Set(entities.map((e) => e.normalizedValue)).size === 1;
        if (!agree) disagreements += 1;
        blocks.push({ kind: 'values', concept, rows, agree });
      }

      blocks.unshift({
        kind: 'text',
        text:
          disagreements > 0
            ? `Found it — and it does not agree everywhere. ${disagreements} of the ${byConcept.size} concept${byConcept.size === 1 ? '' : 's'} I matched is stated more than one way.`
            : `Here is what the documents say, with where each value came from. Every occurrence I found agrees.`,
      });

      blocks.push({
        kind: 'note',
        text: 'Each line is quoted from the document at the page shown. Nothing here is inferred.',
      });

      return {
        source: 'extracted values',
        blocks,
        suggestions: ['What did you find overall?', 'Show me what must be fixed'],
      };
    },
  },

  /* ---------------- Glossary -------------------------------------- */
  {
    id: 'glossary',
    score: (query, tokens) => {
      if (glossaryHits(query, tokens).length === 0) return 0;
      // "what is a TFL" is a definition; "TFL sample size" is a lookup.
      return isDefinition(query) ? 8 : 4;
    },
    run: (query: string, tokens: string[]) => {
      const hits = glossaryHits(query, tokens);
      const blocks: AnswerBlock[] = hits.slice(0, 4).map((entry) => ({
        kind: 'text',
        text: `${entry.term} — ${entry.plain}`,
      }));

      // A document type gets its stakes as well: what it is matters less than
      // why an error in it is expensive.
      const scope = scopeOf(query);
      if (scope && DOC_PLAIN[scope]) {
        blocks.push({ kind: 'text', text: `In other words: ${DOC_PLAIN[scope].analogy}` });
        blocks.push({ kind: 'note', text: `Why an error there is expensive — ${DOC_PLAIN[scope].stakes}` });
      }

      return {
        source: 'the glossary',
        blocks,
        suggestions: scope
          ? [`What is wrong with the ${scope}?`, 'What do you check?']
          : ['What do you check?', 'What did you find overall?'],
      };
    },
  },

  /* ---------------- Category -------------------------------------- */
  {
    id: 'category',
    score: (query, _tokens, context) => {
      if (!hasRun(context)) return 0;
      return categoryHit(query) ? 3 : 0;
    },
    run: (query, _tokens, context) => {
      const category = categoryHit(query)!;
      const plain = CATEGORY_PLAIN[category];
      const findings = allFindings(context).filter((f) => f.category === category);
      const checks = RULES.filter((rule) => rule.category === category);
      return {
        source: `checks in “${plain.label}”`,
        blocks: [
          { kind: 'text', text: `${plain.label} — ${plain.question}` },
          { kind: 'checks', ids: checks.map((rule) => rule.id), total: checks.length },
          ...(findings.length > 0
            ? [{ kind: 'findings' as const, findings: bySeverity(findings), total: findings.length }]
            : [
                {
                  kind: 'text' as const,
                  text: 'None of those checks found anything in this run.',
                },
              ]),
        ],
        suggestions: ['What do you check?', 'What did you find overall?'],
      };
    },
  },
];

/* ------------------------------------------------------------------ */
/* Matching helpers                                                    */
/* ------------------------------------------------------------------ */

/**
 * Matches a question against the vocabulary of the ruleset — concept keys and
 * rule ids — and never against the documents' own prose.
 *
 * The distinction is what stops "what will the share price be next quarter"
 * from being answered with a table of extracted values because the word
 * "quarter" happened to appear in a paragraph. A word only counts when it is
 * one of the words the ruleset itself uses to name a thing.
 */
function matchEntities(entities: Entity[], terms: string[]): Entity[] {
  const scored = entities
    .map((entity) => {
      const vocabulary = new Set(segments(`${entity.conceptKey} ${entity.extractorRule}`));
      let score = 0;
      for (const term of terms) if (vocabulary.has(term)) score += 1;
      return { entity, score };
    })
    .filter((row) => row.score > 0);

  if (scored.length === 0) return [];
  const best = Math.max(...scored.map((row) => row.score));
  return scored.filter((row) => row.score === best).map((row) => row.entity);
}

function glossaryHits(query: string, tokens: string[]): typeof GLOSSARY {
  const lower = query.toLowerCase();
  return GLOSSARY.filter((entry) => {
    const term = entry.term.toLowerCase().replace(/\s*\(.*\)/, '');
    if (term.length <= 4) {
      // Short acronyms must match as whole words, or "ib" matches "distribute".
      return tokens.includes(term) || new RegExp(`\\b${term}\\b`).test(lower);
    }
    return lower.includes(term);
  });
}

function categoryHit(query: string) {
  const entries = Object.entries(CATEGORY_PLAIN) as [
    keyof typeof CATEGORY_PLAIN,
    (typeof CATEGORY_PLAIN)[keyof typeof CATEGORY_PLAIN],
  ][];
  const lower = query.toLowerCase();
  for (const [category, plain] of entries) {
    const words = plain.label.toLowerCase().split(/\s+and\s+|\s+/);
    if (words.some((word) => word.length > 4 && lower.includes(word))) return category;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

export const EXAMPLE_QUESTIONS = [
  'What did you find overall?',
  'What is wrong with the SAP?',
  'What disagrees between the documents?',
  'Show me what must be fixed',
  'How many patients?',
  'What do you check?',
  'What is a TFL?',
  'What do you not check?',
];

/**
 * Answers a question from the run, or says plainly that it cannot.
 *
 * The fallback is the important part. A question this does not understand
 * produces an admission and a list of what it can answer — never a
 * confident-sounding paragraph assembled from whatever matched loosely.
 */
export function ask(query: string, context: AssistantContext): Answer {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      source: 'nothing asked',
      blocks: [{ kind: 'text', text: 'Ask me something about the documents you just checked.' }],
      suggestions: EXAMPLE_QUESTIONS.slice(0, 4),
    };
  }

  const tokens = tokenize(trimmed);
  let best: { handler: Handler; score: number } | null = null;
  for (const handler of HANDLERS) {
    const score = handler.score(trimmed, tokens, context);
    if (score > 0 && (!best || score > best.score)) best = { handler, score };
  }

  if (!best) {
    const ran = hasRun(context);
    return {
      source: 'no match',
      blocks: [
        {
          kind: 'text',
          text: 'I could not match that to anything in the run. I am not a language model — I look your question up against the vocabulary of the ruleset and the values I extracted, so I would rather tell you I missed than answer confidently and be wrong.',
        },
        {
          kind: 'note',
          text: ran
            ? 'Try naming a document (SAP, TFLs, IB), a severity, or a specific thing like a dose, a sample size or a dictionary version.'
            : 'Nothing has been checked yet either — add the documents on the dashboard and press “Check all three”.',
        },
      ],
      suggestions: EXAMPLE_QUESTIONS.slice(0, 5),
    };
  }

  return best.handler.run(trimmed, tokens, context);
}

/** Plain description of a check id, for rendering a `checks` block. */
export function describeCheck(id: string): string {
  return CHECK_PLAIN[id] ?? RULES.find((rule) => rule.id === id)?.description ?? id;
}
