import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DocumentDescriptor } from '../ingest';
import type { CorpusFile } from '../pipeline';
import type { DocumentType, Severity } from '../types';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export const DERIVED_CORPUS = join(ROOT, 'corpus', 'derived');
export const SOURCE_CORPUS = join(ROOT, 'corpus', 'source');

/** Loads the generated PDFs from disk. The engine never sees anything else. */
export function loadDerivedCorpus(): CorpusFile[] {
  const descriptors: DocumentDescriptor[] = JSON.parse(
    readFileSync(join(DERIVED_CORPUS, 'documents.json'), 'utf8'),
  );
  return descriptors.map((descriptor) => ({
    descriptor,
    data: new Uint8Array(readFileSync(join(DERIVED_CORPUS, descriptor.fileName))),
  }));
}

/**
 * The real disclosure documents, when somebody has dropped them in.
 * corpus/source/ is gitignored and normally empty; the source-corpus tests skip
 * themselves rather than fail when it is.
 */
export function loadSourceCorpus(): CorpusFile[] {
  if (!existsSync(SOURCE_CORPUS)) return [];
  const files = readdirSync(SOURCE_CORPUS).filter((f) => f.toLowerCase().endsWith('.pdf'));
  return files.map((fileName) => ({
    descriptor: {
      id: `DOC-SOURCE-${fileName}`,
      type: inferType(fileName),
      fileName,
      title: fileName,
      version: 'unknown',
      effectiveDate: 'unknown',
      author: 'unknown',
    },
    data: new Uint8Array(readFileSync(join(SOURCE_CORPUS, fileName))),
  }));
}

function inferType(fileName: string): DocumentType {
  const name = fileName.toLowerCase();
  if (name.includes('sap')) return 'SAP';
  if (name.includes('csr')) return 'CSR';
  if (name.includes('crf')) return 'CRF';
  if (name.includes('ib') || name.includes('brochure')) return 'IB';
  if (name.includes('tfl') || name.includes('listing')) return 'TFL';
  return 'PROTOCOL';
}

export type ManifestItem = {
  id: string;
  summary: string;
  kind: 'FINDING' | 'TRUE_NEGATIVE' | 'DECOY';
  severity?: Severity;
  conceptKey?: string;
  scope?: 'INTRA_DOCUMENT' | 'CROSS_DOCUMENT';
  evidence?: string;
  arithmetic?: string;
  resolvedCrossReferences?: number;
};

export type Manifest = { study: string; items: ManifestItem[] };

export function loadManifest(): Manifest {
  return JSON.parse(readFileSync(join(DERIVED_CORPUS, 'manifest.json'), 'utf8'));
}

export const FIXED_CLOCK = () => '2025-09-30T08:00:00.000Z';
