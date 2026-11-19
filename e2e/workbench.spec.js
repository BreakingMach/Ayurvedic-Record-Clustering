import { test, expect } from '@playwright/test';

test.describe('Similarity Workbench E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to base URL and go to Workbench tab
    await page.goto('/');
    // Click Workbench in header nav or Overview "Try Similarity Workbench"
    const wbNavBtn = page.getByRole('button', { name: 'Workbench', exact: true });
    await wbNavBtn.click();
    await expect(page.getByRole('heading', { name: 'Similarity Workbench' })).toBeVisible();
  });

  test('1. Fill form with all 29 traits, run retrieval, assert results panel renders with neighbour table', async ({
    page,
  }) => {
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

    // Click "Load Example #1" which populates all 29 traits from dataset record 0
    const loadExampleBtn = page.getByRole('button', { name: 'Load Example #1' });
    await loadExampleBtn.click();

    // Verify trait counter shows 29 of 29 traits entered
    await expect(page.getByText('29 of 29')).toBeVisible();

    // Click "Run Retrieval"
    const runBtn = page.getByRole('button', { name: 'Run Retrieval' });
    await runBtn.click();

    // Assert results panel appears
    await expect(page.getByText('Retrieved Nearest Neighbours')).toBeVisible();
    await expect(page.getByText('Gower Distance').first()).toBeVisible();
    await expect(page.getByText('Euclidean (mode-impute)')).toBeVisible();
    await expect(page.getByText('Cosine (mode-impute)')).toBeVisible();

    // Assert Rule R11 notice is visible
    await expect(
      page.getByText('Research prototype on a dataset of unverified origin. Not a diagnostic tool.').first()
    ).toBeVisible();

    // Assert Rule R10 compliant heading
    await expect(
      page.getByRole('heading', { name: /Labels of the Nearest Dataset Records/i })
    ).toBeVisible();
  });

  test('2. Upload CSV with invalid trait level, assert specific error message is displayed', async ({
    page,
  }) => {
    // Switch to Batch Mode tab
    const batchTabBtn = page.getByRole('button', { name: 'Batch Mode (CSV)' });
    await batchTabBtn.click();
    await expect(page.getByText('Batch Case Retrieval')).toBeVisible();

    // Create an invalid CSV in memory
    const invalidCsv =
      'Body Size,Body Weight,Height,Bone Structure,Complexion,General feel of skin,Texture of Skin,Hair Color,Appearance of Hair,Shape of face,Eyes,Eyelashes,Blinking of Eyes,Cheeks,Nose,Teeth and gums,Lips,Nails,Appetite,Liking tastes,Metabolism Type,Climate Preference,Stress Levels,Sleep Patterns,Dietary Habits,Physical Activity Level,Water Intake,Digestion Quality,Skin Sensitivity\n' +
      'INVALID_BODY_SIZE_LEVEL,Moderate,Average,Medium,Fair,Smooth,Dry,Brown,Straight,Round,Big,Moderate,Moderate,Smooth,Average,White,Medium,Smooth,Slow,Sweet,moderate,moderate,low,moderate,vegetarian,sedentary,moderate,moderate,normal\n';

    // Upload using file input
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Browse CSV File' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'test_invalid_case.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(invalidCsv),
    });

    // Assert specific error message is shown
    await expect(page.getByText('CSV Validation Issues')).toBeVisible();
    await expect(
      page.getByText('is not a valid level. Expected one of: Large, Medium, Slim')
    ).toBeVisible();
  });

  test('3. Run retrieval with ~50% Unknown traits, assert observed-only columns appear', async ({
    page,
  }) => {
    // Reset any existing input
    await page.getByRole('button', { name: 'Reset' }).click();

    // Select ~14 traits (Physical traits section) and leave remaining 15 as Unknown
    // Select Body Size = Large
    const bodySizeSelect = page.locator('#trait-0');
    await bodySizeSelect.selectOption('Large');

    // Select Body Weight = Heavy
    const bodyWeightSelect = page.locator('#trait-1');
    await bodyWeightSelect.selectOption({ index: 1 });

    // Select Height
    const heightSelect = page.locator('#trait-2');
    await heightSelect.selectOption({ index: 1 });

    // Select Bone Structure
    const boneSelect = page.locator('#trait-3');
    await boneSelect.selectOption({ index: 1 });

    // Select Complexion
    const compSelect = page.locator('#trait-4');
    await compSelect.selectOption({ index: 1 });

    // Select General feel of skin
    const skinSelect = page.locator('#trait-5');
    await skinSelect.selectOption({ index: 1 });

    // Select Texture of Skin
    const texSelect = page.locator('#trait-6');
    await texSelect.selectOption({ index: 1 });

    // Click "Run Retrieval"
    const runBtn = page.getByRole('button', { name: 'Run Retrieval' });
    await runBtn.click();

    // Assert results panel rendered
    await expect(page.getByText('Retrieved Nearest Neighbours')).toBeVisible();

    // Assert observed-only section appears because traits are missing
    await expect(page.getByText('Observed-only variants')).toBeVisible();
    await expect(page.getByText('Euclidean (observed-only)')).toBeVisible();
    await expect(page.getByText('Cosine (observed-only)')).toBeVisible();
  });

  test('6. Create a patient record, load preset, run prediction, assert consensus phenotype and recommendations', async ({
    page,
  }) => {
    // Fill custom patient metadata
    const nameInput = page.getByPlaceholder('e.g. S. Sharma');
    await nameInput.fill('Dr. A. Verma');

    const ageInput = page.getByPlaceholder('e.g. 38');
    await ageInput.fill('45');

    const complaintInput = page.getByPlaceholder('Describe current clinical symptoms, digestive irregularities, sleep complaints, or stress factors...');
    await complaintInput.fill('Persistent dry cough, disturbed light sleep, irregular hunger and joint stiffness.');

    // Click "Vata" preset button
    await page.getByRole('button', { name: 'Vata', exact: true }).click();

    // Verify 29 of 29 traits populated
    await expect(page.getByText('29 of 29')).toBeVisible();

    // Run prediction / retrieval
    const runBtn = page.getByRole('button', { name: 'Run Retrieval' });
    await runBtn.click();

    // Verify Executive Consensus Phenotype Prediction Card renders
    await expect(page.getByText('Predicted Constitutional Phenotype:')).toBeVisible();
    await expect(page.getByText(/Cohort Confidence/i)).toBeVisible();

    // Verify Phenotypic Concordance & Archetype Deviations render
    await expect(page.getByText('Phenotypic Concordance & Archetype Deviations')).toBeVisible();
    await expect(page.getByText(/Concordant Archetype Traits/i)).toBeVisible();

    // Verify Classical Ayurvedic Recommendations render
    await expect(page.getByText(/Constitutional Harmonization & Recommendations/i)).toBeVisible();
    await expect(page.getByText('Ahara (Dietary Harmonization)')).toBeVisible();
    await expect(page.getByText('Vihara (Lifestyle & Dinacharya Routine)')).toBeVisible();

    // Verify Top Nearest Reference Historical Cases render
    await expect(page.getByText('Nearest Reference Patient Cases from Historical Cohort')).toBeVisible();
    await expect(page.getByText(/Similarity/i).first()).toBeVisible();

    // Save patient record
    const saveBtn = page.getByRole('button', { name: 'Save Patient' });
    await saveBtn.click();

    // Verify Saved Patient Registry displays the newly saved patient
    await expect(page.getByText('Saved Patient Registry')).toBeVisible();
    await expect(page.getByText('Dr. A. Verma', { exact: true })).toBeVisible();

    // Switch to Metric Diagnostics & MDS tab
    const diagTabBtn = page.getByRole('button', { name: 'Metric Diagnostics & MDS' });
    await diagTabBtn.click();

    // Verify Trait Match Matrix and MDS map render in diagnostics tab
    await expect(page.getByText('Trait Match Matrix')).toBeVisible();
    await expect(page.getByText('2D Multidimensional Scaling (MDS) Map')).toBeVisible();
  });
});

test.describe('Direct Endpoints Navigation', () => {
  test('4. Direct navigation to /data renders trait schema and class distribution', async ({ page }) => {
    await page.goto('/data');
    await expect(page.getByRole('heading', { name: 'Data', exact: true })).toBeVisible();
    await expect(page.getByText('Dataset-Provided Dosha Class Distribution')).toBeVisible();
    await expect(page.getByText('Body Size')).toBeVisible();
  });

  test('5. Direct navigation to /retrieval renders real records inspector', async ({ page }) => {
    await page.goto('/retrieval');
    await expect(page.getByRole('heading', { name: 'Real-Record Retrieval' })).toBeVisible();
    await expect(page.getByLabel('Search real records')).toBeVisible();
    await expect(page.getByText('Top-5 Nearest Neighbours by Metric')).toBeVisible();
  });
});
