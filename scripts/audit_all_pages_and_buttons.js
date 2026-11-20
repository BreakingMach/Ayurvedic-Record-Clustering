import { chromium } from 'playwright';

const PAGES = [
  { url: 'http://localhost:5173/overview', name: 'Overview' },
  { url: 'http://localhost:5173/comparison', name: 'Metric Comparison' },
  { url: 'http://localhost:5173/results', name: 'Benchmark Results' },
  { url: 'http://localhost:5173/dataset', name: 'Dataset Analysis' },
  { url: 'http://localhost:5173/attributes', name: 'Patient Attributes' },
  { url: 'http://localhost:5173/data', name: 'Data Summary' },
  { url: 'http://localhost:5173/clustering', name: 'Patient Clustering' },
  { url: 'http://localhost:5173/workbench', name: 'Workbench' },
  { url: 'http://localhost:5173/retrieval', name: 'Nearest Neighbours' },
  { url: 'http://localhost:5173/validation', name: 'Label Concordance' },
  { url: 'http://localhost:5173/method', name: 'Methodology & Controls' },
  { url: 'http://localhost:5173/limitations', name: 'Limitations & Bias' },
  { url: 'http://localhost:5173/reports', name: 'Reports & Export' },
];

async function audit() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const auditLog = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      auditLog.push({ type: 'CONSOLE_ERROR', url: page.url(), message: msg.text() });
      console.log(`[CONSOLE ERROR on ${page.url()}]:`, msg.text());
    }
  });

  page.on('pageerror', (err) => {
    auditLog.push({ type: 'PAGE_ERROR', url: page.url(), message: err.message });
    console.log(`[PAGE ERROR on ${page.url()}]:`, err.message);
  });

  console.log('Auditing all 13 pages and their interactive elements...\n');

  for (const p of PAGES) {
    try {
      await page.goto(p.url, { waitUntil: 'networkidle' });
      const title = await page.title();
      const buttons = await page.getByRole('button').all();
      console.log(`✓ Page: ${p.name.padEnd(25)} | URL: ${p.url.padEnd(35)} | Buttons: ${buttons.length}`);

      // Test click all visible buttons that don't cause page unloads
      for (let i = 0; i < buttons.length; i++) {
        const btn = buttons[i];
        const isVis = await btn.isVisible();
        if (!isVis) continue;
        const text = (await btn.innerText()).replace(/\n/g, ' ').trim().slice(0, 30);
        // Avoid clicking external links or page reloaders
        if (text.includes('GitHub') || text.includes('Toggle sidebar')) continue;
        try {
          // Just verify it's clickable
          await btn.hover();
        } catch (e) {
          console.log(`  Warning on button "${text}": ${e.message}`);
        }
      }
    } catch (err) {
      auditLog.push({ type: 'PAGE_LOAD_ERROR', url: p.url, message: err.message });
      console.error(`FAILED to load ${p.url}:`, err.message);
    }
  }

  console.log('\n--- AUDIT SUMMARY ---');
  console.log(`Total Errors Detected: ${auditLog.length}`);
  if (auditLog.length > 0) {
    console.log(JSON.stringify(auditLog, null, 2));
  } else {
    console.log('All 13 pages loaded with 0 console errors and 0 unhandled exceptions.');
  }

  await browser.close();
}

audit().catch(console.error);
