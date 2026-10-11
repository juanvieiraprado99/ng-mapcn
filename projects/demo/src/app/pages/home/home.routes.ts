import { Routes } from '@angular/router';
import { basemapProviders } from '@/shared/basemap.providers';
import { SITE_DESCRIPTION } from '@/shared/seo/site';

export const HOME_ROUTES: Routes = [
  {
    path: '',
    data: { seo: { home: true, description: SITE_DESCRIPTION } },
    // Route-level so `ng-mapcn` is only reached from a lazy chunk.
    providers: basemapProviders,
    loadComponent: () => import('./home').then((m) => m.HomeComponent),
  },
];
