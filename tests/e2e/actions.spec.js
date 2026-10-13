import { check, expect, nav, openExample, openSettings, createAnalysis, test } from './fixtures.js';

test('Maßnahmen gegen Symptom und Grundursache; Person und Termin optional', async ({ page }) => {
  await createAnalysis(page, 'Maßnahmen');
  await page.fill('#pf-what', 'Fritteuse fällt aus');
  await nav(page, 'why');
  await page.click('#addWhy');
  await page.keyboard.type('Plan fehlt');
  await page.locator('#chain .root-btn').click();
  await page.click('#toActions');
  await expect(page.locator('.rc-card')).toHaveCount(2);
  await expect(check(page, 'actionChecks', 'covered')).toHaveAttribute('data-state', 'bad');
  await expect(page.locator('.m-owner')).toHaveCount(0);

  await page.click('[data-root="symptom"]');
  await page.locator('[data-group="symptom"] .m-text').fill('Filter gereinigt');
  await page.locator('[data-group="symptom"] .m-status').selectOption('done');
  await expect(check(page, 'actionChecks', 'symptom')).toHaveAttribute('data-state', 'ok');

  const group = page.locator('.rc-card.root-group');
  await group.locator('.add-action').click();
  await group.locator('.m-text').fill('Filter in den Plan');
  await group.locator('.m-strength select').selectOption('organisational');
  await expect(check(page, 'actionChecks', 'covered')).toHaveAttribute('data-state', 'ok');
  await expect(check(page, 'actionChecks', 'measurable')).toHaveAttribute('data-state', 'warn');
  await group.locator('.m-check').fill('4 Wochen ohne Ausfall');
  await expect(check(page, 'actionChecks', 'measurable')).toHaveAttribute('data-state', 'ok');
  await expect(page.locator('.hier-organisational b')).toHaveText('1');

  await openSettings(page);
  await page.check('#set-owner');
  await page.check('#set-due');
  await page.click('#settingsDone');
  await group.locator('.m-owner input').fill('Fritz');
  await group.locator('.m-due input').fill('2020-01-01');
  await expect(page.locator('#overdueChip')).toContainText('1 überfällig');
  await expect(check(page, 'actionChecks', 'due')).toHaveAttribute('data-state', 'bad');
  await group.locator('.m-status').selectOption('effective');
  await expect(page.locator('#overdueChip')).toHaveCount(0);
  await expect(check(page, 'actionChecks', 'effective')).toHaveAttribute('data-state', 'ok');
  await expect(page.locator('[data-nav="actions"] .num')).toHaveText('3');
  await nav(page, 'report');
  await expect(page.locator('[data-nav="actions"] .num')).toHaveText('✓');
});

test('Maßnahmen ohne Grundursache lassen sich neu zuordnen', async ({ page }) => {
  await openExample(page);
  await page.locator('#chain .why.rootc .root-btn').click();
  await nav(page, 'actions');
  await expect(page.locator('#orphans .orphan-row')).toHaveCount(2);
  await page.locator('#orphans select').first().selectOption('symptom');
  await expect(page.locator('#orphans .orphan-row')).toHaveCount(1);
  await expect(page.locator('[data-group="symptom"] .m-row:not(.th)')).toHaveCount(2);
});
