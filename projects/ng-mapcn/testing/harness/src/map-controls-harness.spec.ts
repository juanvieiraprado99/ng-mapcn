import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MapControlsComponent } from 'ng-mapcn';
import { getFakeMap, renderMap, resetMapTesting } from 'ng-mapcn/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NgMapControlsHarness } from './map-controls-harness';
import { NgMapHarness } from './map-harness';

async function setup(inputs: string) {
  const { fixture } = await renderMap(`<ng-map [zoom]="5"><ng-map-controls ${inputs} /></ng-map>`, {
    imports: [MapControlsComponent],
  });
  const map = await TestbedHarnessEnvironment.loader(fixture).getHarness(NgMapHarness);
  const [controls] = await map.getControls();
  return { fixture, controls, fake: getFakeMap(fixture) };
}

const ALL = '[showCompass]="true" [showLocate]="true" [showFullscreen]="true"';

describe('NgMapControlsHarness', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
    resetMapTesting();
  });

  it('zoomIn and zoomOut click the first and second buttons', async () => {
    const { controls, fake } = await setup(ALL);

    await controls.zoomIn();
    expect(fake.zoomTo).toHaveBeenLastCalledWith(6, { duration: 300 });

    await controls.zoomOut();
    expect(fake.zoomTo).toHaveBeenLastCalledWith(5, { duration: 300 });
    expect(fake.zoomTo).toHaveBeenCalledTimes(2);
  });

  it('resetNorth clicks the compass', async () => {
    const { controls, fake } = await setup(ALL);

    await controls.resetNorth();

    expect(fake.resetNorthPitch).toHaveBeenCalledWith({ duration: 300 });
  });

  it('locate requests the position and flies to it', async () => {
    let succeed: (position: unknown) => void = () => undefined;
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: { getCurrentPosition: (ok: (position: unknown) => void) => (succeed = ok) },
    });
    const { controls, fake } = await setup(ALL);

    await controls.locate();
    expect(await controls.isLocating()).toBe(true);

    succeed({ coords: { longitude: 7, latitude: 8 } });
    expect(await controls.isLocating()).toBe(false);
    expect(fake.flyTo).toHaveBeenCalledWith(expect.objectContaining({ center: [7, 8] }));
  });

  it('toggleFullscreen requests fullscreen on the map container', async () => {
    const { controls, fake } = await setup(ALL);

    expect(await controls.isFullscreen()).toBe(false);
    await controls.toggleFullscreen();

    expect(fake.getContainer().requestFullscreen).toHaveBeenCalledTimes(1);
  });

  it('finds the buttons by structure when some are hidden', async () => {
    const { controls, fake } = await setup(
      '[showZoom]="false" [showCompass]="true" [showFullscreen]="true"',
    );

    // The compass is now the first button: it is not taken for zoom in.
    await expect(controls.zoomIn()).rejects.toThrow();
    await expect(controls.zoomOut()).rejects.toThrow();
    await expect(controls.locate()).rejects.toThrow();

    await controls.resetNorth();
    await controls.toggleFullscreen();
    expect(fake.resetNorthPitch).toHaveBeenCalledTimes(1);
    expect(fake.getContainer().requestFullscreen).toHaveBeenCalledTimes(1);
    expect(fake.zoomTo).not.toHaveBeenCalled();
  });

  it('defaults to the zoom buttons only', async () => {
    const { fixture } = await setup('');
    // Also reachable straight from the fixture, without the map harness.
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const controls = await loader.getHarness(NgMapControlsHarness.with());

    await expect(controls.resetNorth()).rejects.toThrow();
    await expect(controls.toggleFullscreen()).rejects.toThrow();
    await expect(controls.zoomIn()).resolves.toBeUndefined();
  });
});
