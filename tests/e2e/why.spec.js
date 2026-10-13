import { answers, check, createAnalysis, expect, nav, openExample, stored, test } from './fixtures.js';

test('Warum-Kette aufbauen: Antworten, Belege, Status, Grundursache, Daher-Probe', async ({ page }) => {
  await createAnalysis(page, 'Kette');
  await page.fill('#pf-what', 'Gäste warten 40 Min');
  await page.click('#toWhy');
  await page.click('#addWhy');
  await expect(answers(page)).toHaveCount(1);
  // Neues Feld hat den Fokus
  await page.keyboard.type('Küche zu langsam');
  await answers(page).nth(0).locator('.ev-input').fill('Küchenmonitor');
  await answers(page).nth(0).locator('[data-state="confirmed"]').click();
  await page.click('#addWhy');
  await page.keyboard.type('Fritteuse aus');
  await page.click('#addWhy');
  await page.keyboard.type('Filterreinigung fehlt im Plan');
  await expect(answers(page)).toHaveCount(3);
  await expect(answers(page).nth(2).locator('.lvl')).toContainText('3');
  await expect(page.locator('.ask .q-input').nth(2)).toHaveAttribute('placeholder', 'Warum: „Fritteuse aus“?');

  await expect(check(page, 'chainChecks', 'evidence')).toContainText('W2, W3 sind nur vermutet');
  await answers(page).nth(2).locator('.root-btn').click();
  await expect(answers(page).nth(2)).toHaveClass(/rootc/);
  await expect(check(page, 'chainChecks', 'root')).toHaveAttribute('data-state', 'ok');
  await expect(check(page, 'chainChecks', 'depth')).toHaveAttribute('data-state', 'ok');
  await expect(page.locator('#readback')).toContainText('Filterreinigung fehlt im Plan → daher Fritteuse aus → daher Küche zu langsam → daher Gäste warten 40 Min');
  await page.click('[data-confirm="causal"]');
  await expect(check(page, 'chainChecks', 'causal')).toHaveAttribute('data-state', 'ok');
  await expect(page.locator('#whyKpis')).toContainText('1 / 3');

  // Weiterfragen unter einer Grundursache hebt die Markierung auf
  await page.click('#addWhy');
  await expect(page.locator('.toast')).toContainText('Markierung als Grundursache aufgehoben');
  await expect(answers(page).nth(2)).not.toHaveClass(/rootc/);

  await expect.poll(async () => (await stored(page))[0].nodes.length).toBe(4);
});

test('Schuldzuweisung wird angemerkt', async ({ page }) => {
  await createAnalysis(page, 'Schuld');
  await nav(page, 'why');
  await page.click('#addWhy');
  await page.keyboard.type('Der Mitarbeiter hat es vergessen');
  await expect(answers(page).first().locator('.field-hint')).toContainText('Schuldzuweisung');
  await expect(check(page, 'chainChecks', 'blame')).toHaveAttribute('data-state', 'warn');
});

test('Verzweigungen: weitere Antwort, Zweig wählen, widerlegen, löschen', async ({ page }) => {
  await createAnalysis(page, 'Zweige');
  await nav(page, 'why');
  await page.click('#addWhy');
  await page.keyboard.type('Ursache A');
  await answers(page).first().locator('.add-sibling').click();
  await page.keyboard.type('Ursache B');
  await expect(page.locator('.branches .branch')).toHaveCount(2);
  await expect(answers(page)).toHaveCount(1);
  await expect(answers(page).first().locator('.ans')).toHaveValue('Ursache B');
  await answers(page).first().locator('[data-state="refuted"]').click();
  await expect(page.locator('.chain-end')).toContainText('Widerlegt');
  await expect(answers(page).first().locator('.root-btn')).toBeDisabled();
  await page.locator('.branches .branch', { hasText: 'Ursache A' }).click();
  await expect(answers(page).first().locator('.ans')).toHaveValue('Ursache A');
  await page.click('#addWhy');
  await page.keyboard.type('Tiefer');
  await expect(answers(page)).toHaveCount(2);
  // Löschen mit Unterbaum fragt nach
  await answers(page).first().locator('.del').click();
  await expect(page.locator('#confirmDialog')).toContainText('1 Antwort(en) darunter');
  await page.click('#confirmOk');
  await expect(answers(page)).toHaveCount(1);
  await expect(answers(page).first().locator('.ans')).toHaveValue('Ursache B');
});

test('Baum zeigt alle Zweige und Blickwinkel; Klick öffnet die Kette', async ({ page }) => {
  await openExample(page);
  await page.click('[data-mode="tree"]');
  await expect(page.locator('#tree .lane')).toHaveCount(3);
  await expect(page.locator('#tree [data-lens="occurrence"] .node.rootc')).toContainText('Filterreinigung');
  await expect(page.locator('#tree .node.ev-card-refuted')).toContainText('mehr Bestellungen');
  await page.locator('#tree .node', { hasText: 'Nur eine Person in der Küche' }).click();
  await expect(page.locator('#chain')).toBeVisible();
  await expect(answers(page).nth(1).locator('.ans')).toHaveValue('Nur eine Person in der Küche statt zwei.');
  await expect(page).toHaveURL(/why\/chain$/);
});

test('Blickwinkel wechseln und eigene Ausgangsfrage', async ({ page }) => {
  await openExample(page);
  await page.click('.lens [data-lens="detection"]');
  await expect(page).toHaveURL(/why\/chain\/detection$/);
  await expect(page.locator('#lq-detection')).toHaveValue('Warum fiel der zugesetzte Filter nicht vorher auf?');
  await expect(answers(page)).toHaveCount(3);
  await expect(answers(page).nth(2)).toHaveClass(/rootc/);
  await expect(page.locator('#readback')).toContainText('daher Warum fiel der zugesetzte Filter');
});
