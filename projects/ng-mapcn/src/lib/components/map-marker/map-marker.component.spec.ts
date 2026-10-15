import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeRegistry } from '../../../testing/maplibre-fake';
import { renderMap, update } from '../../../testing/render';
import { trackZoneRun } from '../../../testing/zone';
import { MarkerContentComponent } from '../marker-content/marker-content.component';
import { MapMarkerComponent } from './map-marker.component';

const TEMPLATE = `
  <ng-map>
  @if (show) {
    <ng-map-marker
      [longitude]="lng"
      [latitude]="lat"
      [draggable]="draggable"
      [offset]="offset"
      [rotation]="rotation"
      [anchor]="anchor"
      [rotationAlignment]="rotationAlignment"
      [pitchAlignment]="pitchAlignment"
      (markerClick)="markerClick($event)"
      (markerMouseEnter)="markerMouseEnter($event)"
      (markerMouseLeave)="markerMouseLeave($event)"
      (dragStart)="dragStart($event)"
      (drag)="drag($event)"
      (dragEnd)="dragEnd($event)"
    />
  }
  </ng-map>
`;

function hostDefaults(): Record<string, any> {
  return {
    show: true,
    lng: 10,
    lat: 20,
    draggable: false,
    offset: undefined,
    rotation: 0,
    anchor: undefined,
    rotationAlignment: 'auto',
    pitchAlignment: 'auto',
    markerClick: vi.fn(),
    markerMouseEnter: vi.fn(),
    markerMouseLeave: vi.fn(),
    dragStart: vi.fn(),
    drag: vi.fn(),
    dragEnd: vi.fn(),
  };
}

async function render(hostProps: Record<string, unknown> = {}) {
  const host = { ...hostDefaults(), ...hostProps };
  const result = await renderMap(TEMPLATE, { imports: [MapMarkerComponent], hostProps: host });
  return { ...result, host };
}

