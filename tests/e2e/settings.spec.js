import { createAnalysis, expect, nav, openSettings, stored, test } from './fixtures.js';

test('Blickwinkel einschalten; als Standard für neue Analysen merken', async ({ page }) => {
  await createAnalysis(page, 'Eins');
  await nav(page, 'why');
  await expect(page.locator('.lens')).toHaveCount(0);
  await page.click('#lensSettings');
  await expect(page.locator('#set-occurrence')).toBeDisabled();
  await page.check('#set-detection');
  await page.check('#asDefault');
  await page.click('#settingsDone');
  await expect(page.locator('.lens button')).toHaveCount(2);
  await page.click('[data-lens="detection"]');
  await page.click('#addWhy');
  await page.keyboard.type('Keine Prüfung');
  await page.click('[data-mode="tree"]');
  await expect(page.locator('#tree .lane')).toHaveCount(2);

  await page.click('#homeLink');
  await createAnalysis(page, 'Zwei');
  await expect.poll(async () => (await stored(page)).find(a => a.name === 'Zwei')?.settings.detection).toBe(true);

  // Ausschalten blendet aus, die Daten bleiben
  await page.click('#homeLink');
  await page.locator('.acard-link', { hasText: 'Eins' }).click();
  await openSettings(page);
  await page.uncheck('#set-detection');
  await page.keyboard.press('Escape');
  await nav(page, 'why');
  await expect(page.locator('.lens')).toHaveCount(0);
  await expect.poll(async () => (await stored(page)).find(a => a.name === 'Eins')?.nodes.length).toBe(1);
});

test('Farbe der Analyse ändern', async ({ page }) => {
  await createAnalysis(page, 'Bunt');
  await openSettings(page);
  await page.click('.swatch[aria-label="#c2255c"]');
  await page.click('#settingsDone');
  await expect.poll(async () => (await stored(page))[0].color).toBe('#c2255c');
});
