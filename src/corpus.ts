import type { DocumentDescriptor } from './engine/ingest';
import type { CorpusFile } from './engine/pipeline';
import descriptors from '../corpus/derived/documents.json';

/**
 * Browser-side corpus loading.
 *
 * The PDFs are bundled as assets and fetched at runtime, which means the demo
 * parses real files in the browser exactly as the test suite parses them in
 * Node — same ingestion code, same output. Nothing is pre-parsed and shipped as
 * JSON, because the moment that happens the parser stops being demonstrated.
 */
const PDF_URLS = import.meta.glob('../corpus/derived/*.pdf', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function urlFor(fileName: string): string {
  const entry = Object.entries(PDF_URLS).find(([path]) => path.endsWith(`/${fileName}`));
  if (!entry) throw new Error(`corpus file not bundled: ${fileName}. Run \`npm run corpus\`.`);
  return entry[1];
}

export async function loadCorpus(): Promise<CorpusFile[]> {
  const files: CorpusFile[] = [];
  for (const descriptor of descriptors as DocumentDescriptor[]) {
    const response = await fetch(urlFor(descriptor.fileName));
    if (!response.ok) throw new Error(`could not read ${descriptor.fileName}`);
    files.push({ descriptor, data: new Uint8Array(await response.arrayBuffer()) });
  }
  return files;
}

export const CORPUS_DESCRIPTORS = descriptors as DocumentDescriptor[];
