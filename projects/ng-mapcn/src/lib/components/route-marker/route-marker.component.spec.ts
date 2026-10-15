import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeRegistry } from '../../../testing/maplibre-fake';
import { renderMap, update } from '../../../testing/render';
import { MapRouteComponent } from '../map-route/map-route.component';
import { MarkerContentComponent } from '../marker-content/marker-content.component';
import { RouteMarkerComponent } from './route-marker.component';

const TEMPLATE = `
  <ng-map>
    <ng-map-route [coordinates]="coordinates" [progress]="progress">
      @if (show) {
        <ng-route-marker [at]="at">
          <ng-marker-content><span class="truck">truck</span></ng-marker-content>
        </ng-route-marker>
      }
    </ng-map-route>
  </ng-map>
`;

const COORDS: [number, number][] = [
  [0, 0],
  [1, 0],
  [4, 0],
];

async function render(hostProps: Record<string, unknown> = {}) {
  const result = await renderMap(TEMPLATE, {
    imports: [MapRouteComponent, RouteMarkerComponent, MarkerContentComponent],
    hostProps: { coordinates: COORDS, progress: 0.5, at: 'start', show: true, ...hostProps },
  });
  result.fixture.detectChanges();
  return result;
}

function lngLat(): [number, number] {
  const ll = fakeRegistry.markers[0].getLngLat();
  return [ll.lng, ll.lat];
}

describe('RouteMarkerComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.documentElement.className = '';
    TestBed.resetTestingModule();
  });

  it('places the marker at the start and projects its content', async () => {
    await render({ at: 'start' });

    expect(fakeRegistry.markers).toHaveLength(1);
    expect(lngLat()).toEqual([0, 0]);
    expect(fakeRegistry.markers[0].getElement().querySelector('.truck')?.textContent).toBe('truck');
    expect(fakeRegistry.markers[0].map).toBe(fakeRegistry.maps[0]);
  });

  it('places the marker at the end', async () => {
    await render({ at: 'end' });
    expect(lngLat()).toEqual([4, 0]);
  });

  it('places the marker at progress and moves it with setLngLat, without recreating', async () => {
    const { fixture } = await render({ at: 'progress', progress: 0.5 });
    expect(lngLat()[0]).toBeCloseTo(2, 6);
    const marker = fakeRegistry.markers[0];
    marker.calls.length = 0;

    update(fixture, { progress: 1 });
    fixture.detectChanges();

    expect(fakeRegistry.markers).toHaveLength(1);
    expect(lngLat()).toEqual([4, 0]);
    expect(marker.calls).toEqual(['setLngLat']);
  });

  it('treats a missing progress as 0', async () => {
    await render({ at: 'progress', progress: undefined });
    expect(lngLat()).toEqual([0, 0]);
  });

  it('places the marker at a numeric fraction', async () => {
    const { fixture } = await render({ at: 0.125 });
    expect(lngLat()[0]).toBeCloseTo(0.5, 6);

    update(fixture, { at: 0.5 });
    fixture.detectChanges();
    expect(lngLat()[0]).toBeCloseTo(2, 6);
    expect(fakeRegistry.markers).toHaveLength(1);
  });

  it('follows coordinate changes', async () => {
    const { fixture } = await render({ at: 'end' });

    update(fixture, {
      coordinates: [
        [10, 10],
        [20, 10],
      ],
    });
    fixture.detectChanges();

    expect(lngLat()).toEqual([20, 10]);
    expect(fakeRegistry.markers).toHaveLength(1);
  });

  it('creates no marker while the route has no coordinates, then creates it once', async () => {
    const { fixture } = await render({ coordinates: [] });
    expect(fakeRegistry.markers).toHaveLength(0);

    update(fixture, { coordinates: COORDS });
    fixture.detectChanges();
    expect(fakeRegistry.markers).toHaveLength(1);
  });

  it('removes the marker when destroyed', async () => {
    const { fixture } = await render();
    const marker = fakeRegistry.markers[0];

    update(fixture, { show: false });
    fixture.detectChanges();

    expect(marker.calls).toContain('remove');
    expect(marker.map).toBeNull();
  });
});
