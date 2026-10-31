import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeRegistry } from '../../../testing/maplibre-fake';
import { renderMap, update } from '../../../testing/render';
import { trackZoneRun } from '../../../testing/zone';
import { MarkerContentComponent } from '../marker-content/marker-content.component';
import { MarkerPopupComponent } from '../marker-popup/marker-popup.component';
import { MarkerTooltipComponent } from '../marker-tooltip/marker-tooltip.component';
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

  describe('invalid positions', () => {
    it('waits for a valid position before creating the marker (async data)', async () => {
      const { fixture } = await render({ lng: undefined, lat: undefined });
      expect(fakeRegistry.markers).toHaveLength(0);

      update(fixture, { lng: 1, lat: 2 });

      expect(fakeRegistry.markers).toHaveLength(1);
      expect(fakeRegistry.markers[0].getLngLat()).toEqual({ lng: 1, lat: 2 });
    });

    it('reports an invalid position instead of throwing, and keeps the marker', async () => {
      const { fixture } = await render();
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const marker = fakeRegistry.markers[0];
      marker.calls.length = 0;

      expect(() => update(fixture, { lng: Number.NaN })).not.toThrow();

      expect(marker.calls).not.toContain('setLngLat');
      expect(error).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('invalid position') }),
      );
      update(fixture, { lng: 3 });
      expect(fakeRegistry.markers).toHaveLength(1);
      expect(marker.getLngLat()).toEqual({ lng: 3, lat: 20 });
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

    it('does not enter the zone on click or hover when nothing listens', async () => {
      await renderMap('<ng-map><ng-map-marker [longitude]="0" [latitude]="0" /></ng-map>', {
        imports: [MapMarkerComponent],
      });
      const zone = trackZoneRun();
      const el = fakeRegistry.markers[0].getElement();

      el.dispatchEvent(new MouseEvent('click'));
      el.dispatchEvent(new MouseEvent('mouseenter'));
      el.dispatchEvent(new MouseEvent('mouseleave'));

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
        imports: [
          MapMarkerComponent,
          MarkerContentComponent,
          MarkerPopupComponent,
          MarkerTooltipComponent,
        ],
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
      el.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
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

    it('ignores arrow keys when not draggable', async () => {
      const { el } = await renderA11y(
        `<ng-map><ng-map-marker [longitude]="1" [latitude]="2" (markerClick)="click($event)"><ng-marker-content /></ng-map-marker></ng-map>`,
      );
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      expect(fakeRegistry.markers[0].getLngLat()).toEqual({ lng: 1, lat: 2 });
    });

    it('removes its key listeners and attributes on destroy', async () => {
      const { el, fixture, host } = await renderA11y(
        `<ng-map><ng-map-marker [longitude]="1" [latitude]="2" [draggable]="true" (markerClick)="click($event)"><ng-marker-content /></ng-map-marker></ng-map>`,
      );
      const remove = vi.spyOn(el, 'removeEventListener');
      fixture.destroy();
      const removed = remove.mock.calls.map((c) => c[0]);
      expect(removed).toEqual(expect.arrayContaining(['keydown', 'keyup', 'blur']));
      expect(el.hasAttribute('role')).toBe(false);
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(host['click']).not.toHaveBeenCalled();
    });

    it('ignores held Enter and activates Space on keyup', async () => {
      const { el, host } = await renderA11y(
        `<ng-map><ng-map-marker [longitude]="1" [latitude]="2" (markerClick)="click($event)"><ng-marker-content /></ng-map-marker></ng-map>`,
      );
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true }));
      expect(host['click']).not.toHaveBeenCalled();

      const down = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
      el.dispatchEvent(down);
      expect(down.defaultPrevented).toBe(true);
      expect(host['click']).not.toHaveBeenCalled();
      el.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
      expect(host['click']).toHaveBeenCalledTimes(1);
    });

    it('emits markerClick on Enter and Space with a popup, without a DOM click', async () => {
      const { el, host } = await renderA11y(
        `<ng-map><ng-map-marker [longitude]="1" [latitude]="2" (markerClick)="click($event)"><ng-marker-content /><ng-marker-popup>Hi</ng-marker-popup></ng-map-marker></ng-map>`,
      );
      const domClick = vi.fn();
      el.addEventListener('click', domClick);
      const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      el.dispatchEvent(enter);
      expect(enter.defaultPrevented).toBe(false); // MapLibre's keypress toggle must still run
      expect(host['click']).toHaveBeenCalledTimes(1);
      expect(host['click'].mock.calls[0][0]).toBeInstanceOf(MouseEvent);

      el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
      expect(host['click']).toHaveBeenCalledTimes(2);
      // a DOM click would reach the map and toggle the popup a second time
      expect(domClick).not.toHaveBeenCalled();
    });

    it('gives nested interactive content no role or aria-label', async () => {
      const { el } = await renderA11y(
        `<ng-map><ng-map-marker [longitude]="1" [latitude]="2" ariaLabel="Station" (markerClick)="click($event)"><ng-marker-content><button type="button">Open</button></ng-marker-content></ng-map-marker></ng-map>`,
      );
      expect(el.hasAttribute('role')).toBe(false);
      expect(el.hasAttribute('aria-label')).toBe(false);
      expect(el.hasAttribute('tabindex')).toBe(false);
    });

    describe('popup state', () => {
      const POPUP = `<ng-map><ng-map-marker [longitude]="1" [latitude]="2" ariaLabel="Office">
        <ng-marker-content />
        @if (show) {
          <ng-marker-popup [closeButton]="true" [closeOnClick]="true">Details</ng-marker-popup>
        }
      </ng-map-marker></ng-map>`;
      const card = () => fakeRegistry.popups[0].getContent() as HTMLElement;

      it('announces a dialog popup, collapsed, with no aria-controls while closed', async () => {
        const { el } = await renderA11y(POPUP, { show: true });

        expect(el.getAttribute('role')).toBe('button');
        expect(el.getAttribute('aria-haspopup')).toBe('dialog');
        expect(el.getAttribute('aria-expanded')).toBe('false');
        expect(el.hasAttribute('aria-controls')).toBe(false);
        expect(card().id).toMatch(/^ng-marker-popup-\d+$/);
      });

      it('follows clicks and Enter/Space keypresses, pointing aria-controls at the card', async () => {
        const { el, fixture } = await renderA11y(POPUP, { show: true });

        el.click();
        fixture.detectChanges();
        expect(el.getAttribute('aria-expanded')).toBe('true');
        expect(el.getAttribute('aria-controls')).toBe(card().id);
        expect(card().isConnected).toBe(true);

        el.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter' }));
        fixture.detectChanges();
        expect(el.getAttribute('aria-expanded')).toBe('false');
        expect(el.hasAttribute('aria-controls')).toBe(false);

        el.dispatchEvent(new KeyboardEvent('keypress', { key: ' ' }));
        fixture.detectChanges();
        expect(el.getAttribute('aria-expanded')).toBe('true');
      });

      it('collapses when the close button, Escape or a map click closes the popup', async () => {
        const { el, fixture } = await renderA11y(POPUP, { show: true });
        const marker = fakeRegistry.markers[0];
        const expanded = () => {
          fixture.detectChanges();
          return el.getAttribute('aria-expanded');
        };

        marker.togglePopup();
        expect(expanded()).toBe('true');
        card().querySelector<HTMLButtonElement>('.ng-popup-close')!.click();
        expect(expanded()).toBe('false');

        marker.togglePopup();
        expect(expanded()).toBe('true');
        card().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(expanded()).toBe('false');

        marker.togglePopup();
        expect(expanded()).toBe('true');
        fakeRegistry.maps[0].fire('click');
        expect(expanded()).toBe('false');
        expect(el.hasAttribute('aria-controls')).toBe(false);
      });

      it('drops the popup state when the popup goes away', async () => {
        const { el, fixture } = await renderA11y(POPUP, { show: true });
        fakeRegistry.markers[0].togglePopup();
        fixture.detectChanges();

        update(fixture, { show: false });

        for (const name of ['aria-haspopup', 'aria-expanded', 'aria-controls']) {
          expect(el.hasAttribute(name)).toBe(false);
        }
      });

      it('sets no popup state on markers without a popup or with a tooltip only', async () => {
        const { el } = await renderA11y(
          `<ng-map>
            <ng-map-marker [longitude]="1" [latitude]="2" (markerClick)="click($event)"><ng-marker-content /></ng-map-marker>
            <ng-map-marker [longitude]="3" [latitude]="4"><ng-marker-content /><ng-marker-tooltip>Tip</ng-marker-tooltip></ng-map-marker>
          </ng-map>`,
        );
        const tooltipOnly = fakeRegistry.markers[1].getElement();

        for (const marker of [el, tooltipOnly]) {
          expect(marker.hasAttribute('aria-haspopup')).toBe(false);
          expect(marker.hasAttribute('aria-expanded')).toBe(false);
          expect(marker.hasAttribute('aria-controls')).toBe(false);
        }
      });

      it('leaves aria-expanded off a marker whose content has its own control', async () => {
        const { el, fixture } = await renderA11y(
          `<ng-map><ng-map-marker [longitude]="1" [latitude]="2"><ng-marker-content><button type="button">Open</button></ng-marker-content><ng-marker-popup>Hi</ng-marker-popup></ng-map-marker></ng-map>`,
        );
        fakeRegistry.markers[0].togglePopup();
        fixture.detectChanges();

        // No role on the marker element, where aria-expanded is not allowed (axe aria-allowed-attr).
        expect(el.hasAttribute('role')).toBe(false);
        expect(el.hasAttribute('aria-expanded')).toBe(false);
        expect(el.hasAttribute('aria-controls')).toBe(false);
      });
    });

    it('clamps latitude and wraps longitude of keyboard drags', async () => {
      const { el } = await renderA11y(
        `<ng-map><ng-map-marker [longitude]="179.5" [latitude]="85" [draggable]="true"><ng-marker-content /></ng-map-marker></ng-map>`,
      );
      const marker = fakeRegistry.markers[0];
      el.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowUp', shiftKey: true, bubbles: true }),
      );
      expect(marker.getLngLat().lat).toBe(85.05);
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      expect(marker.getLngLat().lng).toBeCloseTo(-179.5);
    });
  });
});
