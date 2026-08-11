import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';
import { configurePdfWorker } from './engine/ingest';
import { App } from './ui/App';
import './ui/theme.css';

/**
 * The PDF worker is bundled, not fetched from a CDN. Everything this
 * application needs is served from its own origin, so the security question —
 * "does anything leave the machine?" — has one answer, and it is no.
 */
configurePdfWorker(workerUrl);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
