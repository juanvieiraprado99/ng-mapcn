import { type Injector, type TemplateRef, untracked } from '@angular/core';
import { type Map as MapLibreMap } from 'maplibre-gl';

import { renderPortal } from './portal';

export type MapControlPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/**
 * Mounts `tpl` as a MapLibre control (`map.addControl`), so MapLibre's corner containers stack it
 * with the other controls. Returns the teardown (defensive: the map may already be removed).
 */
export function mountMapControl(
  map: MapLibreMap,
  tpl: TemplateRef<unknown>,
  injector: Injector,
  position: MapControlPosition,
): () => void {
  const element = document.createElement('div');
  element.className = 'maplibregl-ctrl ng-map-control';
  const control = {
    onAdd: () => element,
    onRemove: () => element.remove(),
  };
  map.addControl(control, position);
  // Rendering reads the template's signals: keep them out of the caller's effect.
  const destroyView = untracked(() => renderPortal(tpl, injector, element));

  return () => {
    try {
      map.removeControl(control);
    } catch {
      // The map may already be removed.
    }
    destroyView();
    element.remove();
  };
}
