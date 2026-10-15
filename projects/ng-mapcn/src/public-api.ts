/*
 * Public API Surface of ng-mapcn
 */

// ── Components ────────────────────────────────────────────────────────────────

export * from './lib/components/controls/map-controls.component';
export * from './lib/components/map/map.component';
export * from './lib/components/map-arc/map-arc.component';
export * from './lib/components/map-cluster-layer/map-cluster-layer.component';
export * from './lib/components/map-geojson/map-geojson.component';
export * from './lib/components/map-heatmap/map-heatmap.component';
export * from './lib/components/map-marker/map-marker.component';
export * from './lib/components/map-marker/marker-context.service';
export * from './lib/components/map-popup/map-popup.component';
export * from './lib/components/map-route/map-route.component';
export * from './lib/components/map-route/route-context.service';
export * from './lib/components/marker-content/marker-content.component';
export * from './lib/components/marker-label/marker-label.component';
export * from './lib/components/marker-popup/marker-popup.component';
export * from './lib/components/marker-tooltip/marker-tooltip.component';
export * from './lib/components/route-marker/route-marker.component';
export * from './lib/components/route-progress/route-progress.component';

// ── Services ──────────────────────────────────────────────────────────────────

export * from './lib/services';

// ── Providers ─────────────────────────────────────────────────────────────────

export * from './lib/providers/map-labels.provider';
export * from './lib/providers/map-styles.provider';

// ── Utils & types ─────────────────────────────────────────────────────────────

export type { MapStylesConfig } from './lib/styles/map-styles';
export { blankMapStyle, defaultStyles } from './lib/styles/map-styles';
export type { BoundsGetter, BoundsTuple, MapFitBoundsOptions } from './lib/utils/bounds';
export * from './lib/utils/map-utils';
