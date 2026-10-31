import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { fakeRegistry } from 'ng-mapcn/testing/maplibre';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadMap, reloadStyle, renderMap, update } from '../../../testing/render';
import { provideMapLabels } from '../../providers/map-labels.provider';
import { blankMapStyle, defaultStyles } from '../../styles/map-styles';
import { MapMinimapComponent } from './map-minimap.component';

const TEMPLATE = `
  <ng-map [center]="[5, 6]" [zoom]="8" [theme]="theme">
    @if (show) {
      <ng-map-minimap
        [position]="position"
        [width]="width"
        [height]="height"
        [zoomOffset]="zoomOffset"
        [styles]="styles"
        [blank]="blank"
        [(collapsed)]="collapsed"
        [labels]="labels"
        [className]="className"
      />
    }
  </ng-map>
`;

const attached: HTMLElement[] = [];

async function render(hostProps: Record<string, unknown> = {}, providers: any[] = []) {
  const host = {
    show: true,
    theme: 'light',
    position: 'bottom-left',
    width: 200,
    height: 150,
    zoomOffset: 5,
    styles: undefined,
    blank: false,
    collapsed: false,
    labels: undefined,
    className: undefined,
    ...hostProps,
  };
  const result = await renderMap(TEMPLATE, {
    imports: [MapMinimapComponent],
    hostProps: host,
    providers,
  });
  const map = result.map!;
  document.body.appendChild(map.getContainer());
  attached.push(map.getContainer());
  loadMap(map);
  await settle(result.fixture);
  return { ...result, map };
}

async function settle(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) {
  fixture.detectChanges();
  // Portal views hang off ApplicationRef and the scheduler's timers are faked: tick explicitly.
  TestBed.inject(ApplicationRef).tick();
  await fixture.whenStable();
  // The instance is created after the render that mounted the card: one more round.
  TestBed.inject(ApplicationRef).tick();
  fixture.detectChanges();
  TestBed.inject(ApplicationRef).tick();
}

const q = <T extends HTMLElement = HTMLElement>(map: { getContainer(): HTMLElement }, s: string) =>
  map.getContainer().querySelector<T>(s)!;
const live = () => fakeRegistry.maps.filter((m) => !m.removed);

