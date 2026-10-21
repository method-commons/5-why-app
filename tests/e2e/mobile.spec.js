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

test('mobil: keine Ansicht ist breiter als der Bildschirm (sonst verrutschen Kopfzeile und Navigation)', async ({ page }) => {
  await openExample(page);
  const id = await page.evaluate(() => location.hash.split('/')[2]);
  // etwas breitere Schrift: Schriften der CI und echter Telefone sind teils breiter als hier
  await page.addStyleTag({ content: '* { letter-spacing: 1px !important; }' });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 760 });
    for (const view of ['problem', 'why/chain', 'why/tree', 'why/ishikawa', 'actions', 'report', '']) {
      await page.evaluate(([i, v]) => { location.hash = v ? `#/a/${i}/${v}` : '#/'; }, [id, view]);
      await expect(page.locator('main')).toBeVisible();
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scroll, `${view || 'Übersicht'}, ${width} px`).toBeLessThanOrEqual(width);
    }
  }
  // die breite Tabelle der Maßnahmen scrollt in ihrem Abschnitt
  await page.evaluate(i => { location.hash = `#/a/${i}/report`; }, id);
  const section = page.locator('.a3 > section.full:has(table)');
  expect(await section.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
});
