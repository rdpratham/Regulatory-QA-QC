import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { RULES } from '../../engine/extract';
import { REQUIREMENTS } from '../../engine/guidance';
import { RULESET_VERSION } from '../../study';
import { useStore } from '../../store';
import type { EntityCategory } from '../../engine/types';
import { CATEGORY_PLAIN, CHECK_PLAIN, DOC_PLAIN, GLOSSARY, PROBLEM_KINDS } from '../plain';
import { Panel } from '../components/primitives';

/**
 * “What are you actually checking?”
 *
 * The catalogue is generated from the ruleset rather than written alongside it,
 * so a rule that exists appears here whether or not anyone remembered to
 * document it. Where a plain-English description has been written it is shown;
 * where it has not, the engine's own description is shown and marked, which is
 * an honest gap rather than an invisible one.
 */
export function Checks() {
  const [query, setQuery] = useState('');
  const slots = useStore((s) => s.slots);

  /** Rules that matched something in this session, so coverage is concrete. */
  const matched = useMemo(() => {
    const ids = new Set<string>();
    for (const slot of Object.values(slots)) {
      for (const entity of slot.result?.entities ?? []) ids.add(entity.extractorRule);
    }
    return ids;
  }, [slots]);

  const grouped = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const byCategory = new Map<EntityCategory, typeof RULES>();
    for (const rule of RULES) {
      const plain = CHECK_PLAIN[rule.id] ?? rule.description;
      if (needle && !`${rule.id} ${rule.description} ${plain}`.toLowerCase().includes(needle)) {
        continue;
      }
      const list = byCategory.get(rule.category) ?? [];
      list.push(rule);
      byCategory.set(rule.category, list);
    }
    return [...byCategory.entries()];
  }, [query]);

  const shown = grouped.reduce((n, [, rules]) => n + rules.length, 0);

  return (
    <div className="space-y-4">
      {/* -------------------------------------------------------- */}
      {/* The five kinds of mistake                                */}
      {/* -------------------------------------------------------- */}
      <Panel title="The five kinds of mistake this looks for">
        <div className="px-4 py-3">
          <p className="text-[12.5px] leading-relaxed text-ink-muted">
            Every one of the {RULES.length} checks below is an instance of one of these five. If you
            read nothing else on this page, read this.
          </p>
          <ol className="mt-4 space-y-4">
            {PROBLEM_KINDS.map((kind, index) => (
              <li key={kind.title} className="flex gap-3">
                <span className="mono mt-0.5 w-4 shrink-0 text-[12px] text-ink-faint">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-ink">{kind.title}</div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">{kind.plain}</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-ink-faint">
                    <span className="label">For example </span>
                    {kind.example}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Panel>

      {/* -------------------------------------------------------- */}
      {/* Full catalogue                                           */}
      {/* -------------------------------------------------------- */}
      <Panel
        title={`Every check in the ruleset — ${RULES.length} of them`}
        actions={
          <label className="flex items-center gap-1.5">
            <Search size={12} aria-hidden className="text-ink-faint" />
            <input
              className="field w-48"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter, e.g. dose"
            />
          </label>
        }
      >
        <p className="border-b px-4 py-2.5 text-[11.5px] leading-relaxed text-ink-faint rule">
          Ruleset <span className="mono">{RULESET_VERSION}</span>. Every check runs against every
          paragraph of every document supplied — nothing is sampled and nothing is skipped.
          {matched.size > 0 && (
            <>
              {' '}
              <span className="text-ink-muted">
                {matched.size} of these matched something in your last run; the rest looked and
                found no such statement.
              </span>
            </>
          )}
          {query && <> Showing {shown} matching “{query}”.</>}
        </p>

        <div className="divide-y rule">
          {grouped.map(([category, rules]) => {
            const plain = CATEGORY_PLAIN[category];
            return (
              <section key={category}>
                <header className="bg-sunken px-4 py-2">
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <span className="text-[12.5px] font-medium text-ink">{plain.label}</span>
                    <span className="doctype text-ink-faint">{category}</span>
                    <span className="mono text-[11px] text-ink-faint">{rules.length}</span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-muted">
                    {plain.question}
                  </p>
                </header>

                <ul className="divide-y rule">
                  {rules.map((rule) => {
                    const written = CHECK_PLAIN[rule.id];
                    const hit = matched.has(rule.id);
                    return (
                      <li key={rule.id} className="flex items-start gap-3 px-4 py-2.5">
                        <span
                          aria-hidden
                          title={hit ? 'matched in your last run' : 'no match in your last run'}
                          className="mt-[6px] inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: hit ? 'var(--brand)' : 'var(--line-strong)' }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[12.5px] leading-relaxed text-ink">
                            {written ?? rule.description}
                          </p>
                          {!written && (
                            <p className="mt-0.5 text-[11px] text-ink-faint">
                              (engine wording — no plain-English version written for this one yet)
                            </p>
                          )}
                          <div className="mono mt-1 flex flex-wrap items-center gap-x-3 text-[10.5px] text-ink-faint">
                            <span>{rule.id}</span>
                            {rule.documentTypes && (
                              <span>only in {rule.documentTypes.join(', ')}</span>
                            )}
                            <span>specificity {rule.specificity.toFixed(2)}</span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </Panel>

      {/* -------------------------------------------------------- */}
      {/* Regulator's checklist                                    */}
      {/* -------------------------------------------------------- */}
      <Panel title={`The regulator’s checklist — ${REQUIREMENTS.length} required elements`}>
        <p className="border-b px-4 py-2.5 text-[11.5px] leading-relaxed text-ink-faint rule">
          Separately from consistency, each document is checked for the elements the published
          guidelines require it to contain. Each item below cites the guidance it comes from, so a
          reviewer can go and read the source rather than take the check on trust.
        </p>
        <ul className="divide-y rule">
          {REQUIREMENTS.map((requirement) => (
            <li key={requirement.id} className="px-4 py-2.5">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-[12.5px] text-ink">{requirement.title}</span>
                <span className="mono text-[10.5px] text-ink-faint">
                  applies to {requirement.appliesTo.join(', ')}
                </span>
              </div>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-muted">
                {requirement.requirement}
              </p>
              <p className="citation mt-1 whitespace-normal">
                {requirement.source.issuer} · {requirement.source.document}
                {requirement.source.section ? ` § ${requirement.source.section}` : ''}
              </p>
            </li>
          ))}
        </ul>
      </Panel>

      {/* -------------------------------------------------------- */}
      {/* Limits                                                   */}
      {/* -------------------------------------------------------- */}
      <Panel title="What this does not check">
        <div className="space-y-3 px-4 py-3 text-[12.5px] leading-relaxed text-ink-muted">
          <p>
            <span className="label">It does not judge the science </span>
            Whether the trial design is appropriate, whether the dose is sensible, whether the
            conclusion follows from the data — none of that is checked. This finds places where the
            documents disagree with each other or with themselves.
          </p>
          <p>
            <span className="label">It reads text, not pictures </span>
            A figure supplied as an image contributes nothing. Numbers that exist only inside a chart
            are invisible to it.
          </p>
          <p>
            <span className="label">Some checks are keyed to phrasing </span>
            The structural checks — broken cross-references, one acronym with two meanings, gaps in a
            set of categories, page-number reconciliation — work on any document. Checks that look
            for a specific claim, such as a planned sample size, are written against the wording they
            expect. A document phrased differently will match fewer of them, which is why every run
            reports how many of the {RULES.length} checks matched. A short findings list is a
            coverage figure, not a clean bill of health.
          </p>
          <p>
            <span className="label">Cross-document findings need the counterpart documents </span>
            Upload one file on its own and you get its internal contradictions. The disagreements
            between documents — usually the expensive ones — need at least two.
          </p>
          <p>
            <span className="label">A finding is a question, not a verdict </span>
            Everything found is put to a human with the exact page it came from. Nothing is
            auto-corrected, and no finding is closed without a reviewer's name and comment against
            it.
          </p>
        </div>
      </Panel>

      {/* -------------------------------------------------------- */}
      {/* Glossary                                                 */}
      {/* -------------------------------------------------------- */}
      <Panel title="Every term on this site, in plain English">
        <dl className="divide-y rule">
          {GLOSSARY.map((entry) => (
            <div key={entry.term} className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3 px-4 py-2">
              <dt className="text-[12.5px] font-medium text-ink">{entry.term}</dt>
              <dd className="text-[12.5px] leading-relaxed text-ink-muted">{entry.plain}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      {/* -------------------------------------------------------- */}
      {/* Documents                                                */}
      {/* -------------------------------------------------------- */}
      <Panel title="The documents, and why each one matters">
        <div className="divide-y rule">
          {(['SAP', 'TFL', 'IB'] as const).map((type) => {
            const plain = DOC_PLAIN[type];
            return (
              <div key={type} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="doctype" style={{ color: 'var(--brand)' }}>
                    {type}
                  </span>
                  <span className="text-[13px] font-medium text-ink">{plain.name}</span>
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink">{plain.what}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
                  <span className="label">In other words </span>
                  {plain.analogy}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
                  <span className="label">Why an error here is expensive </span>
                  {plain.stakes}
                </p>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