describe('MapMinimapComponent', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    attached.splice(0).forEach((el) => el.remove());
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('mounts a card in the bottom-left corner and remounts on position', async () => {
    const { map, fixture } = await render();
    const mapEl = q(map, '.maplibregl-ctrl-bottom-left .ng-minimap .ng-minimap-map');
    expect(mapEl.style.width).toBe('200px');
    expect(mapEl.style.height).toBe('150px');

    update(fixture, { position: 'top-right' });
    await settle(fixture);
    expect(q(map, '.maplibregl-ctrl-bottom-left .ng-minimap')).toBeNull();
    expect(q(map, '.maplibregl-ctrl-top-right .ng-minimap')).not.toBeNull();
    expect(live()).toHaveLength(2);
  });

  it('creates the minimap with zoom and rotation disabled', async () => {
    const { map } = await render();
    const mini = fakeRegistry.maps[1];
    expect(mini.options).toEqual(
      expect.objectContaining({
        interactive: true,
        attributionControl: false,
        renderWorldCopies: false,
        scrollZoom: false,
        boxZoom: false,
        dragRotate: false,
        doubleClickZoom: false,
        touchZoomRotate: false,
        keyboard: false,
        pitchWithRotate: false,
        touchPitch: false,
        maxPitch: 0,
      }),
    );
    expect(q(map, '.ng-minimap').contains(mini.options.container)).toBe(true);
  });

  it('starts at the main center and zoom minus the offset', async () => {
    await render();
    const mini = fakeRegistry.maps[1];
    expect(mini.options.center).toEqual([5, 6]);
    expect(mini.options.zoom).toBe(3);
  });

  it('clamps the zoom at 0', async () => {
    await render({ zoomOffset: 20 });
    expect(fakeRegistry.maps[1].options.zoom).toBe(0);
  });

  it('follows the main map and re-syncs on a zoomOffset change', async () => {
    const { map, fixture } = await render();
    const mini = fakeRegistry.maps[1];
    map.jumpTo({ center: [10, 20], zoom: 8 });
    expect(mini.jumpTo).toHaveBeenLastCalledWith({ center: [10, 20], zoom: 3 });

    update(fixture, { zoomOffset: 2 });
    await settle(fixture);
    expect(mini.jumpTo).toHaveBeenLastCalledWith({ center: [10, 20], zoom: 6 });
  });

  it('does not follow the main map while syncing', async () => {
    const { map, fixture } = await render();
    const mini = fakeRegistry.maps[1];
    const cmp = fixture.debugElement.query(
      (el) => el.componentInstance instanceof MapMinimapComponent,
    ).componentInstance as { syncing: boolean };
    (mini.jumpTo as any).mockClear();
    cmp.syncing = true;
    map.jumpTo({ center: [1, 1], zoom: 8 });
    expect(mini.jumpTo).not.toHaveBeenCalled();
    cmp.syncing = false;
    map.jumpTo({ center: [2, 2], zoom: 8 });
    expect(mini.jumpTo).toHaveBeenCalledTimes(1);
  });

  it('mirrors the main style and follows its changes', async () => {
    const { fixture, ctx, map } = await render({ theme: 'dark' });
    const mini = fakeRegistry.maps[1];
    expect(mini.options.style).toBe(ctx.currentStyle());
    expect(mini.options.style).toBe(defaultStyles.dark);

    update(fixture, { theme: 'light' });
    await settle(fixture);
    expect(map.setStyle).toHaveBeenCalled();
    expect(mini.setStyle).toHaveBeenCalledWith(defaultStyles.light, { diff: true });
    expect(mini.setStyle).toHaveBeenCalledTimes(1);
  });

  it('uses its own styles, themed, and ignores main style changes', async () => {
    const styles = { light: 'own-light.json', dark: 'own-dark.json' };
    const { fixture } = await render({ styles, blank: true, theme: 'dark' });
    const mini = fakeRegistry.maps[1];
    expect(mini.options.style).toBe('own-dark.json');

    update(fixture, { theme: 'light' });
    await settle(fixture);
    expect(mini.setStyle).toHaveBeenCalledTimes(1);
    expect(mini.setStyle).toHaveBeenCalledWith('own-light.json', { diff: true });
  });

  it('uses the blank style and does not touch it on a theme switch', async () => {
    const { fixture } = await render({ blank: true });
    const mini = fakeRegistry.maps[1];
    expect(mini.options.style).toBe(blankMapStyle);
    update(fixture, { theme: 'dark' });
    await settle(fixture);
    expect(mini.setStyle).not.toHaveBeenCalled();
  });

  it('collapsing removes the minimap and expanding recreates it', async () => {
    const { map, fixture } = await render();
    const first = fakeRegistry.maps[1];
    const button = q<HTMLButtonElement>(map, '.ng-minimap-toggle');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Hide overview map');

    button.click();
    await settle(fixture);
    expect(fixture.componentInstance.collapsed).toBe(true);
    expect(first.remove).toHaveBeenCalled();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('Show overview map');
    expect(q(map, '.ng-minimap-map').hidden).toBe(true);
    expect(live()).toHaveLength(1);

    button.click();
    await settle(fixture);
    expect(fakeRegistry.maps).toHaveLength(3);
    expect(live()).toHaveLength(2);
    expect(q(map, '.ng-minimap-map').hidden).toBe(false);
  });

  it('starts collapsed without creating an instance', async () => {
    const { map } = await render({ collapsed: true });
    expect(fakeRegistry.maps).toHaveLength(1);
    expect(q(map, '.ng-minimap-toggle').getAttribute('aria-expanded')).toBe('false');
  });

  it('removes everything on destroy', async () => {
    const { map, fixture } = await render({ show: false });
    const before = map.listenerCount('move');
    update(fixture, { show: true });
    await settle(fixture);
    const mini = fakeRegistry.maps[1];
    expect(map.listenerCount('move')).toBe(before + 1);

    update(fixture, { show: false });
    await settle(fixture);
    expect(mini.remove).toHaveBeenCalled();
    expect(map.listenerCount('move')).toBe(before);
    expect(q(map, '.ng-minimap')).toBeNull();
  });

  it('does not throw when the main map is removed first', async () => {
    const { map, fixture } = await render();
    map.remove();
    expect(() => fixture.destroy()).not.toThrow();
    expect(fakeRegistry.maps[1].removed).toBe(true);
  });

  it('uses labels, provideMapLabels and className', async () => {
    const { map, fixture } = await render({ className: 'extra' }, [
      provideMapLabels({ minimap: 'Vista', hideMinimap: 'Ocultar' }),
    ]);
    expect(q(map, '.ng-minimap-map').getAttribute('aria-label')).toBe('Vista');
    expect(q(map, '.ng-minimap-toggle').getAttribute('aria-label')).toBe('Ocultar');
    expect(q(map, '.ng-minimap').classList.contains('extra')).toBe(true);

    update(fixture, { labels: { minimap: 'Local' } });
    await settle(fixture);
    expect(q(map, '.ng-minimap-map').getAttribute('aria-label')).toBe('Local');
  });
  it('keeps the minimap in mercator after every style load', async () => {
    const globe = { version: 8, projection: { type: 'globe' }, sources: {}, layers: [] };
    const { fixture } = await render({ styles: { light: globe, dark: 'd.json' } });
    const mini = fakeRegistry.maps[1];
    mini.fire('style.load');
    expect(mini.setProjection).toHaveBeenCalledTimes(1);
    expect(mini.setProjection).toHaveBeenLastCalledWith({ type: 'mercator' });

    update(fixture, { theme: 'dark' });
    await settle(fixture);
    update(fixture, { theme: 'light' });
    await settle(fixture);
    mini.fire('style.load');
    expect(mini.setProjection).toHaveBeenCalledTimes(2);
  });

  it('survives setProjection throwing', async () => {
    await render();
    const mini = fakeRegistry.maps[1];
    (mini.setProjection as any).mockImplementation(() => {
      throw new Error('removed');
    });
    expect(() => mini.fire('style.load')).not.toThrow();
  });

  describe('footprint', () => {
    // the fake projection yields -0 for the top row (lat = -y / 10)
    const ring = (w: number, h: number) => [
      [0, -0],
      [w / 10, -0],
      [w / 10, -h / 10],
      [0, -h / 10],
      [0, -0],
    ];
    const sized = (main: any, w: number, h: number) => {
      Object.defineProperty(main.getCanvas(), 'clientWidth', { value: w, configurable: true });
      Object.defineProperty(main.getCanvas(), 'clientHeight', { value: h, configurable: true });
    };

    it('adds the footprint source and layers on load', async () => {
      await render();
      const mini = fakeRegistry.maps[1];
      loadMap(mini);
      expect(mini.getSource('ng-minimap-footprint')).toBeDefined();
      expect(mini.getLayer('ng-minimap-footprint-fill').paint).toEqual({
        'fill-color': '#3b82f6',
        'fill-opacity': 0.15,
      });
      expect(mini.getLayer('ng-minimap-footprint-line').paint).toEqual({
        'line-color': '#3b82f6',
        'line-width': 1.5,
      });
    });

    it('updates the footprint on main move, even while syncing', async () => {
      const { map } = await render();
      const mini = fakeRegistry.maps[1];
      loadMap(mini);
      sized(map, 200, 100);
      map.jumpTo({ center: [1, 1], zoom: 8 });
      const source = mini.getSource('ng-minimap-footprint');
      expect(source.setData).toHaveBeenLastCalledWith(
        expect.objectContaining({
          geometry: { type: 'Polygon', coordinates: [ring(200, 100)] },
        }),
      );
    });

    it('re-adds the footprint after the minimap style reloads', async () => {
      const { fixture } = await render();
      const mini = fakeRegistry.maps[1];
      loadMap(mini);
      mini.setStyle('x.json');
      reloadStyle(fixture, mini);
      expect(mini.getSource('ng-minimap-footprint')).toBeDefined();
      expect(mini.getLayerOrder()).toEqual([
        'ng-minimap-footprint-fill',
        'ng-minimap-footprint-line',
      ]);
    });

    it('uses the dark color in dark theme', async () => {
      const { fixture } = await render();
      const mini = fakeRegistry.maps[1];
      loadMap(mini);
      update(fixture, { theme: 'dark' });
      await settle(fixture);
      expect(mini.getLayer('ng-minimap-footprint-fill').paint['fill-color']).toBe('#60a5fa');
      expect(mini.getLayer('ng-minimap-footprint-line').paint['line-color']).toBe('#60a5fa');
      mini.setStyle('x.json');
      reloadStyle(fixture, mini);
      expect(mini.getLayer('ng-minimap-footprint-line').paint['line-color']).toBe('#60a5fa');
    });
  });

  describe('navigation', () => {
    const gesture = (mini: any) =>
      mini.fire('move', { originalEvent: new MouseEvent('mousemove') });

    it('a minimap gesture (drag or inertia) pans the main map without echoing back', async () => {
      const { map } = await render();
      const mini = fakeRegistry.maps[1];
      mini.jumpTo({ center: [30, 40] });
      (mini.jumpTo as any).mockClear();
      (map.jumpTo as any).mockClear();
      gesture(mini);
      expect(map.jumpTo).toHaveBeenCalledTimes(1);
      expect(map.jumpTo).toHaveBeenCalledWith({ center: { lng: 30, lat: 40 } });
      expect(map.getCenter()).toEqual({ lng: 30, lat: 40 });
      expect(mini.jumpTo).not.toHaveBeenCalled();
      // a later main move syncs again
      map.jumpTo({ center: [1, 1], zoom: 8 });
      expect(mini.jumpTo).toHaveBeenCalledTimes(1);
    });

    it('ignores a programmatic minimap move (no originalEvent)', async () => {
      const { map } = await render();
      const mini = fakeRegistry.maps[1];
      (map.jumpTo as any).mockClear();
      mini.fire('move');
      expect(map.jumpTo).not.toHaveBeenCalled();
    });

    it('does not reset a minimap gesture on a main move; re-syncs on moveend', async () => {
      const { map } = await render();
      const mini = fakeRegistry.maps[1];
      loadMap(mini);
      mini.setMoving(true);
      (mini.jumpTo as any).mockClear();
      map.jumpTo({ center: [12, 13], zoom: 8 });
      expect(mini.jumpTo).not.toHaveBeenCalled();
      expect(mini.getSource('ng-minimap-footprint').setData).toHaveBeenCalled();

      mini.setMoving(false);
      mini.fire('moveend');
      expect(mini.jumpTo).toHaveBeenCalledWith({ center: [12, 13], zoom: 3 });
    });

    it('does not jump on moveend when already in sync', async () => {
      await render();
      const mini = fakeRegistry.maps[1];
      (mini.jumpTo as any).mockClear();
      mini.fire('moveend');
      expect(mini.jumpTo).not.toHaveBeenCalled();
    });

    it('clicking recenters the main map with easeTo', async () => {
      const { map } = await render();
      fakeRegistry.maps[1].fire('click', { lngLat: { lng: 5, lat: 6 } });
      expect(map.easeTo).toHaveBeenCalledWith({ center: [5, 6] });
    });

    it('takes the minimap canvas out of the tab order and drops its landmark', async () => {
      await render();
      const canvas = fakeRegistry.maps[1].getCanvas();
      expect(canvas.getAttribute('tabindex')).toBe('-1');
      expect(canvas.hasAttribute('role')).toBe(false);
      expect(canvas.hasAttribute('aria-label')).toBe(false);
    });

    it('arrow keys pan the main map by 100 px', async () => {
      const { map } = await render();
      const el = q(map, '.ng-minimap-map');
      const press = (key: string) => {
        const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
        el.dispatchEvent(e);
        return e;
      };
      expect(press('ArrowRight').defaultPrevented).toBe(true);
      expect(map.panBy).toHaveBeenLastCalledWith([100, 0]);
      press('ArrowLeft');
      expect(map.panBy).toHaveBeenLastCalledWith([-100, 0]);
      press('ArrowUp');
      expect(map.panBy).toHaveBeenLastCalledWith([0, -100]);
      press('ArrowDown');
      expect(map.panBy).toHaveBeenLastCalledWith([0, 100]);
      expect(map.panBy).toHaveBeenCalledTimes(4);
      expect(press('a').defaultPrevented).toBe(false);
      expect(map.panBy).toHaveBeenCalledTimes(4);
    });
  });
});
