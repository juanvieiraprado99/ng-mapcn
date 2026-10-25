import { HARNESS_SELECTORS as S } from '../projects/ng-mapcn/testing/harness/src/selectors';
import { expect, test } from './fixtures';
import { gotoAndWaitForMap, mapCall } from './map-helpers';

// The component harnesses (`ng-mapcn/testing/harness`) run in a TestBed against the maplibre-gl
// fake. They only read the DOM, through the selectors in `selectors.ts` and the marker's ARIA
// attributes, so these tests check that same contract against real MapLibre: where MapLibre puts
// markers, popups and controls, and how the marker reports its popup.

const MARKERS = '/docs/components/markers';
/** "Marker Popups": three markers, each with an `ng-marker-popup` with a close button. */
const POPUP_MAP = 3;

test.describe('harness DOM contract on real MapLibre', () => {
  test('markers sit in the canvas container and declare their popup, collapsed', async ({
    page,
  }) => {
    await gotoAndWaitForMap(page, MARKERS, POPUP_MAP);
    const map = page.locator(S.map).nth(POPUP_MAP);

    await expect(map.locator(S.marker)).toHaveCount(3);
    await expect(map.locator(`.maplibregl-canvas-container > ${S.marker}`)).toHaveCount(3);

    const louvre = map.locator(S.marker, { hasText: 'Louvre' });
    await expect(louvre).toHaveAttribute('role', 'button');
    await expect(louvre).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(louvre).toHaveAttribute('aria-expanded', 'false');
    await expect(louvre).not.toHaveAttribute('aria-controls');
  });

  test('a click opens the popup as a direct child of the map container, named by aria-controls', async ({
    page,
  }) => {
    await gotoAndWaitForMap(page, MARKERS, POPUP_MAP);
    const map = page.locator(S.map).nth(POPUP_MAP);
    const louvre = map.locator(S.marker, { hasText: 'Louvre' });

    await louvre.click();

    await expect(louvre).toHaveAttribute('aria-expanded', 'true');
    const cardId = await louvre.getAttribute('aria-controls');
    expect(cardId).toMatch(/^ng-marker-popup-\d+$/);
    const card = map.locator(
      `.maplibregl-map > ${S.popup} > .maplibregl-popup-content > ${S.popupCard}`,
    );
    await expect(card).toHaveCount(1);
    await expect(card).toHaveAttribute('id', cardId!);
    await expect(card).toContainText('Art museum in a former palace');

    // The close button closes it: collapsed again, and aria-controls goes with the card.
    await card.locator(S.popupClose).click();
    await expect(map.locator(S.popup)).toHaveCount(0);
    await expect(louvre).toHaveAttribute('aria-expanded', 'false');
    await expect(louvre).not.toHaveAttribute('aria-controls');
  });

  test('aria-expanded is per marker: another marker keeps its own state', async ({ page }) => {
    await gotoAndWaitForMap(page, MARKERS, POPUP_MAP);
    const map = page.locator(S.map).nth(POPUP_MAP);
    const louvre = map.locator(S.marker, { hasText: 'Louvre' });
    const notreDame = map.locator(S.marker, { hasText: 'Notre-Dame' });
    const eiffel = map.locator(S.marker, { hasText: 'Eiffel Tower' });

    await louvre.click();
    await notreDame.click();

    // closeOnClick is off by default, so both popups stay open.
    await expect(map.locator(S.popup)).toHaveCount(2);
    await expect(louvre).toHaveAttribute('aria-expanded', 'true');
    await expect(notreDame).toHaveAttribute('aria-expanded', 'true');
    await expect(eiffel).toHaveAttribute('aria-expanded', 'false');
    expect(await louvre.getAttribute('aria-controls')).not.toBe(
      await notreDame.getAttribute('aria-controls'),
    );

    await notreDame.click();
    await expect(notreDame).toHaveAttribute('aria-expanded', 'false');
    await expect(louvre).toHaveAttribute('aria-expanded', 'true');
    await expect(map.locator(S.popup)).toHaveCount(1);
  });

  test('Enter opens the popup and Escape closes it, returning focus to the marker', async ({
    page,
  }) => {
    await gotoAndWaitForMap(page, MARKERS, POPUP_MAP);
    const map = page.locator(S.map).nth(POPUP_MAP);
    const eiffel = map.locator(S.marker, { hasText: 'Eiffel Tower' });
    const popup = map.locator(S.popup);

    await eiffel.focus();
    await page.keyboard.press('Enter');
    await expect(eiffel).toHaveAttribute('aria-expanded', 'true');
    // focusAfterOpen: focus moved into the card, where Escape is handled.
    await expect.poll(() => popup.evaluate((el) => el.contains(document.activeElement))).toBe(true);

    await page.keyboard.press('Escape');
    await expect(popup).toHaveCount(0);
    await expect(eiffel).toHaveAttribute('aria-expanded', 'false');
    await expect(eiffel).toBeFocused();
  });

  test('a tooltip is a popup without a card and its marker declares no popup', async ({ page }) => {
    // "Basic Example": markers with an ng-marker-tooltip.
    await gotoAndWaitForMap(page, MARKERS, 0);
    const map = page.locator(S.map).first();
    const shibuya = map.locator(S.marker, { hasText: 'Shibuya' });

    await shibuya.hover();

    const tooltip = map.locator(`.maplibregl-map > ${S.popup}`);
    await expect(tooltip.locator(S.tooltip)).toContainText('Famous crossing & shopping');
    await expect(tooltip.locator(S.popupCard)).toHaveCount(0);
    await expect(shibuya).not.toHaveAttribute('aria-haspopup');
    await expect(shibuya).not.toHaveAttribute('aria-expanded');
  });

  test('controls render in a corner of the control container with the group structure', async ({
    page,
  }) => {
    // "Basic Controls": every button, top-right.
    await gotoAndWaitForMap(page, '/docs/components/controls', 0);
    const map = page.locator(S.map).first();

    const controls = map.locator(
      `.maplibregl-control-container > .maplibregl-ctrl-top-right ${S.controls}`,
    );
    await expect(controls).toHaveCount(1);
    // Zoom in, zoom out, compass, locate and fullscreen, in the order the harness relies on.
    const buttons = controls.locator(`${S.controlGroup} > button`);
    await expect(buttons).toHaveCount(5);
    await expect(buttons.nth(2).locator('.ng-control-compass')).toHaveCount(1);
    await expect(controls.locator(`${S.controlGroup} > button[aria-busy]`)).toHaveCount(1);
    await expect(controls.locator(`${S.controlGroup} > button[aria-pressed]`)).toHaveCount(1);

    // The first button is zoom in, as the harness assumes: it zooms the real map.
    const before = await mapCall(page, 0, (m) => m.getZoom());
    await buttons.first().click();
    await expect.poll(() => mapCall(page, 0, (m) => m.getZoom())).toBeCloseTo(before + 1, 1);
  });
});
