import {
  computed,
  inject,
  InjectionToken,
  isSignal,
  type Provider,
  type Signal,
} from '@angular/core';

/** User-facing and assistive-technology strings rendered by the library. */
export interface MapLabels {
  /** Zoom-in control button. */
  zoomIn: string;
  /** Zoom-out control button. */
  zoomOut: string;
  /** Compass / reset-north control button. */
  resetNorth: string;
  /** Locate-me control button. */
  locate: string;
  /** Fullscreen control button. */
  fullscreen: string;
  /** Accessible name of the map loader overlay. */
  loading: string;
  /** Accessible name of the popup close button. */
  closePopup: string;
  /** Accessible name of an interactive marker that shows the default dot and has no `ariaLabel`. */
  marker: string;
}

/** English defaults, used for every key that is not overridden. */
export const DEFAULT_MAP_LABELS: Readonly<MapLabels> = {
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  resetNorth: 'Reset north',
  locate: 'My location',
  fullscreen: 'Toggle fullscreen',
  loading: 'Loading map',
  closePopup: 'Close popup',
  marker: 'Map marker',
};

/**
 * App-wide label overrides. Components read this token (optional) and merge it over
 * {@link DEFAULT_MAP_LABELS}. The value is a signal, so changing it at runtime (e.g. on a
 * locale switch) relabels every map on the page.
 */
export const MAP_LABELS = new InjectionToken<Signal<Partial<MapLabels> | undefined>>('MAP_LABELS');

/**
 * Provides app-wide label overrides (translations). Partial labels merge over the English
 * defaults.
 *
 * Accepts a static value, a signal, or a factory that runs in an injection context:
 *
 * ```ts
 * provideMapLabels({ zoomIn: 'Aproximar', zoomOut: 'Afastar' })
 * provideMapLabels(() => inject(I18nService).mapLabels)
 * ```
 */
export function provideMapLabels(
  source:
    | Partial<MapLabels>
    | Signal<Partial<MapLabels> | undefined>
    | (() => Signal<Partial<MapLabels> | undefined>),
): Provider {
  return {
    provide: MAP_LABELS,
    useFactory: (): Signal<Partial<MapLabels> | undefined> => {
      const value = typeof source === 'function' && !isSignal(source) ? source() : source;
      return isSignal(value)
        ? (value as Signal<Partial<MapLabels> | undefined>)
        : computed(() => value as Partial<MapLabels>);
    },
  };
}

/**
 * Resolves the effective labels: defaults, then the app-wide provider, then the optional
 * per-component override. Call in an injection context.
 */
export function injectMapLabels(
  override?: Signal<Partial<MapLabels> | undefined>,
): Signal<MapLabels> {
  const app = inject(MAP_LABELS, { optional: true });
  return computed(() => ({ ...DEFAULT_MAP_LABELS, ...app?.(), ...override?.() }));
}
