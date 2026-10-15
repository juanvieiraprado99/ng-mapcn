import type { Routes } from '@angular/router';

import { basemapProviders } from '@/shared/basemap.providers';

/** `/playground`, inside the site layout. Route-level providers keep `ng-mapcn` in a lazy chunk. */
export const PLAYGROUND_ROUTES: Routes = [
  {
    path: '',
    providers: basemapProviders,
    loadComponent: () => import('./playground').then((m) => m.PlaygroundComponent),
  },
];
