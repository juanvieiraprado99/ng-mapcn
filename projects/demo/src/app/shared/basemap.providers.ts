import { inject, type Provider } from '@angular/core';
import { provideMapStyles } from 'ng-mapcn';

import { BasemapService } from './basemap.service';

/**
 * Wires the header's basemap picker into the library's app-wide default.
 *
 * Only ever imported from **lazy route files** — importing `ng-mapcn` from the
 * eager app shell would drag maplibre-gl (CommonJS, not tree-shakeable) into
 * the initial bundle.
 */
export const basemapProviders: Provider[] = [provideMapStyles(() => inject(BasemapService).styles)];
