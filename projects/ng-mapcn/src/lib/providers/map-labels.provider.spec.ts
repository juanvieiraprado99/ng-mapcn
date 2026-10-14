import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fakeRegistry } from '../../testing/maplibre-fake';
import { renderMap, update } from '../../testing/render';
import { MapControlsComponent } from '../components/controls/map-controls.component';
import { MapPopupComponent } from '../components/map-popup/map-popup.component';
import {
  DEFAULT_MAP_LABELS,
  injectMapLabels,
  type MapLabels,
  provideMapLabels,
} from './map-labels.provider';

const TEMPLATE = `
  <ng-map [labels]="mapLabels" [loading]="true">
    <ng-map-controls [showCompass]="true" [showLocate]="true" [showFullscreen]="true" [labels]="controlLabels" />
    <ng-map-popup [longitude]="0" [latitude]="0" [closeButton]="true" [labels]="popupLabels">x</ng-map-popup>
  </ng-map>
`;

const render = (hostProps: Record<string, unknown> = {}, providers: unknown[] = []) =>
  renderMap(TEMPLATE, {
    imports: [MapControlsComponent, MapPopupComponent],
    providers,
    hostProps: {
      mapLabels: undefined,
      controlLabels: undefined,
      popupLabels: undefined,
      ...hostProps,
    },
  });

const aria = (root: HTMLElement, sel: string) =>
  root.querySelector(sel)?.getAttribute('aria-label');
const popup = () => fakeRegistry.popups[0].getContent() as HTMLElement;
const titles = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLButtonElement>('.ng-control-btn')).map((b) => b.title);

describe('map labels', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('uses the English defaults without a provider', async () => {
    const { fixture } = await render();
    const el = fixture.nativeElement as HTMLElement;
    expect(titles(el)).toEqual([
      DEFAULT_MAP_LABELS.zoomIn,
      DEFAULT_MAP_LABELS.zoomOut,
      DEFAULT_MAP_LABELS.resetNorth,
      DEFAULT_MAP_LABELS.locate,
      DEFAULT_MAP_LABELS.fullscreen,
    ]);
    expect(aria(el, '.ng-control-btn')).toBe('Zoom in');
    expect(aria(el, '.ng-map-loader')).toBe('Loading map');
    expect(aria(popup(), '.ng-popup-close')).toBe('Close popup');
  });

  it('merges a static provider value over the defaults', async () => {
    const { fixture } = await render({}, [
      provideMapLabels({ zoomIn: 'Aproximar', loading: 'Carregando mapa', closePopup: 'Fechar' }),
    ]);
    const el = fixture.nativeElement as HTMLElement;
    expect(titles(el)[0]).toBe('Aproximar');
    expect(titles(el)[1]).toBe('Zoom out');
    expect(aria(el, '.ng-control-btn')).toBe('Aproximar');
    expect(aria(el, '.ng-map-loader')).toBe('Carregando mapa');
    expect(aria(popup(), '.ng-popup-close')).toBe('Fechar');
  });

  it('follows a signal provider', async () => {
    const labels = signal<Partial<MapLabels>>({ zoomIn: 'Aproximar', closePopup: 'Fechar' });
    const { fixture } = await render({}, [provideMapLabels(labels)]);
    const el = fixture.nativeElement as HTMLElement;
    expect(titles(el)[0]).toBe('Aproximar');

    labels.set({ zoomIn: 'Acercar', closePopup: 'Cerrar' });
    update(fixture, {});
    expect(titles(el)[0]).toBe('Acercar');
    expect(aria(popup(), '.ng-popup-close')).toBe('Cerrar');
  });

  it('accepts a factory returning a signal', () => {
    TestBed.configureTestingModule({
      providers: [provideMapLabels(() => signal({ locate: 'Aqui' }))],
    });
    const labels = TestBed.runInInjectionContext(() => injectMapLabels());
    expect(labels().locate).toBe('Aqui');
    expect(labels().zoomIn).toBe('Zoom in');
  });

  it('lets per-component labels win over the provider', async () => {
    const { fixture } = await render(
      {
        mapLabels: { loading: 'Map load' },
        controlLabels: { zoomIn: 'Local zoom' },
        popupLabels: { closePopup: 'Local close' },
      },
      [provideMapLabels({ zoomIn: 'Provider zoom', zoomOut: 'Provider out' })],
    );
    const el = fixture.nativeElement as HTMLElement;
    expect(titles(el).slice(0, 2)).toEqual(['Local zoom', 'Provider out']);
    expect(aria(el, '.ng-map-loader')).toBe('Map load');
    expect(aria(popup(), '.ng-popup-close')).toBe('Local close');
  });
});
