import { test as base, expect } from '@playwright/test';
import fs from 'node:fs';

/** Gebaute App, ausgeliefert von `vite preview` (siehe playwright.config.js). */
export const APP_URL = 'http://localhost:4173/';

/**
 * `page` öffnet die App mit leerem Speicher und lässt den Test bei jedem
 * JavaScript-Fehler der Seite fehlschlagen.
 */
export const test = base.extend({
  // Playwright verlangt hier ein Objektmuster als ersten Parameter
  // eslint-disable-next-line no-empty-pattern
  pageErrors: async ({}, use) => { await use([]); },
  page: async ({ page, pageErrors }, use) => {
    page.on('pageerror', e => pageErrors.push(e.message));
    await page.goto(APP_URL);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await use(page);
    expect(pageErrors, 'JavaScript-Fehler auf der Seite').toEqual([]);
  },
});
export { expect };

/** Beispiel öffnen (landet in der Warum-Kette). */
export async function openExample(page) {
  await page.click('#exampleBtn');
  await expect(page.locator('#chain')).toBeVisible();
}

/** Neue Analyse über den Dialog anlegen (landet bei „Problem“). */
export async function createAnalysis(page, name = 'Test') {
  await page.click('#newBtn');
  await page.fill('#naName', name);
  await page.click('#naCreate');
  await expect(page.locator('#aName')).toHaveValue(name);
}

/** Schritt in der Kopfzeile öffnen. */
export async function nav(page, tab) {
  await page.click(`[data-nav="${tab}"]`);
}

/** Antwort-Karten der Kette. */
export function answers(page) {
  return page.locator('#chain .why');
}

/** Prüfpunkt einer Prüfliste. */
export function check(page, list, key) {
  return page.locator(`#${list} [data-check="${key}"]`);
}

/** Gespeicherte Analysen aus dem localStorage (wartet auf das verzögerte Speichern). */
export function stored(page) {
  return page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('five-why:analysis:')).map(k => JSON.parse(localStorage.getItem(k)).data));
}

/** Download auslösen und Inhalt lesen. */
export async function download(page, action) {
  const [dl] = await Promise.all([page.waitForEvent('download'), action()]);
  return { name: dl.suggestedFilename(), text: fs.readFileSync(await dl.path(), 'utf8') };
}

/** Datei über den Dateiauswahl-Dialog der App einlesen. */
export async function chooseFile(page, button, file) {
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click(button)]);
  await chooser.setFiles(file);
}

/** Einstellungen der Analyse öffnen. */
export async function openSettings(page) {
  await page.click('#menuBtn');
  await page.click('[data-action="settings"]');
  await expect(page.locator('#settingsDialog')).toBeVisible();
}
