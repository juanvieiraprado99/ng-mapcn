import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeRegistry } from '../../../testing/maplibre-fake';
import { renderMap, update } from '../../../testing/render';
import { MapMarkerComponent } from '../map-marker/map-marker.component';
import { MarkerTooltipComponent } from './marker-tooltip.component';

const TEMPLATE = `
  <ng-map><ng-map-marker [longitude]="3" [latitude]="4">
    @if (show) {
      <ng-marker-tooltip [offset]="offset" [anchor]="anchor"><span class="tip">Tip text</span></ng-marker-tooltip>
    }
  </ng-map-marker></ng-map>
`;

async function render(hostProps: Record<string, unknown> = {}) {
  return renderMap(TEMPLATE, {
    imports: [MapMarkerComponent, MarkerTooltipComponent],
    hostProps: { show: true, offset: 16, anchor: undefined, ...hostProps },
  });
}

describe('MarkerTooltipComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.documentElement.className = '';
    TestBed.resetTestingModule();
  });

  it('creates a hover popup with the expected options', async () => {
    await render();

    expect(fakeRegistry.popups).toHaveLength(1);
    const popup = fakeRegistry.popups[0];
    expect(popup.options).toMatchObject({
      maxWidth: 'none',
      closeButton: false,
      closeOnClick: true,
      focusAfterOpen: false,
      offset: 16,
    });
    const content = popup.getContent() as HTMLElement;
    expect(content.className).toBe('ng-tooltip-pill');
    expect(content.style.pointerEvents).toBe('none');
    expect(content.querySelector('.tip')?.textContent).toBe('Tip text');
  });

  it('passes a custom offset and anchor at creation', async () => {
    await render({ offset: [2, 3], anchor: 'top' });

    const popup = fakeRegistry.popups[0];
    expect(popup.options.offset).toEqual([2, 3]);
    expect(popup.options.anchor).toBe('top');
  });

  it('shows at the marker position on mouseenter and hides on mouseleave', async () => {
    await render();
    const popup = fakeRegistry.popups[0];
    const el = fakeRegistry.markers[0].getElement();
    popup.calls.length = 0;

    el.dispatchEvent(new MouseEvent('mouseenter'));
    expect(popup.calls).toEqual(['setLngLat', 'addTo']);
    expect(popup.getLngLat()).toEqual({ lng: 3, lat: 4 });
    expect(popup.map).toBe(fakeRegistry.maps[0]);
    expect(popup.isOpen()).toBe(true);

    el.dispatchEvent(new MouseEvent('mouseleave'));
    expect(popup.isOpen()).toBe(false);
    expect(popup.calls.at(-1)).toBe('remove');
  });

  it('shows on focus, hides on blur and on Escape, and makes the marker focusable', async () => {
    await render();
    const popup = fakeRegistry.popups[0];
    const el = fakeRegistry.markers[0].getElement();
    expect(el.getAttribute('tabindex')).toBe('0');

    el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(popup.isOpen()).toBe(true);
    el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(popup.isOpen()).toBe(false);

    el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(popup.isOpen()).toBe(false);
  });

  it('keeps a focus-opened tooltip open on mouseleave', async () => {
    await render();
    const popup = fakeRegistry.popups[0];
    const el = fakeRegistry.markers[0].getElement();

    el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('mouseleave'));
    expect(popup.isOpen()).toBe(true);
    el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(popup.isOpen()).toBe(false);
  });

  it('calls setOffset on the live popup when [offset] changes', async () => {
    const { fixture } = await render();
    const popup = fakeRegistry.popups[0];
    popup.calls.length = 0;

    update(fixture, { offset: [8, 9] });

    expect(fakeRegistry.popups).toHaveLength(1);
    expect(popup.calls).toEqual(['setOffset']);
    expect(popup.getOffset()).toEqual([8, 9]);
  });

  it('removes its listeners and popup on destroy', async () => {
    const { fixture } = await render();
    const popup = fakeRegistry.popups[0];
    const el = fakeRegistry.markers[0].getElement();
    const content = popup.getContent() as HTMLElement;

    update(fixture, { show: false });
    expect(popup.calls).toContain('remove');
    expect(content.querySelector('.tip')).toBeNull();

    popup.calls.length = 0;
    el.dispatchEvent(new MouseEvent('mouseenter'));
    expect(popup.calls).toEqual([]);
    expect(popup.isOpen()).toBe(false);
  });

  it('does not throw when the whole fixture is destroyed', async () => {
    const { fixture } = await render();
    expect(() => fixture.destroy()).not.toThrow();
  });

  describe('className', () => {
    it('applies the initial classes and keeps the built-in class', async () => {
      const { fixture } = await renderMap(
        `<ng-map><ng-map-marker [longitude]="1" [latitude]="2"><ng-marker-tooltip [className]="cls"><p>x</p></ng-marker-tooltip></ng-map-marker></ng-map>`,
        {
          imports: [MapMarkerComponent, MarkerTooltipComponent],
          hostProps: { cls: 'w-64 p-0' },
        },
      );
      await fixture.whenStable();
      const el = fakeRegistry.popups[0].getContent() as HTMLElement;
      expect(el.classList).toContain('ng-tooltip-pill');
      expect(el.classList).toContain('w-64');
      expect(el.classList).toContain('p-0');
    });

    it('swaps classes when the input changes, without dropping the built-in class', async () => {
      const { fixture } = await renderMap(
        `<ng-map><ng-map-marker [longitude]="1" [latitude]="2"><ng-marker-tooltip [className]="cls"><p>x</p></ng-marker-tooltip></ng-map-marker></ng-map>`,
        {
          imports: [MapMarkerComponent, MarkerTooltipComponent],
          hostProps: { cls: 'a b' },
        },
      );
      await fixture.whenStable();
      const before = fakeRegistry.popups[0].getContent() as HTMLElement;
      update(fixture, { cls: 'b c ng-tooltip-pill' });
      await fixture.whenStable();
      const el = fakeRegistry.popups[0].getContent() as HTMLElement;
      expect(el).toBe(before);
      expect(el.classList).not.toContain('a');
      expect(el.classList).toContain('b');
      expect(el.classList).toContain('c');
      expect(el.classList).toContain('ng-tooltip-pill');

      update(fixture, { cls: undefined });
      await fixture.whenStable();
      expect(el.className).toBe('ng-tooltip-pill');
    });
  });
});
