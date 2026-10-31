import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BLOCKS } from '@/blocks/registry';
import { SITE_TITLE } from '@/shared/seo/site';

import { renderRoute } from '../testing/render-route';

const PAGES: [url: string, h1: string, title: string][] = [
  ['/', 'Beautiful maps, made simple', SITE_TITLE],
  ['/docs', 'Introduction', 'Introduction to Angular Map Components - ng-mapcn'],
  ['/docs/installation', 'Installation', 'Install Angular Map Components - ng-mapcn'],
  ['/docs/testing', 'Testing your maps', 'Testing Angular Maps - ng-mapcn'],
  ['/docs/api-reference', 'API Reference', 'Angular Map API Reference - ng-mapcn'],
  ['/docs/basemaps', 'Map Styles', 'Angular Map Styles and Basemaps - ng-mapcn'],
  ['/docs/roadmap', 'Roadmap', 'Angular Map Components Roadmap - ng-mapcn'],
  ['/docs/components/map', 'Map', 'Angular Map Component - ng-mapcn'],
  ['/docs/components/controls', 'Controls', 'Angular Map Controls - ng-mapcn'],
  ['/docs/components/legend', 'Legend', 'Angular Map Legend Component - ng-mapcn'],
  ['/docs/components/markers', 'Markers', 'Angular Map Markers - ng-mapcn'],
  ['/docs/components/popups', 'Popups', 'Angular Map Popups - ng-mapcn'],
  ['/docs/components/routes', 'Routes', 'Angular Map Routes and Polylines - ng-mapcn'],
  ['/docs/components/arcs', 'Arcs', 'Angular Map Arcs - ng-mapcn'],
  ['/docs/components/geojson', 'GeoJSON', 'Angular GeoJSON Layers - ng-mapcn'],
  ['/docs/components/clusters', 'Clusters', 'Angular Map Clusters - ng-mapcn'],
  ['/docs/components/heatmap', 'Heatmap', 'Angular Map Heatmap - ng-mapcn'],
  ['/docs/components/symbols', 'Symbols', 'Angular Map Symbol Layer - ng-mapcn'],
  ['/docs/components/tile-sources', 'Tile Sources', 'Angular Map Tile Sources - ng-mapcn'],
  [
    '/docs/components/3d',
    '3D Buildings & Terrain',
    'Angular 3D Map Buildings and Terrain - ng-mapcn',
  ],
  ['/docs/components/draw', 'Draw', 'Angular Map Draw Tools - ng-mapcn'],
  ['/docs/components/advanced', 'Advanced', 'Advanced Angular Map Usage - ng-mapcn'],
  ['/blocks', 'Blocks', 'Angular Map Blocks and Templates - ng-mapcn'],
  ['/playground', 'Playground', 'Angular Map Playground - ng-mapcn'],
  ['/credits', 'Credits', 'Credits - ng-mapcn'],
];

describe('app routes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    document.documentElement.className = '';
    TestBed.resetTestingModule();
  });

  it.each(PAGES)('%s renders its page without errors', async (url, h1, title) => {
    const { errors, h1: actual } = await renderRoute(url);

    expect(actual?.startsWith(h1)).toBe(true);
    expect(document.title).toBe(title);
    expect(TestBed.inject(Router).url).toBe(url);
    expect(errors).toEqual([]);
  });

  it('redirects an unknown URL to the home page', async () => {
    const { h1, errors } = await renderRoute('/does/not/exist');

    expect(TestBed.inject(Router).url).toBe('/');
    expect(h1?.startsWith('Beautiful maps, made simple')).toBe(true);
    expect(document.title).toBe(SITE_TITLE);
    expect(errors).toEqual([]);
  });

  it.each(BLOCKS.map((b) => [b.name, b.title] as const))(
    '/view/%s renders the block alone',
    async (name, title) => {
      const { harness, errors } = await renderRoute(`/view/${name}`);
      const host = (harness.fixture.nativeElement as HTMLElement).querySelector('app-block-view');

      expect(host).not.toBeNull();
      // The block component is loaded lazily after the route activates.
      await vi.waitFor(() => {
        harness.detectChanges();
        expect(host!.children.length).toBeGreaterThan(0);
      });
      expect(host!.textContent).not.toContain('Block not found.');
      expect(host!.ownerDocument.querySelector('header')).toBeNull();
      expect(document.title).toBe(`${title} - ng-mapcn`);
      expect(errors).toEqual([]);
    },
  );

  it('shows "Block not found." for an unknown block', async () => {
    const { harness, errors } = await renderRoute('/view/nope');
    const host = (harness.fixture.nativeElement as HTMLElement).querySelector('app-block-view')!;

    expect(host.textContent).toContain('Block not found.');
    expect(document.title).toBe('Blocks - ng-mapcn');
    expect(errors).toEqual([]);
  });
});
