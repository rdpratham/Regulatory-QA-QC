import { useFindings } from '../../store';
import { SEVERITY_ORDER } from '../../engine/severity';
import type { EntityCategory, Severity } from '../../engine/types';
import { Empty, Panel, SEVERITY_COLOR } from '../components/primitives';
import type { FindingsFilter } from './Findings';

const DOCUMENT_ORDER = ['PROTOCOL', 'SAP', 'CSR', 'TFL', 'CRF', 'IB'] as const;

/**
 * Document × category, shaded by the highest severity found. This is the
 * executive-summary screenshot, so it has to be readable at a glance and
 * clickable into the evidence — a grid nobody can drill into is a picture of a
 * conclusion rather than a route to one.
 */
export function Matrix({ onSelect }: { onSelect: (filter: FindingsFilter) => void }) {
  const findings = useFindings();
  if (findings.length === 0) return <Empty message="No run yet. Open Run QC and start the pipeline." />;

  const categories = [...new Set(findings.map((f) => f.category))].sort() as EntityCategory[];

  const cell = (documentType: string, category: EntityCategory) => {
    const matched = findings.filter(
      (f) => f.category === category && f.documentTypes.includes(documentType as never),
    );
    if (matched.length === 0) return null;
    const severity = matched.reduce<Severity>(
      (worst, f) => (SEVERITY_ORDER[f.severity] < SEVERITY_ORDER[worst] ? f.severity : worst),
      'MINOR',
    );
    const open = matched.filter((f) => !f.disposition).length;
    return { count: matched.length, severity, open };
  };

  return (
    <div className="space-y-4">
      <Panel title="Consistency matrix">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] border-collapse">
            <thead>
              <tr>
                <th className="label border-b border-r px-4 py-2 text-left rule">Category</th>
                {DOCUMENT_ORDER.map((documentType) => (
                  <th key={documentType} className="border-b border-l px-3 py-2 rule">
                    <span className="doctype text-ink">{documentType}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category}>
                  <th className="border-b border-r px-4 py-2 text-left rule">
                    <button
                      type="button"
                      className="text-[12px] font-medium text-ink hover:underline"
                      onClick={() => onSelect({ category })}
                    >
                      {category.replace(/_/g, ' ').toLowerCase()}
                    </button>
                  </th>
                  {DOCUMENT_ORDER.map((documentType) => {
                    const value = cell(documentType, category);
                    return (
                      <td key={documentType} className="border-b border-l p-0 rule">
                        {value ? (
                          <button
                            type="button"
                            onClick={() => onSelect({ category, documentType })}
                            className="flex h-full w-full flex-col items-center justify-center gap-1 px-3 py-3 hover:bg-sunken"
                            style={{ background: shade(value.severity, value.count) }}
                            title={`${value.count} finding${value.count === 1 ? '' : 's'}, ${value.open} open`}
                          >
                            <span
                              className="mono text-[14px] font-semibold leading-none"
                              style={{ color: SEVERITY_COLOR[value.severity] }}
                            >
                              {value.count}
                            </span>
                            <span className="doctype" style={{ color: SEVERITY_COLOR[value.severity] }}>
                              {value.severity.slice(0, 4)}
                            </span>
                          </button>
                        ) : (
                          <div className="px-3 py-3 text-center">
                            <span className="mono text-[12px] text-ink-faint">—</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t px-4 py-2.5 text-[11.5px] text-ink-faint rule">
          Cells are shaded by the highest severity in that cell and labelled with the number of
          findings. A dash means the concepts in that category were compared and agreed.
        </p>
      </Panel>

      <Panel title="Severity by scope">
        <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3">
          {(['CRITICAL', 'MAJOR', 'MINOR'] as Severity[]).map((severity) => {
            const matched = findings.filter((f) => f.severity === severity);
            return (
              <button
                key={severity}
                type="button"
                onClick={() => onSelect({ severity })}
                className="bg-raised px-4 py-3 text-left hover:bg-sunken"
              >
                <div className="doctype" style={{ color: SEVERITY_COLOR[severity] }}>
                  {severity}
                </div>
                <div className="mono mt-1 text-[19px] leading-none text-ink">{matched.length}</div>
                <div className="mt-1.5 text-[11px] text-ink-faint">
                  {matched.filter((f) => f.scope === 'INTRA_DOCUMENT').length} within a document ·{' '}
                  {matched.filter((f) => f.scope === 'CROSS_DOCUMENT').length} across documents
                </div>
              </button>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

/** A single hue per severity, at an opacity that reads as weight, not decoration. */
function shade(severity: Severity, count: number): string {
  const alpha = Math.min(0.16, 0.05 + count * 0.025);
  const rgb =
    severity === 'CRITICAL' ? '143, 29, 33' : severity === 'MAJOR' ? '150, 98, 12' : '71, 86, 106';
  return `rgba(${rgb}, ${alpha})`;
}
