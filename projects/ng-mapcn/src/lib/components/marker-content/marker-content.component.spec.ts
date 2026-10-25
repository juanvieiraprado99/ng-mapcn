import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeRegistry } from '../../../testing/maplibre-fake';
import { renderMap, update } from '../../../testing/render';
import { MapMarkerComponent } from '../map-marker/map-marker.component';
import { MarkerContentComponent } from './marker-content.component';

const IMPORTS = [MapMarkerComponent, MarkerContentComponent];

describe('MarkerContentComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.documentElement.className = '';
    TestBed.resetTestingModule();
  });

  it('projects the content inside .ng-marker-content in the marker element', async () => {
    await renderMap(
      `<ng-map><ng-map-marker [longitude]="1" [latitude]="2">
         <ng-marker-content><span class="pin">Hello pin</span></ng-marker-content>
       </ng-map-marker></ng-map>`,
      { imports: IMPORTS },
    );

    const el = fakeRegistry.markers[0].getElement();
    const wrapper = el.querySelector('.ng-marker-content');
    expect(wrapper).not.toBeNull();
    expect(wrapper!.querySelector('.pin')?.textContent).toBe('Hello pin');
    expect(el.querySelector('.ng-marker-default-icon')).toBeNull();
  });

  it('clears the marker element without assigning innerHTML (Trusted Types)', async () => {
    const setInnerHTML = vi.spyOn(Element.prototype, 'innerHTML', 'set');
    await renderMap(
      `<ng-map><ng-map-marker [longitude]="1" [latitude]="2">
         <ng-marker-content><span class="pin">pin</span></ng-marker-content>
       </ng-map-marker></ng-map>`,
      { imports: IMPORTS },
    );

    expect(fakeRegistry.markers[0].getElement().querySelector('.pin')).not.toBeNull();
    expect(setInnerHTML).not.toHaveBeenCalled();
  });

  it('renders the default icon when there is no content', async () => {
    await renderMap(
      `<ng-map><ng-map-marker [longitude]="1" [latitude]="2"><ng-marker-content /></ng-map-marker></ng-map>`,
      { imports: IMPORTS },
    );

    const el = fakeRegistry.markers[0].getElement();
    expect(el.querySelector('.ng-marker-content > .ng-marker-default-icon')).not.toBeNull();
  });

  it('removes its wrapper when the content component is removed and the marker stays', async () => {
    const { fixture } = await renderMap(
      `<ng-map><ng-map-marker [longitude]="1" [latitude]="2">@if (show) {<ng-marker-content><b>x</b></ng-marker-content>}</ng-map-marker></ng-map>`,
      { imports: IMPORTS, hostProps: { show: true } },
    );
    const el = fakeRegistry.markers[0].getElement();
    expect(el.querySelector('.ng-marker-content')).not.toBeNull();

    update(fixture, { show: false });

    expect(fakeRegistry.markers).toHaveLength(1);
    expect(el.querySelector('.ng-marker-content')).toBeNull();
  });

  it('renders the default icon for whitespace-only content', async () => {
    await renderMap(
      `<ng-map><ng-map-marker [longitude]="1" [latitude]="2"><ng-marker-content>   </ng-marker-content></ng-map-marker></ng-map>`,
      { imports: IMPORTS },
    );

    expect(
      fakeRegistry.markers[0].getElement().querySelector('.ng-marker-default-icon'),
    ).not.toBeNull();
  });

  it('keeps top-level control-flow blocks inside the marker element when they re-render', async () => {
    const { fixture } = await renderMap(
      `<ng-map><ng-map-marker [longitude]="1" [latitude]="2">
         <ng-marker-content>
           @if (show) { <span class="late">late</span> }
         </ng-marker-content>
       </ng-map-marker></ng-map>`,
      { imports: IMPORTS, hostProps: { show: false } },
    );
    const el = fakeRegistry.markers[0].getElement();

    update(fixture, { show: true });

    expect(el.querySelector('.ng-marker-content .late')?.textContent).toBe('late');
    // The marker element is in the fixture (inside the map container): no copy elsewhere.
    const rendered = fixture.nativeElement.querySelectorAll('.late');
    expect(rendered).toHaveLength(1);
    expect(el.contains(rendered[0])).toBe(true);
  });

  it('clears the previous children of the marker element and removes the content on teardown', async () => {
    const { fixture } = await renderMap(
      `<ng-map><ng-map-marker [longitude]="1" [latitude]="2">
         @if (withContent) {
           <ng-marker-content><b class="fresh">fresh</b></ng-marker-content>
         }
       </ng-map-marker></ng-map>`,
      { imports: IMPORTS, hostProps: { withContent: false } },
    );
    const el = fakeRegistry.markers[0].getElement();
    el.innerHTML = '<i class="stale"></i>';

    update(fixture, { withContent: true });
    expect(el.querySelector('.stale')).toBeNull();
    expect(el.querySelector('.ng-marker-content .fresh')?.textContent).toBe('fresh');

    update(fixture, { withContent: false });
    // The embedded view is destroyed, so its projected nodes are detached.
    expect(el.querySelector('.fresh')).toBeNull();
  });

  describe('default icon follows the projected content (mapcn: children || DefaultMarkerIcon)', () => {
    /** MutationObserver records are delivered in a microtask. */
    const flushMutations = () => Promise.resolve();
    const icons = () =>
      fakeRegistry.markers[0].getElement().querySelectorAll('.ng-marker-default-icon').length;

    async function renderConditional(hostProps: Record<string, unknown>, content: string) {
      const result = await renderMap(
        `<ng-map><ng-map-marker [longitude]="1" [latitude]="2">
           <ng-marker-content>${content}</ng-marker-content>
         </ng-map-marker></ng-map>`,
        { imports: IMPORTS, hostProps },
      );
      await flushMutations();
      return result;
    }

    it('removes the default icon when conditional content appears', async () => {
      const { fixture } = await renderConditional(
        { show: false },
        '@if (show) { <span class="pin">PIN</span> }',
      );
      expect(icons()).toBe(1);

      update(fixture, { show: true });
      await flushMutations();

      expect(icons()).toBe(0);
    });

    it('shows the default icon again when the content goes away', async () => {
      const { fixture } = await renderConditional(
        { show: true },
        '@if (show) { <span class="pin">PIN</span> }',
      );
      expect(icons()).toBe(0);

      update(fixture, { show: false });
      await flushMutations();

      expect(icons()).toBe(1);
    });

    it('treats empty interpolated text as no content', async () => {
      const { fixture } = await renderConditional({ label: '' }, '{{ label }}');
      expect(icons()).toBe(1);

      update(fixture, { label: 'A' });
      await flushMutations();
      expect(icons()).toBe(0);

      update(fixture, { label: '' });
      await flushMutations();
      expect(icons()).toBe(1);
    });

    it('stops observing on teardown', async () => {
      const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
      const { fixture } = await renderMap(
        `<ng-map><ng-map-marker [longitude]="1" [latitude]="2">
           @if (withContent) { <ng-marker-content /> }
         </ng-map-marker></ng-map>`,
        { imports: IMPORTS, hostProps: { withContent: true } },
      );

      update(fixture, { withContent: false });

      expect(disconnect).toHaveBeenCalled();
    });
  });

  describe('className', () => {
    it('applies the initial classes and keeps the built-in class', async () => {
      const { fixture } = await renderMap(
        `<ng-map><ng-map-marker [longitude]="1" [latitude]="2"><ng-marker-content [className]="cls"><span class="pin">x</span></ng-marker-content></ng-map-marker></ng-map>`,
        {
          imports: IMPORTS,
          hostProps: { cls: 'w-64 p-0' },
        },
      );
      await fixture.whenStable();
      const el = fakeRegistry.markers[0]
        .getElement()
        .querySelector('.ng-marker-content') as HTMLElement;
      expect(el.classList).toContain('ng-marker-content');
      expect(el.classList).toContain('w-64');
      expect(el.classList).toContain('p-0');
    });

    it('swaps classes when the input changes, without dropping the built-in class', async () => {
      const { fixture } = await renderMap(
        `<ng-map><ng-map-marker [longitude]="1" [latitude]="2"><ng-marker-content [className]="cls"><span class="pin">x</span></ng-marker-content></ng-map-marker></ng-map>`,
        {
          imports: IMPORTS,
          hostProps: { cls: 'a b' },
        },
      );
      await fixture.whenStable();
      const before = fakeRegistry.markers[0]
        .getElement()
        .querySelector('.ng-marker-content') as HTMLElement;
      update(fixture, { cls: 'b c ng-marker-content' });
      await fixture.whenStable();
      const el = fakeRegistry.markers[0]
        .getElement()
        .querySelector('.ng-marker-content') as HTMLElement;
      expect(el).toBe(before);
      expect(el.classList).not.toContain('a');
      expect(el.classList).toContain('b');
      expect(el.classList).toContain('c');
      expect(el.classList).toContain('ng-marker-content');

      update(fixture, { cls: undefined });
      await fixture.whenStable();
      expect(el.className).toBe('ng-marker-content');
    });
  });
});
