import { useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import { CORPUS_DESCRIPTORS } from '../../corpus';
import { STUDY } from '../../study';
import { useStore } from '../../store';
import { CitationRef, Panel, Stat } from '../components/primitives';

export function DocumentSet({ onRun }: { onRun: () => void }) {
  const result = useStore((s) => s.result);
  const [dropped, setDropped] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <Panel title="Study">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-4 py-3 lg:grid-cols-4">
          <Field label="Protocol number" value={STUDY.protocolNumber} mono />
          <Field label="Sponsor" value={STUDY.sponsor} />
          <Field label="Biometrics" value={STUDY.biometricsCro} />
          <Field label="Data management" value={STUDY.dataManagementCro} />
          <div className="col-span-2 lg:col-span-4">
            <div className="label">Title</div>
            <div className="mt-0.5 text-[12.5px] text-ink">{STUDY.title}</div>
          </div>
        </div>
      </Panel>

      <Panel title="Documents under review">
        <div className="divide-y rule">
          {CORPUS_DESCRIPTORS.map((descriptor) => {
            const parsed = result?.documents.find((d) => d.id === descriptor.id);
            return (
              <article key={descriptor.id} className="flex items-start gap-4 px-4 py-3">
                <FileText size={16} className="mt-0.5 shrink-0 text-ink-faint" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="doctype text-ink">{descriptor.type}</span>
                    <span className="mono text-[12px] text-ink">{descriptor.version}</span>
                    <span className="mono text-[11px] text-ink-faint">
                      effective {descriptor.effectiveDate}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-[12.5px] text-ink">{descriptor.title}</div>
                  <div className="mt-1 text-[11.5px] text-ink-muted">{descriptor.author}</div>
                </div>
                <div className="shrink-0 text-right">
                  {parsed ? (
                    <>
                      <div className="mono text-[12px] text-ink">
                        {parsed.printedPageCount} printed / {parsed.pdfPageCount} pdf
                      </div>
                      <div className="mono text-[11px] text-ink-faint">
                        offset {parsed.pageOffset} · {parsed.sections.length} sections
                      </div>
                      <div className="mono text-[11px] text-ink-faint">
                        {parsed.rotatedItemsDropped} rotated items removed
                      </div>
                    </>
                  ) : (
                    <div className="mono text-[11.5px] text-ink-faint">not yet parsed</div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </Panel>

      {result && (
        <Panel title="Ingestion summary">
          <div className="grid grid-cols-2 lg:grid-cols-4">
            <Stat label="Paragraphs indexed" value={result.paragraphs.length} />
            <Stat
              label="Header/footer lines removed"
              value={result.documents.reduce((n, d) => n + d.boilerplate.length, 0)}
              hint="derived from repetition, not configured"
            />
            <Stat
              label="Rotated items dropped"
              value={result.documents.reduce((n, d) => n + d.rotatedItemsDropped, 0)}
              hint="watermarks and margin stamps"
            />
            <Stat
              label="Abbreviations read"
              value={result.documents.reduce((n, d) => n + d.abbreviations.length, 0)}
              hint="from the documents' own tables"
            />
          </div>
        </Panel>
      )}

      <Panel title="Add a document">
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            setDropped(event.dataTransfer.files[0]?.name ?? 'file');
          }}
          className="m-4 border border-dashed px-4 py-8 text-center rule"
        >
          <Upload size={18} className="mx-auto text-ink-faint" aria-hidden />
          <p className="mt-2 text-[12.5px] text-ink">
            Demo mode — using the {STUDY.protocolNumber} sample set.
          </p>
          <p className="mx-auto mt-1 max-w-xl text-[11.5px] leading-relaxed text-ink-muted">
            {dropped
              ? `“${dropped}” was not parsed. `
              : ''}
            This build ships a fixed five-document corpus so that the same run is
            reproducible in front of an audience. The ingestion path is real: the
            five PDFs below are parsed in the browser on every run, watermarks and
            all. Arbitrary upload is a configuration change, not a rewrite — see
            PRODUCTION.md.
          </p>
        </div>
      </Panel>

      {result && (
        <Panel title="First citation produced by this run">
          <div className="px-4 py-3">
            {result.entities[0] && <CitationRef citation={result.entities[0].citation} />}
            <p className="mt-2 text-[12.5px] text-ink">“{result.entities[0]?.citation.snippet}”</p>
          </div>
        </Panel>
      )}

      {!result && (
        <div className="flex justify-end">
          <button type="button" className="btn btn-primary" onClick={onRun}>
            Run QC
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className={`mt-0.5 text-[12.5px] text-ink ${mono ? 'mono' : ''}`}>{value}</div>
    </div>
  );
}
