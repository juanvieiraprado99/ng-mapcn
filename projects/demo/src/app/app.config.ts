import { provideHttpClient, withXhr } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  Routes,
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';
import { provideClientHydration, withEventReplay, withNoIncrementalHydration } from '@angular/platform-browser';
import { provideZard } from '@/shared/core/provider/providezard';
import { ThemeService } from '@/shared/theme.service';
import { SiteTitleStrategy } from '@/shared/title-strategy';
import { MainLayoutComponent } from './layout/main-layout';

// Every route is lazy: nothing here may import `ng-mapcn`, or maplibre-gl
// (CommonJS, not tree-shakeable) ends up in the initial bundle.
const routes: Routes = [
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
            keywords: ['Angular map templates', 'map dashboard Angular', 'store locator Angular', 'choropleth map'],
          },
        },
        loadChildren: () => import('./pages/blocks/blocks.routes').then((m) => m.BLOCKS_ROUTES),
      },
      {
        path: 'credits',
        title: 'Credits',
        data: {
          seo: {
            description:
              'The open-source projects ng-mapcn is built on: mapcn, MapLibre GL, zard/ui, Tailwind CSS and the basemap providers that make beautiful Angular maps possible.',
          },
        },
        loadComponent: () => import('./pages/credits/credits').then((m) => m.CreditsComponent),
      },
    ],
  },
  {
    // A block alone, without the site header (iframe previews, "Open in new tab").
    path: 'view',
    loadChildren: () =>
      import('./pages/blocks/view.routes').then((m) => m.BLOCK_VIEW_ROUTES),
  },
  {
    path: '**',
    redirectTo: '',
  },
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'top',
      }),
      withComponentInputBinding(),
    ),
    provideHttpClient(withXhr()), provideClientHydration(withEventReplay(), withNoIncrementalHydration()),

    provideZard(),
    // Eager: block views (no header, no theme toggle) still need its `t` hotkey
    // and the cross-window sync that keeps preview iframes on the page's theme.
    provideAppInitializer(() => void inject(ThemeService)),
    { provide: TitleStrategy, useClass: SiteTitleStrategy },
  ],
};
