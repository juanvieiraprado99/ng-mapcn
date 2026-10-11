import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeRegistry } from '../../../testing/maplibre-fake';
import { loadMap, renderMap, setMapSize } from '../../../testing/render';
import { provideMapStyles } from '../../providers/map-styles.provider';
import { blankMapStyle, defaultStyles } from '../../styles/map-styles';
import { type MapComponent } from './map.component';

const TEMPLATE = `
  <ng-map
    [theme]="theme"
    [center]="center"
    [zoom]="zoom"
    [styles]="styles"
    [blank]="blank"
    [projection]="projection"
    [viewport]="viewport"
    [options]="options"
    (viewportChange)="viewportChange($event)"
    (mapReady)="mapReady($event)"
    (mapClick)="mapClick($event)"
    (mapError)="mapError($event)"
  >
    <div class="projected-child"></div>
  </ng-map>
`;

function hostDefaults() {
  return {
    theme: 'light',
    center: [0, 0],
    zoom: 2,
    styles: undefined,
    blank: false,
    projection: undefined,
    viewport: undefined,
    options: undefined,
    viewportChange: vi.fn(),
    mapReady: vi.fn(),
    mapClick: vi.fn(),
    mapError: vi.fn(),
  } as Record<string, any>;
}

async function render(
  hostProps: Record<string, unknown> = {},
  extra: { providers?: unknown[]; size?: { width: number; height: number } | null } = {},
) {
  const host = { ...hostDefaults(), ...hostProps };
  const result = await renderMap(TEMPLATE, { ...extra, hostProps: host });
  return { ...result, host };
}

/** Updates host inputs and runs change detection (effects run during it). */
function update(fixture: { componentInstance: any; detectChanges(): void }, props: object) {
  Object.assign(fixture.componentInstance, props);
  fixture.detectChanges();
}

