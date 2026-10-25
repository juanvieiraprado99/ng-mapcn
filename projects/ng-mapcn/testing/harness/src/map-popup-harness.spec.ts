import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MapMarkerComponent, MapPopupComponent, MarkerTooltipComponent } from 'ng-mapcn';
import { renderMap, resetMapTesting } from 'ng-mapcn/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NgMapHarness } from './map-harness';
import { NgMapPopupHarness } from './map-popup-harness';

const IMPORTS = [MapPopupComponent, MapMarkerComponent, MarkerTooltipComponent];

async function setup(closeButton: boolean) {
  const closed = vi.fn();
  const { fixture } = await renderMap(
    `<ng-map>
       <ng-map-popup [longitude]="1" [latitude]="2" [closeButton]="closeButton"
                     (popupClose)="closed()">
         <p>Visitor center</p>
       </ng-map-popup>
     </ng-map>`,
    { imports: IMPORTS, hostProps: { closeButton, closed } },
  );
  const map = await TestbedHarnessEnvironment.loader(fixture).getHarness(NgMapHarness);
  return { fixture, map, closed };
}

describe('NgMapPopupHarness', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    resetMapTesting();
  });

  it('reads the text and is found by it', async () => {
    const { fixture, map } = await setup(false);

    const [popup] = await map.getPopups({ text: /Visitor/ });
    expect(await popup.getText()).toBe('Visitor center');
    expect(await popup.isTooltip()).toBe(false);
    expect(await map.getPopups({ text: 'Elsewhere' })).toHaveLength(0);
    const loader = TestbedHarnessEnvironment.loader(fixture);
    expect(await loader.getAllHarnesses(NgMapPopupHarness)).toHaveLength(1);
  });

  it('close() clicks the close button, which closes the popup', async () => {
    const { map, closed } = await setup(true);
    const [popup] = await map.getPopups();

    expect(await popup.hasCloseButton()).toBe(true);
    await popup.close();

    expect(closed).toHaveBeenCalledTimes(1);
    expect(await map.getPopups()).toHaveLength(0);
  });

  it('close() throws without a close button', async () => {
    const { map } = await setup(false);
    const [popup] = await map.getPopups();

    expect(await popup.hasCloseButton()).toBe(false);
    await expect(popup.close()).rejects.toThrow(/no close button/);
  });

  it('pressEscape() closes the popup', async () => {
    const { map, closed } = await setup(false);
    const [popup] = await map.getPopups();

    await popup.pressEscape();

    expect(closed).toHaveBeenCalledTimes(1);
    expect(await map.getPopups()).toHaveLength(0);
  });

  it('isTooltip() detects a marker tooltip', async () => {
    const { fixture } = await renderMap(
      `<ng-map>
         <ng-map-marker [longitude]="1" [latitude]="2">
           <ng-marker-tooltip>Hint</ng-marker-tooltip>
         </ng-map-marker>
       </ng-map>`,
      { imports: IMPORTS },
    );
    const map = await TestbedHarnessEnvironment.loader(fixture).getHarness(NgMapHarness);
    await (await map.getMarkers())[0].hover();

    const [tooltip] = await map.getPopups();
    expect(await tooltip.isTooltip()).toBe(true);
    expect(await tooltip.hasCloseButton()).toBe(false);
    expect(await tooltip.getText()).toBe('Hint');
  });
});
