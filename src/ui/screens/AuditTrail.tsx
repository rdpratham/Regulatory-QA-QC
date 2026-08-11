import { useState } from 'react';
import { Download, Lock } from 'lucide-react';
import { STUDY } from '../../study';
import { auditCsv, download, useFindings, useOpenFindingCount, useStore } from '../../store';
import type { AuditEventType } from '../../engine/types';
import { Empty, Panel } from '../components/primitives';

const EVENT_TYPES: AuditEventType[] = [
  'DOCUMENT_INGESTED',
  'EXTRACTION_COMPLETED',
  'COMPARISON_RUN',
  'FINDING_REVIEWED',
  'REPORT_EXPORTED',
  'QC_SIGNED_OFF',
];

export function AuditTrail() {
  const events = useStore((s) => s.auditEvents);
  const openCount = useOpenFindingCount();
  const findings = useFindings();
  const signOff = useStore((s) => s.signOff);
  const signOffReview = useStore((s) => s.signOffReview);
  const reviewer = useStore((s) => s.reviewer);

  const [filter, setFilter] = useState<AuditEventType | ''>('');
  const [attested, setAttested] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const visible = [...events].reverse().filter((event) => !filter || event.eventType === filter);

  const commit = () => {
    try {
      signOffReview(name.trim() || reviewer);
      setError(null);
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : String(thrown));
    }
  };

  const blocked = openCount > 0 || findings.length === 0;

  return (
    <div className="space-y-4">
      <Panel title="Sign off QC review">
        {signOff ? (
          <p className="mono px-4 py-3 text-[12.5px] text-ink">
            Signed off by {signOff.reviewer} at {signOff.timestamp}.
          </p>
        ) : (
          <div className="px-4 py-3">
            <p className="text-[12.5px] text-ink">
              {findings.length === 0
                ? 'No QC run has been performed yet.'
                : blocked
                  ? `${openCount} of ${findings.length} findings are still undispositioned. Sign-off is blocked until every finding has been dispositioned by a reviewer.`
                  : `All ${findings.length} findings have been dispositioned. Sign-off will write a terminal event to the audit trail.`}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="block">
                <span className="label">Reviewer name</span>
                <input
                  className="field mt-1"
                  value={name || reviewer}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Full name"
                />
              </label>
              <button
                type="button"
                className="btn btn-primary"
                disabled={blocked || !attested || !(name || reviewer).trim()}
                onClick={commit}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Lock size={12} aria-hidden /> Sign off
                </span>
              </button>
            </div>
            <label className="mt-3 flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={attested}
                onChange={(event) => setAttested(event.target.checked)}
              />
              <span className="text-[12px] leading-relaxed text-ink">
                I confirm that I have reviewed each finding against its cited source, that the
                dispositions recorded above reflect my assessment, and that I am authorised to sign
                off this quality control review for {STUDY.protocolNumber}.
              </span>
            </label>
            {error && (
              <p className="mt-2 text-[11.5px]" style={{ color: 'var(--critical)' }}>
                {error}
              </p>
            )}
          </div>
        )}
      </Panel>

      <Panel
        title={`Audit trail — ${events.length} events`}
        actions={
          <div className="flex items-center gap-2 no-print">
            <select
              className="field w-auto"
              value={filter}
              onChange={(event) => setFilter(event.target.value as AuditEventType | '')}
            >
              <option value="">All event types</option>
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ').toLowerCase()}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn"
              onClick={() =>
                download(`${STUDY.protocolNumber}-audit-trail.csv`, auditCsv(), 'text/csv')
              }
            >
              <span className="inline-flex items-center gap-1.5">
                <Download size={12} aria-hidden /> CSV
              </span>
            </button>
          </div>
        }
      >
        {visible.length === 0 ? (
          <Empty message="No audit events match this filter." />
        ) : (
          <div className="max-h-[64vh] overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-raised">
                <tr className="border-b rule">
                  <th className="label px-4 py-2 text-left">Event</th>
                  <th className="label px-3 py-2 text-left">Timestamp</th>
                  <th className="label px-3 py-2 text-left">Actor</th>
                  <th className="label px-3 py-2 text-left">Type</th>
                  <th className="label px-4 py-2 text-left">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y rule">
                {visible.map((event) => (
                  <tr key={event.id}>
                    <td className="mono px-4 py-2 align-top text-[11px] text-ink-faint">{event.id}</td>
                    <td className="mono px-3 py-2 align-top text-[11.5px] text-ink">
                      {event.timestamp}
                    </td>
                    <td className="px-3 py-2 align-top text-[12px] text-ink">{event.actor}</td>
                    <td className="px-3 py-2 align-top">
                      <span className="doctype text-ink-muted">{event.eventType}</span>
                    </td>
                    <td className="px-4 py-2 text-[12px] leading-relaxed text-ink">{event.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t px-4 py-2.5 text-[11.5px] leading-relaxed text-ink-faint rule">
          The audit log is append-only. There is no delete or edit method on it and no code path in
          this application that removes an event — a structural test in the suite reads the source
          and fails the build if one is ever introduced.
        </p>
      </Panel>
    </div>
  );
}
