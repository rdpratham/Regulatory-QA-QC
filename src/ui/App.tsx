import { useState } from 'react';
import {
  ClipboardList,
  FileStack,
  Grid3x3,
  History,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MessageSquare,
  PlayCircle,
  ScrollText,
  Scale,
  Gauge,
} from 'lucide-react';
import { RULESET_VERSION, STUDY } from '../study';
import { useFindings, useOpenFindingCount, useStore } from '../store';
import { SHORTHILLS_LOGO } from './brand';
import { Assistant } from './screens/Assistant';
import { AuditTrail } from './screens/AuditTrail';
import { Checks } from './screens/Checks';
import { Dashboard } from './screens/Dashboard';
import { DocumentSet } from './screens/DocumentSet';
import { Findings, type FindingsFilter } from './screens/Findings';
import { Guidance } from './screens/Guidance';
import { Matrix } from './screens/Matrix';
import { Readiness } from './screens/Readiness';
import { Report } from './screens/Report';
import { RunQc } from './screens/RunQc';
import { SignIn } from './screens/SignIn';

type ScreenKey =
  | 'dashboard'
  | 'ask'
  | 'checks'
  | 'documents'
  | 'run'
  | 'findings'
  | 'matrix'
  | 'guidance'
  | 'readiness'
  | 'report'
  | 'audit';

type ScreenDef = { key: ScreenKey; label: string; icon: typeof FileStack; group: string };

/**
 * Two groups, because there are two audiences.
 *
 * The first is for anybody: upload three documents, read what came back, find
 * out what is being checked. The second is the reviewer's workbench — the same
 * findings, but with dispositions, sign-off and the audit trail attached. Both
 * run on one engine; the split is in the reading, not in the checking.
 */
const SCREENS: ScreenDef[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Start here' },
  { key: 'ask', label: 'Ask a question', icon: MessageSquare, group: 'Start here' },
  { key: 'checks', label: 'What we check', icon: ListChecks, group: 'Start here' },
  { key: 'documents', label: 'Document set', icon: FileStack, group: 'Reviewer workbench' },
  { key: 'run', label: 'Run QC', icon: PlayCircle, group: 'Reviewer workbench' },
  { key: 'findings', label: 'Findings', icon: ClipboardList, group: 'Reviewer workbench' },
  { key: 'matrix', label: 'Consistency matrix', icon: Grid3x3, group: 'Reviewer workbench' },
  { key: 'guidance', label: 'Guideline conformance', icon: Scale, group: 'Reviewer workbench' },
  { key: 'readiness', label: 'Submission readiness', icon: Gauge, group: 'Reviewer workbench' },
  { key: 'report', label: 'Discrepancy report', icon: ScrollText, group: 'Reviewer workbench' },
  { key: 'audit', label: 'Audit trail', icon: History, group: 'Reviewer workbench' },
];

const GROUPS = ['Start here', 'Reviewer workbench'];

export function App() {
  const [screen, setScreen] = useState<ScreenKey>('dashboard');
  const [filter, setFilter] = useState<FindingsFilter>({});
  const session = useStore((s) => s.session);
  const signOut = useStore((s) => s.signOut);
  const reviewer = useStore((s) => s.reviewer);
  const setReviewer = useStore((s) => s.setReviewer);
  const findings = useFindings();
  const open = useOpenFindingCount();

  if (!session) return <SignIn />;

  const goToFindings = (next: FindingsFilter) => {
    setFilter(next);
    setScreen('findings');
  };

  return (
    <div className="flex min-h-full">
      <aside className="flex w-60 shrink-0 flex-col border-r bg-raised rule no-print">
        <div className="border-b px-4 py-4 rule">
          <img
            src={SHORTHILLS_LOGO}
            alt="Shorthills AI"
            className="h-6 w-auto"
            width={312}
            height={83}
          />
          <div className="mt-3 text-[12.5px] font-medium text-ink">Clinical Document QC</div>
          <div className="mono mt-1 text-[11px] text-ink-muted">{STUDY.protocolNumber}</div>
          <div className="mono text-[11px] text-ink-faint">ruleset {RULESET_VERSION}</div>
        </div>

        <nav className="flex-1 py-1">
          {GROUPS.map((group) => (
            <div key={group} className="py-1">
              <div className="label px-4 py-1.5">{group}</div>
              {SCREENS.filter((item) => item.group === group).map((item) => {
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
                        ? 'border-l-2 bg-sunken pl-[14px] font-medium text-ink'
                        : 'text-ink-muted hover:bg-sunken'
                    }`}
                    style={active ? { borderLeftColor: 'var(--brand)' } : undefined}
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
            </div>
          ))}
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

        <div className="border-t px-4 py-3 rule">
          <div className="truncate text-[12px] text-ink">{session.displayName}</div>
          <div className="mono truncate text-[11px] text-ink-faint">{session.email}</div>
          <button
            type="button"
            className="btn mt-2 w-full"
            onClick={signOut}
          >
            <span className="inline-flex items-center gap-1.5">
              <LogOut size={12} aria-hidden />
              Sign out
            </span>
          </button>
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
          {screen === 'dashboard' && <Dashboard onOpenWorkbench={() => setScreen('findings')} />}
          {screen === 'ask' && <Assistant />}
          {screen === 'checks' && <Checks />}
          {screen === 'documents' && <DocumentSet onRun={() => setScreen('run')} />}
          {screen === 'run' && <RunQc onComplete={() => setScreen('findings')} />}
          {screen === 'findings' && <Findings filter={filter} onFilterChange={setFilter} />}
          {screen === 'matrix' && <Matrix onSelect={goToFindings} />}
          {screen === 'guidance' && <Guidance />}
          {screen === 'readiness' && <Readiness onSelect={goToFindings} />}
          {screen === 'report' && <Report />}
          {screen === 'audit' && <AuditTrail />}
        </div>
      </main>
    </div>
  );
}
