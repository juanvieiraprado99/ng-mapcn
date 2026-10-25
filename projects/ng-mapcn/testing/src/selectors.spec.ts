import { TestBed } from '@angular/core/testing';
import {
  MapControlsComponent,
  MapMarkerComponent,
  MapPopupComponent,
  MarkerContentComponent,
  MarkerTooltipComponent,
} from 'ng-mapcn';
import { afterEach, describe, expect, it } from 'vitest';

import { loadMap, renderMap, resetMapTesting } from './render';
import { MAP_TEST_SELECTORS as S } from './selectors';

const TEMPLATE = `
  <ng-map [loading]="true">
    <ng-map-controls />
    <ng-map-marker [longitude]="1" [latitude]="2">
      <ng-marker-content>Pin</ng-marker-content>
      <ng-marker-tooltip>Tip</ng-marker-tooltip>
    </ng-map-marker>
    <ng-map-popup [longitude]="3" [latitude]="4" [closeButton]="true">Card</ng-map-popup>
  </ng-map>
`;

describe('MAP_TEST_SELECTORS', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    resetMapTesting();
  });

  it('matches the DOM the library renders on the maplibre-gl fake', async () => {
    const { fixture, map } = await renderMap(TEMPLATE, {
      imports: [
        MapControlsComponent,
        MapMarkerComponent,
        MapPopupComponent,
        MarkerContentComponent,
        MarkerTooltipComponent,
      ],
    });
    await loadMap(fixture);
    const root = fixture.nativeElement as HTMLElement;
    const container = map!.getContainer();
    // The tooltip is a popup too, shown while the marker is hovered.
    container.querySelector(S.marker)!.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();

    expect(root.querySelectorAll(S.map)).toHaveLength(1);
    expect(root.querySelector(S.loader)).not.toBeNull();
    expect(container.querySelector(`.maplibregl-canvas-container > ${S.marker}`)?.textContent).toBe(
      'Pin',
    );
    const popups = container.querySelectorAll(`:scope > ${S.popup}`);
    expect(popups).toHaveLength(2);
    const card = container.querySelector(`${S.popup} > .maplibregl-popup-content > ${S.popupCard}`);
    expect(card?.textContent).toContain('Card');
    expect(card?.getAttribute('role')).toBe('dialog');
    expect(card?.querySelector(S.popupClose)).not.toBeNull();
    expect(container.querySelector(`${S.popup} ${S.tooltip}`)?.textContent).toContain('Tip');
    const controls = container.querySelector(`.maplibregl-control-container ${S.controls}`);
    expect(controls?.querySelector(S.controlGroup)).not.toBeNull();
  });

  it('lists the stable selectors, each a valid CSS selector', () => {
    expect(Object.keys(S)).toEqual([
      'map',
      'loader',
      'marker',
      'popup',
      'popupCard',
      'tooltip',
      'popupClose',
      'controls',
      'controlGroup',
    ]);
    for (const selector of Object.values(S)) {
      expect(() => document.querySelector(selector)).not.toThrow();
    }
  });
});
