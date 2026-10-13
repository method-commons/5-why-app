import { createAnalysis, expect, openExample, stored, test } from './fixtures.js';

test('leere Startseite erklärt die Methode', async ({ page }) => {
  await expect(page.locator('#emptyState')).toContainText('Ursachen finden');
  await expect(page.locator('.howto')).toContainText('Grundursache');
  await page.click('.howto-more');
  await expect(page.locator('#helpDialog')).toContainText('Toyota');
  await page.click('[data-help="ishikawa"]');
  await expect(page.locator('#helpDialog')).toContainText('Fischgräten');
  await page.keyboard.press('Escape');
  await expect(page.locator('#helpDialog')).toBeHidden();
});

test('neue Analyse anlegen, speichern und auf der Startseite zeigen', async ({ page }) => {
  await createAnalysis(page, 'Druckerausfall');
  await page.fill('#aContext', 'Büro 2');
  await page.fill('#pf-what', 'Drucker druckt nicht');
  await page.click('#homeLink');
  const card = page.locator('.acard');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('Druckerausfall');
  await expect(card).toContainText('Büro 2');
  await expect(card).toContainText('Drucker druckt nicht');
  await expect(page.locator('.page-head .sub')).toContainText('1 Analyse');
  await expect.poll(async () => (await stored(page)).length).toBe(1);
  await page.reload();
  await expect(page.locator('.acard')).toContainText('Druckerausfall');
});

test('Beispiel öffnen, duplizieren, löschen und Löschen rückgängig machen', async ({ page }) => {
  await openExample(page);
  await page.click('#homeLink');
  const card = page.locator('.acard');
  await expect(card).toContainText('Lange Wartezeit am Samstag');
  await expect(card).toContainText('überfällig');
  await card.locator('.card-menu .icon-btn').click();
  await card.locator('[data-action="duplicate"]').click();
  await expect(page.locator('#aName')).toHaveValue('Lange Wartezeit am Samstag (Kopie)');
  await page.click('#homeLink');
  await expect(page.locator('.acard')).toHaveCount(2);
  const copy = page.locator('.acard', { hasText: '(Kopie)' });
  await copy.locator('.card-menu .icon-btn').click();
  await copy.locator('[data-action="delete"]').click();
  await page.click('#confirmOk');
  await expect(page.locator('.acard')).toHaveCount(1);
  await page.click('.toast .link');
  await expect(page.locator('.acard')).toHaveCount(2);
});

test('Analyse über das Menü löschen', async ({ page }) => {
  await createAnalysis(page, 'Weg damit');
  await page.click('#menuBtn');
  await page.click('[data-action="delete"]');
  await page.click('#confirmOk');
  await expect(page.locator('#emptyState')).toBeVisible();
  expect(await stored(page)).toEqual([]);
});
