import { provideHttpClient, withXhr } from '@angular/common/http';
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import {
  Routes,
  provideRouter,
  withInMemoryScrolling,
} from '@angular/router';
import { provideClientHydration, withEventReplay, withNoIncrementalHydration } from '@angular/platform-browser';
import { provideZard } from '@/shared/core/provider/providezard';

// Every route is lazy: nothing here may import `ng-mapcn`, or maplibre-gl
// (CommonJS, not tree-shakeable) ends up in the initial bundle.
const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./pages/home/home.routes').then((m) => m.HOME_ROUTES),
  },
  {
    path: 'docs',
    loadChildren: () => import('./pages/docs/docs.routes').then((m) => m.DOCS_ROUTES),
  },
  {
    path: 'credits',
    loadComponent: () => import('./pages/credits/credits').then((m) => m.CreditsComponent),
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
      })
    ),
    provideHttpClient(withXhr()), provideClientHydration(withEventReplay(), withNoIncrementalHydration()),

    provideZard(),],
};
