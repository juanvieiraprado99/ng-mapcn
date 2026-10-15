import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadMap, reloadStyle, renderMap } from '../../../testing/render';
import { MapArcComponent } from '../map-arc/map-arc.component';
import { MapGeoJSONComponent } from '../map-geojson/map-geojson.component';
import { MapMarkerComponent } from '../map-marker/map-marker.component';
import { MapRouteComponent } from '../map-route/map-route.component';

const TEMPLATE = `
  <ng-map [fitBounds]="fit" [viewport]="viewport" (viewportChange)="viewportChange($event)">
    @for (m of markers; track m.id) {
      <ng-map-marker [longitude]="m.lng" [latitude]="m.lat" />
    }
    @if (route) {
      <ng-map-route [coordinates]="route" />
    }
    @if (geojson) {
      <ng-map-geojson [data]="geojson" />
    }
    @if (arcs) {
      <ng-map-arc [data]="arcs" />
    }
  </ng-map>
`;

const imports = [MapMarkerComponent, MapRouteComponent, MapGeoJSONComponent, MapArcComponent];

async function render(hostProps: Record<string, unknown> = {}) {
  const result = await renderMap(TEMPLATE, {
    imports,
    hostProps: {
      fit: {},
      viewport: undefined,
      viewportChange: vi.fn(),
      markers: [
        { id: 1, lng: 0, lat: 0 },
        { id: 2, lng: 10, lat: 20 },
      ],
      route: undefined,
      geojson: undefined,
      arcs: undefined,
      ...hostProps,
    },
  });
  return { ...result, map: result.map! };
}

/** Change detection plus the render hooks, where the fit runs. */
async function settle(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) {
  fixture.detectChanges();
  await fixture.whenStable();
}

async function loadAndSettle(fixture: any, map: any) {
  loadMap(map);
  await settle(fixture);
}

async function update(fixture: any, props: object) {
  Object.assign(fixture.componentInstance, props);
  await settle(fixture);
}

const lastFit = (map: { fitBounds: ReturnType<typeof vi.fn> }) =>
  map.fitBounds.mock.calls.at(-1) as [number[], Record<string, unknown>];

