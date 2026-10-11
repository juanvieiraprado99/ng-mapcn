import type { Routes } from '@angular/router';

/**
 * `/blocks` gallery (inside the site layout). It renders no map itself — the
 * previews are iframes of `/view/:name` — so it never loads ng-mapcn.
 */
export const BLOCKS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./blocks').then((m) => m.BlocksComponent),
  },
];
