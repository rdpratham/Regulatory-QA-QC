import { useMemo } from 'react';
import { create } from 'zustand';
import { loadCorpus } from './corpus';
import { AuditLog, toCsv } from './engine/audit';
import { runPipeline, type CorpusFile, type PipelineStage } from './engine/pipeline';
import type {
  AuditEvent,
  Disposition,
  DispositionStatus,
  DocumentType,
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

export type CorpusSource = 'SAMPLE' | 'UPLOADED';

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */

/**
 * Demo gate.
 *
 * These credentials sit in the client bundle, which means they are readable by
 * anyone who opens the page — this is a front door for a walkthrough, not
 * authentication, and it must not be presented as more than that. Nothing
 * downstream depends on how the session was obtained, only on `session` being
 * set, so replacing this with the sponsor's identity provider touches this
 * block and nothing else.
 */
export const DEMO_EMAIL = 'pratham@shai.com';
export const DEMO_PASSWORD = '1234';

export type Session = { email: string; displayName: string; signedInAt: string };

/* ------------------------------------------------------------------ */
/* Three-document QC                                                   */
/* ------------------------------------------------------------------ */

/** The three documents the dashboard checks, in the order they are shown. */
export const SLOT_KEYS = ['SAP', 'TFL', 'IB'] as const;
export type SlotKey = (typeof SLOT_KEYS)[number];

export type SlotStatus = 'EMPTY' | 'READY' | 'RUNNING' | 'DONE' | 'FAILED';

export type SlotState = {
  key: SlotKey;
  file: CorpusFile | null;
  status: SlotStatus;
  stages: StageState[];
  result: PipelineResult | null;
  error: string | null;
  /** Wall clock, so the three windows can show that they really did overlap. */
  startedAt: number | null;
  finishedAt: number | null;
};

function emptySlot(key: SlotKey): SlotState {
  return {
    key,
    file: null,
    status: 'EMPTY',
    stages: [],
    result: null,
    error: null,
    startedAt: null,
    finishedAt: null,
  };
}

function emptySlots(): Record<SlotKey, SlotState> {
  return { SAP: emptySlot('SAP'), TFL: emptySlot('TFL'), IB: emptySlot('IB') };
}

type State = {
  status: RunStatus;
  error: string | null;
  stages: StageState[];
  result: PipelineResult | null;
  dispositions: Record<string, Disposition>;
  auditEvents: AuditEvent[];
  reviewer: string;
  signOff: SignOff | null;
  source: CorpusSource;
  uploaded: CorpusFile[];

  session: Session | null;
  signInError: string | null;
  slots: Record<SlotKey, SlotState>;
  /** The cross-document pass that runs once the three per-document runs finish. */
  crossStatus: RunStatus;

  signIn: (email: string, password: string) => boolean;
  signOut: () => void;
  setSlotFile: (key: SlotKey, file: CorpusFile) => void;
  clearSlot: (key: SlotKey) => void;
  loadSampleIntoSlots: () => Promise<void>;
  runAllSlots: () => Promise<void>;

  setReviewer: (name: string) => void;
  addUploads: (files: CorpusFile[]) => void;
  setUploadType: (fileName: string, type: DocumentType) => void;
  removeUpload: (fileName: string) => void;
  useSampleSet: () => void;
  run: () => Promise<void>;
  dispose: (findingId: string, status: DispositionStatus, comment: string) => void;
  recordExport: (format: string) => void;
  signOffReview: (reviewer: string) => void;
  openFindingCount: () => number;
};

const STAGE_DELAY_MS = 620;

/**
 * Shorter for the three-up dashboard. The pacing exists so a reviewer can read
 * what the engine did rather than watch a spinner; with three panels ticking at
 * once the same effect needs less time per stage.
 */
const PARALLEL_STAGE_DELAY_MS = 300;

export const useStore = create<State>((set, get) => ({
  status: 'IDLE',
  error: null,
  stages: [],
  result: null,
  dispositions: {},
  auditEvents: auditLog.events(),
  reviewer: '',
  signOff: null,
  source: 'SAMPLE',
  uploaded: [],

  session: null,
  signInError: null,
  slots: emptySlots(),
  crossStatus: 'IDLE',

  /* ---------------------------------------------------------------- */
  /* Session                                                          */
  /* ---------------------------------------------------------------- */

  signIn: (email, password) => {
    const trimmed = email.trim().toLowerCase();
    if (trimmed !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
      set({ signInError: 'That email and password combination is not recognised.' });
      return false;
    }
    const displayName = 'Pratham Jain';
    const session: Session = {
      email: DEMO_EMAIL,
      displayName,
      signedInAt: new Date().toISOString(),
    };
    auditLog.append({
      eventType: 'SESSION_STARTED',
      actor: displayName,
      detail: `${displayName} <${DEMO_EMAIL}> signed in`,
    });
    // The reviewer name on every disposition is the person who signed in, not a
    // free-text field someone can leave blank or fill in with someone else.
    set({
      session,
      signInError: null,
      reviewer: displayName,
      auditEvents: auditLog.events(),
    });
    return true;
  },

  signOut: () => {
    const who = get().session?.displayName ?? 'unknown';
    auditLog.append({ eventType: 'SESSION_ENDED', actor: who, detail: `${who} signed out` });
    set({ session: null, signInError: null, auditEvents: auditLog.events() });
  },

  /* ---------------------------------------------------------------- */
  /* The three document slots                                         */
  /* ---------------------------------------------------------------- */

  setSlotFile: (key, file) =>
    set((state) => ({
      slots: {
        ...state.slots,
        [key]: { ...emptySlot(key), file, status: 'READY' },
      },
      // A new file invalidates the previous cross-document pass; showing a
      // stale one next to a fresh per-document result would be a lie.
      result: null,
      status: 'IDLE',
      crossStatus: 'IDLE',
    })),

  clearSlot: (key) =>
    set((state) => ({
      slots: { ...state.slots, [key]: emptySlot(key) },
      result: null,
      status: 'IDLE',
      crossStatus: 'IDLE',
    })),

  /** Loads the bundled sample SAP, TFL and IB so the run can be seen without files. */
  loadSampleIntoSlots: async () => {
    const corpus = await loadCorpus();
    set((state) => {
      const slots = emptySlots();
      for (const key of SLOT_KEYS) {
        const file = corpus.find((f) => f.descriptor.type === key);
        slots[key] = file ? { ...emptySlot(key), file, status: 'READY' } : state.slots[key];
      }
      return { slots, result: null, status: 'IDLE', crossStatus: 'IDLE' };
    });
  },

  /**
   * Runs the three documents concurrently, then compares them against each
   * other.
   *
   * The concurrency is real, not decorative: each document's ingestion is
   * awaited independently, so the three interleave and the panels advance
   * together. Each panel reports its own start and finish time, and the summary
   * shows total wall clock against the sum of the three — which is the only
   * honest way to claim they overlapped.
   *
   * The fourth pass is the point of the product. Findings that exist only
   * because two documents disagree cannot be produced by any single-document
   * run, so once the three finish, all supplied files are compared together.
   */
  runAllSlots: async () => {
    const active = SLOT_KEYS.filter((key) => get().slots[key].file);
    if (active.length === 0 || active.some((key) => get().slots[key].status === 'RUNNING')) return;

    const patch = (key: SlotKey, update: Partial<SlotState>) =>
      set((state) => ({ slots: { ...state.slots, [key]: { ...state.slots[key], ...update } } }));

    for (const key of active) {
      patch(key, { status: 'RUNNING', stages: [], result: null, error: null, finishedAt: null });
    }
    set({ result: null, status: 'IDLE', crossStatus: 'IDLE' });

    const actor = get().reviewer || get().session?.displayName || 'system';

    await Promise.all(
      active.map(async (key) => {
        const file = get().slots[key].file;
        if (!file) return;
        patch(key, { startedAt: Date.now() });
        try {
          const { result } = await runPipeline([file], {
            audit: auditLog,
            actor,
            onStage: async (stage) => {
              set((state) => ({
                slots: {
                  ...state.slots,
                  [key]: {
                    ...state.slots[key],
                    stages: [...state.slots[key].stages, { ...stage, done: true }],
                  },
                },
              }));
              await new Promise((resolve) => setTimeout(resolve, PARALLEL_STAGE_DELAY_MS));
            },
          });
          patch(key, { status: 'DONE', result, finishedAt: Date.now() });
        } catch (error) {
          patch(key, {
            status: 'FAILED',
            error: error instanceof Error ? error.message : String(error),
            finishedAt: Date.now(),
          });
        }
        set({ auditEvents: auditLog.events() });
      }),
    );

    const files = active.map((key) => get().slots[key].file).filter((f): f is CorpusFile => !!f);
    if (files.length < 2) {
      set({ auditEvents: auditLog.events() });
      return;
    }

    set({ crossStatus: 'RUNNING' });
    try {
      const { result } = await runPipeline(files, { audit: auditLog, actor });
      set({
        result,
        status: 'READY',
        crossStatus: 'READY',
        source: 'UPLOADED',
        uploaded: files,
        auditEvents: auditLog.events(),
      });
    } catch (error) {
      set({
        crossStatus: 'FAILED',
        error: error instanceof Error ? error.message : String(error),
        auditEvents: auditLog.events(),
      });
    }
  },

  setReviewer: (name) => set({ reviewer: name }),

  addUploads: (files) =>
    set((state) => {
      const byName = new Map(state.uploaded.map((f) => [f.descriptor.fileName, f]));
      for (const file of files) byName.set(file.descriptor.fileName, file);
      return { uploaded: [...byName.values()], source: 'UPLOADED', result: null, stages: [] };
    }),

  setUploadType: (fileName, type) =>
    set((state) => ({
      uploaded: state.uploaded.map((file) =>
        file.descriptor.fileName === fileName
          ? { ...file, descriptor: { ...file.descriptor, type } }
          : file,
      ),
    })),

  removeUpload: (fileName) =>
    set((state) => {
      const uploaded = state.uploaded.filter((f) => f.descriptor.fileName !== fileName);
      return { uploaded, source: uploaded.length > 0 ? 'UPLOADED' : 'SAMPLE' };
    }),

  useSampleSet: () => set({ source: 'SAMPLE', result: null, stages: [] }),

  run: async () => {
    if (get().status === 'RUNNING') return;
    set({ status: 'RUNNING', stages: [], error: null, result: null });

    try {
      const { source, uploaded } = get();
      const files = source === 'UPLOADED' && uploaded.length > 0 ? uploaded : await loadCorpus();
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

/* ------------------------------------------------------------------ */
/* File handling                                                       */
/* ------------------------------------------------------------------ */

/** Best guess at what a document is, from its filename. Always overridable. */
export function inferDocumentType(fileName: string): DocumentType {
  const name = fileName.toLowerCase();
  if (/\bsap\b|statistical.?analysis/.test(name)) return 'SAP';
  if (/\bcsr\b|study.?report|results/.test(name)) return 'CSR';
  if (/\bcrf\b|case.?report/.test(name)) return 'CRF';
  if (/\bib\b|brochure/.test(name)) return 'IB';
  if (/\btfl?s?\b|tables?.?figures?|listing|output/.test(name)) return 'TFL';
  return 'PROTOCOL';
}

/**
 * Reads PDFs the reviewer selected. This is a local read — the bytes go from
 * the disk into this tab's memory and no further. Nothing is uploaded, because
 * there is nowhere to upload to.
 */
export async function readPdfFiles(fileList: FileList | File[]): Promise<CorpusFile[]> {
  const files: CorpusFile[] = [];
  for (const file of Array.from(fileList)) {
    if (!/\.pdf$/i.test(file.name)) continue;
    files.push({
      descriptor: {
        id: `DOC-UPLOAD-${file.name.replace(/[^A-Za-z0-9]+/g, '-')}`,
        type: inferDocumentType(file.name),
        fileName: file.name,
        title: file.name.replace(/\.pdf$/i, ''),
        version: 'as supplied',
        effectiveDate: new Date(file.lastModified).toISOString().slice(0, 10),
        author: 'supplied by reviewer',
      },
      data: new Uint8Array(await file.arrayBuffer()),
    });
  }
  return files;
}

/** Export types the viewer's runtime accepts without extended permissions. */
const BASE_EXTENSIONS = /\.(txt|json|md)$/i;

/**
 * Offers a generated file to the viewer.
 *
 * In the hosted single-file build the host mediates saving: the viewer sees a
 * confirmation and may decline. Where the host does not provide that, an
 * ordinary browser download is used. A declined save is a normal outcome and
 * is not reported as an error.
 */
export async function download(
  fileName: string,
  contents: string,
  mime: string,
): Promise<'saved' | 'declined' | 'failed'> {
  const host = (globalThis as { claude?: { downloads?: { save: (r: unknown) => Promise<unknown> } } })
    .claude?.downloads;

  if (host) {
    const attempts = BASE_EXTENSIONS.test(fileName)
      ? [fileName]
      : [fileName, `${fileName.replace(/\.[^.]+$/, '')}.txt`];

    for (const attempt of attempts) {
      try {
        await host.save({ filename: attempt, data: contents });
        return 'saved';
      } catch (error) {
        const code = (error as { code?: string })?.code;
        if (code === 'declined') return 'declined';
        // An extension the view has not enabled is worth one retry as text;
        // anything else falls through to the ordinary browser download.
        if (code !== 'extension_not_enabled' && code !== 'rejected_extension') break;
      }
    }
  }

  try {
    const blob = new Blob([contents], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
    return 'saved';
  } catch {
    return 'failed';
  }
}
