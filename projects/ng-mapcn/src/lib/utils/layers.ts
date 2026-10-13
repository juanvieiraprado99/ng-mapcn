import {
  type AddLayerObject,
  type Map as MapLibreMap,
  type SourceSpecification,
} from 'maplibre-gl';

/** Adds sources/layers while recording them, so a failed creation undoes only its own. */
export interface MapLayerBuilder {
  addSource(id: string, source: SourceSpecification): void;
  addLayer(layer: AddLayerObject, beforeId?: string): void;
}

/**
 * Adds the sources and layers of a layer component. When a MapLibre call throws (an id already
 * in use, a missing `beforeId`, an invalid spec), whatever this call added is removed, the error
 * goes to `onError` and `null` is returned — a source or layer that already existed is never
 * touched, since it belongs to someone else. On success, returns the defensive teardown: layers
 * before sources (invariant 4).
 */
export function addMapLayers(
  map: MapLibreMap,
  build: (builder: MapLayerBuilder) => void,
  onError: (error: unknown) => void,
): (() => void) | null {
  const sources: string[] = [];
  const layers: string[] = [];
  const teardown = () => {
    for (const id of [...layers].reverse()) {
      try {
        if (map.getLayer(id)) map.removeLayer(id);
      } catch {
        // style may be mid-reload
      }
    }
    for (const id of [...sources].reverse()) {
      try {
        if (map.getSource(id)) map.removeSource(id);
      } catch {
        // style may be mid-reload
      }
    }
  };

  try {
    build({
      addSource: (id, source) => {
        map.addSource(id, source);
        sources.push(id);
      },
      addLayer: (layer, beforeId) => {
        map.addLayer(layer, beforeId);
        layers.push(layer.id);
      },
    });
    return teardown;
  } catch (error) {
    teardown();
    onError(error);
    return null;
  }
}
