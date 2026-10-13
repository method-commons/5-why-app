import { expect, openExample, test } from './fixtures.js';

test.use({ viewport: { width: 390, height: 844 } });

test('mobil: Navigation unten, Kette und Ishikawa als Liste', async ({ page }) => {
  await openExample(page);
  const navBar = page.locator('.nav');
  await expect(navBar).toBeVisible();
  const box = await navBar.boundingBox();
  expect(box.y).toBeGreaterThan(700);
  await page.click('[data-nav="actions"]');
  await expect(page.locator('.rc-card').first()).toBeVisible();
  await page.click('[data-nav="why"]');
  await page.click('[data-mode="ishikawa"]');
  await expect(page.locator('.spine')).toBeHidden();
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
});
