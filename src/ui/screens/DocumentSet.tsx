import { useRef, useState } from 'react';
import { FileText, Trash2, Upload } from 'lucide-react';
import { CORPUS_DESCRIPTORS } from '../../corpus';
import { RULES } from '../../engine/extract';
import { STUDY } from '../../study';
import { readPdfFiles, useStore } from '../../store';
import type { DocumentType } from '../../engine/types';
import { CitationRef, Panel, Stat } from '../components/primitives';

const DOCUMENT_TYPES: DocumentType[] = ['PROTOCOL', 'SAP', 'CSR', 'TFL', 'CRF', 'IB'];

export function DocumentSet({ onRun }: { onRun: () => void }) {
  const result = useStore((s) => s.result);
  const source = useStore((s) => s.source);
  const uploaded = useStore((s) => s.uploaded);
  const addUploads = useStore((s) => s.addUploads);
  const setUploadType = useStore((s) => s.setUploadType);
  const removeUpload = useStore((s) => s.removeUpload);
  const useSampleSet = useStore((s) => s.useSampleSet);

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string | null>(null);

  const accept = async (list: FileList | File[]) => {
    const files = await readPdfFiles(list);
    const skipped = Array.from(list).length - files.length;
    setRejected(skipped > 0 ? `${skipped} file${skipped === 1 ? '' : 's'} skipped — PDFs only.` : null);
    if (files.length > 0) addUploads(files);
  };

  const usingUploads = source === 'UPLOADED' && uploaded.length > 0;

  return (
    <div className="space-y-4">
      {!usingUploads && (
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
      )}

      <Panel
        title={usingUploads ? 'Your documents' : 'Documents under review'}
        actions={
          usingUploads ? (
            <button type="button" className="btn no-print" onClick={useSampleSet}>
              Use the sample set
            </button>
          ) : undefined
        }
      >
        <div className="divide-y rule">
          {usingUploads
            ? uploaded.map((file) => {
                const parsed = result?.documents.find((d) => d.id === file.descriptor.id);
                return (
                  <article key={file.descriptor.fileName} className="flex items-start gap-4 px-4 py-3">
                    <FileText size={16} className="mt-0.5 shrink-0 text-ink-faint" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] text-ink">{file.descriptor.fileName}</div>
                      <div className="mono mt-1 text-[11px] text-ink-faint">
                        {(file.data.byteLength / 1024).toFixed(0)} KB
                        {parsed
                          ? ` · ${parsed.printedPageCount} printed / ${parsed.pdfPageCount} pdf · offset ${parsed.pageOffset} · ${parsed.sections.length} sections`
                          : ' · not yet parsed'}
                      </div>
                    </div>
                    <label className="shrink-0">
                      <span className="label mr-2">Treat as</span>
                      <select
                        className="field w-auto"
                        value={file.descriptor.type}
                        onChange={(event) =>
                          setUploadType(file.descriptor.fileName, event.target.value as DocumentType)
                        }
                      >
                        {DOCUMENT_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="btn shrink-0 no-print"
                      aria-label={`Remove ${file.descriptor.fileName}`}
                      onClick={() => removeUpload(file.descriptor.fileName)}
                    >
                      <Trash2 size={12} aria-hidden />
                    </button>
                  </article>
                );
              })
            : CORPUS_DESCRIPTORS.map((descriptor) => {
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

      <Panel title="Check your own documents">
        <div className="px-4 pb-4 pt-3">
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
            className={`border border-dashed px-4 py-8 text-center rule ${
              dragging ? 'bg-sunken' : ''
            }`}
          >
            <Upload size={18} className="mx-auto text-ink-faint" aria-hidden />
            <p className="mt-2 text-[12.5px] text-ink">
              Drop PDFs here, or{' '}
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={() => inputRef.current?.click()}
              >
                choose files
              </button>
              .
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              multiple
              className="sr-only"
              onChange={(event) => {
                if (event.target.files) void accept(event.target.files);
                event.target.value = '';
              }}
            />
            <p className="mt-1.5 text-[11.5px] text-ink-faint">
              Read in this tab. Nothing is uploaded — there is nowhere to upload to.
            </p>
            {rejected && (
              <p className="mt-2 text-[11.5px]" style={{ color: 'var(--critical)' }}>
                {rejected}
              </p>
            )}
          </div>

          <div className="mt-3 space-y-2 text-[11.5px] leading-relaxed text-ink-muted">
            <p>
              <span className="label">What travels to your documents </span>
              Ingestion is generic: watermark removal, running header and footer detection,
              printed-to-PDF page reconciliation, the section tree, and the abbreviation table are
              all derived from the file. So are the structural checks — internal cross-references
              that resolve to the wrong section, one acronym carrying two expansions, grading-scale
              and dictionary versions, programming identifiers spelled more than one way, eCRF page
              names that name one page two ways, category sets that leave a gap.
            </p>
            <p>
              <span className="label">What does not, yet </span>
              Rules keyed to specific phrasing — planned sample size, equivalence criteria, analysis
              set definitions — fire on the wording they were written for. On a different sponsor's
              document they will not match, and the run reports how many of the {RULES.length} rules found
              anything so a sparse result reads as coverage rather than as a clean bill of health.
              Cross-document findings need the counterpart documents: upload a plan on its own and
              you get its internal contradictions, which is most of what there is to find.
            </p>
          </div>
        </div>
      </Panel>

      {result && result.entities[0] && (
        <Panel title="First citation produced by this run">
          <div className="px-4 py-3">
            <CitationRef citation={result.entities[0].citation} />
            <p className="mt-2 text-[12.5px] text-ink">“{result.entities[0].citation.snippet}”</p>
          </div>
        </Panel>
      )}

      <div className="flex justify-end">
        <button type="button" className="btn btn-primary no-print" onClick={onRun}>
          {usingUploads ? `Run QC on ${uploaded.length} document${uploaded.length === 1 ? '' : 's'}` : 'Run QC'}
        </button>
      </div>
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
