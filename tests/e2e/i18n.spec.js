import { expect, openExample, test } from './fixtures.js';

test('Sprache auf Englisch umstellen; Beispiel auf Englisch', async ({ page }) => {
  await page.click('#menuBtn');
  await page.click('[data-lang="en"]');
  await expect(page.locator('h1')).toHaveText('My analyses');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await openExample(page);
  await expect(page.locator('#analysisName')).toContainText('Long wait on Saturday');
  await expect(page.locator('[data-nav="why"]')).toContainText('Why analysis');
  await page.click('[data-mode="ishikawa"]');
  await expect(page.locator('.cat-name').first()).toHaveValue('Man');
});
