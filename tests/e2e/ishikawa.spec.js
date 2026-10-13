import { answers, createAnalysis, expect, nav, openExample, openSettings, test } from './fixtures.js';

test('Ishikawa einschalten, Ursachen sammeln und als Zweig weiterfragen', async ({ page }) => {
  await createAnalysis(page, 'Fisch');
  await nav(page, 'why');
  await expect(page.locator('[data-mode="ishikawa"]')).toHaveCount(0);
  await openSettings(page);
  await page.check('#set-ishikawa');
  await expect(page.locator('.sub-opts')).toContainText('Mensch');
  await page.click('#settingsDone');
  await page.click('[data-mode="ishikawa"]');
  await expect(page.locator('.bone')).toHaveCount(6);

  const machine = page.locator('.bone').nth(1);
  await expect(machine.locator('.cat-name')).toHaveValue('Maschine');
  await machine.locator('.add-cause').click();
  await page.keyboard.type('Fritteuse überhitzt');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Kasse langsam');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await expect(machine.locator('.cause')).toHaveCount(2);

  await machine.locator('.cause', { hasText: 'Kasse langsam' }).click();
  await page.click('#causeEditor [data-state="excluded"]');
  await expect(page.locator('#toNode')).toBeDisabled();
  await machine.locator('.cause', { hasText: 'Fritteuse' }).click();
  await page.click('#causeEditor [data-state="confirmed"]');
  await page.click('#toNode');
  await expect(page).toHaveURL(/why\/chain$/);
  await expect(answers(page)).toHaveCount(1);
  await expect(answers(page).first().locator('.ans')).toHaveValue('Fritteuse überhitzt');
  await expect(answers(page).first()).toContainText('Maschine');
  await expect(answers(page).first().locator('[data-state="confirmed"]')).toHaveAttribute('aria-pressed', 'true');

  await page.click('[data-mode="ishikawa"]');
  await expect(machine.locator('.cause .tow')).toHaveText('→ W1');
  await expect(page.locator('.ish-foot')).toContainText('In der Warum-Analyse (1)');
});

test('Beispiel: Ishikawa zur Antwort W1, Vorlage wechseln mit Rückfrage', async ({ page }) => {
  await openExample(page);
  await page.click('[data-mode="ishikawa"]');
  await expect(page.locator('#fishHead')).toContainText('W1');
  await expect(page.locator('.cause')).toHaveCount(14);
  await page.selectOption('#anchorSel', '');
  await expect(page.locator('.cause')).toHaveCount(0);
  await page.selectOption('#presetSel', '4p');
  await expect(page.locator('#confirmDialog')).toContainText('Ursache(n)');
  await page.click('#confirmOk');
  await expect(page.locator('.bone')).toHaveCount(4);
  await page.click('#addCategory');
  await expect(page.locator('.bone')).toHaveCount(5);
  await expect(page.locator('#presetSel')).toHaveValue('custom');
});