describe('MapMarkerComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.documentElement.className = '';
    TestBed.resetTestingModule();
  });

  describe('creation', () => {
    it('creates one marker as soon as the map exists, without waiting for load', async () => {
      const { ctx } = await render();

      expect(ctx.isLoaded()).toBe(false);
      expect(fakeRegistry.markers).toHaveLength(1);
      const marker = fakeRegistry.markers[0];
      expect(marker.map).toBe(fakeRegistry.maps[0]);
      expect(marker.getLngLat()).toEqual({ lng: 10, lat: 20 });
      expect(marker.calls.slice(0, 2)).toEqual(['setLngLat', 'addTo']);
    });

    it('passes the creation options', async () => {
      await render({
        draggable: true,
        offset: [3, 4],
        rotation: 45,
        anchor: 'bottom',
        rotationAlignment: 'map',
        pitchAlignment: 'viewport',
      });

      const { options } = fakeRegistry.markers[0];
      expect(options.element).toBeInstanceOf(HTMLElement);
      expect(options.draggable).toBe(true);
      expect(options.offset).toEqual([3, 4]);
      expect(options.rotation).toBe(45);
      expect(options.anchor).toBe('bottom');
      expect(options.rotationAlignment).toBe('map');
      expect(options.pitchAlignment).toBe('viewport');
    });

    it('omits anchor when it is not set', async () => {
      await render();
      expect('anchor' in fakeRegistry.markers[0].options).toBe(false);
    });

    it('exposes the instance through getMarker()', async () => {
      const { fixture } = await render();
      const cmp = fixture.debugElement.query(By.directive(MapMarkerComponent))
        .componentInstance as MapMarkerComponent;

      expect(cmp.getMarker()).toBe(fakeRegistry.markers[0]);
    });
  });

  describe('reconciliation', () => {
    it('updates the position without creating a new marker', async () => {
      const { fixture } = await render();
      const marker = fakeRegistry.markers[0];
      marker.calls.length = 0;

      update(fixture, { lng: 1, lat: 2 });

      expect(fakeRegistry.markers).toHaveLength(1);
      expect(marker.getLngLat()).toEqual({ lng: 1, lat: 2 });
      expect(marker.calls).toEqual(['setLngLat']);
    });

    it.each([
      ['draggable', true, 'setDraggable'],
      ['rotation', 90, 'setRotation'],
      ['rotationAlignment', 'map', 'setRotationAlignment'],
      ['pitchAlignment', 'map', 'setPitchAlignment'],
      ['offset', [5, 6], 'setOffset'],
    ])('calls only the %s setter when it changes', async (prop, value, setter) => {
      const { fixture } = await render();
      const marker = fakeRegistry.markers[0];
      marker.calls.length = 0;

      update(fixture, { [prop]: value });

      expect(fakeRegistry.markers).toHaveLength(1);
      expect(marker.calls).toEqual([setter]);
    });

    it('calls no setter when a value is re-assigned unchanged', async () => {
      const { fixture } = await render({ rotation: 30, offset: [1, 1] });
      const marker = fakeRegistry.markers[0];
      marker.calls.length = 0;

      update(fixture, { rotation: 30, offset: [1, 1], lng: 10, lat: 20 });

      expect(marker.calls).toEqual([]);
    });

    it('resets the offset to [0, 0] when it becomes undefined', async () => {
      const { fixture } = await render({ offset: [5, 6] });
      const marker = fakeRegistry.markers[0];
      marker.calls.length = 0;

      update(fixture, { offset: undefined });

      expect(marker.calls).toEqual(['setOffset']);
      expect(marker.getOffset()).toMatchObject({ x: 0, y: 0 });
    });
  });

  describe('events', () => {
    it('emits click, mouseenter and mouseleave from the marker element', async () => {
      const { host } = await render();
      const el = fakeRegistry.markers[0].getElement();

      el.dispatchEvent(new MouseEvent('click'));
      el.dispatchEvent(new MouseEvent('mouseenter'));
      el.dispatchEvent(new MouseEvent('mouseleave'));

      expect(host['markerClick']).toHaveBeenCalledTimes(1);
      expect(host['markerMouseEnter']).toHaveBeenCalledTimes(1);
      expect(host['markerMouseLeave']).toHaveBeenCalledTimes(1);
      expect(host['markerClick'].mock.calls[0][0]).toBeInstanceOf(MouseEvent);
    });

    it('emits dragStart, drag and dragEnd with the marker position', async () => {
      const { host } = await render();
      const marker = fakeRegistry.markers[0];

      marker.setLngLat([7, 8]);
      marker.fire('dragstart');
      marker.setLngLat([9, 10]);
      marker.fire('drag');
      marker.setLngLat([11, 12]);
      marker.fire('dragend');

      expect(host['dragStart']).toHaveBeenCalledWith({ lng: 7, lat: 8 });
      expect(host['drag']).toHaveBeenCalledWith({ lng: 9, lat: 10 });
      expect(host['dragEnd']).toHaveBeenCalledWith({ lng: 11, lat: 12 });
    });
  });

  describe('teardown', () => {
    it('removes the marker exactly once when the component is destroyed', async () => {
      const { fixture } = await render();
      const marker = fakeRegistry.markers[0];

      update(fixture, { show: false });

      expect(marker.calls.filter((c) => c === 'remove')).toHaveLength(1);
      expect(marker.map).toBeNull();
    });

    it('does not throw when the whole fixture is destroyed', async () => {
      const { fixture } = await render();
      expect(() => fixture.destroy()).not.toThrow();
      expect(fakeRegistry.markers[0].calls.filter((c) => c === 'remove')).toHaveLength(1);
    });
  });

  describe('drag and the Angular zone', () => {
    it('emits drag inside the zone, so zone.js apps run change detection', async () => {
      const { host } = await render({ draggable: true });
      const zone = trackZoneRun();
      const insideAtEmit: boolean[] = [];
      host['drag'].mockImplementation(() => insideAtEmit.push(zone.inside));

      fakeRegistry.markers[0].fire('drag');

      expect(insideAtEmit).toEqual([true]);
    });

    it('does not enter the zone on drag when nothing listens to drag', async () => {
      await renderMap(
        '<ng-map><ng-map-marker [longitude]="0" [latitude]="0" [draggable]="true" /></ng-map>',
        { imports: [MapMarkerComponent] },
      );
      const zone = trackZoneRun();

      fakeRegistry.markers[0].fire('drag');

      expect(zone.runs).toBe(0);
    });
  });

  describe('keyboard accessibility', () => {
    async function renderA11y(template: string, hostProps: Record<string, unknown> = {}) {
      const host = {
        click: vi.fn(),
        dragEnd: vi.fn(),
        dragStart: vi.fn(),
        drag: vi.fn(),
        ...hostProps,
      };
      const result = await renderMap(template, {
        imports: [MapMarkerComponent, MarkerContentComponent],
        hostProps: host,
      });
      return { ...result, host, el: fakeRegistry.markers[0].getElement() };
    }

    it('leaves a marker without handlers out of the tab order', async () => {
      const { el } = await renderA11y(
        `<ng-map><ng-map-marker [longitude]="1" [latitude]="2"><ng-marker-content /></ng-map-marker></ng-map>`,
      );
      expect(el.hasAttribute('role')).toBe(false);
      expect(el.hasAttribute('tabindex')).toBe(false);
      expect(el.hasAttribute('aria-label')).toBe(false);
    });

    it('makes a (markerClick) marker a named button operated by Enter and Space', async () => {
      const { el, host } = await renderA11y(
        `<ng-map><ng-map-marker [longitude]="1" [latitude]="2" (markerClick)="click($event)"><ng-marker-content /></ng-map-marker></ng-map>`,
      );
      expect(el.getAttribute('role')).toBe('button');
      expect(el.getAttribute('tabindex')).toBe('0');
      expect(el.getAttribute('aria-label')).toBe('Map marker');

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      expect(host['click']).toHaveBeenCalledTimes(2);
      expect(host['click'].mock.calls[0][0]).toBeInstanceOf(MouseEvent);
    });

    it('uses ariaLabel and keeps app-provided attributes', async () => {
      const { el } = await renderA11y(
        `<ng-map><ng-map-marker [longitude]="1" [latitude]="2" ariaLabel="Station" (markerClick)="click($event)"><ng-marker-content /></ng-map-marker></ng-map>`,
      );
      expect(el.getAttribute('aria-label')).toBe('Station');
    });

    it('does not name custom content and gives labelled static markers role img', async () => {
      const { el } = await renderA11y(
        `<ng-map><ng-map-marker [longitude]="1" [latitude]="2" ariaLabel="Home"><ng-marker-content>x</ng-marker-content></ng-map-marker></ng-map>`,
      );
      expect(el.getAttribute('role')).toBe('img');
      expect(el.hasAttribute('tabindex')).toBe(false);
      expect(el.getAttribute('aria-label')).toBe('Home');
    });

    it('moves a draggable marker with arrow keys, Shift for a larger step', async () => {
      const { el, host } = await renderA11y(
        `<ng-map><ng-map-marker [longitude]="1" [latitude]="2" [draggable]="true" (dragStart)="dragStart($event)" (drag)="drag($event)" (dragEnd)="dragEnd($event)"><ng-marker-content /></ng-map-marker></ng-map>`,
      );
      expect(el.getAttribute('tabindex')).toBe('0');
      const marker = fakeRegistry.markers[0];

      const right = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
      });
      el.dispatchEvent(right);
      expect(right.defaultPrevented).toBe(true);
      expect(marker.getLngLat()).toEqual({ lng: 2, lat: 2 });
      expect(host['dragStart']).toHaveBeenCalledWith({ lng: 1, lat: 2 });
      expect(host['drag']).toHaveBeenCalledTimes(1);
      expect(host['dragEnd']).toHaveBeenCalledWith({ lng: 2, lat: 2 });

      el.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowUp', shiftKey: true, bubbles: true }),
      );
      expect(marker.getLngLat()).toEqual({ lng: 2, lat: 7 });
    });

    it('ignores arrow keys when not draggable and removes its keydown listener on destroy', async () => {
      const { el, fixture } = await renderA11y(
        `<ng-map><ng-map-marker [longitude]="1" [latitude]="2" (markerClick)="click($event)"><ng-marker-content /></ng-map-marker></ng-map>`,
      );
      const marker = fakeRegistry.markers[0];
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      expect(marker.getLngLat()).toEqual({ lng: 1, lat: 2 });
      fixture.destroy();
      expect(el.hasAttribute('role')).toBe(false);
    });
  });
});
