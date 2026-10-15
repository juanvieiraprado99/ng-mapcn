import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeRegistry } from '../../../testing/maplibre-fake';
import { renderMap, update } from '../../../testing/render';
import { MapPopupComponent } from './map-popup.component';

const TEMPLATE = `
  <ng-map>
    @if (show) {
      <ng-map-popup
        [longitude]="lng"
        [latitude]="lat"
        [closeButton]="closeButton"
        [offset]="offset"
        [maxWidth]="maxWidth"
        [closeOnClick]="closeOnClick"
        (popupClose)="popupClose()"
      >
        <p class="body">Popup body</p>
      </ng-map-popup>
    }
  </ng-map>
`;

function hostDefaults(): Record<string, any> {
  return {
    show: true,
    lng: 10,
    lat: 20,
    closeButton: false,
    offset: 16,
    maxWidth: 'none',
    closeOnClick: true,
    popupClose: vi.fn(),
  };
}

/**
 * Renders the map first and mounts the popup afterwards (see the regression test below for a
 * popup that exists before the map is ready).
 */
async function render(hostProps: Record<string, unknown> = {}) {
  const host: Record<string, any> = { ...hostDefaults(), ...hostProps, show: false };
  const result = await renderMap(TEMPLATE, { imports: [MapPopupComponent], hostProps: host });
  update(result.fixture, { show: true });
  await result.fixture.whenStable();
  result.fixture.detectChanges();
  return { ...result, host };
}

const content = () => fakeRegistry.popups[0].getContent() as HTMLElement;

