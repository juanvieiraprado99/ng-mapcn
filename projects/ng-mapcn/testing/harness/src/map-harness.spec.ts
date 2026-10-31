import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import {
  MapControlsComponent,
  MapMarkerComponent,
  MapPopupComponent,
  MarkerContentComponent,
} from 'ng-mapcn';
import { loadMap, renderMap, resetMapTesting, update } from 'ng-mapcn/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { NgMapHarness } from './map-harness';

const IMPORTS = [
  MapMarkerComponent,
  MarkerContentComponent,
  MapPopupComponent,
  MapControlsComponent,
];

describe('NgMapHarness', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    resetMapTesting();
  });

  it('shows the loader until the map is loaded, and while the loading input is set', async () => {
    const { fixture } = await renderMap('<ng-map [loading]="busy" />', {
      hostProps: { busy: false },
    });
    const map = await TestbedHarnessEnvironment.loader(fixture).getHarness(NgMapHarness);

    expect(await map.isLoading()).toBe(true);

    await loadMap(fixture);
    expect(await map.isLoading()).toBe(false);

    update(fixture, { busy: true });
    expect(await map.isLoading()).toBe(true);
  });

  it('finds the markers, popups and controls of each map', async () => {
    const { fixture } = await renderMap(
      `<ng-map class="first">
         <ng-map-marker [longitude]="1" [latitude]="1">
           <ng-marker-content>Alpha</ng-marker-content>
         </ng-map-marker>
         <ng-map-marker [longitude]="2" [latitude]="2">
           <ng-marker-content>Beta</ng-marker-content>
         </ng-map-marker>
         <ng-map-popup [longitude]="0" [latitude]="0">Hello</ng-map-popup>
         <ng-map-controls />
       </ng-map>
       <ng-map class="second">
         <ng-map-marker [longitude]="3" [latitude]="3">
           <ng-marker-content>Gamma</ng-marker-content>
         </ng-map-marker>
       </ng-map>`,
      { imports: IMPORTS },
    );
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const [first, second] = await loader.getAllHarnesses(NgMapHarness);

    const markers = await first.getMarkers();
    expect(await Promise.all(markers.map((m) => m.getText()))).toEqual(['Alpha', 'Beta']);
    expect(await first.getMarkers({ text: 'Beta' })).toHaveLength(1);
    expect(await first.getMarkers({ text: 'Gamma' })).toHaveLength(0);
    expect(await (await first.getPopups())[0].getText()).toBe('Hello');
    expect(await first.getControls()).toHaveLength(1);

    expect(await second.getMarkers()).toHaveLength(1);
    expect(await second.getPopups()).toHaveLength(0);
    expect(await second.getControls()).toHaveLength(0);

    const filtered = await loader.getHarness(NgMapHarness.with({ selector: '.second' }));
    expect(await (await filtered.getMarkers())[0].getText()).toBe('Gamma');
  });
});
