import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';

test('starts, grows, pauses, resumes, resets, and accepts keyboard controls without errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.install();
  await page.goto('/verdant/');
  await expect(page).toHaveTitle('Verdant — a study in growth');
  await page.clock.runFor(6000);
  await expect(page.locator('#phase')).toHaveText('Growing');
  await expect(page.locator('.leaf')).toHaveCount(10);
  await page.getByRole('button', { name: 'Pause animation' }).click();
  const elapsed = await page.locator('#elapsed').textContent();
  const stem = await page.locator('#stem').getAttribute('d');
  await page.clock.runFor(3000);
  await expect(page.locator('#elapsed')).toHaveText(elapsed ?? '');
  await expect(page.locator('#stem')).toHaveAttribute('d', stem ?? '');
  await page.getByRole('button', { name: 'Play animation' }).press('Enter');
  await page.clock.runFor(1000);
  expect(await page.locator('#elapsed').textContent()).not.toBe(elapsed);
  await page.getByRole('button', { name: 'Pause animation' }).click();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.locator('#elapsed')).toHaveText('00.0 / 20s');
  const slider = page.getByLabel('Breeze strength');
  await slider.focus();
  await slider.press('ArrowRight');
  await expect(page.locator('#wind-value')).toHaveText('0.70×');
  expect(
    await slider.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).toBe('solid');
  expect(errors).toEqual([]);
});

test('reduced motion starts mature and paused and remains user controllable', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Play animation' }),
  ).toBeVisible();
  await expect(page.locator('#elapsed')).toHaveText('12.0 / 20s');
  await page.getByRole('button', { name: 'Play animation' }).click();
  await expect(
    page.getByRole('button', { name: 'Pause animation' }),
  ).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  // Allow the browser to deliver the first media-query change before reversing it.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(
    page.getByRole('button', { name: 'Play animation' }),
  ).toBeVisible();
});

for (const width of [320, 390, 768, 1440]) {
  test(`fits viewport at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole('button', { name: 'Reset', exact: true }),
    ).toBeVisible();
    await expect(page.locator('#scene')).toBeVisible();
    const buttons = await page
      .locator('button')
      .evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().height),
      );
    expect(buttons.every((height) => height >= 44)).toBe(true);
  });
}

test('the production artifact works offline via file URL with no external resources', async ({
  page,
  context,
}) => {
  expect(await readdir('dist')).toEqual(['index.html']);
  const html = await readFile('dist/index.html', 'utf8');
  expect(html).not.toMatch(
    /<script[^>]+src=|<link[^>]+stylesheet|\/\* INLINE_/,
  );
  const externalRequests: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => {
    if (/^https?:/.test(request.url())) externalRequests.push(request.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await context.setOffline(true);
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await expect(
    page.getByRole('button', { name: 'Pause animation' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Pause animation' }).click();
  await expect(
    page.getByRole('button', { name: 'Play animation' }),
  ).toBeVisible();
  expect(externalRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('page suspension preserves playback intent, and final exit disposes controls and SVG nodes', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/');
  await page.clock.runFor(2000);
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent('pagehide', { persisted: true }),
    ),
  );
  const elapsed = await page.locator('#elapsed').textContent();
  await page.clock.runFor(30000);
  await expect(page.locator('#elapsed')).toHaveText(elapsed ?? '');
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent('pageshow', { persisted: true }),
    ),
  );
  await page.clock.runFor(1000);
  expect(await page.locator('#elapsed').textContent()).not.toBe(elapsed);
  await page.getByRole('button', { name: 'Pause animation' }).click();
  await page.evaluate(() => {
    window.dispatchEvent(
      new PageTransitionEvent('pagehide', { persisted: true }),
    );
    window.dispatchEvent(
      new PageTransitionEvent('pageshow', { persisted: true }),
    );
  });
  await expect(
    page.getByRole('button', { name: 'Play animation' }),
  ).toBeVisible();
  await page.evaluate(() => {
    window.dispatchEvent(
      new PageTransitionEvent('pagehide', { persisted: false }),
    );
    window.dispatchEvent(
      new PageTransitionEvent('pagehide', { persisted: false }),
    );
  });
  await expect(page.locator('.leaf')).toHaveCount(0);
  await page.getByRole('button', { name: 'Play animation' }).click();
  await expect(
    page.getByRole('button', { name: 'Play animation' }),
  ).toBeVisible();
});

test('failed mounting reports invalid markup and removes partially created SVG nodes', async ({
  page,
}) => {
  const html = (await readFile('dist/index.html', 'utf8')).replace(
    'id="wind"',
    'id="missing-wind"',
  );
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/invalid-markup', (route) =>
    route.fulfill({ contentType: 'text/html', body: html }),
  );
  await page.goto('/invalid-markup');
  await expect.poll(() => errors).toEqual(['Missing element: #wind']);
  await expect(page.locator('.leaf')).toHaveCount(0);
});
