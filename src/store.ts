import { useMemo } from 'react';
import { create } from 'zustand';
import { loadCorpus } from './corpus';
import { AuditLog, toCsv } from './engine/audit';
import { runPipeline, type PipelineStage } from './engine/pipeline';
import type {
  AuditEvent,
  Disposition,
  DispositionStatus,
  Finding,
  PipelineResult,
} from './engine/types';

/**
 * Review state.
 *
 * Two rules are enforced here rather than in the UI, because a rule enforced in
 * a component is a rule that a second component can forget:
 *
 *   1. A disposition requires a reviewer and a comment of at least ten
 *      characters. There is no code path that records one without.
 *   2. Sign-off is refused while any finding is undispositioned.
 *
 * The audit log lives outside the store and is append-only. The store holds a
 * copy for rendering; it cannot write to the log except through append().
 */

export const MIN_COMMENT_LENGTH = 10;

const auditLog = new AuditLog('system');

export type RunStatus = 'IDLE' | 'RUNNING' | 'READY' | 'FAILED';

export type StageState = PipelineStage & { done: boolean };

export type SignOff = {
  reviewer: string;
  timestamp: string;
};

type State = {
  status: RunStatus;
  error: string | null;
  stages: StageState[];
  result: PipelineResult | null;
  dispositions: Record<string, Disposition>;
  auditEvents: AuditEvent[];
  reviewer: string;
  signOff: SignOff | null;

  setReviewer: (name: string) => void;
  run: () => Promise<void>;
  dispose: (findingId: string, status: DispositionStatus, comment: string) => void;
  recordExport: (format: string) => void;
  signOffReview: (reviewer: string) => void;
  openFindingCount: () => number;
};

const STAGE_DELAY_MS = 620;

export const useStore = create<State>((set, get) => ({
  status: 'IDLE',
  error: null,
  stages: [],
  result: null,
  dispositions: {},
  auditEvents: auditLog.events(),
  reviewer: '',
  signOff: null,

  setReviewer: (name) => set({ reviewer: name }),

  run: async () => {
    if (get().status === 'RUNNING') return;
    set({ status: 'RUNNING', stages: [], error: null, result: null });

    try {
      const files = await loadCorpus();
      const { result } = await runPipeline(files, {
        audit: auditLog,
        actor: get().reviewer || 'system',
        onStage: async (stage) => {
          set((state) => ({ stages: [...state.stages, { ...stage, done: true }] }));
          // Paced so the work is legible. The pipeline itself is synchronous
          // once the files are parsed; this is presentation, and the README
          // says so.
          await new Promise((resolve) => setTimeout(resolve, STAGE_DELAY_MS));
        },
      });
      set({ status: 'READY', result, auditEvents: auditLog.events() });
    } catch (error) {
      set({ status: 'FAILED', error: error instanceof Error ? error.message : String(error) });
    }
  },

  dispose: (findingId, status, comment) => {
    const reviewer = get().reviewer.trim();
    const trimmed = comment.trim();
    if (!reviewer) throw new Error('A reviewer name is required before a finding can be dispositioned.');
    if (trimmed.length < MIN_COMMENT_LENGTH) {
      throw new Error(`A comment of at least ${MIN_COMMENT_LENGTH} characters is required.`);
    }

    const finding = get().result?.findings.find((f) => f.id === findingId);
    const disposition: Disposition = {
      status,
      reviewer,
      comment: trimmed,
      timestamp: new Date().toISOString(),
    };

    auditLog.append({
      eventType: 'FINDING_REVIEWED',
      actor: reviewer,
      detail: `${findingId} ${status} — ${finding?.title ?? 'unknown finding'} [${finding?.severity ?? '?'}, confidence ${finding?.confidence ?? '?'}] — "${trimmed}"`,
    });

    set((state) => ({
      dispositions: { ...state.dispositions, [findingId]: disposition },
      auditEvents: auditLog.events(),
    }));
  },

  recordExport: (format) => {
    auditLog.append({
      eventType: 'REPORT_EXPORTED',
      actor: get().reviewer || 'system',
      detail: `Discrepancy report exported as ${format}; ruleset ${get().result?.rulesetVersion ?? 'unknown'}`,
    });
    set({ auditEvents: auditLog.events() });
  },

  signOffReview: (reviewer) => {
    if (get().openFindingCount() > 0) {
      throw new Error('Sign-off is blocked while findings remain undispositioned.');
    }
    const timestamp = new Date().toISOString();
    auditLog.append({
      eventType: 'QC_SIGNED_OFF',
      actor: reviewer,
      detail: `QC review signed off by ${reviewer}. ${get().result?.findings.length ?? 0} findings dispositioned against ruleset ${get().result?.rulesetVersion ?? 'unknown'}.`,
    });
    set({ signOff: { reviewer, timestamp }, auditEvents: auditLog.events() });
  },

  openFindingCount: () => {
    const { result, dispositions } = get();
    if (!result) return 0;
    return result.findings.filter((f) => !dispositions[f.id]).length;
  },
}));

/**
 * Findings with dispositions merged, memoized.
 *
 * The merge has to happen outside the zustand selector: a selector that builds
 * a new array on every call never compares equal to its previous result, and
 * the component re-renders forever. Selecting the two stable slices and
 * combining them in `useMemo` is the fix.
 */
export function useFindings(): Finding[] {
  const result = useStore((s) => s.result);
  const dispositions = useStore((s) => s.dispositions);
  return useMemo(
    () =>
      (result?.findings ?? []).map((finding) => ({
        ...finding,
        disposition: dispositions[finding.id] ?? null,
      })),
    [result, dispositions],
  );
}

export function useOpenFindingCount(): number {
  const result = useStore((s) => s.result);
  const dispositions = useStore((s) => s.dispositions);
  return useMemo(
    () => (result?.findings ?? []).filter((f) => !dispositions[f.id]).length,
    [result, dispositions],
  );
}

export function auditCsv(): string {
  return toCsv(auditLog.events());
}

export function download(fileName: string, contents: string, mime: string): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
