import { vi } from 'vitest';

import { type FakeMap } from './maplibre-fake';

// The library's own specs reuse the published helpers (`ng-mapcn/testing`). The layout patch that
// `renderMap` installs is undone by `resetMapTesting()` in `setup.ts`.
export {
  renderMap,
  type RenderMapOptions,
  setMapSize,
  structuralCalls,
  update,
} from '../../testing/src/public-api';

/**
 * Simulates MapLibre finishing the style load: `load`, `styledata`, then the 100 ms debounce.
 * Synchronous (unlike the published `loadMap`), on Vitest fake timers.
 */
export function loadMap(map: FakeMap): void {
  if (!vi.isFakeTimers()) {
    throw new Error('loadMap() requires fake timers: call vi.useFakeTimers() first.');
  }
  map.fire('load');
  map.fire('styledata');
  vi.advanceTimersByTime(100);
}

/** `loadMap()` followed by change detection so the layer components' effects run. */
export function loadAndSettle(fixture: { detectChanges(): void }, map: FakeMap): void {
  loadMap(map);
  fixture.detectChanges();
}

/**
 * Simulates the style requested by `setStyle` arriving: `style.load` + `styledata` (see
 * `finishStyleLoad`), the 100 ms debounce, then effects.
 */
export function reloadStyle(fixture: { detectChanges(): void }, map: FakeMap): void {
  if (map.hasPendingStyle()) map.finishStyleLoad();
  else map.fire('styledata');
  vi.advanceTimersByTime(100);
  fixture.detectChanges();
}
