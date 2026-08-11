/**
 * Repackages the single-file build as an Artifact page fragment.
 *
 * The Artifact host supplies its own <!doctype>, <html>, <head> and <body>, so
 * the published file must be the contents of the page and not a whole document.
 * This lifts the inlined stylesheet, the mount point, and the inlined bundle out
 * of the Vite output and writes them in that order, with the title first so the
 * host finds it inside the bytes it scans.
 *
 *   npm run build:artifact && node scripts/package-artifact.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(ROOT, 'dist-artifact', 'index.html'), 'utf8');

const title = source.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim();
const style = source.match(/<style[^>]*>([\s\S]*?)<\/style>/)?.[1];
const script = source.match(/<script type="module"[^>]*>([\s\S]*?)<\/script>/)?.[1];

if (!title || !style || !script) {
  throw new Error(
    'could not find the title, inlined stylesheet, or inlined bundle in dist-artifact/index.html',
  );
}

const page = `<title>${title}</title>
<style>
${style}
</style>
<div id="root"></div>
<script type="module">
${script}
</script>
`;

const out = join(ROOT, 'dist-artifact', 'artifact.html');
writeFileSync(out, page);

const mb = (page.length / 1024 / 1024).toFixed(2);
// eslint-disable-next-line no-console
console.log(`artifact page written: ${out} (${mb} MB, cap is 16 MB)`);
