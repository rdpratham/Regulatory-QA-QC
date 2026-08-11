import { useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  CircleAlert,
  FileText,
  Layers,
  Loader2,
  Play,
  Trash2,
  Upload,
} from 'lucide-react';
import { RULES } from '../../engine/extract';
import type { Finding, Severity } from '../../engine/types';
import { SLOT_KEYS, readPdfFiles, useStore, type SlotState } from '../../store';
import { BRAND_BLUE } from '../brand';
import { DOC_PLAIN, SEVERITY_PLAIN, plainVerdict, plainWhatHappened } from '../plain';
import { Panel, SEVERITY_COLOR } from '../components/primitives';
import { PlainFinding } from '../components/PlainFinding';

const SEVERITIES: Severity[] = ['CRITICAL', 'MAJOR', 'MINOR'];

const PLANNED_STAGES: { key: string; plain: string }[] = [
  { key: 'INGEST', plain: 'Reading the file, word by word, with the position of every word' },
  { key: 'DEBOILERPLATE', plain: 'Ignoring watermarks, headers and footers so they are not mistaken for content' },
  { key: 'STRUCTURE', plain: 'Rebuilding the section list and matching printed page numbers to PDF pages' },
  { key: 'EXTRACT', plain: 'Pulling out every checkable fact — counts, doses, thresholds, dates, names' },
  { key: 'COMPARE', plain: 'Redoing the document’s own sums and following its internal references' },
  { key: 'SCORE', plain: 'Ranking what was found by how much it matters' },
];

