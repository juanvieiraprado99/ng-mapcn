import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { gotoAndWaitForMap, mapCall } from './map-helpers';
import { EXPECTED_MAPS, ROUTES } from './routes';

/**
 * Accessibility checks, run against the development build.
 *
 * Axe scans are scoped to the library UI (`ng-map`: controls, markers, popups, loader) so the demo
 * site's own chrome (code-highlight contrast, docs cards, selects) does not drown out library
 * violations. Pages without a map are skipped (nothing of the library to scan); block previews on
 * /blocks are covered through their /view/:name routes.
 */
const SCANNED_ROUTES = ROUTES.filter((route) => route !== '/blocks' && EXPECTED_MAPS[route] !== 0);

async function libraryViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .include('ng-map')
    // MapLibre fades markers that sit behind the globe horizon (`maplibregl-marker-covered`,
    // opacity 0.2): they are intentionally dimmed, so their label contrast is not meaningful.
    .exclude('.maplibregl-marker-covered')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return results.violations.map((violation) => ({
    rule: violation.id,
    help: violation.help,
    targets: violation.nodes.map((node) => node.target.join(' ')).slice(0, 5),
  }));
}

test.describe('accessibility (axe)', () => {
  for (const route of SCANNED_ROUTES) {
    test(`${route} has no axe violations in the library UI`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('app-root[ng-version]')).toHaveCount(1);
      await gotoAndWaitForMap(page, route, Math.max((EXPECTED_MAPS[route] ?? 1) - 1, 0));
      await expect(page.locator('ng-map .ng-map-loader')).toHaveCount(0, { timeout: 30_000 });
      expect(await libraryViolations(page)).toEqual([]);
    });
  }
});

test.describe('keyboard: controls', () => {
  test('every control is a named button, reachable with Tab and operable with Enter', async ({
    page,
  }) => {
    await gotoAndWaitForMap(page, '/docs/components/controls', 0);
    const map = page.locator('ng-map').first();

    const names = ['Zoom in', 'Zoom out', 'Reset north', 'My location', 'Toggle fullscreen'];
    for (const name of names) {
      await expect(map.getByRole('button', { name })).toHaveCount(1);
    }

    const zoomIn = map.getByRole('button', { name: 'Zoom in' });
    await zoomIn.focus();
    // Keyboard focus is visible.
    await expect
      .poll(() =>
        zoomIn.evaluate((el) => {
          const style = getComputedStyle(el);
          return style.outlineStyle !== 'none' || style.boxShadow !== 'none';
        }),
      )
      .toBe(true);

    // Tab walks the group in order.
    for (const name of names.slice(1)) {
      await page.keyboard.press('Tab');
      await expect(map.getByRole('button', { name })).toBeFocused();
    }

    const before = await mapCall(page, 0, (m) => m.getZoom());
    await zoomIn.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => mapCall(page, 0, (m) => m.getZoom())).toBeGreaterThan(before);
  });
});

test.describe('keyboard: popups', () => {
  test('the standalone popup takes focus, its close button is named and Escape closes it', async ({
    page,
  }) => {
    await gotoAndWaitForMap(page, '/docs/components/popups', 0);
    const map = page.locator('ng-map').first();
    const popup = map.locator('.maplibregl-popup');
    await expect(popup).toHaveCount(1);

    // focusAfterOpen: focus moved into the popup.
    await expect.poll(() => popup.evaluate((el) => el.contains(document.activeElement))).toBe(true);

    const close = popup.getByRole('button', { name: 'Close popup' });
    await expect(close).toHaveCount(1);
    await close.focus();
    await page.keyboard.press('Enter');
    await expect(popup).toHaveCount(0);
  });

  test('Escape closes the popup from inside its card', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/popups', 0);
    const popup = page.locator('ng-map').first().locator('.maplibregl-popup');
    await expect(popup).toHaveCount(1);
    await expect.poll(() => popup.evaluate((el) => el.contains(document.activeElement))).toBe(true);

    await page.keyboard.press('Escape');
    await expect(popup).toHaveCount(0);
  });

  test('a marker opens its popup with Enter and Escape closes it', async ({ page }) => {
    // "Rich Popups": the marker content is a named <button>, the popup an ng-map-popup.
    await gotoAndWaitForMap(page, '/docs/components/markers', 1);
    const map = page.locator('ng-map').nth(1);
    const marker = map.getByRole('button', { name: 'Grand Central Terminal' });
    const popup = map.locator('.maplibregl-popup');

    await marker.focus();
    await page.keyboard.press('Enter');
    await expect(popup).toHaveCount(1);
    await expect(popup).toContainText('Grand Central Terminal');
    await expect.poll(() => popup.evaluate((el) => el.contains(document.activeElement))).toBe(true);

    await page.keyboard.press('Escape');
    await expect(popup).toHaveCount(0);
  });
});

test.describe('markers', () => {
  test('labelled markers expose their label text', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/markers', 0);
    const map = page.locator('ng-map').first();
    for (const name of ['Shibuya', 'Shinjuku', 'Asakusa']) {
      const label = map.locator('ng-marker-label', { hasText: name });
      await expect(label).toBeVisible();
      await expect(label).toHaveText(name);
    }
  });

  test('interactive markers have an accessible name', async ({ page }) => {
    await gotoAndWaitForMap(page, '/docs/components/markers', 1);
    const map = page.locator('ng-map').nth(1);
    for (const name of [
      'The Metropolitan Museum of Art',
      'Brooklyn Bridge',
      'Grand Central Terminal',
    ]) {
      await expect(map.getByRole('button', { name })).toHaveCount(1);
    }
  });
});
