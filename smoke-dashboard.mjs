/**
 * End-to-end smoke test for the sign-in → dashboard → three-window flow, run
 * against the single-file build behind the same content security policy the
 * Artifact host applies. It asserts the things a screenshot cannot: that the
 * three per-document runs really overlapped in time, and that all three windows
 * reached a result.
 *
 *   node csp-server.mjs & node smoke-dashboard.mjs
 */
import { chromium } from 'playwright';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });

const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text().slice(0, 200));
});
page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 200)));

await page.goto('http://127.0.0.1:4320/', { waitUntil: 'load' });

/* ---- sign in ---------------------------------------------------- */
await page.waitForSelector('text=Clinical Document QC', { timeout: 20000 });

// Wrong credentials must be refused.
await page.fill('input[type=email]', 'wrong@example.com');
await page.fill('input[type=password]', 'nope');
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForSelector('[role=alert]', { timeout: 5000 });
console.log('rejected bad credentials: yes');

await page.fill('input[type=email]', 'pratham@shai.com');
await page.fill('input[type=password]', '1234');
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForSelector('text=What happens here', { timeout: 10000 });
console.log('signed in: yes');
await page.screenshot({ path: '/tmp/shot-dashboard-empty.png', fullPage: false });

/* ---- load the three documents and run --------------------------- */
await page.getByRole('button', { name: 'Load the sample study' }).click();
await page.waitForSelector('text=3 of 3 documents ready', { timeout: 20000 });

const t0 = Date.now();
await page.getByRole('button', { name: 'Check all three' }).click();

// All three windows must reach a verdict.
// The second argument is the function's argument, not the options — passing the
// options there silently leaves the default 30s timeout in place.
await page.waitForFunction(
  () => (document.body.innerText.match(/\bdone\b/gi) ?? []).length >= 3,
  null,
  { timeout: 180000 },
);
console.log('three windows finished in', ((Date.now() - t0) / 1000).toFixed(1) + 's');

await page.waitForSelector('text=They really did run at the same time', { timeout: 30000 });
const timing = await page.evaluate(() => {
  const t = document.body.innerText;
  const m = t.match(/finished in\s+([\d.]+)s of wall clock, against\s+([\d.]+)s/);
  return m ? { wall: Number(m[1]), summed: Number(m[2]) } : null;
});
console.log('timing:', JSON.stringify(timing));
if (!timing || timing.summed <= timing.wall) {
  throw new Error('the three runs did not overlap — summed work is not greater than wall clock');
}

/* ---- cross-document pass ---------------------------------------- */
await page.waitForSelector('text=Open the full workbench', { timeout: 180000 });
const summary = await page.evaluate(() => {
  const t = document.body.innerText;
  return {
    windowsWithVerdict: (t.match(/(?:things? to fix before this goes out|inconsistenc(?:y|ies) worth resolving|minor points?|No contradictions found)/g) ?? []).length,
    cross: t.match(/(\d+) disagreements? between the documents/)?.[1] ?? '0',
    checksMatched: t.match(/(\d+) of (\d+) checks matched/)?.slice(1).join('/'),
  };
});
console.log('summary:', JSON.stringify(summary));
await page.screenshot({ path: '/tmp/shot-dashboard-results.png', fullPage: true });

/* ---- the catalogue ---------------------------------------------- */
await page.getByRole('button', { name: 'What we check' }).click();
await page.waitForSelector('text=The five kinds of mistake this looks for', { timeout: 10000 });
const catalogue = await page.evaluate(() => {
  const t = document.body.innerText;
  return {
    rules: t.match(/Every check in the ruleset[^\d]+(\d+) of them/i)?.[1],
    requirements: t.match(/checklist[^\d]+(\d+) required elements/i)?.[1],
    undocumented: (t.match(/no plain-English version written/g) ?? []).length,
  };
});
console.log('catalogue:', JSON.stringify(catalogue));
await page.screenshot({ path: '/tmp/shot-checks.png', fullPage: true });

/* ---- the assistant ---------------------------------------------- */
await page.getByRole('button', { name: 'Ask a question' }).click();
await page.waitForSelector('text=Ask about these documents', { timeout: 10000 });

const asked = [];
for (const question of [
  'What did you find overall?',
  'What is wrong with the SAP?',
  'How many patients?',
  'What is a TFL?',
  'what will the share price be next quarter',
]) {
  await page.fill('input[aria-label="Ask a question about these documents"]', question);
  await page.getByRole('button', { name: /^Ask$/ }).click();
  await page.waitForFunction(
    (q) => document.body.innerText.includes(q),
    question,
    { timeout: 15000 },
  );
  const source = await page.evaluate(() => {
    const marks = [...document.querySelectorAll('span')]
      .map((n) => n.textContent ?? '')
      .filter((t) => t.startsWith('answered from '));
    return marks[marks.length - 1]?.replace('answered from ', '') ?? null;
  });
  asked.push({ question, source });
}
console.log('assistant:', JSON.stringify(asked, null, 0));

// The nonsense question must be refused, not answered.
const refused = asked[asked.length - 1];
if (refused.source !== 'no match') {
  throw new Error(`assistant answered a nonsense question from "${refused.source}"`);
}
await page.screenshot({ path: '/tmp/shot-assistant.png', fullPage: true });

console.log('console errors:', errors.length ? errors.slice(0, 3) : 'none');
await browser.close();
