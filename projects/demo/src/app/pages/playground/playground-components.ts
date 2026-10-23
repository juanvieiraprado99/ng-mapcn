import type { Type } from '@angular/core';
import {
  MapArcComponent,
  MapClusterLayerComponent,
  MapFillExtrusionComponent,
  MapGeoJSONComponent,
  MapHeatmapComponent,
  MapImageOverlayComponent,
  MapMarkerComponent,
  MapRasterSourceComponent,
  MapRouteComponent,
  MapTerrainComponent,
} from 'ng-mapcn';
import { MapDrawComponent } from 'ng-mapcn/draw';

/**
 * Spec `className` -> the class rendered with `NgComponentOutlet`. Kept apart from the pure
 * specs so they stay importable (and testable) without `ng-mapcn`/maplibre-gl.
 */
export const PLAYGROUND_COMPONENTS: Record<string, Type<unknown>> = {
  MapArcComponent,
  MapClusterLayerComponent,
  MapDrawComponent,
  MapFillExtrusionComponent,
  MapGeoJSONComponent,
  MapHeatmapComponent,
  MapImageOverlayComponent,
  MapMarkerComponent,
  MapRasterSourceComponent,
  MapRouteComponent,
  MapTerrainComponent,
};