describe('ng-map [fitBounds]', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('waits for the map to load, then fits the children without animating', async () => {
    const { fixture, map } = await render({ fit: { padding: 48, maxZoom: 14 } });
    expect(map.fitBounds).not.toHaveBeenCalled();

    await loadAndSettle(fixture, map);

    expect(map.fitBounds).toHaveBeenCalledTimes(1);
    const [bounds, options] = lastFit(map);
    expect(bounds).toEqual([0, 0, 10, 20]);
    expect(options).toEqual({ padding: 48, maxZoom: 14, duration: 0 });
  });

  it('does nothing without the input or without data', async () => {
    const off = await render({ fit: undefined });
    await loadAndSettle(off.fixture, off.map);
    expect(off.map.fitBounds).not.toHaveBeenCalled();
    TestBed.resetTestingModule();

    const empty = await render({ markers: [] });
    await loadAndSettle(empty.fixture, empty.map);
    expect(empty.map.fitBounds).not.toHaveBeenCalled();
  });

  it('defaults maxZoom to 16', async () => {
    const { fixture, map } = await render();
    await loadAndSettle(fixture, map);
    expect(lastFit(map)[1]['maxZoom']).toBe(16);
  });

  it('uses explicit bounds instead of the children', async () => {
    const { fixture, map } = await render({
      fit: {
        bounds: [
          [-5, -6],
          [7, 8],
        ],
      },
    });
    await loadAndSettle(fixture, map);
    expect(lastFit(map)[0]).toEqual([-5, -6, 7, 8]);
  });

  it('refits (animated) when the data bounds change, and only then', async () => {
    const { fixture, map } = await render({ fit: { duration: 300 } });
    await loadAndSettle(fixture, map);
    expect(map.fitBounds).toHaveBeenCalledTimes(1);

    // Same bounds, new array identity: no refit.
    await update(fixture, {
      markers: [
        { id: 1, lng: 0, lat: 0 },
        { id: 2, lng: 10, lat: 20 },
      ],
    });
    await update(fixture, { fit: { duration: 300 } });
    expect(map.fitBounds).toHaveBeenCalledTimes(1);

    await update(fixture, {
      markers: [
        { id: 1, lng: 0, lat: 0 },
        { id: 2, lng: 30, lat: 20 },
      ],
    });
    expect(map.fitBounds).toHaveBeenCalledTimes(2);
    const [bounds, options] = lastFit(map);
    expect(bounds).toEqual([0, 0, 30, 20]);
    expect(options['duration']).toBe(300);
  });

  it('animate: false jumps even on refits', async () => {
    const { fixture, map } = await render({ fit: { animate: false } });
    await loadAndSettle(fixture, map);
    await update(fixture, { markers: [{ id: 1, lng: 5, lat: 5 }] });
    expect(map.fitBounds).toHaveBeenCalledTimes(2);
    expect(lastFit(map)[1]['duration']).toBe(0);
  });

  it('unions markers, routes, GeoJSON and arcs', async () => {
    const { fixture, map } = await render({
      route: [
        [-20, 1],
        [2, 2],
      ],
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [1, 1],
            [2, -30],
            [3, 1],
            [1, 1],
          ],
        ],
      },
      arcs: [{ id: 'a', from: [0, 0], to: [40, 5] }],
    });
    await loadAndSettle(fixture, map);
    expect(lastFit(map)[0]).toEqual([-20, -30, 40, 20]);
  });

  it('fits the unwrapped curve of an antimeridian arc, not a world-spanning box', async () => {
    const { fixture, map } = await render({
      markers: [],
      arcs: [{ id: 'a', from: [170, 0], to: [-170, 0] }],
    });
    await loadAndSettle(fixture, map);
    const [w, s, e, n] = lastFit(map)[0];
    expect(w).toBe(170);
    expect(e).toBe(190);
    // The curve bulges away from the straight line, so the box has height.
    expect(Math.abs(n - s)).toBeGreaterThan(0);
  });

  it('refits when a child appears or disappears', async () => {
    const { fixture, map } = await render();
    await loadAndSettle(fixture, map);

    await update(fixture, {
      route: [
        [50, 50],
        [51, 51],
      ],
    });
    expect(lastFit(map)[0]).toEqual([0, 0, 51, 51]);

    await update(fixture, { route: undefined });
    expect(lastFit(map)[0]).toEqual([0, 0, 10, 20]);
  });

  it('does not refit after a theme style reload with the same bounds', async () => {
    const { fixture, map } = await render();
    await loadAndSettle(fixture, map);

    map.setStyle({ version: 8, sources: {}, layers: [] });
    reloadStyle(fixture, map);
    await settle(fixture);

    expect(map.fitBounds).toHaveBeenCalledTimes(1);
  });

  it('does not feed back through a controlled viewport', async () => {
    const viewport = { center: [1, 1] as [number, number], zoom: 3, bearing: 0, pitch: 0 };
    const { fixture, map, host } = await (async () => {
      const r = await render({ viewport });
      return { ...r, host: r.fixture.componentInstance };
    })();
    await loadAndSettle(fixture, map);
    map.jumpTo.mockClear();

    // The consumer follows viewportChange, as a controlled viewport does.
    const emitted = host.viewportChange.mock.calls.map((c: unknown[]) => c[0]);
    expect(emitted.length).toBeGreaterThan(0);
    await update(fixture, { viewport: emitted.at(-1) });

    expect(map.jumpTo).not.toHaveBeenCalled();
    expect(map.fitBounds).toHaveBeenCalledTimes(1);
  });

  describe('MapContextService.fitBounds()', () => {
    it('returns false before load and fits explicit or data bounds after', async () => {
      const { fixture, map, ctx } = await render({ fit: undefined });
      expect(ctx.fitBounds()).toBe(false);

      await loadAndSettle(fixture, map);
      expect(ctx.fitBounds({ padding: 10 })).toBe(true);
      expect(lastFit(map)[0]).toEqual([0, 0, 10, 20]);
      expect(lastFit(map)[1]).toEqual({ padding: 10, maxZoom: 16 });

      expect(ctx.fitBounds({ bounds: [1, 2, 3, 4], animate: false })).toBe(true);
      expect(lastFit(map)[0]).toEqual([1, 2, 3, 4]);
      expect(lastFit(map)[1]['duration']).toBe(0);
    });

    it('returns false when there are no bounds', async () => {
      const { fixture, map, ctx } = await render({ fit: undefined, markers: [] });
      await loadAndSettle(fixture, map);
      expect(ctx.fitBounds()).toBe(false);
    });
  });
});
