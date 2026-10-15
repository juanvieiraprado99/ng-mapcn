import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeRegistry } from '../../../testing/maplibre-fake';
import {
  loadAndSettle,
  reloadStyle,
  renderMap,
  structuralCalls,
  update,
} from '../../../testing/render';
import { MapRouteComponent } from './map-route.component';

const TEMPLATE = `
  <ng-map [theme]="theme">
    @if (show) {
      <ng-map-route
        [coordinates]="coordinates"
        [id]="id"
        [color]="color"
        [width]="width"
        [opacity]="opacity"
        [dashArray]="dashArray"
        [interactive]="interactive"
        [beforeId]="beforeId"
        [active]="active"
        [activeColor]="activeColor"
        [activeWidth]="activeWidth"
        [activeOpacity]="activeOpacity"
        [activeDashArray]="activeDashArray"
        (routeClick)="routeClick($event)"
        (routeMouseEnter)="routeMouseEnter($event)"
        (routeMouseLeave)="routeMouseLeave($event)"
      />
    }
  </ng-map>
`;

const COORDS: [number, number][] = [
  [0, 0],
  [1, 1],
];

function hostDefaults(): Record<string, any> {
  return {
    theme: 'light',
    show: true,
    coordinates: COORDS,
    id: 'r1',
    color: '#4285F4',
    width: 3,
    opacity: 0.8,
    dashArray: undefined,
    interactive: true,
    beforeId: undefined,
    active: false,
    activeColor: undefined,
    activeWidth: undefined,
    activeOpacity: undefined,
    activeDashArray: undefined,
    routeClick: vi.fn(),
    routeMouseEnter: vi.fn(),
    routeMouseLeave: vi.fn(),
  };
}

async function render(hostProps: Record<string, unknown> = {}) {
  const host = { ...hostDefaults(), ...hostProps };
  const result = await renderMap(TEMPLATE, { imports: [MapRouteComponent], hostProps: host });
  return { ...result, map: result.map!, host };
}

async function renderLoaded(hostProps: Record<string, unknown> = {}) {
  const result = await render(hostProps);
  loadAndSettle(result.fixture, result.map);
  return result;
}

const SOURCE = 'r1';
const LAYER = 'r1-layer';

