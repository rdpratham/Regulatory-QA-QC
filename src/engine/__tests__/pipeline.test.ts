import { beforeAll, describe, expect, it } from 'vitest';
import { REVIEW_THRESHOLD } from '../severity';
import { runPipeline } from '../pipeline';
import type { Finding, PipelineResult } from '../types';
import { FIXED_CLOCK, loadDerivedCorpus, loadManifest } from './helpers';
import type { AuditLog } from '../audit';

/**
 * This file is the specification.
 *
 * corpus/derived/manifest.json catalogues every item planted in the authored
 * corpus. Running the real pipeline over the generated PDFs must reproduce all
 * of them, at the right severity, from the right documents — and must keep the
 * decoys below the review threshold. Editing the corpus without editing the
 * manifest fails the build, which is how the two stay honest.
 */

const manifest = loadManifest();

let result: PipelineResult;
let audit: AuditLog;

beforeAll(async () => {
  const run = await runPipeline(loadDerivedCorpus(), { now: FIXED_CLOCK, actor: 'test-runner' });
  result = run.result;
  audit = run.audit;
}, 60_000);

function matching(conceptKey: string, item: { scope?: string; evidence?: string }): Finding[] {
  return result.findings.filter((finding) => {
    if (finding.conceptKey !== conceptKey) return false;
    if (item.scope && finding.scope !== item.scope) return false;
    if (item.evidence) {
      const haystack = [
        finding.title,
        finding.description,
        ...finding.occurrences.map((o) => `${o.value} ${o.entity.rawText} ${o.entity.citation.snippet}`),
      ].join(' ');
      if (!haystack.includes(item.evidence)) return false;
    }
    return true;
  });
}

describe('ingestion produced a usable document set', () => {
  it('parsed every document in the corpus', () => {
    expect(result.documents).toHaveLength(6);
    expect(new Set(result.documents.map((d) => d.type))).toEqual(
      new Set(['PROTOCOL', 'SAP', 'CSR', 'TFL', 'CRF', 'IB']),
    );
  });

  it('extracted enough structure to cross-reference', () => {
    expect(result.paragraphs.length).toBeGreaterThan(150);
    expect(result.entities.length).toBeGreaterThan(200);
  });

  it('carries both page numbers on every citation', () => {
    for (const finding of result.findings) {
      for (const occurrence of finding.occurrences) {
        expect(occurrence.entity.citation.pdfPage).toBeGreaterThan(0);
        expect(occurrence.entity.citation.sectionId).toBeTruthy();
        expect(occurrence.entity.citation.paragraphId).toBeTruthy();
      }
    }
  });
});

describe('planted findings', () => {
  for (const item of manifest.items.filter((i) => i.kind === 'FINDING')) {
    describe(`${item.id} — ${item.summary}`, () => {
      it('is reported', () => {
        expect(matching(item.conceptKey!, item).length).toBeGreaterThan(0);
      });

      it(`is reported at ${item.severity}`, () => {
        const found = matching(item.conceptKey!, item);
        expect(found.map((f) => f.severity)).toContain(item.severity);
      });

      it('is reported at or above the review threshold', () => {
        const found = matching(item.conceptKey!, item);
        expect(Math.max(...found.map((f) => f.confidence))).toBeGreaterThanOrEqual(
          REVIEW_THRESHOLD,
        );
      });

      it('carries a citation, regulatory context, and a non-destructive action', () => {
        const [finding] = matching(item.conceptKey!, item);
        expect(finding.occurrences.length).toBeGreaterThan(0);
        expect(finding.regulatoryContext.length).toBeGreaterThan(40);
        expect(finding.suggestedAction.length).toBeGreaterThan(20);
        expect(finding.suggestedAction).not.toMatch(/\bauto-?(fix|correct|resolve|update)\b/i);
      });

      it('is undispositioned until a human acts', () => {
        for (const finding of matching(item.conceptKey!, item)) {
          expect(finding.disposition).toBeNull();
        }
      });
    });
  }
});

