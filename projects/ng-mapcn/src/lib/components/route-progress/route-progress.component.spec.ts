import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  loadAndSettle,
  reloadStyle,
  renderMap,
  structuralCalls,
  update,
} from '../../../testing/render';
import { MapRouteComponent } from '../map-route/map-route.component';
import { RouteProgressComponent } from './route-progress.component';

const TEMPLATE = `
  <ng-map [theme]="theme">
    <ng-map-route id="r1" [coordinates]="coordinates" [progress]="progress" [width]="width" [beforeId]="beforeId">
      @if (showProgress) {
        <ng-route-progress [color]="color" [width]="progressWidth" [opacity]="opacity" [dashArray]="dashArray" />
      }
    </ng-map-route>
  </ng-map>
`;

const COORDS: [number, number][] = [
  [0, 0],
  [2, 0],
];

const SOURCE = 'r1-layer-progress';
const LAYER = 'r1-layer-progress-layer';

async function renderLoaded(hostProps: Record<string, unknown> = {}) {
  const host = {
    theme: 'light',
    coordinates: COORDS,
    progress: 0.5,
    width: 4,
    beforeId: undefined,
    showProgress: true,
    color: '#22c55e',
    progressWidth: undefined,
    opacity: 1,
    dashArray: undefined,
    ...hostProps,
  };
  const result = await renderMap(TEMPLATE, {
    imports: [MapRouteComponent, RouteProgressComponent],
    hostProps: host,
  });
  const map = result.map!;
  loadAndSettle(result.fixture, map);
  result.fixture.detectChanges();
  return { ...result, map };
}

describe('RouteProgressComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.documentElement.className = '';
    TestBed.resetTestingModule();
  });

  it('adds a second source/layer above the route with the covered part of the line', async () => {
    const { map } = await renderLoaded();

    expect(map.getLayerOrder()).toEqual(['r1-layer', LAYER]);
    const data = map.getSource(SOURCE).data;
    expect(data.features).toHaveLength(1);
    const coords = data.features[0].geometry.coordinates;
    expect(coords).toHaveLength(2);
    expect(coords[1][0]).toBeCloseTo(1, 6);
    const paint = map.getLayer(LAYER).paint;
    expect(paint['line-color']).toBe('#22c55e');
    expect(paint['line-width']).toBe(4); // inherits the route width
    expect(paint['line-opacity']).toBe(1);
  });

  it('stays below beforeId together with the route', async () => {
    const { fixture, map } = await renderMap(TEMPLATE, {
      imports: [MapRouteComponent, RouteProgressComponent],
      hostProps: { coordinates: COORDS, progress: 0.5, showProgress: true, beforeId: 'base-layer' },
    });
    map!.addSource('base', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map!.addLayer({ id: 'base-layer', type: 'line', source: 'base' });
    loadAndSettle(fixture, map!);
    fixture.detectChanges();

    expect(map!.getLayerOrder()).toEqual(['r1-layer', LAYER, 'base-layer']);
  });

  it('draws nothing at progress 0 / without progress', async () => {
    const { map } = await renderLoaded({ progress: 0 });
    expect(map.getSource(SOURCE).data.features).toEqual([]);
  });

  it('updates the data with setData on progress change, without recreating', async () => {
    const { fixture, map } = await renderLoaded();
    const setData = map.getSource(SOURCE).setData;
    setData.mockClear();
    map.calls.length = 0;

    update(fixture, { progress: 1 });
    fixture.detectChanges();

    expect(setData).toHaveBeenCalledTimes(1);
    expect(setData.mock.calls[0][0].features[0].geometry.coordinates).toEqual(COORDS);
    expect(structuralCalls(map)).toEqual([]);
  });

  it('updates the data when coordinates change', async () => {
    const { fixture, map } = await renderLoaded();
    const setData = map.getSource(SOURCE).setData;
    setData.mockClear();

    update(fixture, {
      coordinates: [
        [0, 0],
        [0, 4],
      ],
    });
    fixture.detectChanges();

    const coords = setData.mock.calls.at(-1)![0].features[0].geometry.coordinates;
    expect(coords[1][1]).toBeCloseTo(2, 6);
  });

  it('reconciles paint with setPaintProperty only', async () => {
    const { fixture, map } = await renderLoaded();
    map.setPaintProperty.mockClear();
    map.calls.length = 0;

    update(fixture, { color: '#ff0000', progressWidth: 7, opacity: 0.5, dashArray: [2, 2] });
    fixture.detectChanges();

    expect(map.setPaintProperty).toHaveBeenCalledWith(LAYER, 'line-color', '#ff0000');
    expect(map.setPaintProperty).toHaveBeenCalledWith(LAYER, 'line-width', 7);
    expect(map.setPaintProperty).toHaveBeenCalledWith(LAYER, 'line-opacity', 0.5);
    expect(map.setPaintProperty).toHaveBeenCalledWith(LAYER, 'line-dasharray', [2, 2]);
    expect(structuralCalls(map)).toEqual([]);
  });

  it('re-adds the progress layer after a theme switch', async () => {
    const { fixture, map } = await renderLoaded();

    update(fixture, { theme: 'dark' });
    expect(map.getLayer(LAYER)).toBeUndefined();
    reloadStyle(fixture, map);
    fixture.detectChanges();

    expect(map.getLayerOrder()).toEqual(['r1-layer', LAYER]);
    expect(structuralCalls(map).filter((c) => c === `addLayer:${LAYER}`)).toHaveLength(2);
  });

  it('removes its layer before its source when destroyed', async () => {
    const { fixture, map } = await renderLoaded();
    map.calls.length = 0;

    update(fixture, { showProgress: false });
    fixture.detectChanges();

    expect(structuralCalls(map)).toEqual([`removeLayer:${LAYER}`, `removeSource:${SOURCE}`]);
    expect(map.getLayer('r1-layer')).toBeDefined();
  });
});
