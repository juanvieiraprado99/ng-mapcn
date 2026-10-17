import { computed, type Signal } from '@angular/core';

/** Whether `lng`/`lat` form a position MapLibre accepts (`LngLat` throws on anything else). */
export function isValidLngLat(lng: unknown, lat: unknown): boolean {
  return (
    typeof lng === 'number' &&
    typeof lat === 'number' &&
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    Math.abs(lat) <= 90
  );
}

/**
 * Turns true the first time `lng`/`lat` form a valid position and stays true (it stops tracking
 * them then). Creation effects wait on it, so async data that starts out `undefined` creates the
 * MapLibre object once it arrives, and the effect never re-runs (recreating it) afterwards.
 */
export function positionReady(lng: () => unknown, lat: () => unknown): Signal<boolean> {
  let ready = false;
  return computed(() => (ready ||= isValidLngLat(lng(), lat())));
}

/** Error reported (instead of thrown inside an effect) for a position MapLibre would reject. */
export function invalidPositionError(component: string, lng: unknown, lat: unknown): Error {
  return new Error(`${component}: invalid position [${String(lng)}, ${String(lat)}] ignored.`);
}
