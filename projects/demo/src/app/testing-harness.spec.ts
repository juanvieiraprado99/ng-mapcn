import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MapMarkerComponent, MarkerContentComponent, MarkerPopupComponent } from 'ng-mapcn';
import { loadMap, renderMap, resetMapTesting } from 'ng-mapcn/testing';
import { NgMapHarness, NgMapMarkerHarness, NgMapPopupHarness } from 'ng-mapcn/testing/harness';
import { afterEach, describe, expect, it } from 'vitest';

// Drives a map through the component harnesses exactly like an app would: only the package's
// public entry points and `@angular/cdk/testing`, with `maplibre-gl` mocked by the fake in
// `src/testing/setup.ts`.
const TEMPLATE = `
  <ng-map>
    <ng-map-marker [longitude]="-46.63" [latitude]="-23.55" ariaLabel="São Paulo">
      <ng-marker-content>SP</ng-marker-content>
      <ng-marker-popup [closeButton]="true">Largest city in Brazil</ng-marker-popup>
    </ng-map-marker>
  </ng-map>
`;

describe('ng-mapcn/testing/harness (from the package)', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    resetMapTesting();
  });

  it('opens a marker popup with a click and closes it with its close button', async () => {
    const { fixture } = await renderMap(TEMPLATE, {
      imports: [MapMarkerComponent, MarkerContentComponent, MarkerPopupComponent],
    });
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const map = await loader.getHarness(NgMapHarness);

    expect(await map.isLoading()).toBe(true);
    await loadMap(fixture);
    expect(await map.isLoading()).toBe(false);

    const marker = await map.getMarkers({ label: 'São Paulo' }).then(([m]) => m);
    expect(marker).toBeInstanceOf(NgMapMarkerHarness);
    expect(await marker.getText()).toBe('SP');
    expect(await map.getPopups()).toHaveLength(0);

    await marker.click();

    const popup = await loader.getHarness(NgMapPopupHarness.with({ text: /Largest city/ }));
    expect(await popup.isTooltip()).toBe(false);
    expect(await marker.hasPopup()).toBe(true);

    await popup.close();
    expect(await map.getPopups()).toHaveLength(0);
    expect(await marker.hasPopup()).toBe(false);
  });
});
