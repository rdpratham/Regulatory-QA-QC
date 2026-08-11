import { beforeAll, describe, expect, it } from 'vitest';
import { runPipeline, type CorpusFile } from '../../engine/pipeline';
import type { DocumentType, PipelineResult } from '../../engine/types';
import { loadDerivedCorpus } from '../../engine/__tests__/helpers';
import { EXAMPLE_QUESTIONS, ask, type AnswerBlock, type AssistantContext } from '../assistant';

/**
 * The assistant answers from the run or admits it cannot. Both halves are
 * load-bearing, and the second half is the one worth testing hardest: a
 * question-answering box that quietly produces something plausible for a
 * question it did not understand is worse than no box at all.
 */

const WANTED: DocumentType[] = ['SAP', 'TFL', 'IB'];

let context: AssistantContext;
let empty: AssistantContext;

beforeAll(async () => {
  const corpus = loadDerivedCorpus().filter((file) => WANTED.includes(file.descriptor.type));

  const perDocument: { key: DocumentType; result: PipelineResult | null }[] = [];
  for (const key of WANTED) {
    const file = corpus.find((f) => f.descriptor.type === key) as CorpusFile;
    const { result } = await runPipeline([file]);
    perDocument.push({ key, result });
  }
  const { result: cross } = await runPipeline(corpus);

  context = { perDocument, cross };
  empty = { perDocument: WANTED.map((key) => ({ key, result: null })), cross: null };
}, 120_000);

function textOf(blocks: AnswerBlock[]): string {
  return blocks
    .map((block) => (block.kind === 'text' || block.kind === 'note' ? block.text : ''))
    .join(' ')
    .toLowerCase();
}

function kinds(blocks: AnswerBlock[]): string[] {
  return blocks.map((block) => block.kind);
}

describe('admitting ignorance', () => {
  it('says it did not understand rather than answering anyway', () => {
    const answer = ask('what will the share price be next quarter', context);
    expect(answer.source).toBe('no match');
    expect(textOf(answer.blocks)).toContain('could not match');
    // No findings, values or stats — nothing that could be read as an answer.
    expect(kinds(answer.blocks).every((kind) => kind === 'text' || kind === 'note')).toBe(true);
  });

  it('offers what it can answer when it misses', () => {
    const answer = ask('zzzzz qqqqq', context);
    expect(answer.suggestions.length).toBeGreaterThan(0);
  });

  it('does not pretend to have read documents before a run', () => {
    const answer = ask('what is wrong with the SAP', empty);
    expect(textOf(answer.blocks)).toMatch(/not part of this run|nothing has been checked/);
  });

  it('still explains itself before a run', () => {
    const answer = ask('what do you check', empty);
    expect(answer.source).toBe('the ruleset');
    expect(kinds(answer.blocks)).toContain('checks');
  });
});

describe('answering from the run', () => {
  it('summarises the whole run with counts', () => {
    const answer = ask('what did you find overall', context);
    expect(answer.source).toBe('this run');
    expect(kinds(answer.blocks)).toContain('stats');
  });

  it('scopes to a named document', () => {
    const answer = ask('what is wrong with the TFL', context);
    expect(answer.source).toBe('the TFL run');
  });

  it('separates cross-document findings from internal ones', () => {
    const answer = ask('what disagrees between the documents', context);
    expect(answer.source).toBe('the cross-document pass');
    const findings = answer.blocks.find((b) => b.kind === 'findings');
    if (findings && findings.kind === 'findings') {
      expect(findings.findings.every((f) => f.scope === 'CROSS_DOCUMENT')).toBe(true);
    }
  });

  it('filters by severity when one is named', () => {
    const answer = ask('show me what must be fixed', context);
    const findings = answer.blocks.find((b) => b.kind === 'findings');
    expect(findings).toBeDefined();
    if (findings?.kind === 'findings') {
      expect(findings.findings.every((f) => f.severity === 'CRITICAL')).toBe(true);
    }
  });

  it('finds a value and cites every occurrence of it', () => {
    const answer = ask('how many patients', context);
    expect(answer.source).toBe('extracted values');
    const values = answer.blocks.find((b) => b.kind === 'values');
    expect(values).toBeDefined();
    if (values?.kind === 'values') {
      expect(values.rows.length).toBeGreaterThan(0);
      // A value without a citation is exactly the thing this must never emit.
      for (const row of values.rows) {
        expect(row.citation.documentType).toBeTruthy();
        expect(row.citation.sectionId).toBeTruthy();
      }
    }
  });

  it('never emits a value it did not read from a document', () => {
    for (const question of ['how many patients', 'what dose', 'what grading scale']) {
      const answer = ask(question, context);
      for (const block of answer.blocks) {
        if (block.kind !== 'values') continue;
        for (const row of block.rows) {
          const source = context.cross!.entities.find(
            (entity) =>
              entity.normalizedValue === row.value && entity.citation.snippet === row.citation.snippet,
          );
          expect(source, `no entity backs "${row.value}"`).toBeDefined();
        }
      }
    }
  });
});

describe('explaining itself', () => {
  it('defines a term without needing a run', () => {
    const answer = ask('what is a SAP', empty);
    expect(answer.source).toBe('the glossary');
    expect(textOf(answer.blocks)).toContain('statistical analysis plan');
  });

  it('does not mistake a definition question for a findings question', () => {
    expect(ask('what is a TFL', context).source).toBe('the glossary');
  });

  it('states its limits when asked', () => {
    const answer = ask('what do you not check', context);
    expect(answer.source).toBe('stated limits');
    expect(textOf(answer.blocks)).toContain('not a language model');
  });

  it('answers every question it advertises', () => {
    for (const question of EXAMPLE_QUESTIONS) {
      const answer = ask(question, context);
      expect(answer.source, `unanswered: ${question}`).not.toBe('no match');
      expect(answer.blocks.length).toBeGreaterThan(0);
    }
  });

  it('reports which handler produced the answer', () => {
    for (const question of EXAMPLE_QUESTIONS) {
      expect(ask(question, context).source).toBeTruthy();
    }
  });
});
