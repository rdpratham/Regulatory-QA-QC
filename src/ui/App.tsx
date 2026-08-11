import { useEffect, useState } from 'react';
import {
  ClipboardList,
  FileStack,
  Grid3x3,
  History,
  PlayCircle,
  ScrollText,
} from 'lucide-react';
import { RULESET_VERSION, STUDY } from '../study';
import { useFindings, useOpenFindingCount, useStore } from '../store';
import { AuditTrail } from './screens/AuditTrail';
import { DocumentSet } from './screens/DocumentSet';
import { Findings, type FindingsFilter } from './screens/Findings';
import { Matrix } from './screens/Matrix';
import { Report } from './screens/Report';
import { RunQc } from './screens/RunQc';

type ScreenKey = 'documents' | 'run' | 'findings' | 'matrix' | 'report' | 'audit';

const SCREENS: { key: ScreenKey; label: string; icon: typeof FileStack }[] = [
  { key: 'documents', label: 'Document set', icon: FileStack },
  { key: 'run', label: 'Run QC', icon: PlayCircle },
  { key: 'findings', label: 'Findings', icon: ClipboardList },
  { key: 'matrix', label: 'Consistency matrix', icon: Grid3x3 },
  { key: 'report', label: 'Discrepancy report', icon: ScrollText },
  { key: 'audit', label: 'Audit trail', icon: History },
];

export function App() {
  const [screen, setScreen] = useState<ScreenKey>('documents');
  const [filter, setFilter] = useState<FindingsFilter>({});
  const { status, reviewer, setReviewer } = useStore();
  const findings = useFindings();
  const open = useOpenFindingCount();

  // Move to the findings workbench as soon as there is something to review.
  useEffect(() => {
    if (status === 'READY' && screen === 'run') return;
  }, [status, screen]);

  const goToFindings = (next: FindingsFilter) => {
    setFilter(next);
    setScreen('findings');
  };

  return (
    <div className="flex min-h-full">
      <aside className="w-56 shrink-0 border-r bg-raised rule no-print">
        <div className="border-b px-4 py-4 rule">
          <div className="doctype text-ink">Cross-document QC</div>
          <div className="mono mt-1 text-[11px] text-ink-muted">{STUDY.protocolNumber}</div>
          <div className="mono text-[11px] text-ink-faint">ruleset {RULESET_VERSION}</div>
        </div>

        <nav className="py-2">
          {SCREENS.map((item) => {
            const Icon = item.icon;
            const active = screen === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setScreen(item.key)}
                aria-current={active ? 'page' : undefined}
                className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-[12.5px] ${
                  active
                    ? 'border-l-2 border-ink bg-sunken pl-[14px] font-medium text-ink'
                    : 'text-ink-muted hover:bg-sunken'
                }`}
              >
                <Icon size={14} aria-hidden className="shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.key === 'findings' && findings.length > 0 && (
                  <span className="mono text-[10.5px] text-ink-faint">
                    {open}/{findings.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t px-4 py-3 rule">
          <label className="block">
            <span className="label">Reviewer</span>
            <input
              className="field mt-1"
              value={reviewer}
              onChange={(event) => setReviewer(event.target.value)}
              placeholder="Your name"
            />
          </label>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
            Recorded against every disposition in the audit trail.
          </p>
        </div>

        <div className="px-4 py-3">
          <p className="text-[11px] leading-relaxed text-ink-faint">
            Runs entirely offline. No network call is made after the page loads.
          </p>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b bg-raised px-6 py-3 rule no-print">
          <h1 className="text-[14px] font-semibold text-ink">
            {SCREENS.find((s) => s.key === screen)?.label}
          </h1>
          <p className="mono text-[11px] text-ink-faint">{STUDY.shortTitle}</p>
        </header>

        <div className="p-6">
          {screen === 'documents' && <DocumentSet onRun={() => setScreen('run')} />}
          {screen === 'run' && <RunQc onComplete={() => setScreen('findings')} />}
          {screen === 'findings' && <Findings filter={filter} onFilterChange={setFilter} />}
          {screen === 'matrix' && <Matrix onSelect={goToFindings} />}
          {screen === 'report' && <Report />}
          {screen === 'audit' && <AuditTrail />}
        </div>
      </main>
    </div>
  );
}
