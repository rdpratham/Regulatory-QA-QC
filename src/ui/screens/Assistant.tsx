import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { CornerDownLeft, Info, MessageSquare } from 'lucide-react';
import type { DocumentType } from '../../engine/types';
import { SLOT_KEYS, useStore } from '../../store';
import { BRAND_BLUE } from '../brand';
import {
  EXAMPLE_QUESTIONS,
  ask,
  describeCheck,
  type Answer,
  type AnswerBlock,
  type AssistantContext,
} from '../assistant';
import { CitationRef, Panel } from '../components/primitives';
import { PlainFinding } from '../components/PlainFinding';

/**
 * The question box.
 *
 * Deliberately not styled as a messaging app. Speech bubbles and a typing
 * indicator would borrow the manner of a chatbot without the substance, and
 * the substance here is that every answer is looked up rather than composed.
 * A question is a heading; the answer is a document under it, with citations.
 */

type Turn = { id: number; question: string; answer: Answer };

export function Assistant() {
  const slots = useStore((s) => s.slots);
  const cross = useStore((s) => s.result);

  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);

  const context: AssistantContext = useMemo(
    () => ({
      perDocument: SLOT_KEYS.map((key) => ({
        key: key as DocumentType,
        result: slots[key].result,
      })),
      cross,
    }),
    [slots, cross],
  );

  // Newest turn is appended, so the transcript reads top to bottom like a
  // record. Scroll follows it rather than the reader having to hunt.
  useEffect(() => {
    if (turns.length > 0) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns.length]);

  const submit = (question: string) => {
    const trimmed = question.trim();
    if (!trimmed) return;
    setTurns((previous) => [
      ...previous,
      { id: nextId.current++, question: trimmed, answer: ask(trimmed, context) },
    ]);
    setDraft('');
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit(draft);
  };

  const ready = SLOT_KEYS.some((key) => slots[key].result);

  return (
    <div className="space-y-4">
      <Panel title="Ask about these documents">
        <div className="px-4 py-3">
          <p className="text-[13px] leading-relaxed text-ink">
            Ask a question in your own words. Every answer is assembled from the run you just did —
            the values, the findings and the checks — and carries the page each value came from.
          </p>
          <p className="mt-2 flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-muted">
            <Info size={13} aria-hidden className="mt-0.5 shrink-0" style={{ color: BRAND_BLUE }} />
            <span>
              There is no language model behind this, and that is the point. It looks your question
              up against the vocabulary of the ruleset and answers from what was actually extracted,
              so it can miss a question — but it cannot invent a number. When it does not understand
              you, it says so.
            </span>
          </p>
          {!ready && (
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-faint">
              Nothing has been checked yet. It can still answer questions about what it checks and
              what the terms mean.
            </p>
          )}
        </div>
      </Panel>

      {turns.length === 0 ? (
        <Panel title="Try one of these">
          <div className="flex flex-wrap gap-2 px-4 py-3">
            {EXAMPLE_QUESTIONS.map((question) => (
              <Chip key={question} label={question} onClick={() => submit(question)} />
            ))}
          </div>
        </Panel>
      ) : (
        <div className="space-y-4">
          {turns.map((turn) => (
            <Panel key={turn.id}>
              <div className="border-b bg-sunken px-4 py-2.5 rule">
                <div className="flex items-start gap-2">
                  <MessageSquare
                    size={13}
                    aria-hidden
                    className="mt-[3px] shrink-0"
                    style={{ color: BRAND_BLUE }}
                  />
                  <p className="text-[13px] font-medium leading-snug text-ink">{turn.question}</p>
                </div>
              </div>

              <div className="space-y-3 px-4 py-3">
                {turn.answer.blocks.map((block, index) => (
                  <Block key={index} block={block} />
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t px-4 py-2.5 rule">
                <span className="label shrink-0">Next</span>
                {turn.answer.suggestions.map((question) => (
                  <Chip key={question} label={question} onClick={() => submit(question)} small />
                ))}
                <span className="mono ml-auto text-[10.5px] text-ink-faint">
                  answered from {turn.answer.source}
                </span>
              </div>
            </Panel>
          ))}
          <div ref={endRef} />
        </div>
      )}

      <form onSubmit={onSubmit} className="flex gap-2 no-print">
        <input
          className="field flex-1"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="e.g. what is wrong with the SAP?"
          aria-label="Ask a question about these documents"
        />
        <button
          type="submit"
          className="shrink-0 px-4 py-2 text-[12.5px] font-medium text-white disabled:opacity-40"
          style={{ background: BRAND_BLUE }}
          disabled={!draft.trim()}
        >
          <span className="inline-flex items-center gap-1.5">
            Ask
            <CornerDownLeft size={12} aria-hidden />
          </span>
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Blocks                                                              */
/* ------------------------------------------------------------------ */

function Block({ block }: { block: AnswerBlock }) {
  switch (block.kind) {
    case 'text':
      return <p className="text-[12.5px] leading-relaxed text-ink">{block.text}</p>;

    case 'note':
      return (
        <p className="border-l pl-3 text-[11.5px] leading-relaxed text-ink-muted rule">
          {block.text}
        </p>
      );

    case 'stats':
      return (
        <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {block.rows.map((row) => (
            <div key={row.label} className="flex items-baseline gap-2">
              <dt className="label shrink-0">{row.label}</dt>
              <dd className="text-[12px] text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
      );

    case 'values':
      return (
        <div className="border rule">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b bg-sunken px-3 py-2 rule">
            <span className="mono text-[11.5px] text-ink">{block.concept}</span>
            <span
              className="doctype"
              style={{ color: block.agree ? 'var(--ink-muted)' : 'var(--critical)' }}
            >
              {block.agree ? 'all occurrences agree' : 'occurrences disagree'}
            </span>
          </div>
          <ul className="divide-y rule">
            {block.rows.map((row, index) => (
              <li key={index} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3 py-2">
                <span className="mono text-[12.5px] text-ink">{row.value}</span>
                {row.raw !== row.value && (
                  <span className="text-[11.5px] text-ink-faint">read as “{row.raw}”</span>
                )}
                <span className="ml-auto">
                  <CitationRef citation={row.citation} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      );

    case 'checks':
      return (
        <div>
          <ul className="space-y-1.5">
            {block.ids.map((id) => (
              <li key={id} className="flex items-start gap-2">
                <span
                  aria-hidden
                  className="mt-[6px] inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: BRAND_BLUE }}
                />
                <span className="text-[12px] leading-relaxed text-ink-muted">
                  {describeCheck(id)}
                </span>
              </li>
            ))}
          </ul>
          {block.total > block.ids.length && (
            <p className="mt-2 text-[11.5px] text-ink-faint">
              {block.total - block.ids.length} more on the “What we check” screen.
            </p>
          )}
        </div>
      );

    case 'findings':
      return (
        <div className="border rule">
          <div className="border-b bg-sunken px-3 py-2 rule">
            <span className="label">
              {block.findings.length === block.total
                ? `${block.total} finding${block.total === 1 ? '' : 's'}`
                : `${block.findings.length} of ${block.total} findings, worst first`}
            </span>
          </div>
          <div className="divide-y rule">
            {block.findings.map((finding) => (
              <PlainFinding key={finding.id} finding={finding} />
            ))}
          </div>
        </div>
      );
  }
}

function Chip({
  label,
  onClick,
  small,
}: {
  label: string;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border bg-raised text-ink-muted hover:bg-sunken hover:text-ink rule ${
        small ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-[12px]'
      }`}
    >
      {label}
    </button>
  );
}
