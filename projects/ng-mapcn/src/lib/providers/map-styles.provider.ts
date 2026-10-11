import { computed, InjectionToken, isSignal, type Provider, type Signal } from '@angular/core';

import { type MapStylesConfig } from '../styles/map-styles';

/**
 * App-wide basemap default. Every `ng-map` without an explicit `styles` input
 * (and without `blank`) reads this token; when it is not provided the Carto
 * defaults are used. The value is a signal, so changing it at runtime swaps the
 * basemap of every map on the page.
 */
export const MAP_DEFAULT_STYLES = new InjectionToken<Signal<MapStylesConfig | undefined>>(
  'MAP_DEFAULT_STYLES',
);

/**
 * Provides the app-wide basemap default.
 *
 * Accepts a static config, a signal, or a factory that runs in an injection
 * context (so it can `inject()` a service holding the signal):
 *
 * ```ts
 * provideMapStyles({ light: lightUrl, dark: darkUrl })
 * provideMapStyles(() => inject(BasemapService).styles)
 * ```
 */
export function provideMapStyles(
  source:
    | MapStylesConfig
    | Signal<MapStylesConfig | undefined>
    | (() => Signal<MapStylesConfig | undefined>),
): Provider {
  return {
    provide: MAP_DEFAULT_STYLES,
    useFactory: (): Signal<MapStylesConfig | undefined> => {
      const value = typeof source === 'function' && !isSignal(source) ? source() : source;
      return isSignal(value)
        ? (value as Signal<MapStylesConfig | undefined>)
        : computed(() => value as MapStylesConfig);
    },
  };
}
