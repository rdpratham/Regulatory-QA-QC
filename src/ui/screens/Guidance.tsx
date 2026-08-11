import { useState } from 'react';
import { Check, Minus } from 'lucide-react';
import { useStore } from '../../store';
import type { DocumentType, Severity } from '../../engine/types';
import { CitationRef, Empty, Panel, SEVERITY_COLOR, Stat } from '../components/primitives';

const DOCUMENT_ORDER: DocumentType[] = ['PROTOCOL', 'SAP', 'CSR', 'TFL', 'CRF', 'IB'];

/**
 * Conformance against published guidance, as a checklist rather than as a list
 * of problems. The satisfied rows are the point: a QC lead needs to see that
 * twenty-one requirements were checked and located before the fourteen that
 * were not mean anything.
 */
export function Guidance() {
  const result = useStore((s) => s.result);
  const [show, setShow] = useState<'ALL' | 'GAPS'>('ALL');

  if (!result) return <Empty message="No run yet. Open Run QC and start the pipeline." />;

  const checks = result.guidance;
  const located = checks.filter((c) => c.outcome === 'SATISFIED');
  const gaps = checks.filter((c) => c.outcome === 'NOT_LOCATED');
  const visible = show === 'GAPS' ? gaps : checks;

  const byDocument = DOCUMENT_ORDER.map((type) => ({
    type,
    rows: visible.filter((c) => c.documentType === type),
  })).filter((group) => group.rows.length > 0);

  const sources = [...new Set(checks.map((c) => c.requirement.source.document))].sort();

  return (
    <div className="space-y-4">
      <Panel title="Conformance summary">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          <Stat label="Requirements checked" value={checks.length} hint={`across ${byDocument.length} documents`} />
          <Stat label="Located" value={located.length} hint="element found, with the section cited" />
          <Stat
            label="Not located"
            value={gaps.length}
            hint={`${gaps.filter((g) => g.requirement.severity === 'CRITICAL').length} critical`}
          />
          <Stat label="Guidance documents" value={sources.length} />
        </div>
        <div className="border-t px-4 py-3 rule">
          <div className="label">Sources</div>
          <ul className="mt-1.5 space-y-0.5">
            {sources.map((source) => (
              <li key={source} className="text-[12px] text-ink">
                {source}
                <span className="text-ink-faint">
                  {' — '}
                  {checks.find((c) => c.requirement.source.document === source)?.requirement.source.issuer}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      <div className="flex items-center gap-2 no-print">
        <span className="label">Show</span>
        <button
          type="button"
          className={`btn ${show === 'ALL' ? 'btn-primary' : ''}`}
          onClick={() => setShow('ALL')}
        >
          All {checks.length}
        </button>
        <button
          type="button"
          className={`btn ${show === 'GAPS' ? 'btn-primary' : ''}`}
          onClick={() => setShow('GAPS')}
        >
          Not located {gaps.length}
        </button>
      </div>

      {byDocument.map((group) => (
        <Panel key={group.type} title={`${group.type} — ${group.rows.filter((r) => r.outcome === 'SATISFIED').length}/${group.rows.length} located`}>
          <ul className="divide-y rule">
            {group.rows.map((check) => {
              const { requirement } = check;
              const satisfied = check.outcome === 'SATISFIED';
              const cite = `${requirement.source.document}${
                requirement.source.section ? ` §${requirement.source.section}` : ''
              }`;
              return (
                <li key={`${check.documentId}-${requirement.id}`} className="flex gap-3 px-4 py-3">
                  <span className="mt-0.5 w-4 shrink-0">
                    {satisfied ? (
                      <Check size={14} aria-hidden style={{ color: 'var(--ink-muted)' }} />
                    ) : (
                      <Minus
                        size={14}
                        aria-hidden
                        style={{ color: SEVERITY_COLOR[requirement.severity as Severity] }}
                      />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-[12.5px] font-medium text-ink">{requirement.title}</span>
                      <span className="citation">{cite}</span>
                      {!satisfied && (
                        <span
                          className="doctype"
                          style={{ color: SEVERITY_COLOR[requirement.severity as Severity] }}
                        >
                          not located · {requirement.severity}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
                      {requirement.requirement}
                    </p>
                    {satisfied && check.citation ? (
                      <div className="mt-1.5">
                        <CitationRef citation={check.citation} />
                        <div className="mt-0.5 text-[11.5px] italic text-ink-muted">
                          “{check.citation.snippet}”
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-faint">
                        {requirement.rationale}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      ))}

      <Panel title="What this check does and does not tell you">
        <div className="space-y-2 px-4 py-3 text-[12px] leading-relaxed text-ink-muted">
          <p>
            <span className="label">It checks presence </span>
            For each requirement it searches the document's section headings and paragraph text and
            reports where it found the element, or that it could not find it. Reference lists and
            tables of contents are excluded from the search, because a bibliography naming a
            guideline is not a document that complies with it.
          </p>
          <p>
            <span className="label">It does not check adequacy </span>
            It cannot tell you whether a statistical section is competent, whether an equivalence
            margin is defensible, or whether a safety assessment is sufficient. A located
            requirement means the element is present and citable — nothing more. This is not a
            regulatory opinion and does not substitute for one.
          </p>
          <p>
            <span className="label">A not-located result is a prompt, not a verdict </span>
            An element written under wording the check does not recognise reads as absent, and an
            element covered by a separate agreement — financing, publication — may legitimately not
            be in the document at all. Every one of these is a question for a reviewer.
          </p>
        </div>
      </Panel>
    </div>
  );
}
