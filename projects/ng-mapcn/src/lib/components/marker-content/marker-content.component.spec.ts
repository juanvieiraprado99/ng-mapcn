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

  it('renders the default icon when there is no content', async () => {
    await renderMap(
      `<ng-map><ng-map-marker [longitude]="1" [latitude]="2"><ng-marker-content /></ng-map-marker></ng-map>`,
      { imports: IMPORTS },
    );

    const el = fakeRegistry.markers[0].getElement();
    expect(el.querySelector('.ng-marker-content > .ng-marker-default-icon')).not.toBeNull();
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
    expect(fixture.nativeElement.querySelector('.late')).toBeNull();
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
});
