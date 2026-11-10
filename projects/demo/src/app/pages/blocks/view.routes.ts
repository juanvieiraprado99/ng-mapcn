import type { ResolveFn, Routes } from '@angular/router';

import { findBlock } from '@/blocks/registry';
import { basemapProviders } from '@/shared/basemap.providers';
import { provideZardCharts } from '@/shared/components/chart';
import type { RouteSeo } from '@/shared/seo/seo.service';

/** Tab title of a block view: "<Block title> - ng-mapcn". */
const blockTitle: ResolveFn<string> = (route) =>
  findBlock(route.paramMap.get('name') ?? '')?.title ?? 'Blocks';

/** Bare previews (iframes): the gallery is the page to index. In pt-BR the tab uses `titlePt`. */
const blockSeo: ResolveFn<RouteSeo> = (route) => {
  const block = findBlock(route.paramMap.get('name') ?? '');
  return {
    noindex: true,
    canonical: '/blocks',
    description: 'ng-mapcn block preview.',
    pt: { title: block?.titlePt, description: 'Prévia de um block do ng-mapcn.' },
  };
};

/**
 * `/view/:name` — a block alone, without the site header (iframe previews and
 * "Open in new tab"). Route-level providers keep `ng-mapcn` and ECharts out of
 * the initial bundle.
 */
export const BLOCK_VIEW_ROUTES: Routes = [
  {
    path: ':name',
    title: blockTitle,
    resolve: { seo: blockSeo },
    providers: [...basemapProviders, provideZardCharts()],
    loadComponent: () => import('./block-view').then((m) => m.BlockViewComponent),
  },
];
