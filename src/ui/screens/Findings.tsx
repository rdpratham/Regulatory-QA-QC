import { useMemo, useState } from 'react';
import { Info, ShieldQuestion } from 'lucide-react';
import { MIN_COMMENT_LENGTH, useFindings, useStore } from '../../store';
import { REVIEW_THRESHOLD } from '../../engine/severity';
import type { DispositionStatus, EntityCategory, Finding, Severity } from '../../engine/types';
import {
  CitationRef,
  Confidence,
  DISPOSITION_LABEL,
  Empty,
  Excerpt,
  Panel,
  SEVERITY_COLOR,
  SeverityMark,
} from '../components/primitives';

const SEVERITIES: Severity[] = ['CRITICAL', 'MAJOR', 'MINOR'];

const ACTIONS: { status: DispositionStatus; label: string; hint: string }[] = [
  { status: 'CONFIRMED', label: 'Confirm', hint: 'A real discrepancy that needs correcting.' },
  {
    status: 'INTENTIONAL_DOCUMENTED',
    label: 'Confirm as intentional',
    hint: 'A deliberate, documented divergence. The flag stands; the rationale is recorded.',
  },
  { status: 'DISMISSED', label: 'Dismiss', hint: 'Not a discrepancy. Say why.' },
  { status: 'RESOLVED', label: 'Mark resolved', hint: 'Already corrected in a later version.' },
];

export type FindingsFilter = {
  severity?: Severity;
  category?: EntityCategory;
  documentType?: string;
};

