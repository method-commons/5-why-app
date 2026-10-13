import { check, createAnalysis, expect, nav, test } from './fixtures.js';

test('Problem beschreiben mit Prüfung, Hinweisen, Vorschlag, Fakten und Team', async ({ page }) => {
  await createAnalysis(page, 'Wartezeit');
  await expect(check(page, 'problemChecks', 'concrete')).toHaveAttribute('data-state', 'open');
  await page.fill('#pf-what', 'Lange Wartezeit');
  await expect(check(page, 'problemChecks', 'concrete')).toHaveAttribute('data-state', 'bad');
  await page.fill('#pf-where', 'Domplatz');
  await page.fill('#pf-when', 'Samstag');
  await page.fill('#pf-target', '10 Min');
  await page.fill('#pf-actual', '40 Min');
  await expect(check(page, 'problemChecks', 'concrete')).toHaveAttribute('data-state', 'ok');
  await expect(check(page, 'problemChecks', 'measurable')).toHaveAttribute('data-state', 'ok');

  await page.fill('#pf-howFound', 'Weil die Fritteuse kaputt war');
  await expect(page.locator('.field-hint')).toContainText('Enthält schon eine Ursache („weil“)');
  await expect(check(page, 'problemChecks', 'noCause')).toHaveAttribute('data-state', 'warn');
  await page.fill('#pf-howFound', 'Beschwerden');
  await expect(check(page, 'problemChecks', 'noCause')).toHaveAttribute('data-state', 'ok');

  await expect(page.locator('#statement')).toHaveAttribute('placeholder', 'Lange Wartezeit – Domplatz – Samstag. Ist: 40 Min (Soll: 10 Min).');
  await page.click('#useSuggestion');
  await expect(page.locator('#statement')).toHaveValue('Lange Wartezeit – Domplatz – Samstag. Ist: 40 Min (Soll: 10 Min).');

  await page.fill('#factInput', 'Kassenlog');
  await page.press('#factInput', 'Enter');
  await page.fill('#factInput', 'Foto');
  await page.click('#addFact');
  await expect(page.locator('#factList .fact')).toHaveCount(2);
  await page.locator('#factList .fact').first().locator('.icon-btn').click();
  await expect(page.locator('#factList .fact')).toHaveCount(1);
  await expect(check(page, 'problemChecks', 'facts')).toHaveAttribute('data-state', 'ok');

  await page.fill('#teamInput', 'Aylin');
  await page.press('#teamInput', 'Enter');
  await page.fill('#teamInput', 'aylin');
  await page.click('#addPerson');
  await expect(page.locator('#teamList .person')).toHaveCount(1);

  // Der Schritt „Problem“ gilt als erledigt
  await nav(page, 'why');
  await expect(page.locator('[data-nav="problem"] .num')).toHaveText('✓');
  await expect(page.locator('.problem-start')).toContainText('Lange Wartezeit – Domplatz');
});

test('Rückgängig und Wiederholen', async ({ page }) => {
  await createAnalysis(page, 'Undo');
  await page.fill('#factInput', 'Eins');
  await page.click('#addFact');
  await expect(page.locator('#factList .fact')).toHaveCount(1);
  await page.click('#undoBtn');
  await expect(page.locator('#factList .fact')).toHaveCount(0);
  await page.click('#redoBtn');
  await expect(page.locator('#factList .fact')).toHaveCount(1);
  await page.locator('.section-title').click();
  await page.keyboard.press('Control+z');
  await expect(page.locator('#factList .fact')).toHaveCount(0);
});
