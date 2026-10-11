import { Component } from '@angular/core';
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
  };
}

async function render(hostProps: Record<string, unknown> = {}) {
  const host = { ...hostDefaults(), ...hostProps };
  const result = await renderMap(TEMPLATE, { imports: [MapControlsComponent], hostProps: host });
  return { ...result, map: result.map!, host };
}

const button = (fixture: { nativeElement: HTMLElement }, title: string) =>
  fixture.nativeElement.querySelector<HTMLButtonElement>(`button[title="${title}"]`)!;

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
      const { fixture } = await render();
      const root: HTMLElement = fixture.nativeElement.querySelector('.ng-controls');

      expect(root.classList).toContain('ng-controls');
      expect(root.classList).toContain('ng-controls--bottom-right');
      expect(button(fixture, 'Zoom in')).not.toBeNull();
      expect(button(fixture, 'Zoom out')).not.toBeNull();
      expect(button(fixture, 'Reset north')).toBeNull();
      expect(button(fixture, 'My location')).toBeNull();
      expect(button(fixture, 'Toggle fullscreen')).toBeNull();
    });

    it.each(['top-left', 'top-right', 'bottom-left', 'bottom-right'])(
      'applies the %s position class',
      async (position) => {
        const { fixture } = await render({ position });
        const root: HTMLElement = fixture.nativeElement.querySelector('.ng-controls');
        expect(root.classList).toContain(`ng-controls--${position}`);
      },
    );

    it('renders every optional button when enabled and hides zoom when disabled', async () => {
      const { fixture } = await render({
        showZoom: false,
        showCompass: true,
        showLocate: true,
        showFullscreen: true,
      });

      expect(button(fixture, 'Zoom in')).toBeNull();
      expect(button(fixture, 'Reset north')).not.toBeNull();
      expect(button(fixture, 'My location')).not.toBeNull();
      expect(button(fixture, 'Toggle fullscreen')).not.toBeNull();
    });
  });

  describe('zoom and compass', () => {
    it('zooms in and out by one level with a 300 ms animation', async () => {
      const { fixture, map } = await render();
      const start = map.getZoom();

      button(fixture, 'Zoom in').click();
      expect(map.zoomTo).toHaveBeenLastCalledWith(start + 1, { duration: 300 });

      button(fixture, 'Zoom out').click();
      expect(map.zoomTo).toHaveBeenLastCalledWith(start, { duration: 300 });
    });

    it('resets north and pitch from the compass button', async () => {
      const { fixture, map } = await render({ showCompass: true });

      button(fixture, 'Reset north').click();

      expect(map.resetNorthPitch).toHaveBeenCalledWith({ duration: 300 });
    });

    it('syncs the compass transform from bearing and pitch on rotate and pitch events', async () => {
      const { fixture, map } = await render({ showCompass: true });
      const svg = button(fixture, 'Reset north').querySelector('svg')!;
      expect(map.listenerCount('rotate')).toBe(1);
      expect(map.listenerCount('pitch')).toBe(1);

      map.jumpTo({ bearing: 30, pitch: 40 });
      map.fire('rotate');
      expect(svg.style.transform).toBe('rotateX(40deg) rotateZ(-30deg)');

      map.jumpTo({ bearing: -10, pitch: 5 });
      map.fire('pitch');
      expect(svg.style.transform).toBe('rotateX(5deg) rotateZ(10deg)');
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

      button(fixture, 'My location').click();
      fixture.detectChanges();

      expect(getCurrentPosition).toHaveBeenCalledTimes(1);
      expect(button(fixture, 'My location').disabled).toBe(true);

      getCurrentPosition.mock.calls[0][0]({ coords: { longitude: 5, latitude: 6 } });
      fixture.detectChanges();

      expect(map.flyTo).toHaveBeenCalledWith({ center: [5, 6], zoom: 14, duration: 1500 });
      expect(host['locateChange']).toHaveBeenCalledWith({ longitude: 5, latitude: 6 });
      expect(button(fixture, 'My location').disabled).toBe(false);
    });

    it('ignores a second click while a request is in flight', async () => {
      const getCurrentPosition = vi.fn();
      stubGeolocation(getCurrentPosition);
      const { fixture } = await render({ showLocate: true });

      button(fixture, 'My location').click();
      fixture.detectChanges();
      button(fixture, 'My location').click();

      expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    });

    it('resets the locating state on error without emitting', async () => {
      const getCurrentPosition = vi.fn();
      stubGeolocation(getCurrentPosition);
      const { fixture, map, host } = await render({ showLocate: true });

      button(fixture, 'My location').click();
      fixture.detectChanges();
      getCurrentPosition.mock.calls[0][1]({ code: 1 });
      fixture.detectChanges();

      expect(button(fixture, 'My location').disabled).toBe(false);
      expect(map.flyTo).not.toHaveBeenCalled();
      expect(host['locateChange']).not.toHaveBeenCalled();
    });
  });

  describe('fullscreen', () => {
    it('requests fullscreen on the map container', async () => {
      const { fixture, map } = await render({ showFullscreen: true });

      button(fixture, 'Toggle fullscreen').click();

      expect(map.getContainer().requestFullscreen).toHaveBeenCalledTimes(1);
    });

    it('exits fullscreen when the document is already fullscreen', async () => {
      const exitFullscreen = vi.fn();
      Object.defineProperty(document, 'exitFullscreen', {
        configurable: true,
        value: exitFullscreen,
      });
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        value: document.body,
      });
      const { fixture, map } = await render({ showFullscreen: true });

      button(fixture, 'Toggle fullscreen').click();

      expect(exitFullscreen).toHaveBeenCalledTimes(1);
      expect(map.getContainer().requestFullscreen).not.toHaveBeenCalled();
    });

    it('swaps the icon on fullscreenchange', async () => {
      const { fixture } = await render({ showFullscreen: true });
      const before = button(fixture, 'Toggle fullscreen').querySelector('path')!.getAttribute('d');

      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        value: document.body,
      });
      document.dispatchEvent(new Event('fullscreenchange'));
      fixture.detectChanges();

      const after = button(fixture, 'Toggle fullscreen').querySelector('path')!.getAttribute('d');
      expect(after).not.toBe(before);
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
});