export function Dashboard({ onOpenWorkbench }: { onOpenWorkbench: () => void }) {
  const slots = useStore((s) => s.slots);
  const runAllSlots = useStore((s) => s.runAllSlots);
  const loadSampleIntoSlots = useStore((s) => s.loadSampleIntoSlots);
  const crossStatus = useStore((s) => s.crossStatus);
  const crossResult = useStore((s) => s.result);
  const session = useStore((s) => s.session);

  const ready = SLOT_KEYS.filter((key) => slots[key].file);
  const running = SLOT_KEYS.some((key) => slots[key].status === 'RUNNING') || crossStatus === 'RUNNING';
  const anyDone = SLOT_KEYS.some((key) => slots[key].status === 'DONE');

  const timing = useMemo(() => {
    const done = SLOT_KEYS.map((key) => slots[key]).filter(
      (slot) => slot.startedAt !== null && slot.finishedAt !== null,
    );
    if (done.length < 2) return null;
    const first = Math.min(...done.map((s) => s.startedAt!));
    const last = Math.max(...done.map((s) => s.finishedAt!));
    const wall = last - first;
    const summed = done.reduce((total, s) => total + (s.finishedAt! - s.startedAt!), 0);
    return { wall, summed, count: done.length };
  }, [slots]);

  return (
    <div className="space-y-4">
      {/* -------------------------------------------------------- */}
      {/* Orientation                                              */}
      {/* -------------------------------------------------------- */}
      <Panel title="What happens here">
        <div className="px-4 py-3">
          <p className="text-[13px] leading-relaxed text-ink">
            {session ? `${session.displayName.split(' ')[0]}, add` : 'Add'} the three documents
            below. Each one is read and checked on its own — all three at the same time, each in its
            own window — and then the three are compared against each other.
          </p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">
            You do not need a clinical background to read the results. Every finding is written
            twice: once in the words the document uses, and once in plain English, with the exact
            page it came from so you can check it yourself.
          </p>
        </div>
      </Panel>

      {/* -------------------------------------------------------- */}
      {/* Upload slots                                             */}
      {/* -------------------------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-3">
        {SLOT_KEYS.map((key) => (
          <SlotCard key={key} slot={slots[key]} />
        ))}
      </div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="text-[12.5px] text-ink">
              {ready.length === 0
                ? 'Add at least one document to run a check.'
                : `${ready.length} of 3 documents ready — ${ready.join(', ')}.`}
            </div>
            <div className="mt-0.5 text-[11.5px] text-ink-faint">
              {ready.length < 2
                ? 'With one document you get its internal contradictions. Two or more also gets you the disagreements between them, which is where the expensive findings are.'
                : 'The three run concurrently; the comparison between them runs once they finish.'}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="btn no-print"
              onClick={() => void loadSampleIntoSlots()}
              disabled={running}
            >
              Load the sample study
            </button>
            <button
              type="button"
              className="px-4 py-2 text-[12.5px] font-medium text-white disabled:opacity-40"
              style={{ background: BRAND_BLUE }}
              onClick={() => void runAllSlots()}
              disabled={running || ready.length === 0}
            >
              <span className="inline-flex items-center gap-1.5">
                {running ? (
                  <Loader2 size={12} aria-hidden className="animate-spin" />
                ) : (
                  <Play size={12} aria-hidden />
                )}
                {running ? 'Checking…' : anyDone ? 'Run again' : 'Check all three'}
              </span>
            </button>
          </div>
        </div>
      </Panel>

      {/* -------------------------------------------------------- */}
      {/* Three windows                                            */}
      {/* -------------------------------------------------------- */}
      {(running || anyDone) && (
        <div className="grid items-start gap-4 lg:grid-cols-3">
          {SLOT_KEYS.map((key) => (
            <DocumentWindow key={key} slot={slots[key]} />
          ))}
        </div>
      )}

      {timing && (
        <Panel title="They really did run at the same time">
          <div className="px-4 py-3">
            <p className="text-[12.5px] leading-relaxed text-ink">
              {timing.count} documents finished in{' '}
              <span className="mono">{(timing.wall / 1000).toFixed(1)}s</span> of wall clock, against{' '}
              <span className="mono">{(timing.summed / 1000).toFixed(1)}s</span> of work summed
              across them. Run one after another, the same work would have taken the larger number.
            </p>
          </div>
        </Panel>
      )}

      {/* -------------------------------------------------------- */}
      {/* Cross-document pass                                      */}
      {/* -------------------------------------------------------- */}
      {(crossStatus === 'RUNNING' || crossResult) && (
        <Panel
          title="And now the three compared against each other"
          actions={
            crossResult ? (
              <button type="button" className="btn no-print" onClick={onOpenWorkbench}>
                <span className="inline-flex items-center gap-1.5">
                  Open the full workbench
                  <ArrowRight size={12} aria-hidden />
                </span>
              </button>
            ) : undefined
          }
        >
          {crossStatus === 'RUNNING' && (
            <p className="flex items-center gap-2 px-4 py-3 text-[12.5px] text-ink-muted">
              <Loader2 size={13} aria-hidden className="animate-spin" />
              Comparing every fact that appears in more than one of the documents…
            </p>
          )}

          {crossResult && (
            <div className="px-4 py-3">
              <CrossSummary findings={crossResult.findings} />
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Upload slot                                                        */
/* ------------------------------------------------------------------ */

function SlotCard({ slot }: { slot: SlotState }) {
  const setSlotFile = useStore((s) => s.setSlotFile);
  const clearSlot = useStore((s) => s.clearSlot);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string | null>(null);

  const plain = DOC_PLAIN[slot.key];

  const accept = async (list: FileList | File[]) => {
    const files = await readPdfFiles(list);
    if (files.length === 0) {
      setRejected('That file was not a PDF. Only PDFs can be read.');
      return;
    }
    setRejected(null);
    const [file] = files;
    // The slot decides what the document is, not the filename. Someone who
    // drops a file onto the SAP slot has said it is the SAP.
    setSlotFile(slot.key, {
      ...file,
      descriptor: { ...file.descriptor, id: `DOC-${slot.key}`, type: slot.key },
    });
  };

  return (
    <section className="border bg-raised rule">
      <header className="border-b px-4 py-3 rule">
        <div className="flex items-baseline gap-2">
          <span className="doctype" style={{ color: BRAND_BLUE }}>
            {slot.key}
          </span>
          <span className="text-[13px] font-medium text-ink">{plain.name}</span>
        </div>
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">{plain.what}</p>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-faint">
          <span className="label">In other words </span>
          {plain.analogy}
        </p>
      </header>

      <div className="px-4 py-3">
        {slot.file ? (
          <div className="flex items-start gap-3">
            <FileText size={16} className="mt-0.5 shrink-0 text-ink-faint" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] text-ink">{slot.file.descriptor.fileName}</div>
              <div className="mono mt-0.5 text-[11px] text-ink-faint">
                {(slot.file.data.byteLength / 1024).toFixed(0)} KB · read in this tab, not uploaded
              </div>
            </div>
            <button
              type="button"
              className="btn shrink-0 no-print"
              aria-label={`Remove the ${slot.key} document`}
              onClick={() => clearSlot(slot.key)}
              disabled={slot.status === 'RUNNING'}
            >
              <Trash2 size={12} aria-hidden />
            </button>
          </div>
        ) : (
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              void accept(event.dataTransfer.files);
            }}
            className={`border border-dashed px-4 py-6 text-center rule ${dragging ? 'bg-sunken' : ''}`}
          >
            <Upload size={16} className="mx-auto text-ink-faint" aria-hidden />
            <p className="mt-2 text-[12px] text-ink">
              Drop the {slot.key} PDF here, or{' '}
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={() => inputRef.current?.click()}
              >
                choose a file
              </button>
              .
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              onChange={(event) => {
                if (event.target.files) void accept(event.target.files);
                event.target.value = '';
              }}
            />
            {rejected && (
              <p className="mt-2 text-[11.5px]" style={{ color: 'var(--critical)' }}>
                {rejected}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Result window                                                      */
/* ------------------------------------------------------------------ */

function DocumentWindow({ slot }: { slot: SlotState }) {
  const plain = DOC_PLAIN[slot.key];
  const findings = slot.result?.findings ?? [];

  const counts = useMemo(() => {
    const base: Record<Severity, number> = { CRITICAL: 0, MAJOR: 0, MINOR: 0 };
    for (const finding of findings) base[finding.severity] += 1;
    return base;
  }, [findings]);

  const verdict = plainVerdict(counts);
  const seconds =
    slot.startedAt && slot.finishedAt ? ((slot.finishedAt - slot.startedAt) / 1000).toFixed(1) : null;

  return (
    <section className="flex min-w-0 flex-col border bg-raised rule">
      {/* Title bar */}
      <header className="flex items-center justify-between gap-2 border-b bg-sunken px-3 py-2 rule">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="doctype" style={{ color: BRAND_BLUE }}>
            {slot.key}
          </span>
          <span className="truncate text-[12px] text-ink">{plain.name}</span>
        </div>
        <StatusPill slot={slot} />
      </header>

      {slot.status === 'EMPTY' && (
        <p className="px-4 py-8 text-center text-[12px] text-ink-faint">
          No {slot.key} document added.
        </p>
      )}

      {(slot.status === 'RUNNING' || slot.status === 'READY') && (
        <ol className="divide-y rule">
          {PLANNED_STAGES.map((planned, index) => {
            const done = slot.stages.find((s) => s.key === planned.key);
            const active = slot.status === 'RUNNING' && !done && slot.stages.length === index;
            return (
              <li
                key={planned.key}
                className={`relative flex items-start gap-2.5 overflow-hidden px-3 py-2.5 ${
                  active ? 'stage-active' : ''
                }`}
              >
                <span className="mt-0.5 w-3.5 shrink-0">
                  {done ? (
                    <Check size={13} aria-hidden className="text-ink" />
                  ) : (
                    <span className="mono text-[10.5px] text-ink-faint">{index + 1}</span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`text-[12px] leading-snug ${done ? 'text-ink' : 'text-ink-faint'}`}>
                    {planned.plain}
                  </span>
                  {done && (
                    <span className="mono mt-0.5 block text-[11px] leading-snug text-ink-muted">
                      {done.detail}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {slot.status === 'FAILED' && (
        <p className="flex items-start gap-2 px-3 py-3 text-[12px] text-ink">
          <CircleAlert size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--critical)' }} />
          {slot.error}
        </p>
      )}

      {slot.status === 'DONE' && slot.result && (
        <>
          {/* Verdict */}
          <div
            className="border-b px-3 py-3 rule"
            style={{
              borderLeft: `3px solid ${
                verdict.tone === 'bad'
                  ? 'var(--critical)'
                  : verdict.tone === 'watch'
                    ? 'var(--major)'
                    : 'var(--minor)'
              }`,
            }}
          >
            <div className="text-[13px] font-medium leading-snug text-ink">{verdict.headline}</div>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">{verdict.detail}</p>
            <div className="mt-2.5 space-y-1">
              {SEVERITIES.map((severity) => (
                <div key={severity} className="flex items-baseline gap-2">
                  <span
                    aria-hidden
                    className="inline-block h-2.5 w-[3px] shrink-0 translate-y-[1px]"
                    style={{ background: counts[severity] ? SEVERITY_COLOR[severity] : 'var(--line-strong)' }}
                  />
                  <span className="mono w-4 shrink-0 text-[11.5px] text-ink">{counts[severity]}</span>
                  <span
                    className="text-[11.5px] leading-snug"
                    style={{ color: counts[severity] ? 'var(--ink)' : 'var(--ink-faint)' }}
                  >
                    {SEVERITY_PLAIN[severity].label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* What was read */}
          <dl className="grid grid-cols-2 border-b text-[11.5px] rule">
            <ReadStat label="Pages read" value={slot.result.documents[0]?.pdfPageCount ?? 0} />
            <ReadStat label="Sections found" value={slot.result.documents[0]?.sections.length ?? 0} />
            <ReadStat label="Paragraphs" value={slot.result.paragraphs.length} />
            <ReadStat label="Facts pulled out" value={slot.result.entities.length} />
          </dl>

          {/* Findings. The list scrolls inside the window so that three of them
              stay comparable side by side however long one document's list is. */}
          {findings.length > 0 && (
            <div className="flex items-baseline justify-between gap-2 border-b px-3 py-2 rule">
              <span className="label">
                {findings.length} finding{findings.length === 1 ? '' : 's'}, worst first
              </span>
              {findings.length > 3 && (
                <span className="text-[10.5px] text-ink-faint">scroll for the rest</span>
              )}
            </div>
          )}
          <div className="min-w-0 flex-1 divide-y overflow-y-auto rule" style={{ maxHeight: '32rem' }}>
            {findings.length === 0 ? (
              <p className="px-3 py-6 text-center text-[12px] leading-relaxed text-ink-faint">
                Nothing contradictory in this document on its own. Disagreements with the other two
                are reported below the windows.
              </p>
            ) : (
              [...findings]
                .sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity))
                .map((finding) => <PlainFinding key={finding.id} finding={finding} />)
            )}
          </div>

          {/* Footer: coverage */}
          <div className="border-t px-3 py-2.5 rule">
            <div className="mono text-[10.5px] text-ink-faint">
              {seconds && <>ran in {seconds}s · </>}
              {new Set(slot.result.entities.map((e) => e.extractorRule)).size} of {RULES.length}{' '}
              checks matched something here
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
              A check that matched nothing is coverage, not a pass — it looked and found no such
              statement in this document.
            </p>
          </div>
        </>
      )}
    </section>
  );
}

function StatusPill({ slot }: { slot: SlotState }) {
  const map: Record<SlotState['status'], { text: string; color: string }> = {
    EMPTY: { text: 'no file', color: 'var(--ink-faint)' },
    READY: { text: 'ready', color: 'var(--ink-muted)' },
    RUNNING: { text: 'checking', color: BRAND_BLUE },
    DONE: { text: 'done', color: 'var(--ink)' },
    FAILED: { text: 'failed', color: 'var(--critical)' },
  };
  const state = map[slot.status];
  return (
    <span className="doctype inline-flex shrink-0 items-center gap-1.5" style={{ color: state.color }}>
      {slot.status === 'RUNNING' && <Loader2 size={11} aria-hidden className="animate-spin" />}
      {state.text}
    </span>
  );
}

function ReadStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-l border-t px-3 py-2 first:border-l-0 [&:nth-child(-n+2)]:border-t-0 [&:nth-child(odd)]:border-l-0 rule">
      <dt className="label">{label}</dt>
      <dd className="mono mt-0.5 text-[13px] text-ink">{value}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cross-document summary                                             */
/* ------------------------------------------------------------------ */

function CrossSummary({ findings }: { findings: Finding[] }) {
  const cross = findings.filter((f) => f.scope === 'CROSS_DOCUMENT');
  const counts: Record<Severity, number> = { CRITICAL: 0, MAJOR: 0, MINOR: 0 };
  for (const finding of cross) counts[finding.severity] += 1;

  if (cross.length === 0) {
    return (
      <p className="text-[12.5px] leading-relaxed text-ink-muted">
        Every fact that appears in more than one of these documents agreed. That is the check that
        matters most, and it passed — the per-document findings above are internal to each file.
      </p>
    );
  }

  return (
    <div>
      <p className="flex items-start gap-2 text-[13px] leading-relaxed text-ink">
        <Layers size={14} aria-hidden className="mt-0.5 shrink-0" style={{ color: BRAND_BLUE }} />
        <span>
          <strong className="font-semibold">
            {cross.length} disagreement{cross.length === 1 ? '' : 's'} between the documents.
          </strong>{' '}
          These could not be found by reading any one of them on its own — each is a fact stated one
          way in one document and another way in another.
        </span>
      </p>

      <div className="mt-3 space-y-3">
        {[...cross]
          .sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity))
          .slice(0, 4)
          .map((finding) => (
            <div key={finding.id} className="border-l pl-3 rule">
              <div className="doctype" style={{ color: SEVERITY_COLOR[finding.severity] }}>
                {SEVERITY_PLAIN[finding.severity].label} ·{' '}
                {finding.documentTypes.join(' vs ')}
              </div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink">
                {plainWhatHappened(finding)}
              </p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-muted">{finding.title}</p>
            </div>
          ))}
      </div>

      {cross.length > 4 && (
        <p className="mt-3 text-[11.5px] text-ink-faint">
          {cross.length - 4} more in the workbench, where each can be confirmed, dismissed or
          assigned.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {SEVERITIES.map((severity) => (
          <span key={severity} className="text-[11.5px] text-ink-muted">
            <span className="mono text-ink">{counts[severity]}</span>{' '}
            {SEVERITY_PLAIN[severity].label.toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  );
}