describe('MapPopupComponent', () => {
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
    it('creates one popup as soon as the map exists, without waiting for load', async () => {
      const { ctx } = await render();

      expect(ctx.isLoaded()).toBe(false);
      expect(fakeRegistry.popups).toHaveLength(1);
      const popup = fakeRegistry.popups[0];
      expect(popup.map).toBe(fakeRegistry.maps[0]);
      expect(popup.isOpen()).toBe(true);
    });

    it('passes the creation options', async () => {
      await render({ offset: [1, 2], closeOnClick: false });

      expect(fakeRegistry.popups[0].options).toEqual({
        offset: [1, 2],
        closeOnClick: false,
        closeButton: false,
        focusAfterOpen: true,
      });
    });

    it('applies maxWidth, content and position before opening', async () => {
      await render({ maxWidth: '300px' });
      const popup = fakeRegistry.popups[0];

      expect(popup.calls.slice(0, 4)).toEqual([
        'setMaxWidth',
        'setDOMContent',
        'setLngLat',
        'addTo',
      ]);
      expect(popup.getMaxWidth()).toBe('300px');
      expect(popup.getLngLat()).toEqual({ lng: 10, lat: 20 });
    });

    it('projects the content into .ng-popup-card', async () => {
      await render();

      expect(content().className).toBe('ng-popup-card');
      expect(content().querySelector('.body')?.textContent).toBe('Popup body');
    });
  });

  describe('content projection before the map is ready', () => {
    // Regression: the content view used to live in the host's ViewContainerRef, so <ng-map>'s
    // `@if (mapInstance()) { <ng-content /> }` projection re-inserted its nodes next to the host,
    // leaving the card empty.
    it('projects the content when the popup exists from the first render', async () => {
      await renderMap(TEMPLATE, {
        imports: [MapPopupComponent],
        hostProps: hostDefaults(),
      });

      expect(content().querySelector('.body')?.textContent).toBe('Popup body');
    });
  });

  describe('close button', () => {
    it('is absent by default', async () => {
      await render();
      expect(content().querySelector('.ng-popup-close')).toBeNull();
    });

    it('builds the close icon as SVG elements, without assigning innerHTML (Trusted Types)', async () => {
      const setInnerHTML = vi.spyOn(Element.prototype, 'innerHTML', 'set');
      await render({ closeButton: true });

      const svg = content().querySelector('.ng-popup-close svg')!;
      expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
      expect(svg.querySelectorAll('path')).toHaveLength(2);
      expect(setInnerHTML).not.toHaveBeenCalled();
    });

    it('is appended with an aria-label when closeButton is set and removes the popup on click', async () => {
      const { host } = await render({ closeButton: true });
      const button = content().querySelector<HTMLButtonElement>('.ng-popup-close')!;

      expect(button).not.toBeNull();
      expect(button.getAttribute('aria-label')).toBe('Close popup');
      expect(button.type).toBe('button');

      button.click();

      expect(fakeRegistry.popups[0].isOpen()).toBe(false);
      expect(host['popupClose']).toHaveBeenCalledTimes(1);
    });

    it('is added and removed at runtime', async () => {
      const { fixture } = await render();

      update(fixture, { closeButton: true });
      expect(content().querySelectorAll('.ng-popup-close')).toHaveLength(1);

      update(fixture, { closeButton: false });
      expect(content().querySelector('.ng-popup-close')).toBeNull();

      update(fixture, { closeButton: true });
      expect(content().querySelectorAll('.ng-popup-close')).toHaveLength(1);
      expect(fakeRegistry.popups).toHaveLength(1);
    });
  });

  describe('reconciliation', () => {
    it('calls setLngLat only when the position differs', async () => {
      const { fixture } = await render();
      const popup = fakeRegistry.popups[0];
      popup.calls.length = 0;

      update(fixture, { lng: 10, lat: 20, maxWidth: 'none' });
      expect(popup.calls.filter((c) => c === 'setLngLat')).toHaveLength(0);

      update(fixture, { lng: 11 });
      expect(popup.calls.filter((c) => c === 'setLngLat')).toHaveLength(1);
      expect(popup.getLngLat()).toEqual({ lng: 11, lat: 20 });
      expect(fakeRegistry.popups).toHaveLength(1);
    });

    it('applies a new offset with setOffset', async () => {
      const { fixture } = await render();
      const popup = fakeRegistry.popups[0];
      popup.calls.length = 0;

      update(fixture, { offset: [7, 8] });

      expect(popup.calls).toContain('setOffset');
      expect(popup.getOffset()).toEqual([7, 8]);
    });

    it('calls setMaxWidth only when maxWidth differs', async () => {
      const { fixture } = await render();
      const popup = fakeRegistry.popups[0];
      popup.calls.length = 0;

      update(fixture, { lng: 12 });
      expect(popup.calls).not.toContain('setMaxWidth');

      update(fixture, { maxWidth: '200px' });
      expect(popup.calls.filter((c) => c === 'setMaxWidth')).toHaveLength(1);
      expect(popup.getMaxWidth()).toBe('200px');
    });
  });

  describe('events', () => {
    it('emits popupClose when the popup closes', async () => {
      const { host } = await render();

      fakeRegistry.popups[0].remove();

      expect(host['popupClose']).toHaveBeenCalledTimes(1);
    });

    it('closes on Escape pressed inside the card, and ignores other keys', async () => {
      const { host } = await render();
      const body = content().querySelector('.body') as HTMLElement;

      body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(fakeRegistry.popups[0].isOpen()).toBe(true);

      body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(fakeRegistry.popups[0].isOpen()).toBe(false);
      expect(host['popupClose']).toHaveBeenCalledTimes(1);
    });
  });

  describe('teardown', () => {
    it('removes the popup and destroys the projected content', async () => {
      const { fixture } = await render();
      const popup = fakeRegistry.popups[0];
      const card = content();

      update(fixture, { show: false });

      expect(popup.calls).toContain('remove');
      expect(popup.isOpen()).toBe(false);
      expect(card.querySelector('.body')).toBeNull();
    });

    it('swallows an error thrown by popup.remove() and still destroys the content', async () => {
      const { fixture } = await render();
      const card = content();
      vi.spyOn(fakeRegistry.popups[0], 'remove').mockImplementation(() => {
        throw new Error('already removed');
      });

      expect(() => update(fixture, { show: false })).not.toThrow();
      expect(card.querySelector('.body')).toBeNull();
    });

    it('does not throw when the whole fixture is destroyed', async () => {
      const { fixture } = await render();
      expect(() => fixture.destroy()).not.toThrow();
    });

    it('does not report the teardown as a close (no emit on destroyed outputs)', async () => {
      const { fixture, host } = await render();
      const warn = vi.spyOn(console, 'warn');

      update(fixture, { show: false });

      expect(host['popupClose']).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('open (two-way)', () => {
    const OPEN_TEMPLATE = `
      <ng-map>
        <ng-map-popup [longitude]="lng" [latitude]="lat" [(open)]="open" (popupClose)="popupClose()">
          <p class="body">Popup body</p>
        </ng-map-popup>
      </ng-map>
    `;

    async function renderOpen(open: boolean) {
      const host: Record<string, any> = { lng: 10, lat: 20, open, popupClose: vi.fn() };
      const result = await renderMap(OPEN_TEMPLATE, {
        imports: [MapPopupComponent],
        hostProps: host,
      });
      result.fixture.detectChanges();
      return { ...result, host: result.fixture.componentInstance as Record<string, any> };
    }

    it('writes false back when the popup is closed by the map or the close button', async () => {
      const { fixture, host } = await renderOpen(true);

      fakeRegistry.popups[0].remove();
      fixture.detectChanges();

      expect(host['open']).toBe(false);
      expect(host['popupClose']).toHaveBeenCalledTimes(1);
    });

    it('re-opens the same popup instance when open becomes true again', async () => {
      const { fixture } = await renderOpen(true);
      fakeRegistry.popups[0].remove();
      fixture.detectChanges();

      update(fixture, { open: true, lng: 30 });

      expect(fakeRegistry.popups).toHaveLength(1);
      expect(fakeRegistry.popups[0].isOpen()).toBe(true);
      expect(fakeRegistry.popups[0].getLngLat()).toEqual({ lng: 30, lat: 20 });
    });

    it('closes the popup when open is set to false', async () => {
      const { fixture, host } = await renderOpen(true);

      update(fixture, { open: false });

      expect(fakeRegistry.popups[0].isOpen()).toBe(false);
      expect(host['popupClose']).toHaveBeenCalledTimes(1);
    });

    it('does not show the popup while open starts as false', async () => {
      const { fixture } = await renderOpen(false);
      expect(fakeRegistry.popups[0].isOpen()).toBe(false);

      update(fixture, { open: true });

      expect(fakeRegistry.popups[0].isOpen()).toBe(true);
    });

    it('stays closed when only the position changes (mapcn parity)', async () => {
      const { fixture } = await renderOpen(true);
      fakeRegistry.popups[0].remove();
      fixture.detectChanges();

      update(fixture, { lng: 40 });

      expect(fakeRegistry.popups[0].isOpen()).toBe(false);
    });
  });

  describe('className', () => {
    it('applies the initial classes and keeps the built-in class', async () => {
      const { fixture } = await renderMap(
        `<ng-map><ng-map-popup [longitude]="1" [latitude]="2" [className]="cls"><p>x</p></ng-map-popup></ng-map>`,
        {
          imports: [MapPopupComponent],
          hostProps: { cls: 'w-64 p-0' },
        },
      );
      await fixture.whenStable();
      const el = fakeRegistry.popups[0].getContent() as HTMLElement;
      expect(el.classList).toContain('ng-popup-card');
      expect(el.classList).toContain('w-64');
      expect(el.classList).toContain('p-0');
    });

    it('swaps classes when the input changes, without dropping the built-in class', async () => {
      const { fixture } = await renderMap(
        `<ng-map><ng-map-popup [longitude]="1" [latitude]="2" [className]="cls"><p>x</p></ng-map-popup></ng-map>`,
        {
          imports: [MapPopupComponent],
          hostProps: { cls: 'a b' },
        },
      );
      await fixture.whenStable();
      const before = fakeRegistry.popups[0].getContent() as HTMLElement;
      update(fixture, { cls: 'b c ng-popup-card' });
      await fixture.whenStable();
      const el = fakeRegistry.popups[0].getContent() as HTMLElement;
      expect(el).toBe(before);
      expect(el.classList).not.toContain('a');
      expect(el.classList).toContain('b');
      expect(el.classList).toContain('c');
      expect(el.classList).toContain('ng-popup-card');

      update(fixture, { cls: undefined });
      await fixture.whenStable();
      expect(el.className).toBe('ng-popup-card');
    });
  });
});
