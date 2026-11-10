import { type Routes } from '@angular/router';

import { MainLayoutComponent } from './layout/main-layout';

// Every route is lazy: nothing here may import `ng-mapcn`, or maplibre-gl
// (CommonJS, not tree-shakeable) ends up in the initial bundle.
export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () => import('./pages/home/home.routes').then((m) => m.HOME_ROUTES),
      },
      {
        path: 'docs',
        loadChildren: () => import('./pages/docs/docs.routes').then((m) => m.DOCS_ROUTES),
      },
      {
        path: 'blocks',
        title: 'Map Blocks',
        data: {
          seo: {
            title: 'Angular Map Blocks and Templates',
            description:
              'Ready-made Angular map blocks built with ng-mapcn and zard/ui: analytics dashboards, choropleths, heatmaps, store locators, delivery trackers and more. Copy and paste.',
            keywords: [
              'Angular map templates',
              'map dashboard Angular',
              'store locator Angular',
              'choropleth map',
            ],
            pt: {
              title: 'Blocks e templates de mapa para Angular',
              description:
                'Blocks de mapa prontos para Angular, feitos com ng-mapcn e zard/ui: dashboards de analytics, coropléticos, mapas de calor, localizadores de lojas, rastreio de entregas e mais. Copie e cole.',
            },
          },
        },
        loadChildren: () => import('./pages/blocks/blocks.routes').then((m) => m.BLOCKS_ROUTES),
      },
      {
        path: 'playground',
        title: 'Playground',
        data: {
          seo: {
            title: 'Angular Map Playground',
            description:
              'Visual playground for ng-mapcn: stack map components as blocks, edit their inputs live, share the scene as a link and copy the matching Angular code.',
            keywords: ['Angular map playground', 'MapLibre Angular demo', 'Angular map styles'],
            pt: {
              title: 'Playground de mapas para Angular',
              description:
                'Playground visual do ng-mapcn: empilhe componentes de mapa como blocos, edite os inputs ao vivo, compartilhe a cena por link e copie o código Angular correspondente.',
            },
          },
        },
        loadChildren: () =>
          import('./pages/playground/playground.routes').then((m) => m.PLAYGROUND_ROUTES),
      },
      {
        path: 'credits',
        title: 'Credits',
        data: {
          seo: {
            description:
              'The open-source projects ng-mapcn is built on: mapcn, MapLibre GL, zard/ui, Tailwind CSS and the basemap providers that make beautiful Angular maps possible.',
            pt: {
              title: 'Créditos',
              description:
                'Os projetos open source em que o ng-mapcn se apoia: mapcn, MapLibre GL, zard/ui, Tailwind CSS e os provedores de basemap que tornam possíveis mapas bonitos em Angular.',
            },
          },
        },
        loadComponent: () => import('./pages/credits/credits').then((m) => m.CreditsComponent),
      },
    ],
  },
  {
    // A block alone, without the site header (iframe previews, "Open in new tab").
    path: 'view',
    loadChildren: () => import('./pages/blocks/view.routes').then((m) => m.BLOCK_VIEW_ROUTES),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