describe('decoys', () => {
  for (const item of manifest.items.filter((i) => i.kind === 'DECOY')) {
    it(`${item.id} — ${item.summary} — is surfaced but held below the review threshold`, () => {
      const found = matching(item.conceptKey!, item);
      expect(found.length, 'a decoy must be surfaced, not suppressed').toBeGreaterThan(0);
      const lowest = found.reduce((min, f) => (f.confidence < min.confidence ? f : min));
      expect(lowest.confidence).toBeLessThan(REVIEW_THRESHOLD);
      expect(lowest.severity).toBe('MINOR');
      expect(lowest.benignNote, 'a downgraded finding must explain why').toBeTruthy();
    });
  }
});

describe('true negatives', () => {
  for (const item of manifest.items.filter((i) => i.kind === 'TRUE_NEGATIVE' && i.arithmetic)) {
    it(`${item.id} — ${item.summary} — is confirmed, not reported`, () => {
      const checks = result.arithmetic.filter((c) => c.label.includes(item.arithmetic!));
      expect(checks.length).toBeGreaterThan(0);
      for (const check of checks) expect(check.outcome).toBe('CONFIRMED');
    });
  }

  it('D3 — internal references that resolve are counted, not reported', () => {
    const resolved = result.entities.filter(
      (e) => e.conceptKey === 'crossref.integrity' && e.normalizedValue === 'RESOLVED',
    );
    const expected = manifest.items.find((i) => i.id === 'D3')!.resolvedCrossReferences!;
    expect(resolved.length).toBeGreaterThanOrEqual(expected);
    for (const entity of resolved) {
      expect(
        result.findings.some((f) => f.occurrences.some((o) => o.entity.id === entity.id)),
      ).toBe(false);
    }
  });

  it('reports no finding for concepts every document agrees on', () => {
    const agreed = ['schedule.cycle_interval', 'stat.alpha', 'equivalence.ci_level.difference'];
    for (const conceptKey of agreed) {
      const cross = result.findings.filter(
        (f) => f.conceptKey === conceptKey && f.scope === 'CROSS_DOCUMENT',
      );
      expect(cross, `${conceptKey} should agree across documents`).toHaveLength(0);
    }
  });
});

describe('scoring and ordering', () => {
  it('orders findings by severity then confidence', () => {
    const rank = { CRITICAL: 0, MAJOR: 1, MINOR: 2 } as const;
    for (let i = 1; i < result.findings.length; i += 1) {
      const previous = result.findings[i - 1];
      const current = result.findings[i];
      expect(rank[previous.severity]).toBeLessThanOrEqual(rank[current.severity]);
      if (previous.severity === current.severity) {
        expect(previous.confidence).toBeGreaterThanOrEqual(current.confidence);
      }
    }
  });

  it('explains every confidence score with contributing factors that sum to it', () => {
    for (const finding of result.findings) {
      expect(finding.confidenceFactors.length).toBeGreaterThanOrEqual(4);
      const total = finding.confidenceFactors.reduce((sum, f) => sum + f.contribution, 0);
      expect(Math.abs(total - finding.confidence)).toBeLessThan(0.06);
    }
  });

  it('gives every finding a unique id', () => {
    expect(new Set(result.findings.map((f) => f.id)).size).toBe(result.findings.length);
  });
});

describe('audit trail', () => {
  it('records every stage of the run against a single ruleset version', () => {
    const types = audit.events().map((e) => e.eventType);
    expect(types.filter((t) => t === 'DOCUMENT_INGESTED')).toHaveLength(
      result.documents.length,
    );
    expect(types).toContain('EXTRACTION_COMPLETED');
    expect(types).toContain('COMPARISON_RUN');
    for (const event of audit.events()) {
      expect(event.timestamp).toBe(FIXED_CLOCK());
      expect(event.rulesetVersion).toBe(result.rulesetVersion);
    }
  });

  it('records the detected page offset per document, not an assumed one', () => {
    const ingested = audit.events().filter((e) => e.eventType === 'DOCUMENT_INGESTED');
    for (const event of ingested) expect(event.detail).toMatch(/printed-to-PDF offset \d+/);
  });
});

describe('determinism', () => {
  it('produces identical findings on a second run of the same files', async () => {
    const again = await runPipeline(loadDerivedCorpus(), { now: FIXED_CLOCK });
    expect(JSON.stringify(again.result.findings)).toBe(JSON.stringify(result.findings));
  }, 60_000);
});
