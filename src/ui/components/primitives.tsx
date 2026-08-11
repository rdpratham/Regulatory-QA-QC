import type { ReactNode } from 'react';
import type { Citation, Finding, Severity } from '../../engine/types';

/* ------------------------------------------------------------------ */
/* Citation                                                            */
/* ------------------------------------------------------------------ */

/**
 * The citation is the product. It is set like a legal citation because that is
 * functionally what it is, and it always carries both page numbers: the printed
 * page an inspector will quote, and the PDF page the reviewer has to navigate
 * to in order to see it.
 */
export function CitationRef({ citation }: { citation: Citation }) {
  return (
    <span className="citation">
      <span className="doctype text-ink">{citation.documentType}</span>{' '}
      {citation.version} · §{citation.sectionId} ·{' '}
      {citation.printedPage === null ? 'front matter' : `p.${citation.printedPage}`}
      <span className="text-ink-faint"> (pdf {citation.pdfPage})</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Severity                                                            */
/* ------------------------------------------------------------------ */

export const SEVERITY_COLOR: Record<Severity, string> = {
  CRITICAL: 'var(--critical)',
  MAJOR: 'var(--major)',
  MINOR: 'var(--minor)',
};

export function SeverityMark({ severity, muted }: { severity: Severity; muted?: boolean }) {
  const color = muted ? 'var(--settled)' : SEVERITY_COLOR[severity];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span aria-hidden className="inline-block h-2.5 w-[3px]" style={{ background: color }} />
      <span className="doctype" style={{ color }}>
        {severity}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Confidence                                                          */
/* ------------------------------------------------------------------ */

/**
 * Regulatory buyers do not accept an unexplained number, so the contributing
 * factors are always one hover away and are never summarised into an adjective.
 */
export function Confidence({ finding }: { finding: Finding }) {
  return (
    <div className="group relative inline-block">
      <span className="mono text-[11px] text-ink-muted underline decoration-dotted underline-offset-2">
        confidence {finding.confidence.toFixed(2)}
      </span>
      <div className="pointer-events-none absolute left-0 top-full z-20 hidden w-[26rem] border bg-raised p-3 shadow-sm rule group-hover:block group-focus-within:block">
        <div className="label mb-2">Contributing factors</div>
        <table className="w-full">
          <tbody>
            {finding.confidenceFactors.map((factor) => (
              <tr key={factor.label} className="align-top">
                <td className="w-[9.5rem] py-1 pr-2 text-[11.5px] text-ink">{factor.label}</td>
                <td className="w-14 py-1 pr-2 text-right">
                  <span
                    className="mono text-[11.5px]"
                    style={{ color: factor.contribution < 0 ? 'var(--critical)' : 'var(--ink)' }}
                  >
                    {factor.contribution >= 0 ? '+' : ''}
                    {factor.contribution.toFixed(2)}
                  </span>
                </td>
                <td className="py-1 text-[11px] leading-snug text-ink-muted">{factor.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Evidence excerpt                                                    */
/* ------------------------------------------------------------------ */

/**
 * The source excerpt with the conflicting value marked inside the surrounding
 * paragraph text. This is the single most important element in the product: it
 * is what lets a reviewer confirm a finding without opening the document, and
 * what proves the engine did not invent anything.
 */
export function Excerpt({ snippet, highlight }: { snippet: string; highlight: string }) {
  const index = highlight ? snippet.indexOf(highlight) : -1;
  if (index < 0) {
    return <p className="text-[12.5px] leading-relaxed text-ink">{snippet}</p>;
  }
  return (
    <p className="text-[12.5px] leading-relaxed text-ink">
      {snippet.slice(0, index)}
      <mark className="evidence bg-transparent">{highlight}</mark>
      {snippet.slice(index + highlight.length)}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export function Panel({
  title,
  actions,
  children,
  className = '',
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border bg-raised rule ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b px-4 py-2.5 rule">
          <h2 className="label">{title}</h2>
          {actions}
        </header>
      )}
      <div>{children}</div>
    </section>
  );
}

export function Empty({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="px-4 py-16 text-center">
      <p className="text-[12.5px] text-ink-muted">{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="border-l px-4 py-3 first:border-l-0 rule">
      <div className="label">{label}</div>
      <div className="mono mt-1 text-[19px] leading-none text-ink">{value}</div>
      {hint && <div className="mt-1.5 text-[11px] text-ink-faint">{hint}</div>}
    </div>
  );
}

export const DISPOSITION_LABEL: Record<string, string> = {
  CONFIRMED: 'Confirmed',
  DISMISSED: 'Dismissed',
  RESOLVED: 'Resolved',
  INTENTIONAL_DOCUMENTED: 'Intentional, documented',
};
