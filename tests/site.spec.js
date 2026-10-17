import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';
const errors = [];
test.beforeEach(async ({ page }) => { errors.length = 0; page.on('pageerror', error => errors.push(error.message)); });
test.afterEach(() => { expect(errors).toEqual([]); });

test('all four genuine experiments run under a GitHub Pages repository path', async ({ page }) => {
  const requests = []; page.on('request', request => requests.push({ url: request.url(), method: request.method() }));
  await page.goto('./');
  await expect(page.locator('#python-code')).toContainText('fetch_lfw_people');
  expect(requests.some(r => r.url.endsWith('faces.bin'))).toBe(false);
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path:'artifacts/desktop-home.png' });
  await page.locator('#load-data').click();
  await expect(page.locator('#dataset-output')).toBeVisible();
  await expect(page.locator('#face-gallery .face-tile')).toHaveCount(18);
  await page.locator('#identity-filter').selectOption('2');
  await page.locator('#partition-filter').selectOption('test');
  await expect(page.locator('#faces-page')).toContainText('22 images');
  await page.locator('#face-gallery .face-tile').first().click();
  await expect(page.locator('#input-title')).toContainText('Donald Rumsfeld');

  await page.locator('#run-projection').click();
  await expect(page.locator('#projection-output')).toBeVisible();
  await expect(page.locator('#projection-stats')).toContainText('90.00%');
  const firstMse = Number(await page.locator('#projection-stats strong').nth(2).textContent());
  await page.locator('#task2').screenshot({ path:'artifacts/desktop-projection.png' });
  await page.locator('#component-count').focus(); await page.locator('#component-count').press('End');
  await expect(page.locator('#component-value')).toHaveText('150');
  await expect(page.locator('#projection-stats strong').first()).toHaveText('150 / 150');
  const betterMse = Number(await page.locator('#projection-stats strong').nth(2).textContent());
  expect(betterMse).toBeLessThanOrEqual(firstMse);
  await page.locator('#whiten').uncheck();
  await expect(page.locator('#weights-unit')).toContainText('Unwhitened');
  expect(Number(await page.locator('#projection-stats strong').nth(2).textContent())).toBe(betterMse);
  const downloadEvent = page.waitForEvent('download'); await page.locator('#download-weights').click(); const download = await downloadEvent; expect(download.suggestedFilename()).toBe('lab05-pca-weights.csv');
  await page.locator('#face-upload').setInputFiles('assets/hero-face.webp');
  await expect(page.locator('#input-title')).toContainText('Uploaded image');
  await page.locator('#recognize-face').click();
  await expect(page.locator('#prediction-detail')).toContainText('true identity unknown');

  await page.locator('#run-eigenfaces').click();
  await expect(page.locator('#eigen-gallery figure')).toHaveCount(12);
  await page.locator('#eigen-mode').selectOption('compare');
  await expect(page.locator('#eigen-gallery figure')).toHaveCount(6);
  await page.locator('#eigen-index').focus(); await page.locator('#eigen-index').press('End');
  await expect(page.locator('#eigen-insight')).toContainText('Eigenface 150');

  await page.locator('#test-face').selectOption('13');
  await page.locator('#recognize-face').click();
  await expect(page.locator('#predicted-name')).toHaveText('George W Bush');
  await expect(page.locator('#prediction-detail')).toContainText('Tony Blair');
  await expect(page.locator('#prediction-detail')).toContainText('incorrect prediction');
  await page.locator('#evaluate-test').click();
  await expect(page.locator('#evaluation-status')).toContainText('Python agreement 258 / 258');
  await expect(page.locator('#report-badge')).toHaveText('LIVE BROWSER RUN');
  await expect(page.locator('#metric-accuracy')).toHaveText('84.88%');
  await expect(page.locator('#metric-errors')).toHaveText('39');
  await page.locator('#show-errors').click();
  await expect(page.locator('#failure-gallery figure')).toHaveCount(6);
  await expect(page.locator('#failure-gallery')).toContainText('Test 13');
  await page.locator('#results').screenshot({ path:'artifacts/desktop-results.png' });
  expect(requests.filter(request => request.method !== 'GET')).toEqual([]);
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  expect(axe.violations.map(v => ({ id:v.id, nodes:v.nodes.map(n => n.target) }))).toEqual([]);
});

