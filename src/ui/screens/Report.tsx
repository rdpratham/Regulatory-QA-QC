import { Download, Printer } from 'lucide-react';
import { STUDY } from '../../study';
import { download, useFindings, useStore } from '../../store';
import type { Severity } from '../../engine/types';
import {
  CitationRef,
  DISPOSITION_LABEL,
  Empty,
  Panel,
  SEVERITY_COLOR,
} from '../components/primitives';

const SEVERITIES: Severity[] = ['CRITICAL', 'MAJOR', 'MINOR'];

export function Report() {
  const result = useStore((s) => s.result);
  const findings = useFindings();
  const signOff = useStore((s) => s.signOff);
  const recordExport = useStore((s) => s.recordExport);

  if (!result) return <Empty message="No run yet. Open Run QC and start the pipeline." />;

  const exportJson = () => {
    recordExport('JSON');
    download(
      `${STUDY.protocolNumber}-discrepancy-report.json`,
      JSON.stringify(
        {
          study: STUDY.protocolNumber,
          rulesetVersion: result.rulesetVersion,
          runTimestamp: result.runTimestamp,
          documents: result.documents.map((d) => ({
            id: d.id,
            type: d.type,
            version: d.version,
            effectiveDate: d.effectiveDate,
            author: d.author,
            printedPages: d.printedPageCount,
            pdfPages: d.pdfPageCount,
            pageOffset: d.pageOffset,
          })),
          arithmetic: result.arithmetic,
          findings,
          signOff,
        },
        null,
        2,
      ),
      'application/json',
    );
  };

  const print = () => {
    recordExport('print');
    window.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2 no-print">
        <button type="button" className="btn" onClick={exportJson}>
          <span className="inline-flex items-center gap-1.5">
            <Download size={12} aria-hidden /> Export JSON
          </span>
        </button>
        <button type="button" className="btn btn-primary" onClick={print}>
          <span className="inline-flex items-center gap-1.5">
            <Printer size={12} aria-hidden /> Print
          </span>
        </button>
      </div>

      <Panel>
        <div className="px-6 py-6">
          <header className="border-b pb-4 rule print-block">
            <div className="label">Cross-document consistency QC — discrepancy report</div>
            <h1 className="mt-1 text-[18px] font-semibold leading-snug text-ink">{STUDY.title}</h1>
            <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1.5 lg:grid-cols-3">
              <Row label="Protocol number" value={STUDY.protocolNumber} />
              <Row label="Sponsor" value={STUDY.sponsor} />
              <Row label="Ruleset version" value={result.rulesetVersion} />
              <Row label="Run timestamp" value={result.runTimestamp} />
              <Row label="Documents under review" value={String(result.documents.length)} />
              <Row
                label="Findings"
                value={`${findings.length} (${findings.filter((f) => f.severity === 'CRITICAL').length} critical)`}
              />
            </dl>
          </header>

          <section className="border-b py-4 rule print-block">
            <h2 className="label">Documents under review</h2>
            <table className="mt-2 w-full">
              <thead>
                <tr className="border-b rule">
                  <th className="label py-1.5 text-left">Type</th>
                  <th className="label py-1.5 text-left">Version</th>
                  <th className="label py-1.5 text-left">Effective</th>
                  <th className="label py-1.5 text-left">Author</th>
                  <th className="label py-1.5 text-right">Pages (printed / pdf)</th>
                </tr>
              </thead>
              <tbody className="divide-y rule">
                {result.documents.map((document) => (
                  <tr key={document.id}>
                    <td className="py-1.5"><span className="doctype text-ink">{document.type}</span></td>
                    <td className="mono py-1.5 text-[12px]">{document.version}</td>
                    <td className="mono py-1.5 text-[12px]">{document.effectiveDate}</td>
                    <td className="py-1.5 text-[12px]">{document.author}</td>
                    <td className="mono py-1.5 text-right text-[12px]">
                      {document.printedPageCount} / {document.pdfPageCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="border-b py-4 rule print-block">
            <h2 className="label">Derivations recomputed</h2>
            <p className="mt-1 text-[12px] text-ink-muted">
              {result.arithmetic.filter((a) => a.outcome === 'CONFIRMED').length} of{' '}
              {result.arithmetic.length} derivations stated in the documents reproduce when
              recomputed. Confirmations are reported so that a failure can be read as a specific
              failure rather than as a general doubt.
            </p>
          </section>

          {SEVERITIES.map((severity) => {
            const group = findings.filter((f) => f.severity === severity);
            if (group.length === 0) return null;
            return (
              <section key={severity} className="py-4">
                <h2 className="doctype" style={{ color: SEVERITY_COLOR[severity] }}>
                  {severity} — {group.length}
                </h2>
                <div className="mt-2 space-y-4">
                  {group.map((finding) => (
                    <article key={finding.id} className="border-l-2 pl-3 print-block" style={{ borderColor: SEVERITY_COLOR[severity] }}>
                      <div className="flex flex-wrap items-baseline gap-x-3">
                        <span className="mono text-[11px] text-ink-faint">{finding.id}</span>
                        <h3 className="text-[13px] font-semibold text-ink">{finding.title}</h3>
                      </div>
                      <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
                        {finding.description}
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {finding.occurrences.map((occurrence) => (
                          <li key={occurrence.entity.id}>
                            <CitationRef citation={occurrence.entity.citation} />
                            <span className="mono ml-2 text-[11.5px] text-ink">{occurrence.value}</span>
                            <div className="mt-0.5 text-[11.5px] italic leading-relaxed text-ink-muted">
                              “{occurrence.entity.citation.snippet}”
                            </div>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-muted">
                        <span className="label">Regulatory context </span>
                        {finding.regulatoryContext}
                      </p>
                      <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-muted">
                        <span className="label">Action </span>
                        {finding.suggestedAction}
                      </p>
                      <p className="mono mt-1.5 text-[11px] text-ink-faint">
                        confidence {finding.confidence.toFixed(2)} ·{' '}
                        {finding.disposition
                          ? `${DISPOSITION_LABEL[finding.disposition.status]} by ${finding.disposition.reviewer} — “${finding.disposition.comment}”`
                          : 'undispositioned'}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}

          <footer className="mt-4 border-t pt-4 rule print-block">
            <h2 className="label">Quality assurance sign-off</h2>
            {signOff ? (
              <p className="mono mt-2 text-[12px] text-ink">
                Signed off by {signOff.reviewer} at {signOff.timestamp}. Ruleset{' '}
                {result.rulesetVersion}.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-8">
                <SignatureLine label="Reviewer name and signature" />
                <SignatureLine label="Date" />
                <SignatureLine label="QA approver name and signature" />
                <SignatureLine label="Date" />
              </div>
            )}
            <p className="mt-4 text-[11px] leading-relaxed text-ink-faint">
              This report was produced by a deterministic rules engine running offline over the
              documents listed above. It flags discrepancies for human confirmation. It does not
              edit, rewrite, or correct any document, and no finding in it has been resolved
              automatically.
            </p>
          </footer>
        </div>
      </Panel>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="mono text-[12px] text-ink">{value}</dd>
    </div>
  );
}

function SignatureLine({ label }: { label: string }) {
  return (
    <div>
      <div className="h-8 border-b rule" />
      <div className="label mt-1">{label}</div>
    </div>
  );
}
