import { chromium } from 'playwright';

async function testAllButtons() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const report = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
    }
  });

  page.on('pageerror', (err) => {
    console.log('PAGE ERROR:', err.message);
  });

  console.log('--- STARTING EXHAUSTIVE BUTTON INSPECTION ---');

  // 1. Test Workbench Page
  await page.goto('http://localhost:5173/workbench');
  await page.waitForLoadState('networkidle');

  async function checkButton(name, selectorAction) {
    try {
      const btn = typeof selectorAction === 'string' ? page.locator(selectorAction) : selectorAction;
      const visible = await btn.isVisible();
      if (!visible) {
        report.push({ name, status: 'NOT VISIBLE' });
        return;
      }
      await btn.click({ timeout: 2000 });
      await page.waitForTimeout(300);
      report.push({ name, status: 'WORKING' });
    } catch (err) {
      report.push({ name, status: 'FAILED', error: err.message });
    }
  }

  // Header buttons
  await checkButton('Header: Command Palette', page.getByRole('button', { name: /Search.*⌘K/i }));
  const cmdPaletteVisible = await page.getByPlaceholder(/Jump to page/i).isVisible();
  console.log('Command Palette opened:', cmdPaletteVisible);
  if (cmdPaletteVisible) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }

  await checkButton('Header: Export button', page.getByRole('button', { name: 'Export', exact: true }));
  console.log('Navigated to after Header Export:', page.url());

  await page.goto('http://localhost:5173/workbench');
  await page.waitForLoadState('networkidle');

  // Workbench Tab Buttons
  await checkButton('Tab: Metric Diagnostics & MDS', page.getByRole('button', { name: 'Metric Diagnostics & MDS' }));
  await checkButton('Tab: Batch Mode (CSV)', page.getByRole('button', { name: 'Batch Mode (CSV)' }));
  await checkButton('Tab: Patient Intake & Recommendations', page.getByRole('button', { name: 'Patient Intake & Recommendations' }));

  // Dataset switchers
  await checkButton('Dataset Mode: Simulated', page.getByRole('button', { name: /Simulated Mixed Data/i }));
  await checkButton('Dataset Mode: Real Data', page.getByRole('button', { name: /Real Data/i }));

  // Patient Intake Buttons
  await checkButton('Generate ID', page.getByRole('button', { name: 'Generate ID' }));
  await checkButton('Preset: Vata', page.getByRole('button', { name: 'Vata', exact: true }));
  await checkButton('Preset: Pitta', page.getByRole('button', { name: 'Pitta', exact: true }));
  await checkButton('Preset: Kapha', page.getByRole('button', { name: 'Kapha', exact: true }));
  await checkButton('Preset: Vata+Pitta', page.getByRole('button', { name: 'Vata+Pitta', exact: true }));
  await checkButton('Load Example #1', page.getByRole('button', { name: 'Load Example #1' }));
  await checkButton('Fill Random', page.getByRole('button', { name: 'Fill Random' }));
  await checkButton('Reset', page.getByRole('button', { name: 'Reset', exact: true }));
  await checkButton('Clear All (Bottom)', page.getByRole('button', { name: 'Clear All' }));

  // Now test Run Retrieval on empty form vs populated form
  console.log('\n--- TESTING RUN RETRIEVAL BUTTON ---');
  // First, empty form
  const runBtn = page.getByRole('button', { name: 'Run Retrieval' });
  await runBtn.click();
  await page.waitForTimeout(400);
  let resultsPresent = await page.getByText('Historical Dataset Phenotype Consensus').isVisible();
  console.log('Run Retrieval on empty form rendered results:', resultsPresent);

  // Now populate via Vata
  await page.getByRole('button', { name: 'Vata', exact: true }).click();
  await runBtn.click();
  await page.waitForTimeout(400);
  resultsPresent = await page.getByText('Historical Dataset Phenotype Consensus').isVisible();
  console.log('Run Retrieval on Vata populated form rendered results:', resultsPresent);

  // Check scroll position:
  const scrollY = await page.evaluate(() => window.scrollY);
  console.log('Current window.scrollY after Run Retrieval:', scrollY);

  // Test Results Action Buttons
  await checkButton('Export Case JSON', page.getByRole('button', { name: 'Export Case JSON' }));
  await checkButton('Save Patient', page.getByRole('button', { name: 'Save Patient' }));
  await checkButton('Print / PDF Report', page.getByRole('button', { name: 'Print / PDF Report' }));

  // Test Secondary Bottom Calculate button
  const bottomCalcBtn = page.getByRole('button', { name: 'Calculate Consensus & Recommendations' });
  await checkButton('Bottom Action Bar: Calculate Consensus & Recommendations', bottomCalcBtn);

  // Test Floating Quick Action
  const floatingBtn = page.getByRole('button', { name: 'View Results & Consensus' });
  await checkButton('Floating: View Results & Consensus', floatingBtn);

  // Test Top 5 matches Inspect buttons
  const inspectBtn = page.getByRole('button', { name: 'Inspect' }).first();
  await inspectBtn.scrollIntoViewIfNeeded();
  await checkButton('Top 5 Matches: Expand Trait Inspector', inspectBtn);
  const hideBtn = page.getByRole('button', { name: 'Hide' });
  await checkButton('Top 5 Matches: Collapse Trait Inspector', hideBtn);

  // Test Batch Mode buttons
  await page.getByRole('button', { name: 'Batch Mode (CSV)' }).click();
  await page.waitForTimeout(300);
  await checkButton('Batch: Download CSV Template', page.getByRole('button', { name: 'Download CSV Template' }));
  await checkButton('Batch: Browse CSV', page.getByRole('button', { name: 'Browse CSV File' }));

  // Test Sidebar Toggle
  await checkButton('Sidebar: Toggle sidebar', page.getByLabel('Toggle sidebar'));

  // Summary
  console.log('\n--- BUTTON INSPECTION SUMMARY ---');
  for (const item of report) {
    console.log(`[${item.status}] ${item.name}${item.error ? ' - ' + item.error : ''}`);
  }

  await browser.close();
}

testAllButtons().catch(console.error);
