import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeRegistry } from '../../../testing/maplibre-fake';
import { renderMap, update } from '../../../testing/render';
import { MapMarkerComponent } from '../map-marker/map-marker.component';
import { MarkerPopupComponent } from './marker-popup.component';

const TEMPLATE = `
  <ng-map><ng-map-marker [longitude]="1" [latitude]="2">
    @if (show) {
      <ng-marker-popup (popupClose)="popupClose()"><p class="body">Popup body</p></ng-marker-popup>
    }
  </ng-map-marker></ng-map>
`;

async function render() {
  const popupClose = vi.fn();
  const result = await renderMap(TEMPLATE, {
    imports: [MapMarkerComponent, MarkerPopupComponent],
    hostProps: { show: true, popupClose },
  });
  return { ...result, popupClose };
}

describe('MarkerPopupComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.documentElement.className = '';
    TestBed.resetTestingModule();
  });

  it('creates one popup with the expected options and attaches it to the marker', async () => {
    await render();

    expect(fakeRegistry.popups).toHaveLength(1);
    const popup = fakeRegistry.popups[0];
    expect(popup.options).toEqual({
      maxWidth: 'none',
      closeButton: false,
      closeOnClick: false,
      focusAfterOpen: true,
    });
    expect(fakeRegistry.markers[0].getPopup()).toBe(popup);
  });

  it('projects the content into .ng-popup-card', async () => {
    await render();

    const content = fakeRegistry.popups[0].getContent() as HTMLElement;
    expect(content.className).toBe('ng-popup-card');
    expect(content.querySelector('.body')?.textContent).toBe('Popup body');
  });

  it('emits popupClose when the popup closes', async () => {
    const { popupClose } = await render();
    const popup = fakeRegistry.popups[0];

    popup.addTo(fakeRegistry.maps[0]);
    popup.remove();

    expect(popupClose).toHaveBeenCalledTimes(1);
  });

  it('detaches and removes the popup on destroy and drops the projected content', async () => {
    const { fixture } = await render();
    const popup = fakeRegistry.popups[0];
    const content = popup.getContent() as HTMLElement;
    popup.addTo(fakeRegistry.maps[0]);
    const marker = fakeRegistry.markers[0];

    update(fixture, { show: false });

    expect(marker.getPopup()).toBeNull();
    expect(popup.calls).toContain('remove');
    expect(popup.isOpen()).toBe(false);
    expect(content.querySelector('.body')).toBeNull();
  });

  it('does not throw when the whole fixture is destroyed', async () => {
    const { fixture } = await render();
    expect(() => fixture.destroy()).not.toThrow();
  });
});
