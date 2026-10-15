import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeRegistry } from '../testing/maplibre-fake';
import { renderMap } from '../testing/render';
import { MapControlsComponent } from './components/controls/map-controls.component';
import { MapArcComponent } from './components/map-arc/map-arc.component';
import { MapClusterLayerComponent } from './components/map-cluster-layer/map-cluster-layer.component';
import { MapGeoJSONComponent } from './components/map-geojson/map-geojson.component';
import { MapHeatmapComponent } from './components/map-heatmap/map-heatmap.component';
import { MapImageOverlayComponent } from './components/map-image-overlay/map-image-overlay.component';
import { MapMarkerComponent } from './components/map-marker/map-marker.component';
import { MapPopupComponent } from './components/map-popup/map-popup.component';
import { MapRasterSourceComponent } from './components/map-raster-source/map-raster-source.component';
import { MapRouteComponent } from './components/map-route/map-route.component';
import { MapVectorSourceComponent } from './components/map-vector-source/map-vector-source.component';
import { MarkerContentComponent } from './components/marker-content/marker-content.component';
import { MarkerLabelComponent } from './components/marker-label/marker-label.component';
import { MarkerPopupComponent } from './components/marker-popup/marker-popup.component';
import { MarkerTooltipComponent } from './components/marker-tooltip/marker-tooltip.component';
import { RouteMarkerComponent } from './components/route-marker/route-marker.component';
import { RouteProgressComponent } from './components/route-progress/route-progress.component';

/**
 * Every component of the public API, composed in one tree and rendered with the server platform:
 * nothing may throw and no MapLibre object may be created (the server has no DOM to host them).
 * A new component adds itself to the template below.
 */
const TEMPLATE = `
  <ng-map>
    <ng-map-controls [showCompass]="true" [showLocate]="true" [showFullscreen]="true" />
    <ng-map-marker [longitude]="1" [latitude]="2">
      <ng-marker-content><ng-marker-label>Label</ng-marker-label></ng-marker-content>
      <ng-marker-tooltip>Tip</ng-marker-tooltip>
      <ng-marker-popup [closeButton]="true">Popup</ng-marker-popup>
    </ng-map-marker>
    <ng-map-popup [longitude]="1" [latitude]="2" [closeButton]="true">Popup</ng-map-popup>
    <ng-map-route [coordinates]="route" [progress]="0.5">
      <ng-route-progress />
      <ng-route-marker at="progress">Car</ng-route-marker>
    </ng-map-route>
    <ng-map-geojson [data]="collection" />
    <ng-map-arc [data]="arcs" />
    <ng-map-cluster-layer [data]="collection" />
    <ng-map-heatmap [data]="collection" />
    <ng-map-raster-source id="radar" [tiles]="['https://tiles.example.com/{z}/{x}/{y}.png']" />
    <ng-map-vector-source id="parcels" url="https://example.com/parcels.json" />
    <ng-map-image-overlay [url]="'https://example.com/a.png'" [coordinates]="corners" />
  </ng-map>
`;

describe('server-side rendering', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('renders every component without creating any MapLibre object', async () => {
    const route: [number, number][] = [
      [0, 0],
      [1, 1],
    ];
    const collection = { type: 'FeatureCollection', features: [] };
    const arcs = [{ from: [0, 0], to: [1, 1] }];
    const corners = [
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0],
    ];

    const { fixture, ctx } = await renderMap(TEMPLATE, {
      imports: [
        MapControlsComponent,
        MapMarkerComponent,
        MarkerContentComponent,
        MarkerLabelComponent,
        MarkerTooltipComponent,
        MarkerPopupComponent,
        MapPopupComponent,
        MapRouteComponent,
        RouteMarkerComponent,
        RouteProgressComponent,
        MapGeoJSONComponent,
        MapArcComponent,
        MapClusterLayerComponent,
        MapHeatmapComponent,
        MapRasterSourceComponent,
        MapVectorSourceComponent,
        MapImageOverlayComponent,
      ],
      hostProps: { route, collection, arcs, corners },
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });
    vi.advanceTimersByTime(1000);
    fixture.detectChanges();

    expect(ctx.map()).toBeNull();
    expect(fakeRegistry.maps).toHaveLength(0);
    expect(fakeRegistry.markers).toHaveLength(0);
    expect(fakeRegistry.popups).toHaveLength(0);
  });
});
