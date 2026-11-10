import { type Routes } from '@angular/router';

import { basemapProviders } from '@/shared/basemap.providers';
import { SITE_DESCRIPTION } from '@/shared/seo/site';

export const HOME_ROUTES: Routes = [
  {
    path: '',
    data: {
      seo: {
        home: true,
        description: SITE_DESCRIPTION,
        pt: {
          title: 'ng-mapcn - Mapas bonitos, sem complicação, para Angular',
          description:
            'Componentes de mapa para Angular, bonitos e prontos para usar. Feitos com MapLibre GL, estilizados com Tailwind CSS e instalados com ng add — marcadores, popups, rotas, clusters e mais.',
        },
      },
    },
    // Route-level so `ng-mapcn` is only reached from a lazy chunk.
    providers: basemapProviders,
    loadComponent: () => import('./home').then((m) => m.HomeComponent),
  },
];
