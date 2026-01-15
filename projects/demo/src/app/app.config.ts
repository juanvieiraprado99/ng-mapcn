import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { Routes, provideRouter } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/basic',
    pathMatch: 'full',
  },
  {
    path: 'basic',
    loadComponent: () => import('./examples/basic-map/basic-map').then((m) => m.BasicMapComponent),
  },
  {
    path: 'markers',
    loadComponent: () =>
      import('./examples/markers-map/markers-map').then((m) => m.MarkersMapComponent),
  },
  {
    path: 'routes',
    loadComponent: () =>
      import('./examples/routes-map/routes-map').then((m) => m.RoutesMapComponent),
  },
  {
    path: 'routes-planning',
    loadComponent: () =>
      import('./examples/route-planning-map/route-planning-map').then(
        (m) => m.RoutePlanningMapComponent
      ),
  },
  {
    path: 'controls',
    loadComponent: () =>
      import('./examples/controls-map/controls-map').then((m) => m.ControlsMapComponent),
  },
  {
    path: 'dark-theme',
    loadComponent: () =>
      import('./examples/dark-theme-map/dark-theme-map').then((m) => m.DarkThemeMapComponent),
  },
  {
    path: 'custom-style',
    loadComponent: () =>
      import('./examples/custom-style-map/custom-style-map').then((m) => m.CustomStyleMapComponent),
  },
  {
    path: 'flyto-globe',
    loadComponent: () =>
      import('./examples/flyto-globe-map/flyto-globe-map').then((m) => m.FlytoGlobeMapComponent),
  },
  {
    path: 'route-planning',
    loadComponent: () =>
      import('./examples/route-planning-map/route-planning-map').then(
        (m) => m.RoutePlanningMapComponent
      ),
  },
  {
    path: 'tooltips',
    loadComponent: () =>
      import('./examples/tooltips-map/tooltips-map').then((m) => m.TooltipsMapComponent),
  },
  {
    path: 'flyto-markers',
    loadComponent: () =>
      import('./examples/flyto-markers-map/flyto-markers-map').then((m) => m.FlytoMarkersMapComponent),
  },
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
  ],
};