describe('MapComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.documentElement.className = '';
    TestBed.resetTestingModule();
  });

  describe('initialisation', () => {
    it('constructs exactly one Map with the expected options', async () => {
      const { fixture, map } = await render({ center: [10, 20], zoom: 5 });

      expect(fakeRegistry.maps).toHaveLength(1);
      expect(map!.options.renderWorldCopies).toBe(false);
      expect(map!.options.attributionControl).toEqual({ compact: true });
      expect(map!.options.center).toEqual([10, 20]);
      expect(map!.options.zoom).toBe(5);
      expect(map!.options.container).toBe(fixture.nativeElement.querySelector('.ng-map-canvas'));
    });

    it('spreads [options] in but cannot override container or style', async () => {
      const { fixture, map } = await render({
        options: {
          maxZoom: 9,
          renderWorldCopies: true,
          container: 'not-the-container',
          style: 'https://example.com/evil.json',
        },
      });

      expect(map!.options.maxZoom).toBe(9);
      expect(map!.options.renderWorldCopies).toBe(true);
      expect(map!.options.container).toBe(fixture.nativeElement.querySelector('.ng-map-canvas'));
      expect(map!.options.style).toBe(defaultStyles.light);
    });

    it('lets [viewport] take precedence over center and zoom', async () => {
      const { map } = await render({
        center: [1, 1],
        zoom: 3,
        viewport: { center: [5, 6], zoom: 7, bearing: 8, pitch: 9 },
      });

      expect(map!.options.center).toEqual([5, 6]);
      expect(map!.options.zoom).toBe(7);
      expect(map!.options.bearing).toBe(8);
      expect(map!.options.pitch).toBe(9);
    });

    it('does not create a Map while the container has zero size, then retries', async () => {
      const { fixture, map } = await render({}, { size: null });

      expect(map).toBeUndefined();
      expect(fakeRegistry.maps).toHaveLength(0);

      vi.advanceTimersByTime(100);
      expect(fakeRegistry.maps).toHaveLength(0);

      setMapSize({ width: 400, height: 300 });
      vi.advanceTimersByTime(100);
      expect(fakeRegistry.maps).toHaveLength(1);

      // No further retries once the map exists.
      vi.advanceTimersByTime(1000);
      expect(fakeRegistry.maps).toHaveLength(1);
      fixture.detectChanges();
    });

    it('never constructs a Map on the server', async () => {
      const { ctx } = await render(
        {},
        { providers: [{ provide: PLATFORM_ID, useValue: 'server' }] },
      );

      vi.advanceTimersByTime(1000);
      expect(fakeRegistry.maps).toHaveLength(0);
      expect(ctx.map()).toBeNull();
    });

    it('renders projected children only after the map exists', async () => {
      const { fixture } = await render({}, { size: null });
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.projected-child')).toBeNull();

      setMapSize({ width: 400, height: 300 });
      vi.advanceTimersByTime(100);
      fixture.detectChanges();

      expect(el.querySelector('.projected-child')).not.toBeNull();
    });
  });

  describe('invariant 1: load gating', () => {
    it('opens the gate only after load and a debounced styledata', async () => {
      const { fixture, map, ctx, host } = await render();
      const el: HTMLElement = fixture.nativeElement;

      expect(ctx.isLoaded()).toBe(false);
      expect(el.querySelector('[role=status]')).not.toBeNull();

      map!.fire('load');
      expect(ctx.isLoaded()).toBe(false);

      map!.fire('styledata');
      vi.advanceTimersByTime(99);
      expect(ctx.isLoaded()).toBe(false);

      vi.advanceTimersByTime(1);
      expect(ctx.isLoaded()).toBe(true);

      fixture.detectChanges();
      expect(el.querySelector('[role=status]')).toBeNull();
      expect(host['mapReady']).toHaveBeenCalledTimes(1);
      expect(host['mapReady']).toHaveBeenCalledWith(map);
    });

    it('debounces repeated styledata events into one flag update', async () => {
      const { map, ctx } = await render();
      const setStyleLoaded = vi.spyOn(ctx, 'setStyleLoadedFlag');

      map!.fire('load');
      map!.fire('styledata');
      vi.advanceTimersByTime(60);
      map!.fire('styledata');
      vi.advanceTimersByTime(60);
      expect(ctx.isLoaded()).toBe(false);

      vi.advanceTimersByTime(40);
      expect(ctx.isLoaded()).toBe(true);
      expect(setStyleLoaded).toHaveBeenCalledTimes(1);
    });

    it('applies [projection] with setProjection when the style settles', async () => {
      const projection = { type: 'globe' };
      const { map } = await render({ projection });

      map!.fire('load');
      map!.fire('styledata');
      expect(map!.setProjection).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(map!.setProjection).toHaveBeenCalledWith(projection);
    });
  });

  describe('theme and styles', () => {
    it('uses the Carto dark style for theme="dark"', async () => {
      const { map, ctx } = await render({ theme: 'dark' });
      expect(map!.options.style).toBe(defaultStyles.dark);
      expect(ctx.resolvedTheme()).toBe('dark');
    });

    it('swaps the style once on a theme change and closes the gate until styledata settles', async () => {
      const { fixture, map, ctx } = await render({ theme: 'dark' });
      loadMap(map!);
      expect(ctx.isLoaded()).toBe(true);

      update(fixture, { theme: 'light' });

      expect(map!.setStyle).toHaveBeenCalledTimes(1);
      expect(map!.setStyle).toHaveBeenCalledWith(defaultStyles.light, { diff: true });
      expect(ctx.isLoaded()).toBe(false);
      expect(ctx.resolvedTheme()).toBe('light');

      map!.fire('styledata');
      vi.advanceTimersByTime(99);
      expect(ctx.isLoaded()).toBe(false);
      vi.advanceTimersByTime(1);
      expect(ctx.isLoaded()).toBe(true);
    });

    it('does not call setStyle again when the resolved style is unchanged', async () => {
      const { fixture, map } = await render({ theme: 'dark' });
      loadMap(map!);

      update(fixture, { theme: 'light' });
      expect(map!.setStyle).toHaveBeenCalledTimes(1);

      // "auto" resolves to light here (no <html> class, no matchMedia): same style.
      update(fixture, { theme: 'auto' });
      expect(map!.setStyle).toHaveBeenCalledTimes(1);
    });

    it('re-applies the basemap when the [styles] input changes at runtime', async () => {
      const { fixture, map } = await render({ styles: { light: 'a.json' } });
      expect(map!.options.style).toBe('a.json');
      loadMap(map!);

      update(fixture, { styles: { light: 'b.json' } });

      expect(map!.setStyle).toHaveBeenCalledTimes(1);
      expect(map!.setStyle).toHaveBeenCalledWith('b.json', { diff: true });
    });

    describe('style precedence', () => {
      it('[styles] beats [blank], provideMapStyles and Carto', async () => {
        const { map } = await render(
          { styles: { light: 'input.json' }, blank: true },
          { providers: [provideMapStyles({ light: 'app.json' })] },
        );
        expect(map!.options.style).toBe('input.json');
      });

      it('[blank] beats provideMapStyles and Carto', async () => {
        const { map } = await render(
          { blank: true },
          { providers: [provideMapStyles({ light: 'app.json' })] },
        );
        expect(map!.options.style).toBe(blankMapStyle);
      });

      it('provideMapStyles beats Carto', async () => {
        const { map } = await render({}, { providers: [provideMapStyles({ light: 'app.json' })] });
        expect(map!.options.style).toBe('app.json');
      });

      it('falls back to Carto', async () => {
        const { map } = await render();
        expect(map!.options.style).toBe(defaultStyles.light);
      });

      it('falls back to Carto when [styles] lacks the active theme', async () => {
        const { map } = await render({ styles: { dark: 'only-dark.json' } });
        expect(map!.options.style).toBe(defaultStyles.light);
      });
    });
  });

  describe('invariant 3: controlled viewport', () => {
    const base = { center: [0, 0], zoom: 2, bearing: 0, pitch: 0 };

    it('jumps only with the changed fields and does not echo viewportChange', async () => {
      const { fixture, map, host } = await render({ viewport: { ...base } });
      expect(map!.jumpTo).not.toHaveBeenCalled();

      update(fixture, { viewport: { ...base, zoom: 5 } });

      expect(map!.jumpTo).toHaveBeenCalledTimes(1);
      expect(map!.jumpTo).toHaveBeenCalledWith({ zoom: 5 });
      expect(map!.getZoom()).toBe(5);
      expect(host['viewportChange']).not.toHaveBeenCalled();
    });

    it('jumps with several changed fields at once', async () => {
      const { fixture, map } = await render({ viewport: { ...base } });

      update(fixture, { viewport: { center: [3, 4], zoom: 2, bearing: 20, pitch: 0 } });

      expect(map!.jumpTo).toHaveBeenCalledWith({ center: [3, 4], bearing: 20 });
    });

    it('does not jump while the map is moving', async () => {
      const { fixture, map } = await render({ viewport: { ...base } });
      map!.setMoving(true);

      update(fixture, { viewport: { ...base, zoom: 8 } });

      expect(map!.jumpTo).not.toHaveBeenCalled();
    });

    it('does not jump when the viewport equals the current camera', async () => {
      const { fixture, map } = await render({ viewport: { ...base } });

      update(fixture, { viewport: { ...base } });

      expect(map!.jumpTo).not.toHaveBeenCalled();
    });

    it('emits viewportChange with the camera data on a user move', async () => {
      const { map, host } = await render({ viewport: { ...base } });

      // A gesture changes the camera without going through jumpTo.
      map!.easeTo({ center: [7, 8], zoom: 9 });
      map!.fire('move');

      expect(host['viewportChange']).toHaveBeenCalledTimes(1);
      expect(host['viewportChange']).toHaveBeenCalledWith({
        center: [7, 8],
        zoom: 9,
        bearing: 0,
        pitch: 0,
      });
    });

    it('resumes emitting after an internal jump', async () => {
      const { fixture, map, host } = await render({ viewport: { ...base } });

      update(fixture, { viewport: { ...base, zoom: 5 } });
      expect(host['viewportChange']).not.toHaveBeenCalled();

      map!.fire('move');
      expect(host['viewportChange']).toHaveBeenCalledTimes(1);
    });
  });

  describe('events', () => {
    it('emits mapClick with the map event', async () => {
      const { map, host } = await render();

      map!.fire('click', { lngLat: { lng: 1, lat: 2 } });

      expect(host['mapClick']).toHaveBeenCalledTimes(1);
      expect(host['mapClick'].mock.calls[0][0]).toMatchObject({
        type: 'click',
        lngLat: { lng: 1, lat: 2 },
      });
    });

    it('emits mapError with the same Error instance', async () => {
      const { map, host } = await render();
      const error = new Error('boom');

      map!.fire('error', { error });

      expect(host['mapError']).toHaveBeenCalledWith(error);
      expect(host['mapError'].mock.calls[0][0]).toBe(error);
    });

    it('wraps non-Error map errors in an Error', async () => {
      const { map, host } = await render();

      map!.fire('error', { error: 'plain string' });

      const emitted = host['mapError'].mock.calls[0][0];
      expect(emitted).toBeInstanceOf(Error);
      expect(emitted.message).toBe('plain string');
    });

    it('emits mapError when the Map constructor throws, without throwing', async () => {
      fakeRegistry.constructError = new Error('webgl unavailable');

      const { host, ctx } = await render();

      expect(fakeRegistry.maps).toHaveLength(0);
      expect(ctx.map()).toBeNull();
      expect(host['mapError']).toHaveBeenCalledTimes(1);
      expect(host['mapError'].mock.calls[0][0].message).toBe('webgl unavailable');
    });

    it('wraps a non-Error constructor failure in an Error', async () => {
      fakeRegistry.constructError = 'nope' as unknown as Error;

      const { host } = await render();

      expect(host['mapError'].mock.calls[0][0]).toBeInstanceOf(Error);
      expect(host['mapError'].mock.calls[0][0].message).toBe('nope');
    });
  });

  describe('invariant 4: teardown', () => {
    it('removes the map once and resets the context on destroy', async () => {
      const { fixture, map, ctx } = await render();
      loadMap(map!);
      expect(ctx.isLoaded()).toBe(true);

      fixture.destroy();

      expect(map!.remove).toHaveBeenCalledTimes(1);
      expect(ctx.map()).toBeNull();
      expect(ctx.isLoaded()).toBe(false);
    });

    it('clears a pending styledata timer on destroy', async () => {
      const { fixture, map, ctx } = await render({ projection: { type: 'globe' } });
      const setStyleLoaded = vi.spyOn(ctx, 'setStyleLoadedFlag');
      map!.fire('load');
      map!.fire('styledata');

      fixture.destroy();
      vi.advanceTimersByTime(1000);

      expect(setStyleLoaded).not.toHaveBeenCalled();
      expect(map!.setProjection).not.toHaveBeenCalled();
      expect(ctx.isLoaded()).toBe(false);
    });

    it('swallows a throwing map.remove()', async () => {
      const { fixture, map, ctx } = await render();
      map!.remove.mockImplementationOnce(() => {
        throw new Error('already removed');
      });

      expect(() => fixture.destroy()).not.toThrow();
      expect(ctx.map()).toBeNull();
    });

    it('creates no Map after destroy while the zero-size retry was pending', async () => {
      const { fixture } = await render({}, { size: null });
      expect(fakeRegistry.maps).toHaveLength(0);

      fixture.destroy();
      expect(vi.getTimerCount()).toBe(0);
      setMapSize({ width: 400, height: 300 });
      vi.advanceTimersByTime(1000);

      expect(fakeRegistry.maps).toHaveLength(0);
    });

    it('exposes the instance through getMap() and nulls it on destroy', async () => {
      const { fixture, map } = await render();
      const cmp = fixture.debugElement.children[0].componentInstance as MapComponent;
      expect(cmp.getMap()).toBe(map);

      fixture.destroy();
      expect(cmp.getMap()).toBeNull();
    });
  });
});