export function Findings({
  filter,
  onFilterChange,
}: {
  filter: FindingsFilter;
  onFilterChange: (filter: FindingsFilter) => void;
}) {
  const findings = useFindings();
  const reviewer = useStore((s) => s.reviewer);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<'ALL' | 'OPEN' | 'DISPOSITIONED'>('ALL');

  const visible = useMemo(
    () =>
      findings.filter((finding) => {
        if (filter.severity && finding.severity !== filter.severity) return false;
        if (filter.category && finding.category !== filter.category) return false;
        if (filter.documentType && !finding.documentTypes.includes(filter.documentType as never)) {
          return false;
        }
        if (status === 'OPEN' && finding.disposition) return false;
        if (status === 'DISPOSITIONED' && !finding.disposition) return false;
        return true;
      }),
    [findings, filter, status],
  );

  const selected = visible.find((f) => f.id === selectedId) ?? visible[0] ?? null;
  const categories = [...new Set(findings.map((f) => f.category))].sort();
  const documentTypes = [...new Set(findings.flatMap((f) => f.documentTypes))];
  const filtered = Boolean(filter.severity || filter.category || filter.documentType || status !== 'ALL');

  if (findings.length === 0) {
    return <Empty message="No run yet. Open Run QC and start the pipeline." />;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[26rem_1fr]">
      <div className="space-y-3">
        <Panel title={`Findings — ${visible.length} of ${findings.length}`}>
          <div className="space-y-2 border-b px-3 py-2.5 rule">
            <Select
              label="Severity"
              value={filter.severity ?? ''}
              options={SEVERITIES}
              onChange={(value) =>
                onFilterChange({ ...filter, severity: (value || undefined) as Severity })
              }
            />
            <Select
              label="Category"
              value={filter.category ?? ''}
              options={categories}
              onChange={(value) =>
                onFilterChange({ ...filter, category: (value || undefined) as EntityCategory })
              }
            />
            <Select
              label="Document"
              value={filter.documentType ?? ''}
              options={documentTypes}
              onChange={(value) => onFilterChange({ ...filter, documentType: value || undefined })}
            />
            <Select
              label="Status"
              value={status === 'ALL' ? '' : status}
              options={['OPEN', 'DISPOSITIONED']}
              onChange={(value) => setStatus((value || 'ALL') as typeof status)}
            />
          </div>

          {visible.length === 0 ? (
            <Empty
              message="No findings match these filters."
              action={
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    onFilterChange({});
                    setStatus('ALL');
                  }}
                >
                  Clear filters
                </button>
              }
            />
          ) : (
            <ul className="max-h-[68vh] divide-y overflow-auto rule">
              {visible.map((finding) => (
                <li key={finding.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(finding.id)}
                    className={`block w-full px-3 py-2.5 text-left ${
                      selected?.id === finding.id ? 'bg-sunken' : 'hover:bg-sunken'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <SeverityMark severity={finding.severity} muted={Boolean(finding.disposition)} />
                      <span className="mono text-[10.5px] text-ink-faint">{finding.id}</span>
                    </div>
                    <div className="mt-1 text-[12.5px] leading-snug text-ink">{finding.title}</div>
                    <div className="mono mt-1 text-[10.5px] text-ink-faint">
                      {finding.documentTypes.join(' · ')} ·{' '}
                      {finding.scope === 'INTRA_DOCUMENT' ? 'internal' : 'cross-document'} ·{' '}
                      {finding.confidence.toFixed(2)}
                      {finding.disposition
                        ? ` · ${DISPOSITION_LABEL[finding.disposition.status]}`
                        : ''}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {filtered && visible.length > 0 && (
            <div className="border-t px-3 py-2 rule">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  onFilterChange({});
                  setStatus('ALL');
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </Panel>
      </div>

      {selected ? (
        <FindingDetail key={selected.id} finding={selected} reviewer={reviewer} />
      ) : (
        <Panel>
          <Empty message="Select a finding." />
        </Panel>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="label w-[4.5rem] shrink-0">{label}</span>
      <select className="field" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replace(/_/g, ' ').toLowerCase()}
          </option>
        ))}
      </select>
    </label>
  );
}

function FindingDetail({ finding, reviewer }: { finding: Finding; reviewer: string }) {
  const dispose = useStore((s) => s.dispose);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const commit = (status: DispositionStatus) => {
    try {
      dispose(finding.id, status, comment);
      setComment('');
      setError(null);
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : String(thrown));
    }
  };

  const commentReady = comment.trim().length >= MIN_COMMENT_LENGTH;

  return (
    <div className="space-y-4">
      <Panel>
        <div className="border-b px-4 py-3 rule">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <SeverityMark severity={finding.severity} muted={Boolean(finding.disposition)} />
            <Confidence finding={finding} />
            <span className="mono text-[11px] text-ink-faint">{finding.id}</span>
            <span className="mono text-[11px] text-ink-faint">{finding.conceptKey}</span>
            <span className="doctype text-ink-faint">
              {finding.scope === 'INTRA_DOCUMENT' ? 'within one document' : 'across documents'}
            </span>
          </div>
          <h1 className="mt-2 text-[16px] font-semibold leading-snug text-ink">{finding.title}</h1>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">{finding.description}</p>
          {finding.confidence < REVIEW_THRESHOLD && (
            <p className="mt-2 text-[11.5px] text-ink-faint">
              Below the {REVIEW_THRESHOLD.toFixed(2)} review threshold. Surfaced so the judgement can
              be audited, not to demand action.
            </p>
          )}
        </div>

        {finding.benignNote && (
          <div className="flex gap-2 border-b bg-sunken px-4 py-3 rule">
            <ShieldQuestion size={14} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden />
            <p className="text-[12px] leading-relaxed text-ink-muted">{finding.benignNote}</p>
          </div>
        )}

        {/* The money moment: one excerpt per occurrence, side by side. */}
        <div className="grid gap-px bg-line lg:grid-cols-2">
          {finding.occurrences.map((occurrence) => (
            <article key={occurrence.entity.id} className="bg-raised px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <CitationRef citation={occurrence.entity.citation} />
                <span
                  className="mono text-[12px] font-semibold"
                  style={{ color: SEVERITY_COLOR[finding.severity] }}
                >
                  {occurrence.value}
                </span>
              </div>
              <div className="mt-1.5 text-[11px] text-ink-faint">
                {occurrence.entity.citation.sectionHeading}
              </div>
              <blockquote className="mt-2 border-l-2 pl-3 rule">
                <Excerpt
                  snippet={occurrence.entity.citation.snippet}
                  highlight={occurrence.entity.rawText}
                />
              </blockquote>
              <div className="mono mt-2 text-[10.5px] text-ink-faint">
                rule {occurrence.entity.extractorRule}
              </div>
            </article>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Why an inspector cares">
          <p className="px-4 py-3 text-[12.5px] leading-relaxed text-ink">
            {finding.regulatoryContext}
          </p>
        </Panel>
        <Panel title="Suggested action">
          <p className="px-4 py-3 text-[12.5px] leading-relaxed text-ink">
            {finding.suggestedAction}
          </p>
        </Panel>
      </div>

      <Panel title="Disposition">
        {finding.disposition ? (
          <div className="px-4 py-3">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="doctype" style={{ color: 'var(--settled)' }}>
                {DISPOSITION_LABEL[finding.disposition.status]}
              </span>
              <span className="mono text-[11px] text-ink-muted">
                {finding.disposition.reviewer} · {finding.disposition.timestamp}
              </span>
            </div>
            <p className="mt-2 text-[12.5px] text-ink">“{finding.disposition.comment}”</p>
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-ink-faint">
              <Info size={12} className="mt-0.5 shrink-0" aria-hidden />
              Dispositions are recorded in the audit trail and cannot be edited or removed.
            </p>
          </div>
        ) : (
          <div className="px-4 py-3">
            <label className="block">
              <span className="label">Reviewer comment (required, minimum {MIN_COMMENT_LENGTH} characters)</span>
              <textarea
                className="field mt-1.5"
                rows={3}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="What was checked, against what source, and what was concluded."
              />
            </label>
            {!reviewer && (
              <p className="mt-2 text-[11.5px]" style={{ color: 'var(--critical)' }}>
                Enter a reviewer name in the sidebar before dispositioning.
              </p>
            )}
            {error && (
              <p className="mt-2 text-[11.5px]" style={{ color: 'var(--critical)' }}>
                {error}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {ACTIONS.map((action) => (
                <button
                  key={action.status}
                  type="button"
                  className={`btn ${action.status === 'CONFIRMED' ? 'btn-primary' : ''}`}
                  title={action.hint}
                  disabled={!reviewer || !commentReady}
                  onClick={() => commit(action.status)}
                >
                  {action.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
              Nothing here edits a document. “Confirm as intentional” records a deliberate,
              documented divergence — the flag stands and the rationale is captured, which is what a
              health authority asks to see.
            </p>
          </div>
        )}
      </Panel>
    </div>
  );
}
