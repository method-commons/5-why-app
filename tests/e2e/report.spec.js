import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chooseFile, download, expect, nav, openExample, stored, test } from './fixtures.js';

test('Bericht auf einer Seite und als Markdown', async ({ page }) => {
  await openExample(page);
  await nav(page, 'report');
  const report = page.locator('#report');
  await expect(report).toContainText('5-Warum-Analyse: Lange Wartezeit am Samstag');
  await expect(report.locator('section[data-lens]')).toHaveCount(3);
  await expect(report.locator('.rp-root')).toHaveCount(2);
  await expect(report.locator('[data-lens="occurrence"] .rp-root')).toContainText('◎1 Die Filterreinigung');
  await expect(report.locator('[data-lens="detection"] .rp-root')).toContainText('◎2 Beim Öffnen');
  await expect(report.locator('.rp-refuted')).toHaveCount(1);
  await page.uncheck('#showRefuted');
  await expect(report.locator('.rp-refuted')).toHaveCount(0);
  await expect(report.locator('table tbody tr')).toHaveCount(5);
  const md = await download(page, () => page.click('#downloadMd'));
  expect(md.name).toBe('lange-wartezeit-am-samstag.md');
  expect(md.text).toContain('## Warum nicht entdeckt?');
  expect(md.text).not.toContain('~~widerlegt~~');
});

test('Export, Sicherung und Import', async ({ page }) => {
  await openExample(page);
  const json = await download(page, async () => { await page.click('#menuBtn'); await page.click('[data-action="export"]'); });
  expect(json.name).toBe('lange-wartezeit-am-samstag.json');
  expect(JSON.parse(json.text).nodes).toHaveLength(12);
  await page.click('#homeLink');
  const backup = await download(page, async () => { await page.click('#menuBtn'); await page.click('[data-action="backup"]'); });
  expect(JSON.parse(backup.text).analyses).toHaveLength(1);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fivewhy-'));
  const file = path.join(dir, 'a.json');
  fs.writeFileSync(file, json.text);
  // Identisch: übersprungen
  await chooseFile(page, '#importBtn', file);
  await expect(page.locator('.toast').last()).toContainText('schon vorhanden');
  // Abweichend: als Kopie
  const changed = { ...JSON.parse(json.text), name: 'Geändert' };
  fs.writeFileSync(file, JSON.stringify(changed));
  await chooseFile(page, '#importBtn', file);
  await expect(page.locator('#aName')).toHaveValue('Geändert (Import)');
  await expect.poll(async () => (await stored(page)).length).toBe(2);
  // Ungültig
  await page.click('#homeLink');
  fs.writeFileSync(file, '{kaputt');
  await chooseFile(page, '#importBtn', file);
  await expect(page.locator('.toast').last()).toContainText('Import fehlgeschlagen');
});
