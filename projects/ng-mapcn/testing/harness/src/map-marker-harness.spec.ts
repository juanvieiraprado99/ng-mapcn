import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import {
  MapMarkerComponent,
  MarkerContentComponent,
  MarkerPopupComponent,
  MarkerTooltipComponent,
} from 'ng-mapcn';
import { renderMap, resetMapTesting } from 'ng-mapcn/testing';
import { fakeRegistry } from 'ng-mapcn/testing/maplibre';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NgMapHarness } from './map-harness';
import { NgMapMarkerHarness } from './map-marker-harness';

const IMPORTS = [
  MapMarkerComponent,
  MarkerContentComponent,
  MarkerPopupComponent,
  MarkerTooltipComponent,
];

const TEMPLATE = `
  <ng-map>
    <ng-map-marker [longitude]="1" [latitude]="2" ariaLabel="Office" (markerClick)="clicked()">
      <ng-marker-content>Pin</ng-marker-content>
      <ng-marker-popup>Office details</ng-marker-popup>
    </ng-map-marker>
    <ng-map-marker [longitude]="3" [latitude]="4">
      <ng-marker-content>Store</ng-marker-content>
      <ng-marker-tooltip>Store hours</ng-marker-tooltip>
    </ng-map-marker>
    <ng-map-marker [longitude]="5" [latitude]="6" ariaLabel="Depot">
      <ng-marker-content>Depot</ng-marker-content>
      <ng-marker-popup>Depot details</ng-marker-popup>
    </ng-map-marker>
    <ng-map-marker [longitude]="7" [latitude]="8">
      <ng-marker-content><button type="button">Kiosk</button></ng-marker-content>
      <ng-marker-popup>Kiosk details</ng-marker-popup>
    </ng-map-marker>
    <ng-map-marker [longitude]="9" [latitude]="10">
      <ng-marker-content>
        <button
          type="button"
          aria-haspopup="dialog"
          [attr.aria-expanded]="cafe.isOpen()"
          [attr.aria-controls]="cafe.isOpen() ? cafe.cardId : null"
        >Cafe</button>
      </ng-marker-content>
      <ng-marker-popup #cafe>Cafe details</ng-marker-popup>
    </ng-map-marker>
  </ng-map>
`;

async function setup() {
  const clicked = vi.fn();
  const { fixture } = await renderMap(TEMPLATE, { imports: IMPORTS, hostProps: { clicked } });
  const map = await TestbedHarnessEnvironment.loader(fixture).getHarness(NgMapHarness);
  return { fixture, map, clicked };
}

describe('NgMapMarkerHarness', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    resetMapTesting();
  });

  it('is found by text and by aria-label', async () => {
    const { fixture, map } = await setup();
    const loader = TestbedHarnessEnvironment.loader(fixture);

    expect(await map.getMarkers({ text: 'Pin' })).toHaveLength(1);
    expect(await map.getMarkers({ text: /^S/ })).toHaveLength(1);
    expect(await map.getMarkers({ label: 'Office' })).toHaveLength(1);
    expect(await map.getMarkers({ label: 'Nowhere' })).toHaveLength(0);
    // Also reachable straight from the fixture, without the map harness.
    const office = await loader.getHarness(NgMapMarkerHarness.with({ label: 'Office' }));
    expect(await office.getText()).toBe('Pin');
    expect(await office.getAriaLabel()).toBe('Office');
  });

  it('click toggles the marker popup through the fake and emits markerClick', async () => {
    const { map, clicked } = await setup();
    const [office] = await map.getMarkers({ label: 'Office' });

    expect(await office.hasPopup()).toBe(true);
    expect(await office.isPopupOpen()).toBe(false);
    await office.click();

    expect(clicked).toHaveBeenCalledTimes(1);
    expect(await office.isPopupOpen()).toBe(true);
    expect(fakeRegistry.markers[0].getPopup()!.isOpen()).toBe(true);
    const [popup] = await map.getPopups();
    expect(await popup.getText()).toBe('Office details');

    await office.click();
    expect(await office.isPopupOpen()).toBe(false);
    expect(await map.getPopups()).toHaveLength(0);
  });

  it('isPopupOpen reads only this marker: another open popup does not count', async () => {
    const { map } = await setup();
    const [office] = await map.getMarkers({ label: 'Office' });
    const [depot] = await map.getMarkers({ label: 'Depot' });

    await depot.click();

    expect(await depot.isPopupOpen()).toBe(true);
    expect(await office.isPopupOpen()).toBe(false);
    expect(await map.getPopups({ text: 'Depot details' })).toHaveLength(1);

    await office.click();
    expect(await office.isPopupOpen()).toBe(true);
    // Each marker popup is its own MapLibre popup: both stay open.
    expect(await depot.isPopupOpen()).toBe(true);
  });

  it('isPopupOpen throws for a marker whose content has its own control', async () => {
    const { map } = await setup();
    const [kiosk] = await map.getMarkers({ text: 'Kiosk' });

    expect(await kiosk.hasPopup()).toBe(true);
    await expect(kiosk.isPopupOpen()).rejects.toThrow(/its content has its own control/);
  });

  it('isPopupOpen reads the nested button when the app mirrors the popup state on it', async () => {
    const { fixture, map } = await setup();
    const [cafe] = await map.getMarkers({ text: 'Cafe' });
    const button = () =>
      (fixture.nativeElement as HTMLElement).querySelector('button[aria-haspopup]')!;

    expect(await cafe.hasPopup()).toBe(true);
    expect(await cafe.isPopupOpen()).toBe(false);
    expect(button().hasAttribute('aria-controls')).toBe(false);

    await cafe.click();
    expect(await cafe.isPopupOpen()).toBe(true);
    const cardId = button().getAttribute('aria-controls');
    expect(cardId).toMatch(/^ng-marker-popup-\d+$/);
    const [popup] = await map.getPopups({ text: 'Cafe details' });
    expect(popup).toBeDefined();
    expect(document.getElementById(cardId!)?.textContent).toContain('Cafe details');
    // The library still leaves the marker element without role or aria-expanded.
    const markerEl = button().closest('.maplibregl-marker')!;
    expect(markerEl.hasAttribute('role')).toBe(false);
    expect(markerEl.hasAttribute('aria-expanded')).toBe(false);

    await popup.pressEscape();
    expect(await cafe.isPopupOpen()).toBe(false);
  });

  it('pressEnter on the focused marker toggles the popup and emits markerClick once', async () => {
    const { map, clicked } = await setup();
    const [office] = await map.getMarkers({ label: 'Office' });

    await office.focus();
    await office.pressEnter();

    expect(clicked).toHaveBeenCalledTimes(1);
    expect(await office.isPopupOpen()).toBe(true);
  });

  it('hover and focus show the tooltip, mouseAway hides it; a tooltip is not a popup card', async () => {
    const { map } = await setup();
    const [store] = await map.getMarkers({ text: 'Store' });

    await store.hover();
    const [tooltip] = await map.getPopups();
    expect(await tooltip.isTooltip()).toBe(true);
    expect(await tooltip.getText()).toBe('Store hours');
    expect(await store.hasPopup()).toBe(false);
    expect(await store.isPopupOpen()).toBe(false);

    await store.mouseAway();
    expect(await map.getPopups()).toHaveLength(0);

    await store.focus();
    expect(await map.getPopups({ text: 'Store hours' })).toHaveLength(1);
  });
});
