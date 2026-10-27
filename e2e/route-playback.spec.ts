import { expect, test } from './fixtures';
import { gotoAndWaitForMap } from './map-helpers';

const ROUTES_URL = '/docs/components/routes';

// Docs page examples, in template order: basic, planning, progress, playback.
const PLAYBACK = 3;

test.describe('route playback', () => {
  test('plays, pauses and seeks the route marker', async ({ page }) => {
    await gotoAndWaitForMap(page, ROUTES_URL, PLAYBACK);
    const map = page.locator('ng-map').nth(PLAYBACK);
    const range = map.getByRole('slider', { name: 'Playback progress' });
    const value = async () => Number(await range.inputValue());
    // marker 0 is the start marker, marker 1 follows the playback head
    const head = map.locator('.maplibregl-marker').nth(1);

    await expect(map.getByRole('button', { name: 'Play' })).toBeVisible();
    expect(await value()).toBe(0);

    await map.getByRole('button', { name: 'Play' }).click();
    await page.waitForTimeout(500);
    await expect.poll(value).toBeGreaterThan(0);

    await map.getByRole('button', { name: 'Pause' }).click();
    await expect(map.getByRole('button', { name: 'Play' })).toBeVisible();
    const paused = await value();
    await page.waitForTimeout(300);
    expect(await value()).toBe(paused);

    const before = await head.boundingBox();
    expect(before).not.toBeNull();
    await range.fill('0.9');
    await expect
      .poll(async () => (await head.boundingBox())?.x ?? before!.x)
      .not.toBeCloseTo(before!.x, 0);
  });
});