describe('MapRouteComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.documentElement.className = '';
    TestBed.resetTestingModule();
  });

  describe('gating (invariant 1)', () => {
    it('adds nothing before the map is loaded and adds the source before the layer after', async () => {
      const { fixture, map, ctx } = await render();

      expect(ctx.isLoaded()).toBe(false);
      expect(structuralCalls(map)).toEqual([]);
      expect(map.getSource(SOURCE)).toBeUndefined();

      loadAndSettle(fixture, map);

      expect(ctx.isLoaded()).toBe(true);
      expect(structuralCalls(map)).toEqual([`addSource:${SOURCE}`, `addLayer:${LAYER}`]);
      expect(map.getLayer(LAYER)).toBeDefined();
    });

    it('generates an ng-route-N id when none is given', async () => {
      const { fixture, map } = await render({ id: undefined });
      loadAndSettle(fixture, map);

      const [source, layer] = structuralCalls(map);
      const match = /^addSource:(ng-route-\d+)$/.exec(source);
      expect(match).not.toBeNull();
      expect(layer).toBe(`addLayer:${match![1]}-layer`);
    });
  });

  describe('re-add after theme switch (invariant 1)', () => {
    it('re-adds the source and layer exactly once after setStyle', async () => {
      const { fixture, map, ctx } = await renderLoaded();
      expect(structuralCalls(map)).toHaveLength(2);

      update(fixture, { theme: 'dark' });

      expect(map.setStyle).toHaveBeenCalled();
      expect(ctx.isLoaded()).toBe(false);
      expect(map.getSource(SOURCE)).toBeUndefined();
      expect(map.getLayer(LAYER)).toBeUndefined();

      reloadStyle(fixture, map);

      expect(ctx.isLoaded()).toBe(true);
      expect(map.getSource(SOURCE)).toBeDefined();
      expect(map.getLayerOrder().filter((id) => id === LAYER)).toHaveLength(1);
      expect(structuralCalls(map).filter((c) => c === `addSource:${SOURCE}`)).toHaveLength(2);
      expect(structuralCalls(map).filter((c) => c === `addLayer:${LAYER}`)).toHaveLength(2);
    });
  });

  describe('initial definition', () => {
    it('uses round join/cap and the paint inputs, without a dasharray by default', async () => {
      const { map } = await renderLoaded({ color: '#ff0000', width: 5, opacity: 0.5 });

      const layer = map.getLayer(LAYER);
      expect(layer.type).toBe('line');
      expect(layer.source).toBe(SOURCE);
      expect(layer.layout).toEqual({ 'line-join': 'round', 'line-cap': 'round' });
      expect(layer.paint['line-color']).toBe('#ff0000');
      expect(layer.paint['line-width']).toBe(5);
      expect(layer.paint['line-opacity']).toBe(0.5);
    });

    it('seeds the source with a LineString feature', async () => {
      const { map } = await renderLoaded();

      expect(map.getSource(SOURCE).data).toEqual({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: COORDS },
        properties: {},
      });
    });

    it('applies line-dasharray at creation when dashArray is set', async () => {
      const { fixture, map } = await render({ dashArray: [2, 4] });
      loadAndSettle(fixture, map);

      expect(map.getLayer(LAYER).paint['line-dasharray']).toEqual([2, 4]);
    });

    it('does not put line-dasharray in the added layer when unset', async () => {
      const { map } = await renderLoaded();

      // The reconciling effect sets it to undefined afterwards ("clears the pattern").
      expect(map.getLayer(LAYER).paint['line-dasharray']).toBeUndefined();
    });
  });

  describe('reconcile, do not recreate (invariant 2)', () => {
    it('pushes new coordinates through setData as a LineString feature', async () => {
      const { fixture, map } = await renderLoaded();
      const setData = map.getSource(SOURCE).setData;
      setData.mockClear();
      map.calls.length = 0;
      const next: [number, number][] = [
        [5, 5],
        [6, 6],
        [7, 7],
      ];

      update(fixture, { coordinates: next });

      expect(setData).toHaveBeenCalledTimes(1);
      expect(setData).toHaveBeenCalledWith({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: next },
        properties: {},
      });
      expect(structuralCalls(map)).toEqual([]);
    });

    it('updates color, width, opacity and dashArray with setPaintProperty only', async () => {
      const { fixture, map } = await renderLoaded();
      map.setPaintProperty.mockClear();
      map.calls.length = 0;

      update(fixture, { color: '#00ff00', width: 9, opacity: 0.2, dashArray: [1, 2] });

      expect(map.setPaintProperty).toHaveBeenCalledWith(LAYER, 'line-color', '#00ff00');
      expect(map.setPaintProperty).toHaveBeenCalledWith(LAYER, 'line-width', 9);
      expect(map.setPaintProperty).toHaveBeenCalledWith(LAYER, 'line-opacity', 0.2);
      expect(map.setPaintProperty).toHaveBeenCalledWith(LAYER, 'line-dasharray', [1, 2]);
      expect(structuralCalls(map)).toEqual([]);
      expect(fakeRegistry.maps[0].getSource(SOURCE)).toBeDefined();
    });

    it('moves the source and layer to the new ids when [id] changes, and keeps updating', async () => {
      const { fixture, map } = await renderLoaded();
      map.calls.length = 0;

      update(fixture, { id: 'r2' });

      expect(structuralCalls(map)).toEqual([
        `removeLayer:${LAYER}`,
        `removeSource:${SOURCE}`,
        'addSource:r2',
        'addLayer:r2-layer',
      ]);
      expect(map.listenerCount('click', LAYER)).toBe(0);
      expect(map.listenerCount('click', 'r2-layer')).toBe(1);

      const next: [number, number][] = [
        [8, 8],
        [9, 9],
      ];
      update(fixture, { coordinates: next, color: '#123456' });
      expect(map.getSource('r2').setData).toHaveBeenLastCalledWith(
        expect.objectContaining({ geometry: { type: 'LineString', coordinates: next } }),
      );
      expect(map.getLayer('r2-layer').paint['line-color']).toBe('#123456');
    });

    it('binds and unbinds handlers when [interactive] toggles, without re-adding the layer', async () => {
      const { fixture, map } = await renderLoaded({ interactive: false });
      map.calls.length = 0;

      update(fixture, { interactive: true });
      expect(map.listenerCount('click', LAYER)).toBe(1);
      expect(map.listenerCount('mouseenter', LAYER)).toBe(1);

      update(fixture, { interactive: false });
      expect(map.listenerCount('click', LAYER)).toBe(0);
      expect(map.listenerCount('mouseleave', LAYER)).toBe(0);
      expect(structuralCalls(map)).toEqual([]);
    });

    it('clears the dash pattern when dashArray goes back to undefined', async () => {
      const { fixture, map } = await renderLoaded({ dashArray: [2, 4] });
      map.setPaintProperty.mockClear();

      update(fixture, { dashArray: undefined });

      expect(map.setPaintProperty).toHaveBeenCalledWith(LAYER, 'line-dasharray', undefined);
      expect(map.getLayer(LAYER).paint['line-dasharray']).toBeUndefined();
    });
  });

  describe('teardown (invariant 4)', () => {
    it('removes the layer before the source and unregisters every handler', async () => {
      const { fixture, map } = await renderLoaded();
      expect(map.listenerCount('click', LAYER)).toBe(1);
      expect(map.listenerCount('mouseenter', LAYER)).toBe(1);
      expect(map.listenerCount('mouseleave', LAYER)).toBe(1);
      map.calls.length = 0;

      update(fixture, { show: false });

      expect(structuralCalls(map)).toEqual([`removeLayer:${LAYER}`, `removeSource:${SOURCE}`]);
      expect(map.listenerCount('click', LAYER)).toBe(0);
      expect(map.listenerCount('mouseenter', LAYER)).toBe(0);
      expect(map.listenerCount('mouseleave', LAYER)).toBe(0);
      expect(map.getSource(SOURCE)).toBeUndefined();
    });

    it('does not throw when the whole fixture is destroyed', async () => {
      const { fixture } = await renderLoaded();
      expect(() => fixture.destroy()).not.toThrow();
    });
  });

  describe('interaction', () => {
    it('emits routeClick when the layer is clicked', async () => {
      const { map, host } = await renderLoaded();
      const payload = { lngLat: { lng: 1, lat: 2 }, point: { x: 3, y: 4 } };

      map.fire('click', payload, LAYER);

      expect(host['routeClick']).toHaveBeenCalledTimes(1);
      expect(host['routeClick'].mock.calls[0][0]).toMatchObject(payload);
    });

    it('sets the pointer cursor on mouseenter and clears it on mouseleave', async () => {
      const { map } = await renderLoaded();

      map.fire('mouseenter', {}, LAYER);
      expect(map.getCanvas().style.cursor).toBe('pointer');

      map.fire('mouseleave', {}, LAYER);
      expect(map.getCanvas().style.cursor).toBe('');
    });
  });

  describe('beforeId', () => {
    it('inserts the layer below beforeId', async () => {
      const { fixture, map } = await render({ beforeId: 'base-layer' });
      map.addSource('base', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'base-layer', type: 'line', source: 'base' });

      loadAndSettle(fixture, map);

      expect(map.getLayerOrder()).toEqual([LAYER, 'base-layer']);
    });

    it('reports an unknown beforeId through mapError path without leaving a source behind', async () => {
      const { fixture, map } = await render({ beforeId: 'missing' });
      vi.spyOn(console, 'error').mockImplementation(() => {});
      loadAndSettle(fixture, map);

      expect(map.getLayer(LAYER)).toBeUndefined();
      expect(map.getSource(SOURCE)).toBeUndefined();
    });
  });

  describe('hover outputs', () => {
    it('emits routeMouseEnter / routeMouseLeave and keeps the cursor handling', async () => {
      const { map, host } = await renderLoaded();
      const payload = { lngLat: { lng: 1, lat: 2 }, point: { x: 3, y: 4 } };

      map.fire('mouseenter', payload, LAYER);
      expect(host['routeMouseEnter']).toHaveBeenCalledTimes(1);
      expect(host['routeMouseEnter'].mock.calls[0][0]).toMatchObject(payload);
      expect(map.getCanvas().style.cursor).toBe('pointer');

      map.fire('mouseleave', payload, LAYER);
      expect(host['routeMouseLeave']).toHaveBeenCalledTimes(1);
      expect(map.getCanvas().style.cursor).toBe('');
    });

    it('stops emitting after teardown and leaves no listeners', async () => {
      const { fixture, map, host } = await renderLoaded();

      update(fixture, { show: false });
      map.fire('mouseenter', {}, LAYER);

      expect(host['routeMouseEnter']).not.toHaveBeenCalled();
      expect(map.listenerCount('mouseenter', LAYER)).toBe(0);
      expect(map.listenerCount('mouseleave', LAYER)).toBe(0);
    });
  });

  describe('active state', () => {
    it('applies the active paint over the base paint without recreating the layer', async () => {
      const { fixture, map } = await renderLoaded({
        activeColor: '#ff0000',
        activeWidth: 8,
        activeOpacity: 1,
        activeDashArray: [1, 1],
      });
      map.setPaintProperty.mockClear();
      map.calls.length = 0;

      update(fixture, { active: true });

      expect(map.setPaintProperty).toHaveBeenCalledWith(LAYER, 'line-color', '#ff0000');
      expect(map.setPaintProperty).toHaveBeenCalledWith(LAYER, 'line-width', 8);
      expect(map.setPaintProperty).toHaveBeenCalledWith(LAYER, 'line-opacity', 1);
      expect(map.setPaintProperty).toHaveBeenCalledWith(LAYER, 'line-dasharray', [1, 1]);
      expect(structuralCalls(map)).toEqual([]);

      update(fixture, { active: false });
      expect(map.getLayer(LAYER).paint['line-color']).toBe('#4285F4');
      expect(map.getLayer(LAYER).paint['line-width']).toBe(3);
      expect(map.getLayer(LAYER).paint['line-opacity']).toBe(0.8);
      expect(map.getLayer(LAYER).paint['line-dasharray']).toBeUndefined();
      expect(structuralCalls(map)).toEqual([]);
    });

    it('falls back to the base value for unset active* inputs', async () => {
      const { fixture, map } = await renderLoaded({ activeWidth: 10 });

      update(fixture, { active: true });

      expect(map.getLayer(LAYER).paint['line-width']).toBe(10);
      expect(map.getLayer(LAYER).paint['line-color']).toBe('#4285F4');
      expect(map.getLayer(LAYER).paint['line-opacity']).toBe(0.8);
    });

    it('creates the layer with the active paint when active from the start', async () => {
      const { fixture, map } = await render({ active: true, activeColor: '#00ff00' });
      loadAndSettle(fixture, map);

      expect(map.getLayer(LAYER).paint['line-color']).toBe('#00ff00');
    });
  });

  describe('non-interactive', () => {
    it('registers no layer-scoped handlers when interactive is false', async () => {
      const { map, host } = await renderLoaded({ interactive: false });

      expect(map.getLayer(LAYER)).toBeDefined();
      expect(map.calls.filter((c) => c.startsWith('on:'))).not.toContainEqual(
        expect.stringContaining(LAYER),
      );
      expect(map.listenerCount('click', LAYER)).toBe(0);
      expect(map.listenerCount('mouseenter', LAYER)).toBe(0);
      expect(map.listenerCount('mouseleave', LAYER)).toBe(0);

      map.fire('click', {}, LAYER);
      expect(host['routeClick']).not.toHaveBeenCalled();
    });
  });
  describe('no redundant updates', () => {
    it('does not setData with the data the source was just created with', async () => {
      const { fixture, map } = await renderLoaded();
      expect(map.getSource(SOURCE).setData).not.toHaveBeenCalled();

      update(fixture, { theme: 'dark' });
      reloadStyle(fixture, map);

      expect(map.getSource(SOURCE).setData).not.toHaveBeenCalled();
    });
  });

  describe('id collision', () => {
    const DUP_TEMPLATE = `
      <ng-map (mapError)="mapError($event)">
        <ng-map-route id="dup" [coordinates]="coordinates" color="#111111" />
        @if (showSecond) {
          <ng-map-route id="dup" [coordinates]="coordinates" [color]="secondColor" (routeClick)="routeClick($event)" />
        }
      </ng-map>
    `;

    async function renderDuplicate() {
      const host = {
        coordinates: COORDS,
        showSecond: true,
        secondColor: '#222222',
        mapError: vi.fn(),
        routeClick: vi.fn(),
      };
      const result = await renderMap(DUP_TEMPLATE, {
        imports: [MapRouteComponent],
        hostProps: host,
      });
      return { ...result, map: result.map!, host };
    }

    it('reports the failure through mapError instead of breaking change detection', async () => {
      const { fixture, map, host } = await renderDuplicate();
      vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => loadAndSettle(fixture, map)).not.toThrow();

      expect(host.mapError).toHaveBeenCalledTimes(1);
      expect(host.mapError.mock.calls[0][0].message).toContain('already exists');
      expect(map.getLayerOrder().filter((id) => id === 'dup-layer')).toHaveLength(1);
    });

    it('leaves the source and layer of the component that owns the id untouched', async () => {
      const { fixture, map } = await renderDuplicate();
      vi.spyOn(console, 'error').mockImplementation(() => {});
      loadAndSettle(fixture, map);

      update(fixture, { secondColor: '#333333' });
      expect(map.getLayer('dup-layer').paint['line-color']).toBe('#111111');
      // Only the owner's handler: the failed route binds nothing to a layer that is not its own.
      expect(map.listenerCount('click', 'dup-layer')).toBe(1);

      update(fixture, { showSecond: false });
      expect(map.getSource('dup')).toBeDefined();
      expect(map.getLayer('dup-layer')).toBeDefined();
    });
  });
});
