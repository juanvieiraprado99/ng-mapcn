import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderMap, update } from '../../../testing/render';
import { MapControlsComponent } from './map-controls.component';

const TEMPLATE = `
  <ng-map>
    @if (show) {
      <ng-map-controls
        [position]="position"
        [showZoom]="showZoom"
        [showCompass]="showCompass"
        [showLocate]="showLocate"
        [showFullscreen]="showFullscreen"
        (locateChange)="locateChange($event)"
        (locateError)="locateError($event)"
      />
    }
  </ng-map>
`;

function hostDefaults(): Record<string, any> {
  return {
    show: true,
    position: 'bottom-right',
    showZoom: true,
    showCompass: false,
    showLocate: false,
    showFullscreen: false,
    locateChange: vi.fn(),
    locateError: vi.fn(),
  };
}

async function render(hostProps: Record<string, unknown> = {}) {
  const host = { ...hostDefaults(), ...hostProps };
  const result = await renderMap(TEMPLATE, { imports: [MapControlsComponent], hostProps: host });
  return { ...result, map: result.map!, host };
}

// The card lives in MapLibre's corner container, not in the fixture's DOM.
const button = (map: { getContainer(): HTMLElement }, title: string) =>
  map.getContainer().querySelector<HTMLButtonElement>(`button[title="${title}"]`)!;

function stubGeolocation(getCurrentPosition: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition },
  });
}

