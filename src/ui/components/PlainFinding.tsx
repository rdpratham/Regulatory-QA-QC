import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Finding } from '../../engine/types';
import {
  CATEGORY_PLAIN,
  CHECK_PLAIN,
  SEVERITY_PLAIN,
  plainWhatHappened,
  plainWhyItMatters,
} from '../plain';
import { CitationRef, Excerpt, SEVERITY_COLOR } from './primitives';

/**
 * One finding, in two registers.
 *
 * Plain first, technical underneath. The order matters: a reader who does not
 * know the field gets a sentence they can act on before they meet the words
 * “equivalence margin”, and a reader who does can skip the first line and go
 * straight to the citation. Nothing is hidden from either — the technical
 * wording and the source excerpt are always present, one click away at most.
 *
 * Shared by the three-up dashboard and the assistant so that a finding reads
 * identically wherever it surfaces. A finding that changes its wording
 * depending on which screen showed it is a finding a reviewer cannot cite.
 */
export function PlainFinding({ finding }: { finding: Finding }) {
  const [open, setOpen] = useState(false);
  const category = CATEGORY_PLAIN[finding.category];

  return (
    <article className="px-3 py-3">
      <div className="flex items-start gap-2">
        <span
          aria-hidden
          className="mt-[5px] inline-block h-2.5 w-[3px] shrink-0"
          style={{ background: SEVERITY_COLOR[finding.severity] }}
        />
        <div className="min-w-0 flex-1">
          <div className="doctype" style={{ color: SEVERITY_COLOR[finding.severity] }}>
            {SEVERITY_PLAIN[finding.severity].label}
            {finding.scope === 'CROSS_DOCUMENT' && (
              <span className="text-ink-faint"> · {finding.documentTypes.join(' vs ')}</span>
            )}
          </div>

          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink">
            {plainWhatHappened(finding)}
          </p>

          <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-muted">
            <span className="label">Why it matters </span>
            {plainWhyItMatters(finding)}
          </p>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="mt-2 inline-flex items-center gap-1 text-[11.5px] text-ink-muted underline-offset-2 hover:underline"
          >
            <ChevronDown
              size={12}
              aria-hidden
              className={`transition-transform ${open ? 'rotate-180' : ''}`}
            />
            {open ? 'Hide' : 'Show'} the evidence and the technical wording
          </button>

          {open && (
            <div className="mt-2.5 space-y-3 border-l pl-3 rule">
              <div>
                <div className="label">What the checker calls it</div>
                <p className="mt-1 text-[12px] leading-relaxed text-ink">{finding.title}</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">
                  {finding.description}
                </p>
              </div>

              <div>
                <div className="label">Which kind of check found it</div>
                <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">
                  {category.label} — {category.question}
                </p>
              </div>

              {finding.occurrences.map((occurrence) => (
                <div key={occurrence.entity.id}>
                  <CitationRef citation={occurrence.entity.citation} />
                  <div className="mt-1">
                    <Excerpt
                      snippet={occurrence.entity.citation.snippet}
                      highlight={occurrence.entity.rawText}
                    />
                  </div>
                  <div className="mono mt-1 text-[10.5px] text-ink-faint">
                    found by {occurrence.entity.extractorRule}
                    {CHECK_PLAIN[occurrence.entity.extractorRule]
                      ? ` — ${CHECK_PLAIN[occurrence.entity.extractorRule]}`
                      : ''}
                  </div>
                </div>
              ))}

              <div>
                <div className="label">What to do about it</div>
                <p className="mt-1 text-[11.5px] leading-relaxed text-ink">
                  {finding.suggestedAction}
                </p>
              </div>

              {finding.regulatoryContext && (
                <div>
                  <div className="label">Why a regulator cares</div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">
                    {finding.regulatoryContext}
                  </p>
                </div>
              )}

              {finding.benignNote && (
                <p className="text-[11.5px] leading-relaxed text-ink-faint">
                  <span className="label">Possibly deliberate </span>
                  {finding.benignNote}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
