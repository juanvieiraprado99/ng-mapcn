import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { fakeRegistry } from 'ng-mapcn/testing/maplibre';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadMap, renderMap, update } from '../../../testing/render';
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
});
