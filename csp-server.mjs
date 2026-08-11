import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
const html = readFileSync('dist-artifact/index.html');
const mode = process.argv[2] ?? 'worker-ok';
const csp = mode === 'no-worker'
  ? "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; worker-src 'none'"
  : "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; worker-src blob:";
createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Security-Policy': csp });
  res.end(html);
}).listen(4320, '127.0.0.1', () => console.log('csp-server up:', mode));
