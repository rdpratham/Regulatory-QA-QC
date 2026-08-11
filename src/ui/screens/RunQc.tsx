import { Check, CircleAlert, Play } from 'lucide-react';
import { RULES } from '../../engine/extract';
import { useStore } from '../../store';
import { Panel, Stat } from '../components/primitives';

const PLANNED_STAGES = [
  { key: 'INGEST', label: 'Extracting text with coordinates' },
  { key: 'DEBOILERPLATE', label: 'Removing watermarks, headers and footers' },
  { key: 'STRUCTURE', label: 'Indexing sections and reconciling page numbers' },
  { key: 'EXTRACT', label: 'Extracting entities' },
  { key: 'COMPARE', label: 'Recomputing derivations and cross-referencing' },
  { key: 'SCORE', label: 'Scoring findings' },
];

export function RunQc({ onComplete }: { onComplete: () => void }) {
  const { status, stages, result, error, run } = useStore();
  const confirmed = result?.arithmetic.filter((a) => a.outcome === 'CONFIRMED').length ?? 0;

  return (
    <div className="space-y-4">
      <Panel
        title="Quality control run"
        actions={
          <button
            type="button"
            className="btn btn-primary no-print"
            onClick={() => void run()}
            disabled={status === 'RUNNING'}
          >
            <span className="inline-flex items-center gap-1.5">
              <Play size={12} aria-hidden />
              {status === 'READY' ? 'Run again' : 'Run QC'}
            </span>
          </button>
        }
      >
        <ol className="divide-y rule">
          {PLANNED_STAGES.map((planned, index) => {
            const done = stages.find((s) => s.key === planned.key);
            const active = status === 'RUNNING' && !done && stages.length === index;
            return (
              <li
                key={planned.key}
                className={`relative flex items-start gap-3 overflow-hidden px-4 py-3 ${
                  active ? 'stage-active' : ''
                }`}
              >
                <span className="mt-0.5 w-4 shrink-0">
                  {done ? (
                    <Check size={14} aria-hidden className="text-ink" />
                  ) : (
                    <span className="mono text-[11px] text-ink-faint">{index + 1}</span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`text-[12.5px] ${done ? 'text-ink' : 'text-ink-faint'}`}>
                    {planned.label}
                  </span>
                  {done && (
                    <span className="mono mt-0.5 block text-[11.5px] text-ink-muted">
                      {done.detail}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      </Panel>

      {status === 'FAILED' && (
        <Panel title="Run failed">
          <p className="flex items-start gap-2 px-4 py-3 text-[12.5px] text-ink">
            <CircleAlert size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--critical)' }} />
            {error}
          </p>
        </Panel>
      )}

      {result && (
        <>
          <Panel title="Run summary">
            <div className="grid grid-cols-2 lg:grid-cols-4">
              <Stat label="Documents" value={result.documents.length} />
              <Stat label="Paragraphs indexed" value={result.paragraphs.length} />
              <Stat label="Entities extracted" value={result.entities.length} />
              <Stat label="Concepts and checks" value={result.conceptsCompared} />
              <Stat
                label="Derivations recomputed"
                value={`${confirmed}/${result.arithmetic.length}`}
                hint="confirmations count as much as failures"
              />
              <Stat
                label="Findings"
                value={result.findings.length}
                hint={`${result.findings.filter((f) => f.severity === 'CRITICAL').length} critical`}
              />
              <Stat
                label="Rules that matched"
                value={`${new Set(result.entities.map((e) => e.extractorRule)).size}/${RULES.length}`}
                hint="a rule that finds nothing is coverage, not a pass"
              />
              <Stat
                label="Run"
                value={<span className="text-[13px]">{result.runTimestamp.replace('T', ' ').slice(0, 19)}</span>}
              />
            </div>
          </Panel>

          <Panel title="Rule coverage">
            <div className="flex flex-wrap gap-1.5 px-4 py-3">
              {RULES.map((rule) => {
                const count = result.entities.filter((e) => e.extractorRule === rule.id).length;
                return (
                  <span
                    key={rule.id}
                    title={`${rule.description}${count ? ` — ${count} entities` : ' — no match in this document set'}`}
                    className="mono border px-1.5 py-0.5 text-[10.5px] rule"
                    style={{
                      color: count ? 'var(--ink)' : 'var(--ink-faint)',
                      background: count ? 'var(--sunken)' : 'transparent',
                    }}
                  >
                    {rule.id}
                    {count > 0 && <span className="text-ink-faint"> {count}</span>}
                  </span>
                );
              })}
            </div>
            <p className="border-t px-4 py-2.5 text-[11.5px] leading-relaxed text-ink-faint rule">
              Every rule ran against every paragraph. A greyed rule matched nothing here — on a
              document written to different phrasing, expect fewer to match, and read a short
              findings list as the coverage figure above rather than as a clean document.
            </p>
          </Panel>

          <Panel title="Derivations recomputed from the documents">
            <table className="w-full">
              <thead>
                <tr className="border-b rule">
                  <th className="label px-4 py-2 text-left">Check</th>
                  <th className="label px-3 py-2 text-left">Expression</th>
                  <th className="label px-3 py-2 text-right">Computed</th>
                  <th className="label px-3 py-2 text-right">Stated</th>
                  <th className="label px-4 py-2 text-right">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y rule">
                {result.arithmetic.map((check) => (
                  <tr key={check.id}>
                    <td className="px-4 py-2 text-[12px] text-ink">{check.label}</td>
                    <td className="mono px-3 py-2 text-[11.5px] text-ink-muted">{check.expression}</td>
                    <td className="mono px-3 py-2 text-right text-[12px] text-ink">{check.expected}</td>
                    <td className="mono px-3 py-2 text-right text-[12px] text-ink">{check.stated}</td>
                    <td className="px-4 py-2 text-right">
                      <span
                        className="doctype"
                        style={{
                          color: check.outcome === 'CONFIRMED' ? 'var(--ink-muted)' : 'var(--critical)',
                        }}
                      >
                        {check.outcome}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <div className="flex justify-end">
            <button type="button" className="btn btn-primary no-print" onClick={onComplete}>
              Open findings workbench
            </button>
          </div>
        </>
      )}
    </div>
  );
}
