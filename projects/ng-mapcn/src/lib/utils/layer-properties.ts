import { type Map as MapLibreMap } from 'maplibre-gl';

/**
 * Applies `props` as paint or layout properties of `layerId`, and resets to the MapLibre default
 * (`undefined`) every key in `previousKeys` that is no longer in `props` — otherwise a key removed
 * from an input would stay applied until the layer is recreated. Returns the keys now applied, to
 * pass as `previousKeys` next time.
 */
export function syncLayerProperties(
  map: MapLibreMap,
  layerId: string,
  kind: 'paint' | 'layout',
  props: Record<string, unknown>,
  previousKeys: ReadonlySet<string>,
): Set<string> {
  // Keys come from typed paint/layout specs; MapLibre validates the values at runtime.
  const set = (key: string, value: unknown) =>
    kind === 'paint'
      ? map.setPaintProperty(layerId, key as never, value as never)
      : map.setLayoutProperty(layerId, key as never, value as never);

  for (const key of previousKeys) {
    if (!(key in props)) set(key, undefined);
  }
  for (const [key, value] of Object.entries(props)) set(key, value);
  return new Set(Object.keys(props));
}