describe('MapControlsComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete (navigator as { geolocation?: unknown }).geolocation;
    delete (document as { fullscreenElement?: unknown }).fullscreenElement;
    delete (document as { exitFullscreen?: unknown }).exitFullscreen;
    document.documentElement.className = '';
    TestBed.resetTestingModule();
  });

  describe('layout', () => {
    it('defaults to the bottom-right position with only the zoom buttons', async () => {
      const { map } = await render();
      const root: HTMLElement = map.getContainer().querySelector('.ng-controls')!;

      expect(root.classList).toContain('ng-controls');
      expect(root.classList).toContain('ng-controls--bottom-right');
      expect(button(map, 'Zoom in')).not.toBeNull();
      expect(button(map, 'Zoom out')).not.toBeNull();
      expect(button(map, 'Reset north')).toBeNull();
      expect(button(map, 'My location')).toBeNull();
      expect(button(map, 'Toggle fullscreen')).toBeNull();
    });

    it('mounts in the corner of its position', async () => {
      const { map } = await render();

      expect(
        map.getContainer().querySelector('.maplibregl-ctrl-bottom-right .ng-controls'),
      ).not.toBeNull();
    });

    it('moves when position changes', async () => {
      const { fixture, map } = await render();
      update(fixture, { position: 'top-left' });
      await fixture.whenStable();
      const container = map.getContainer();

      expect(container.querySelector('.maplibregl-ctrl-top-left .ng-controls')).not.toBeNull();
      expect(container.querySelector('.maplibregl-ctrl-bottom-right .ng-controls')).toBeNull();
    });

    it('removes the control on destroy', async () => {
      const { fixture, map } = await render();
      update(fixture, { show: false });
      await fixture.whenStable();

      expect(map.getContainer().querySelector('.ng-controls')).toBeNull();
    });

    it.each(['top-left', 'top-right', 'bottom-left', 'bottom-right'])(
      'applies the %s position class',
      async (position) => {
        const { map } = await render({ position });
        const root: HTMLElement = map.getContainer().querySelector('.ng-controls')!;
        expect(root.classList).toContain(`ng-controls--${position}`);
      },
    );

    it('renders every optional button when enabled and hides zoom when disabled', async () => {
      const { map } = await render({
        showZoom: false,
        showCompass: true,
        showLocate: true,
        showFullscreen: true,
      });

      expect(button(map, 'Zoom in')).toBeNull();
      expect(button(map, 'Reset north')).not.toBeNull();
      expect(button(map, 'My location')).not.toBeNull();
      expect(button(map, 'Toggle fullscreen')).not.toBeNull();
    });
  });

  describe('zoom and compass', () => {
    it('zooms in and out by one level with a 300 ms animation', async () => {
      const { map } = await render();
      const start = map.getZoom();

      button(map, 'Zoom in').click();
      expect(map.zoomTo).toHaveBeenLastCalledWith(start + 1, { duration: 300 });

      button(map, 'Zoom out').click();
      expect(map.zoomTo).toHaveBeenLastCalledWith(start, { duration: 300 });
    });

    it('resets north and pitch from the compass button', async () => {
      const { map } = await render({ showCompass: true });

      button(map, 'Reset north').click();

      expect(map.resetNorthPitch).toHaveBeenCalledWith({ duration: 300 });
    });

    it('syncs the compass transform from bearing and pitch on rotate and pitch events', async () => {
      const { map } = await render({ showCompass: true });
      const svg = button(map, 'Reset north').querySelector('svg')!;
      expect(map.listenerCount('rotate')).toBe(1);
      expect(map.listenerCount('pitch')).toBe(1);

      map.jumpTo({ bearing: 30, pitch: 40 });
      map.fire('rotate');
      TestBed.inject(ApplicationRef).tick();
      expect(svg.style.transform).toBe('rotateX(40deg) rotateZ(-30deg)');

      map.jumpTo({ bearing: -10, pitch: 5 });
      map.fire('pitch');
      TestBed.inject(ApplicationRef).tick();
      expect(svg.style.transform).toBe('rotateX(5deg) rotateZ(10deg)');
    });

    it('syncs the compass immediately when it is enabled on a rotated map', async () => {
      const { fixture, map } = await render();
      map.jumpTo({ bearing: 45, pitch: 10 });

      update(fixture, { showCompass: true });
      await fixture.whenStable();

      const svg = button(map, 'Reset north').querySelector('svg')!;
      expect(svg.style.transform).toBe('rotateX(10deg) rotateZ(-45deg)');
      expect(map.listenerCount('rotate')).toBe(1);
    });

    it('registers no compass handlers when the compass is hidden', async () => {
      const { map } = await render();

      expect(map.listenerCount('rotate')).toBe(0);
      expect(map.listenerCount('pitch')).toBe(0);
    });

    it('removes the compass handlers on destroy', async () => {
      const { fixture, map } = await render({ showCompass: true });

      update(fixture, { show: false });

      expect(map.listenerCount('rotate')).toBe(0);
      expect(map.listenerCount('pitch')).toBe(0);
    });
  });

  describe('locate', () => {
    it('flies to the position, emits locateChange and re-enables the button', async () => {
      const getCurrentPosition = vi.fn();
      stubGeolocation(getCurrentPosition);
      const { fixture, map, host } = await render({ showLocate: true });

      button(map, 'My location').click();
      fixture.detectChanges();

      expect(getCurrentPosition).toHaveBeenCalledTimes(1);
      expect(button(map, 'My location').disabled).toBe(true);

      getCurrentPosition.mock.calls[0][0]({ coords: { longitude: 5, latitude: 6 } });
      fixture.detectChanges();

      expect(map.flyTo).toHaveBeenCalledWith({ center: [5, 6], zoom: 14, duration: 1500 });
      expect(host['locateChange']).toHaveBeenCalledWith({ longitude: 5, latitude: 6 });
      expect(button(map, 'My location').disabled).toBe(false);
    });

    it('ignores a second click while a request is in flight', async () => {
      const getCurrentPosition = vi.fn();
      stubGeolocation(getCurrentPosition);
      const { fixture, map } = await render({ showLocate: true });

      button(map, 'My location').click();
      fixture.detectChanges();
      button(map, 'My location').click();

      expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    });

    it('emits locateError when the browser has no geolocation', async () => {
      const { fixture, map, host } = await render({ showLocate: true });

      expect(() => button(map, 'My location').click()).not.toThrow();
      fixture.detectChanges();

      expect(button(map, 'My location').disabled).toBe(false);
      expect(map.flyTo).not.toHaveBeenCalled();
      expect(host['locateError']).toHaveBeenCalledTimes(1);
      expect(host['locateError'].mock.calls[0][0]).toBeInstanceOf(Error);
    });

    it('ignores a position that arrives after the controls were destroyed', async () => {
      const getCurrentPosition = vi.fn();
      stubGeolocation(getCurrentPosition);
      const { fixture, map, host } = await render({ showLocate: true });
      button(map, 'My location').click();

      update(fixture, { show: false });
      getCurrentPosition.mock.calls[0][0]({ coords: { longitude: 5, latitude: 6 } });

      expect(map.flyTo).not.toHaveBeenCalled();
      expect(host['locateChange']).not.toHaveBeenCalled();
    });

    it('resets the locating state and emits locateError on error', async () => {
      const getCurrentPosition = vi.fn();
      stubGeolocation(getCurrentPosition);
      const { fixture, map, host } = await render({ showLocate: true });

      button(map, 'My location').click();
      fixture.detectChanges();
      const error = { code: 1, message: 'denied' };
      getCurrentPosition.mock.calls[0][1](error);
      fixture.detectChanges();

      expect(button(map, 'My location').disabled).toBe(false);
      expect(host['locateError']).toHaveBeenCalledWith(error);
      expect(map.flyTo).not.toHaveBeenCalled();
      expect(host['locateChange']).not.toHaveBeenCalled();
    });
  });

  describe('fullscreen', () => {
    it('requests fullscreen on the map container', async () => {
      const { map } = await render({ showFullscreen: true });

      button(map, 'Toggle fullscreen').click();

      expect(map.getContainer().requestFullscreen).toHaveBeenCalledTimes(1);
    });

    it('swallows a rejected fullscreen request', async () => {
      const { map } = await render({ showFullscreen: true });
      map.getContainer().requestFullscreen.mockReturnValueOnce(Promise.reject(new Error('denied')));

      button(map, 'Toggle fullscreen').click();
      await Promise.resolve();

      expect(map.getContainer().requestFullscreen).toHaveBeenCalledTimes(1);
    });

    it('exits fullscreen when the map container is fullscreen', async () => {
      const exitFullscreen = vi.fn();
      Object.defineProperty(document, 'exitFullscreen', {
        configurable: true,
        value: exitFullscreen,
      });
      const { map } = await render({ showFullscreen: true });
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        value: map.getContainer(),
      });

      button(map, 'Toggle fullscreen').click();

      expect(exitFullscreen).toHaveBeenCalledTimes(1);
      expect(map.getContainer().requestFullscreen).not.toHaveBeenCalled();
    });

    it('swaps the icon and aria-pressed on fullscreenchange', async () => {
      const { fixture, map } = await render({ showFullscreen: true });
      const btn = () => button(map, 'Toggle fullscreen');
      const before = btn().querySelector('path')!.getAttribute('d');
      expect(btn().getAttribute('aria-pressed')).toBe('false');

      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        value: map.getContainer(),
      });
      document.dispatchEvent(new Event('fullscreenchange'));
      fixture.detectChanges();

      expect(btn().querySelector('path')!.getAttribute('d')).not.toBe(before);
      expect(btn().getAttribute('aria-pressed')).toBe('true');
    });

    it('ignores another element going fullscreen', async () => {
      const { fixture, map } = await render({ showFullscreen: true });

      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        value: document.body,
      });
      document.dispatchEvent(new Event('fullscreenchange'));
      fixture.detectChanges();

      expect(button(map, 'Toggle fullscreen').getAttribute('aria-pressed')).toBe('false');
    });

    it('removes the fullscreenchange listener on destroy', async () => {
      const add = vi.spyOn(document, 'addEventListener');
      const remove = vi.spyOn(document, 'removeEventListener');
      const { fixture } = await render({ showFullscreen: true });
      const added = add.mock.calls.find((c) => c[0] === 'fullscreenchange');
      expect(added).toBeDefined();

      update(fixture, { show: false });

      expect(remove).toHaveBeenCalledWith('fullscreenchange', added![1]);
    });
  });

  describe('accessibility', () => {
    it('gives every button an aria-label', async () => {
      const { map } = await render({
        showCompass: true,
        showLocate: true,
        showFullscreen: true,
      });
      const buttons = [...map.getContainer().querySelectorAll('.ng-control-btn')] as HTMLElement[];

      expect(buttons).toHaveLength(5);
      for (const b of buttons) expect(b.getAttribute('aria-label')).toBe(b.getAttribute('title'));
    });
  });

  describe('teardown', () => {
    it('does not throw when the whole fixture is destroyed', async () => {
      const { fixture } = await render({ showCompass: true, showFullscreen: true });
      expect(() => fixture.destroy()).not.toThrow();
    });
  });

  describe('context', () => {
    it('throws when placed outside <ng-map>', () => {
      @Component({ imports: [MapControlsComponent], template: '<ng-map-controls />' })
      class OutsideHost {}

      expect(() => {
        const fixture = TestBed.createComponent(OutsideHost);
        fixture.detectChanges();
      }).toThrow(/MapContextService/);
    });
  });

  describe('className', () => {
    it('applies the initial classes and keeps the built-in class', async () => {
      const { fixture, map } = await renderMap(
        `<ng-map><ng-map-controls position="top-left" [className]="cls" /></ng-map>`,
        {
          imports: [MapControlsComponent],
          hostProps: { cls: 'w-64 p-0' },
        },
      );
      await fixture.whenStable();
      const el = map!.getContainer().querySelector('.ng-controls') as HTMLElement;
      expect(el.classList).toContain('ng-controls');
      expect(el.classList).toContain('w-64');
      expect(el.classList).toContain('p-0');
    });

    it('swaps classes when the input changes, without dropping the built-in class', async () => {
      const { fixture, map } = await renderMap(
        `<ng-map><ng-map-controls position="top-left" [className]="cls" /></ng-map>`,
        {
          imports: [MapControlsComponent],
          hostProps: { cls: 'a b' },
        },
      );
      await fixture.whenStable();
      const before = map!.getContainer().querySelector('.ng-controls') as HTMLElement;
      update(fixture, { cls: 'b c ng-controls' });
      await fixture.whenStable();
      const el = map!.getContainer().querySelector('.ng-controls') as HTMLElement;
      expect(el).toBe(before);
      expect(el.classList).not.toContain('a');
      expect(el.classList).toContain('b');
      expect(el.classList).toContain('c');
      expect(el.classList).toContain('ng-controls');

      update(fixture, { cls: undefined });
      await fixture.whenStable();
      expect(el.className).toBe('ng-controls ng-controls--top-left');
    });
  });
});
