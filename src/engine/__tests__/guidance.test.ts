import { beforeAll, describe, expect, it } from 'vitest';
import { REQUIREMENTS, checkGuidance } from '../guidance';
import { ingestPdf } from '../ingest';
import type { ParsedDocument } from '../types';
import { loadDerivedCorpus } from './helpers';

/**
 * The conformance check is only worth anything if it can be wrong in both
 * directions: it has to find elements that are present and fail to find ones
 * that are absent. A check that passes everything is a check nobody should
 * trust, and it is the easy failure mode for a text search over a long
 * document.
 */

let documents: ParsedDocument[];

beforeAll(async () => {
  documents = await Promise.all(
    loadDerivedCorpus().map((file) => ingestPdf(file.descriptor, file.data)),
  );
}, 60_000);

describe('the requirement registry', () => {
  it('gives every requirement a source a reviewer can go and read', () => {
    for (const requirement of REQUIREMENTS) {
      expect(requirement.source.document.length).toBeGreaterThan(10);
      expect(requirement.source.issuer).toMatch(/^(FDA|ICH \(adopted by FDA\))$/);
      expect(requirement.requirement.length).toBeGreaterThan(30);
      expect(requirement.rationale.length).toBeGreaterThan(40);
      expect(requirement.appliesTo.length).toBeGreaterThan(0);
      expect(requirement.detect.length).toBeGreaterThan(0);
    }
  });

  it('uses unique ids', () => {
    const ids = REQUIREMENTS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers every document type the corpus contains', () => {
    const covered = new Set(REQUIREMENTS.flatMap((r) => r.appliesTo));
    for (const type of ['PROTOCOL', 'SAP', 'CSR', 'IB']) expect(covered).toContain(type);
  });
});

describe('conformance over the corpus', () => {
  it('locates elements that are present, and cites where', () => {
    const checks = checkGuidance(documents);
    const located = checks.filter((c) => c.outcome === 'SATISFIED');

    expect(located.length).toBeGreaterThan(15);
    for (const check of located) {
      expect(check.citation).toBeDefined();
      expect(check.citation!.sectionId).toBeTruthy();
      expect(check.citation!.snippet.length).toBeGreaterThan(3);
      expect(check.citation!.documentType).toBe(check.documentType);
    }
  });

  it('fails to find elements that are genuinely absent', () => {
    const checks = checkGuidance(documents);
    const missing = checks
      .filter((c) => c.outcome === 'NOT_LOCATED')
      .map((c) => `${c.documentType}:${c.requirement.id}`);

    // The protocol carries none of these ICH E6 section 6 elements.
    expect(missing).toContain('PROTOCOL:E6-6.10');
    expect(missing).toContain('PROTOCOL:E6-6.13');
    expect(missing).toContain('PROTOCOL:E6-6.15');
    // The analysis plan predates the estimand framework.
    expect(missing).toContain('SAP:E9R1-estimand');
    // The report has no statistical methods section.
    expect(missing).toContain('CSR:E3-9.7');
  });

  it('does not accept a bibliography entry as evidence of the element', () => {
    const sap = documents.find((d) => d.type === 'SAP')!;
    const references = sap.sections.find((s) => /^REFERENCES/i.test(s.heading));
    const mentionsEstimands = references?.paragraphs.some((p) => /estimand/i.test(p.text));

    // The reference list does name the estimands addendum...
    expect(mentionsEstimands).toBe(true);
    // ...and the check still reports the element as not located.
    const estimand = checkGuidance([sap]).find((c) => c.requirement.id === 'E9R1-estimand');
    expect(estimand?.outcome).toBe('NOT_LOCATED');
  });

  it('applies each requirement only to the document types it governs', () => {
    const checks = checkGuidance(documents);
    for (const check of checks) {
      expect(check.requirement.appliesTo).toContain(check.documentType);
    }
  });

  it('is deterministic', () => {
    const a = checkGuidance(documents).map((c) => `${c.documentId}:${c.requirement.id}:${c.outcome}`);
    const b = checkGuidance(documents).map((c) => `${c.documentId}:${c.requirement.id}:${c.outcome}`);
    expect(a).toEqual(b);
  });
});

describe('a document with none of the required elements', () => {
  it('reports every applicable requirement as not located', () => {
    const empty: ParsedDocument = {
      id: 'DOC-EMPTY',
      type: 'PROTOCOL',
      fileName: 'empty.pdf',
      title: 'Empty',
      version: 'v1.0',
      effectiveDate: '2024-01-01',
      author: 'Test',
      pdfPageCount: 1,
      printedPageCount: 1,
      pageOffset: 0,
      sections: [
        {
          id: '1',
          heading: 'NOTHING IN PARTICULAR',
          printedPage: 1,
          pdfPage: 1,
          paragraphs: [
            { id: '1-p1', text: 'This page is intentionally uninformative.', lines: [], kind: 'PROSE', printedPage: 1, pdfPage: 1 },
          ],
        },
      ],
      abbreviations: [],
      boilerplate: [],
      rotatedItemsDropped: 0,
    };

    const checks = checkGuidance([empty]);
    expect(checks.length).toBeGreaterThan(0);
    expect(checks.every((c) => c.outcome === 'NOT_LOCATED')).toBe(true);
  });
});
