import { RenderMode, ServerRoute } from '@angular/ssr';
import { BLOCKS } from './blocks/registry';

export const serverRoutes: ServerRoute[] = [
  {
    // One static page per block (the gallery iframes and "Open in new tab").
    path: 'view/:name',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => BLOCKS.map((block) => ({ name: block.name })),
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
