/*
 * Public API Surface of ng-mapcn
 */

// ── New compositional components (MapContextService / hierarchical DI) ────────

export * from './lib/components/map/map.component';
export * from './lib/components/controls/map-controls.component';
export * from './lib/components/map-marker/map-marker.component';
export * from './lib/components/map-marker/marker-context.service';
export * from './lib/components/marker-content/marker-content.component';
export * from './lib/components/marker-label/marker-label.component';
export * from './lib/components/marker-popup/marker-popup.component';
export * from './lib/components/marker-tooltip/marker-tooltip.component';
export * from './lib/components/map-popup/map-popup.component';
export * from './lib/components/map-route/map-route.component';
export * from './lib/components/map-cluster-layer/map-cluster-layer.component';

// ── Legacy components (MapService / mapId pattern) — kept for compat ──────────

export * from './lib/components/marker/marker.component';
export * from './lib/components/route/route.component';
export * from './lib/components/route-planning/route-planning.component';

// ── Services ──────────────────────────────────────────────────────────────────

export * from './lib/services';

// ── Models ────────────────────────────────────────────────────────────────────

export * from './lib/models';