test('mobile navigation, all output layouts, notes, and link configuration work', async ({ page }) => {
  await page.setViewportSize({ width:375, height:812 }); await page.goto('./');
  await page.screenshot({ path:'artifacts/mobile-home.png' });
  await page.locator('#menu-toggle').click(); await expect(page.locator('#main-nav')).toHaveClass('open');
  await page.locator('#main-nav a[href="#experiments"]').click(); await expect(page.locator('#menu-toggle')).toHaveAttribute('aria-expanded','false');
  await page.locator('#run-projection').click(); await expect(page.locator('#projection-output')).toBeVisible();
  await page.locator('#run-eigenfaces').click(); await page.locator('#show-errors').click();
  for (const width of [320,375,768,1440]) { await page.setViewportSize({ width, height:900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
  await page.setViewportSize({ width:375, height:812 }); await page.locator('#task2').screenshot({ path:'artifacts/mobile-projection.png' });
  await page.locator('#lab-notes').fill('At 85 components, I observed a recognizable reconstruction.');
  await expect(page.locator('#notes-status')).toHaveText('Saved in this browser.');
  await page.reload(); await expect(page.locator('#lab-notes')).toHaveValue(/At 85 components/);
  await page.locator('.compilation-nav').click(); await expect(page.locator('#link-dialog')).toBeVisible();
  await page.locator('#compilation-url').fill('https://example.com/laboratories/'); await page.locator('#repository-url').fill('https://example.com/source/');
  const configEvent = page.waitForEvent('download'); await page.locator('#download-config').click(); expect((await configEvent).suggestedFilename()).toBe('site-config.js');
  await page.locator('#link-form button[type=submit]').click(); await expect(page.locator('#link-dialog')).not.toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('visionlab-lab05-links')).compilationUrl)).toBe('https://example.com/laboratories/');
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze(); expect(axe.violations.map(v => v.id)).toEqual([]);
});

test('failed model downloads can be retried and invalid images show useful feedback', async ({ page }) => {
  await page.route('**/model.bin', route => route.abort()); await page.goto('./'); await page.locator('#load-data').click();
  await expect(page.locator('#load-error')).toBeVisible(); await expect(page.locator('#load-data')).toBeEnabled();
  await page.unroute('**/model.bin'); await page.locator('#load-data').click(); await expect(page.locator('#dataset-output')).toBeVisible(); await expect(page.locator('#load-error')).toBeHidden();
  await page.locator('#face-upload').setInputFiles({ name:'bad.png', mimeType:'image/png', buffer:Buffer.from('not a real image') });
  await expect(page.locator('#upload-error')).toBeVisible();
  await page.locator('#face-upload').setInputFiles({ name:'wrong.txt', mimeType:'text/plain', buffer:Buffer.from('not an image') });
  await expect(page.locator('#upload-error')).toContainText('Choose a PNG');
});

test('worker evaluation can be canceled without replacing the reference results', async ({ page }) => {
  await page.route('**/worker.js', async route => { await new Promise(resolve => setTimeout(resolve, 2500)); await route.continue().catch(() => {}); });
  await page.goto('./'); await page.locator('#evaluate-test').click(); await expect(page.locator('#cancel-evaluation')).toBeVisible();
  await page.locator('#cancel-evaluation').click(); await expect(page.locator('#evaluation-status')).toContainText('canceled');
  await expect(page.locator('#report-badge')).toHaveText('SAVED PYTHON RUN'); await expect(page.locator('#evaluate-test')).toBeEnabled();
});

test('printable report includes all tasks, nine answers, and genuine figures', async ({ page }) => {
  await page.goto('report.html');
  await expect(page.locator('h1')).toContainText('Laboratory Activity 5');
  await expect(page.locator('article')).toHaveCount(9);
  expect(await page.locator('figure img').evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0))).toBe(true);
  await page.emulateMedia({ media:'print' });
  await page.pdf({ path:'artifacts/report-print-qa.pdf', format:'A4', printBackground:true });
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze(); expect(axe.violations.map(v => v.id)).toEqual([]);
});
