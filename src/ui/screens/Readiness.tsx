import { CircleAlert, CircleCheck, CircleDot } from 'lucide-react';
import { useFindings, useStore } from '../../store';
import { REVIEW_THRESHOLD } from '../../engine/severity';
import type { DocumentType } from '../../engine/types';
import { Empty, Panel, SEVERITY_COLOR, Stat } from '../components/primitives';
import type { FindingsFilter } from './Findings';

/**
 * What a QC lead takes into a submission go/no-go meeting.
 *
 * This deliberately does not say "ready to submit". Nothing here can know that:
 * a submission turns on the clinical evidence, and this tool has read the
 * documents, not the data. What it can say — and what the meeting actually
 * needs — is which items are open, what each one blocks, and where the evidence
 * for each is.
 */

const EXPECTED_SET: { type: DocumentType; role: string }[] = [
  { type: 'PROTOCOL', role: 'What the study committed to do' },
  { type: 'SAP', role: 'How the data will be analysed' },
  { type: 'CSR', role: 'What happened and what was found' },
  { type: 'TFL', role: 'The outputs the report is built from' },
  { type: 'CRF', role: 'What could be captured' },
  { type: 'IB', role: 'What investigators were told' },
];

export function Readiness({ onSelect }: { onSelect: (filter: FindingsFilter) => void }) {
  const result = useStore((s) => s.result);
  const findings = useFindings();
  const signOff = useStore((s) => s.signOff);

  if (!result) return <Empty message="No run yet. Open Run QC and start the pipeline." />;

  const open = findings.filter((f) => !f.disposition);
  const openCritical = open.filter((f) => f.severity === 'CRITICAL');
  const openMajor = open.filter((f) => f.severity === 'MAJOR');
  const actionable = open.filter((f) => f.confidence >= REVIEW_THRESHOLD);

  const guidanceGaps = result.guidance.filter((g) => g.outcome === 'NOT_LOCATED');
  const criticalGaps = guidanceGaps.filter((g) => g.requirement.severity === 'CRITICAL');
  const arithmeticFailures = result.arithmetic.filter((a) => a.outcome === 'FAILED');

  const present = new Set(result.documents.map((d) => d.type));
  const missingDocuments = EXPECTED_SET.filter((d) => !present.has(d.type));

  const gates: {
    label: string;
    detail: string;
    count: number;
    state: 'BLOCKING' | 'OPEN' | 'CLEAR';
    onClick?: () => void;
  }[] = [
    {
      label: 'Critical consistency findings undispositioned',
      detail:
        'A critical finding is one where the documents disagree about what the study measured, on whom, or how many. Each needs a reviewer decision before the set can be filed.',
      count: openCritical.length,
      state: openCritical.length > 0 ? 'BLOCKING' : 'CLEAR',
      onClick: () => onSelect({ severity: 'CRITICAL' }),
    },
    {
      label: 'Guidance elements not located, critical',
      detail:
        'An element the guidance requires that could not be found in the document it governs.',
      count: criticalGaps.length,
      state: criticalGaps.length > 0 ? 'BLOCKING' : 'CLEAR',
    },
    {
      label: 'Stated derivations that do not reproduce',
      detail:
        'A figure the document derives from its own stated inputs, recomputed and found not to match.',
      count: arithmeticFailures.length,
      state: arithmeticFailures.length > 0 ? 'OPEN' : 'CLEAR',
    },
    {
      label: 'Major findings undispositioned',
      detail: 'Population criteria, safety windows, coding versions, broken references.',
      count: openMajor.length,
      state: openMajor.length > 0 ? 'OPEN' : 'CLEAR',
      onClick: () => onSelect({ severity: 'MAJOR' }),
    },
    {
      label: 'Expected documents not supplied',
      detail: missingDocuments.length
        ? `Not in this run: ${missingDocuments.map((d) => d.type).join(', ')}. Checks that need them did not run.`
        : 'Every document type the cross-document checks expect is present.',
      count: missingDocuments.length,
      state: missingDocuments.length > 0 ? 'OPEN' : 'CLEAR',
    },
  ];

  const blocking = gates.filter((g) => g.state === 'BLOCKING');
  const openGates = gates.filter((g) => g.state === 'OPEN');

  return (
    <div className="space-y-4">
      <Panel title="Where this document set stands">
        <div className="border-b px-4 py-4 rule">
          <div className="flex items-start gap-3">
            {blocking.length > 0 ? (
              <CircleAlert size={20} className="mt-0.5 shrink-0" style={{ color: 'var(--critical)' }} />
            ) : openGates.length > 0 ? (
              <CircleDot size={20} className="mt-0.5 shrink-0" style={{ color: 'var(--major)' }} />
            ) : (
              <CircleCheck size={20} className="mt-0.5 shrink-0" style={{ color: 'var(--ink-muted)' }} />
            )}
            <div>
              <h2 className="text-[15px] font-semibold text-ink">
                {blocking.length > 0
                  ? `${blocking.reduce((n, g) => n + g.count, 0)} items must be resolved before this set is filed`
                  : openGates.length > 0
                    ? `No blocking items. ${openGates.reduce((n, g) => n + g.count, 0)} items remain open.`
                    : signOff
                      ? `QC review signed off by ${signOff.reviewer}.`
                      : 'All checks clear. QC review has not been signed off.'}
              </h2>
              <p className="mt-1 max-w-3xl text-[12.5px] leading-relaxed text-ink-muted">
                This is a document quality assessment, not a regulatory opinion. It reports whether
                the documents agree with each other, whether the elements published guidance
                requires are present, and whether the figures the documents derive reproduce. It
                has read the documents, not the data, and it cannot speak to the clinical evidence
                a submission is decided on.
              </p>
            </div>
          </div>
        </div>

        <ul className="divide-y rule">
          {gates.map((gate) => (
            <li key={gate.label} className="flex items-start gap-3 px-4 py-3">
              <span className="mt-0.5 w-4 shrink-0">
                {gate.state === 'CLEAR' ? (
                  <CircleCheck size={14} aria-hidden style={{ color: 'var(--ink-faint)' }} />
                ) : (
                  <CircleAlert
                    size={14}
                    aria-hidden
                    style={{
                      color: gate.state === 'BLOCKING' ? 'var(--critical)' : 'var(--major)',
                    }}
                  />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  {gate.onClick && gate.count > 0 ? (
                    <button
                      type="button"
                      className="text-[12.5px] font-medium text-ink underline-offset-2 hover:underline"
                      onClick={gate.onClick}
                    >
                      {gate.label}
                    </button>
                  ) : (
                    <span className="text-[12.5px] font-medium text-ink">{gate.label}</span>
                  )}
                  {gate.state !== 'CLEAR' && (
                    <span
                      className="doctype"
                      style={{
                        color: gate.state === 'BLOCKING' ? 'var(--critical)' : 'var(--major)',
                      }}
                    >
                      {gate.state === 'BLOCKING' ? 'blocking' : 'open'}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">{gate.detail}</p>
              </div>
              <span
                className="mono shrink-0 text-[17px] leading-none"
                style={{
                  color:
                    gate.state === 'BLOCKING'
                      ? 'var(--critical)'
                      : gate.state === 'OPEN'
                        ? 'var(--major)'
                        : 'var(--ink-faint)',
                }}
              >
                {gate.count}
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="What was checked">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          <Stat label="Documents parsed" value={result.documents.length} />
          <Stat
            label="Concepts and checks"
            value={result.conceptsCompared}
            hint={`${result.entities.length} entities extracted`}
          />
          <Stat
            label="Guidance requirements"
            value={`${result.guidance.length - guidanceGaps.length}/${result.guidance.length}`}
            hint="located in the documents they govern"
          />
          <Stat
            label="Derivations recomputed"
            value={`${result.arithmetic.length - arithmeticFailures.length}/${result.arithmetic.length}`}
            hint="reproduce from stated inputs"
          />
          <Stat
            label="Findings"
            value={findings.length}
            hint={`${actionable.length} open at or above ${REVIEW_THRESHOLD.toFixed(2)} confidence`}
          />
          <Stat label="Dispositioned" value={findings.length - open.length} />
          <Stat label="Ruleset" value={result.rulesetVersion} />
          <Stat
            label="QC sign-off"
            value={<span className="text-[13px]">{signOff ? 'signed' : 'not signed'}</span>}
          />
        </div>
      </Panel>

      <Panel title="Document set">
        <ul className="divide-y rule">
          {EXPECTED_SET.map((expected) => {
            const document = result.documents.find((d) => d.type === expected.type);
            return (
              <li key={expected.type} className="flex items-baseline gap-4 px-4 py-2.5">
                <span className="doctype w-20 shrink-0 text-ink">{expected.type}</span>
                <span className="flex-1 text-[12px] text-ink-muted">{expected.role}</span>
                <span className="mono shrink-0 text-[11.5px]">
                  {document ? (
                    <span className="text-ink">
                      {document.version} · {document.printedPageCount} pp
                    </span>
                  ) : (
                    <span style={{ color: 'var(--major)' }}>not supplied</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>

      {criticalGaps.length > 0 && (
        <Panel title="Guidance elements not located — critical">
          <ul className="divide-y rule">
            {criticalGaps.map((gap) => (
              <li key={`${gap.documentId}-${gap.requirement.id}`} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="doctype text-ink">{gap.documentType}</span>
                  <span className="text-[12.5px] font-medium text-ink">{gap.requirement.title}</span>
                  <span className="citation">
                    {gap.requirement.source.document}
                    {gap.requirement.source.section ? ` §${gap.requirement.source.section}` : ''}
                  </span>
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
                  {gap.requirement.requirement}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {openCritical.length > 0 && (
        <Panel title="Critical findings awaiting a decision">
          <ul className="divide-y rule">
            {openCritical.map((finding) => (
              <li key={finding.id} className="flex items-baseline gap-3 px-4 py-2.5">
                <span className="mono w-12 shrink-0 text-[11px] text-ink-faint">{finding.id}</span>
                <button
                  type="button"
                  className="flex-1 text-left text-[12.5px] text-ink underline-offset-2 hover:underline"
                  onClick={() => onSelect({ severity: 'CRITICAL' })}
                >
                  {finding.title}
                </button>
                <span
                  className="mono shrink-0 text-[11px]"
                  style={{ color: SEVERITY_COLOR.CRITICAL }}
                >
                  {finding.confidence.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
