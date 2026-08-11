import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1460, height: 960 } });
const errs = [];
page.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,160)); });
page.on('pageerror', e => errs.push('pageerror: '+String(e).slice(0,160)));
await page.goto('http://127.0.0.1:4310/', { waitUntil: 'load' });
await page.waitForSelector('text=Documents under review', { timeout: 20000 });
await page.getByRole('button', { name: /^Run QC$/ }).first().click();
await page.waitForSelector('text=Quality control run', { timeout: 10000 });
await page.getByRole('button', { name: /^Run QC$/ }).last().click();
await page.waitForSelector('text=Open findings workbench', { timeout: 120000 });
const stats = await page.evaluate(() => {
  const t = document.body.innerText;
  return {
    entities: t.match(/Entities extracted\s*([\d,]+)/)?.[1],
    findings: t.match(/Findings\s*(\d+)\s*\n?\s*\d+ critical/)?.[1] ?? t.match(/Findings\s*(\d+)/)?.[1],
    rules: t.match(/Rules that matched\s*([\d/]+)/)?.[1],
    derivations: t.match(/Derivations recomputed\s*([\d/]+)/)?.[1],
  };
});
console.log('stats:', JSON.stringify(stats));
console.log('errors:', errs.length ? errs.slice(0,3) : 'none');
await browser.close();
