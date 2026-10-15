import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  loadAndSettle,
  reloadStyle,
  renderMap,
  structuralCalls,
  update,
} from '../../../testing/render';
import { MapImageOverlayComponent } from './map-image-overlay.component';

const TEMPLATE = `
  <ng-map [theme]="theme" (mapError)="mapError($event)">
    @if (show) {
      <ng-map-image-overlay
        [id]="id"
        [url]="url"
        [coordinates]="coordinates"
        [opacity]="opacity"
        [visible]="visible"
        [beforeId]="beforeId"
        [paint]="paint"
      />
    }
  </ng-map>
`;

const CORNERS = [
  [-80, 25],
  [-70, 25],
  [-70, 20],
  [-80, 20],
];

type Host = Record<string, any> & { mapError: ReturnType<typeof vi.fn> };

async function render(hostProps: Record<string, unknown> = {}) {
  const host: Host = {
    theme: 'light',
    show: true,
    id: 'floor',
    url: 'https://example.com/plan.png',
    coordinates: CORNERS,
    opacity: 1,
    visible: true,
    beforeId: undefined,
    paint: undefined,
    mapError: vi.fn(),
    ...hostProps,
  };
  const result = await renderMap(TEMPLATE, {
    imports: [MapImageOverlayComponent],
    hostProps: host,
  });
  return { ...result, map: result.map!, host };
}

async function renderLoaded(hostProps: Record<string, unknown> = {}) {
  const result = await render(hostProps);
  loadAndSettle(result.fixture, result.map);
  return result;
}

const SOURCE = 'floor';
const LAYER = 'image-layer-floor';

describe('MapImageOverlayComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.documentElement.className = '';
    TestBed.resetTestingModule();
  });

  it('adds the image source then the raster layer once loaded', async () => {
    const { fixture, map, ctx } = await render();
    expect(structuralCalls(map)).toEqual([]);

    loadAndSettle(fixture, map);

    expect(structuralCalls(map)).toEqual([`addSource:${SOURCE}`, `addLayer:${LAYER}`]);
    expect(map.getSource(SOURCE)).toMatchObject({
      type: 'image',
      url: 'https://example.com/plan.png',
      coordinates: CORNERS,
    });
    expect(map.getLayer(LAYER)).toMatchObject({
      type: 'raster',
      source: SOURCE,
      paint: { 'raster-opacity': 1 },
      layout: { visibility: 'visible' },
    });
    expect(ctx.hasSource(SOURCE)).toBe(true);
  });

  it('generates an id when none is given', async () => {
    const { fixture, map } = await render({ id: undefined });
    loadAndSettle(fixture, map);

    expect(map.calls.find((c) => c.startsWith('addSource:'))).toMatch(
      /^addSource:ng-image-overlay-\d+$/,
    );
  });

  it('re-adds source and layer after a theme switch', async () => {
    const { fixture, map, ctx } = await renderLoaded({ opacity: 0.5 });

    update(fixture, { theme: 'dark' });
    expect(ctx.hasSource(SOURCE)).toBe(false);
    reloadStyle(fixture, map);

    expect(ctx.hasSource(SOURCE)).toBe(true);
    expect(map.getLayerOrder()).toEqual([LAYER]);
    expect(map.getLayer(LAYER).paint['raster-opacity']).toBe(0.5);
    expect(structuralCalls(map).filter((c) => c === `addSource:${SOURCE}`)).toHaveLength(2);
  });

  it('honors beforeId at creation only', async () => {
    const { fixture, map } = await render({ beforeId: 'base' });
    map.addLayer({ id: 'base', type: 'background' } as never);
    loadAndSettle(fixture, map);

    expect(map.getLayerOrder()).toEqual([LAYER, 'base']);
    map.calls.length = 0;
    update(fixture, { beforeId: 'other' });
    expect(structuralCalls(map)).toEqual([]);
  });

  describe('reconcile, do not recreate (invariant 2)', () => {
    it('does nothing for an equal url and equal-by-value coordinates', async () => {
      const { fixture, map } = await renderLoaded();
      const source = map.getSource(SOURCE);

      update(fixture, {
        coordinates: CORNERS.map((c) => [...c]),
        url: 'https://example.com/plan.png',
      });

      expect(source.updateImage).not.toHaveBeenCalled();
      expect(source.setCoordinates).not.toHaveBeenCalled();
    });

    it('moves the corners with setCoordinates', async () => {
      const { fixture, map } = await renderLoaded();
      const source = map.getSource(SOURCE);
      const moved = [
        [-60, 25],
        [-50, 25],
        [-50, 20],
        [-60, 20],
      ];

      update(fixture, { coordinates: moved });

      expect(source.setCoordinates).toHaveBeenCalledWith(moved);
      expect(source.updateImage).not.toHaveBeenCalled();
      expect(structuralCalls(map)).toEqual([`addSource:${SOURCE}`, `addLayer:${LAYER}`]);
    });

    it('swaps the image with updateImage, carrying the coordinates', async () => {
      const { fixture, map } = await renderLoaded();
      const source = map.getSource(SOURCE);

      update(fixture, { url: 'https://example.com/plan-2.png' });

      expect(source.updateImage).toHaveBeenCalledTimes(1);
      expect(source.updateImage).toHaveBeenCalledWith({
        url: 'https://example.com/plan-2.png',
        coordinates: CORNERS,
      });
      expect(source.setCoordinates).not.toHaveBeenCalled();
    });

    it('updates opacity, visibility and paint on the layer', async () => {
      const { fixture, map } = await renderLoaded();
      map.calls.length = 0;

      update(fixture, { opacity: 0.2, visible: false, paint: { 'raster-fade-duration': 0 } });

      expect(map.setPaintProperty).toHaveBeenCalledWith(LAYER, 'raster-opacity', 0.2);
      expect(map.setPaintProperty).toHaveBeenCalledWith(LAYER, 'raster-fade-duration', 0);
      expect(map.setLayoutProperty).toHaveBeenCalledWith(LAYER, 'visibility', 'none');
      expect(structuralCalls(map)).toEqual([]);
    });
  });

  it('removes the layer before the source and releases the registry', async () => {
    const { fixture, map, ctx } = await renderLoaded();
    map.calls.length = 0;

    update(fixture, { show: false });

    expect(structuralCalls(map)).toEqual([`removeLayer:${LAYER}`, `removeSource:${SOURCE}`]);
    expect(ctx.hasSource(SOURCE)).toBe(false);
  });

  it('does not throw when teardown fails', async () => {
    const { fixture, map } = await renderLoaded();
    vi.spyOn(map, 'removeLayer').mockImplementation(() => {
      throw new Error('style reloading');
    });

    expect(() => update(fixture, { show: false })).not.toThrow();
  });

  it('reports a duplicate id through mapError without throwing', async () => {
    const { fixture, map, ctx, host } = await render();
    map.addSource(SOURCE, { type: 'image', url: 'owner', coordinates: [] } as never);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => loadAndSettle(fixture, map)).not.toThrow();

    expect(host.mapError.mock.calls[0][0].message).toContain('already exists');
    expect(map.getSource(SOURCE).url).toBe('owner');
    expect(ctx.hasSource(SOURCE)).toBe(false);
  });

  it('re-creates source and layer when the id changes', async () => {
    const { fixture, map } = await renderLoaded({ id: 'a' });

    update(fixture, { id: 'b' });

    expect(map.getSource('a')).toBeUndefined();
    expect(map.getLayerOrder()).toEqual(['image-layer-b']);
  });
});
