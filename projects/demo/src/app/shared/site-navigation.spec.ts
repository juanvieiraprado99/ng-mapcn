import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import type { Route, Routes } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { routes } from '../app.routes';
import {
  docsNavigation,
  docsNeighbours,
  mainNavItems,
  siteNavigation,
  type SiteNavigationItem,
} from './site-navigation';

/** Resolves lazy children and returns the URL of every route that renders a page. */
async function pageUrls(tree: Routes, prefix = ''): Promise<string[]> {
  const urls: string[] = [];
  for (const route of tree) {
    if (route.redirectTo !== undefined || route.path === '**') continue;
    const url = [prefix, route.path].filter(Boolean).join('/');
    const children = await childRoutes(route);
    if (children) {
      urls.push(...(await pageUrls(children, url)));
    } else if (route.component || route.loadComponent) {
      urls.push(`/${url}`);
    }
  }
  return urls;
}

async function childRoutes(route: Route): Promise<Routes | undefined> {
  if (route.children) return route.children;
  if (route.loadChildren) return (await route.loadChildren()) as Routes;
  return undefined;
}

const allItems = (): SiteNavigationItem[] => siteNavigation.flatMap((g) => g.items);

describe('site navigation', () => {
  it('every routed navigation link resolves to a route', async () => {
    const urls = await pageUrls(routes);

    const dangling = allItems()
      .filter((item) => !item.file)
      .map((item) => item.href)
      .filter((href) => !urls.includes(href));

    expect(dangling).toEqual([]);
  });

  it('every docs route appears in the docs navigation', async () => {
    const urls = (await pageUrls(routes)).filter(
      (url) => url === '/docs' || url.startsWith('/docs/'),
    );
    const linked = docsNavigation.flatMap((g) => g.items).map((item) => item.href);

    expect(urls.length).toBeGreaterThan(0);
    expect(urls.filter((url) => !linked.includes(url))).toEqual([]);
  });

  it('has no duplicate links inside the docs navigation', () => {
    const hrefs = docsNavigation.flatMap((g) => g.items).map((item) => item.href);

    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('file entries exist under projects/demo/public', () => {
    const files = allItems().filter((item) => item.file);

    expect(files.length).toBeGreaterThan(0);
    for (const item of files) {
      expect(
        existsSync(resolve(process.cwd(), 'projects/demo/public', item.href.replace(/^\//, ''))),
        item.href,
      ).toBe(true);
    }
  });

  it('header links exclude Home', () => {
    expect(mainNavItems.map((i) => i.title)).toEqual([
      'Docs',
      'Components',
      'Blocks',
      'Playground',
    ]);
  });

  it('prev/next links skip file entries and stop at the ends', () => {
    expect(docsNeighbours('/docs').prev).toBeUndefined();
    expect(docsNeighbours('/docs/installation').next?.href).toBe('/docs/testing');
    expect(docsNeighbours('/docs/testing').next?.href).toBe('/docs/api-reference');
    expect(docsNeighbours('/docs/components/advanced').next).toBeUndefined();
    expect(docsNeighbours('/llms.txt')).toEqual({});
  });
});
