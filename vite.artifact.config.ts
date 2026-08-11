import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Single-file build, for hosting the demo as one self-contained page.
 *
 * The published page runs under a content security policy that blocks requests
 * to any external host, so everything has to be in the file: the JavaScript,
 * the stylesheet, the PDF.js worker, and the five corpus PDFs.
 *
 *   assetsInlineLimit  turns the corpus PDFs into base64 data URIs instead of
 *                      separate files. They total ~112 KB.
 *   viteSingleFile     folds the JS and CSS back into index.html.
 *
 * The engine is unchanged. This build parses the same PDFs with the same
 * ingestion code the test suite runs — the page is not a mock-up of the
 * application, it is the application.
 *
 *   npm run build:artifact
 */
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  define: {
    __ARTIFACT_BUILD__: 'true',
  },
  build: {
    outDir: 'dist-artifact',
    // Large enough for the corpus; the page still lands far under the 16 MB cap.
    assetsInlineLimit: 100 * 1024 * 1024,
    cssCodeSplit: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 8000,
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
});
