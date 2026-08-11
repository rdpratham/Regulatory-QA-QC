import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import PdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs?worker&inline';
import { configurePdfWorkerPort } from './engine/ingest';
import { App } from './ui/App';
import './ui/theme.css';

/**
 * The PDF worker is bundled into the page, not fetched from a CDN. Everything
 * this application needs is in the file it was served as, so the security
 * question — does anything leave the machine? — has one answer, and it is no.
 *
 * Where the host refuses a blob-backed worker, pdf.js parses on the main
 * thread instead. Either way the same ingestion code runs on the same bytes.
 */
try {
  configurePdfWorkerPort(new PdfWorker());
} catch {
  // Intentionally silent: main-thread parsing is a supported path, not a fault.
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
