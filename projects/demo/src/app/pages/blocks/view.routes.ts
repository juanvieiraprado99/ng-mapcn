import type { ResolveFn, Routes } from '@angular/router';

import { findBlock } from '@/blocks/registry';
import { basemapProviders } from '@/shared/basemap.providers';
import { provideZardCharts } from '@/shared/components/chart';

/** Tab title of a block view: "<Block title> - ng-mapcn". */
const blockTitle: ResolveFn<string> = (route) =>
  findBlock(route.paramMap.get('name') ?? '')?.title ?? 'Blocks';

/**
 * `/view/:name` — a block alone, without the site header (iframe previews and
 * "Open in new tab"). Route-level providers keep `ng-mapcn` and ECharts out of
 * the initial bundle.
 */
export const BLOCK_VIEW_ROUTES: Routes = [
  {
    path: ':name',
    title: blockTitle,
    // Bare previews (iframes): the gallery is the page to index.
    data: { seo: { noindex: true, canonical: '/blocks', description: 'ng-mapcn block preview.' } },
    providers: [...basemapProviders, provideZardCharts()],
    loadComponent: () => import('./block-view').then((m) => m.BlockViewComponent),
  },
];
