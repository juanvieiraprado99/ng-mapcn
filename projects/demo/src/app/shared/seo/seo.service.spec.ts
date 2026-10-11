import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { SeoService } from './seo.service';
import { SITE_DESCRIPTION, SITE_OG_IMAGE, SITE_TITLE, SITE_URL } from './site';

const meta = (attr: 'name' | 'property', value: string) =>
  document.head.querySelector(`meta[${attr}="${value}"]`)?.getAttribute('content');
const canonical = () => document.head.querySelector('link[rel="canonical"]')?.getAttribute('href');
const jsonLd = () =>
  Array.from(document.head.querySelectorAll('script[data-seo]')).map((s) =>
    JSON.parse(s.textContent!),
  );

describe('SeoService', () => {
  afterEach(() => {
    document.head
      .querySelectorAll('meta, link[rel="canonical"], script[data-seo]')
      .forEach((n) => n.remove());
    document.title = '';
    TestBed.resetTestingModule();
  });

  const apply = (...args: Parameters<SeoService['apply']>) =>
    TestBed.inject(SeoService).apply(...args);

  it('uses the "<name> - ng-mapcn" template with the route title', () => {
    apply('Credits', '/credits', { description: 'd' });

    expect(document.title).toBe('Credits - ng-mapcn');
  });

  it('prefers seo.title over the route title', () => {
    apply('Map', '/docs/components/map', { title: 'Angular Map Component', description: 'd' });

    expect(document.title).toBe('Angular Map Component - ng-mapcn');
  });

  it('uses the site title on the home page and when there is no title', () => {
    apply(null, '/', { home: true, description: 'd' });
    expect(document.title).toBe(SITE_TITLE);

    apply(null, '/x', undefined);
    expect(document.title).toBe(SITE_TITLE);
  });

  it('writes description and de-duplicated keywords', () => {
    apply('Page', '/p', { description: 'My description', keywords: ['alpha', 'ng-mapcn'] });

    expect(meta('name', 'description')).toBe('My description');
    const keywords = meta('name', 'keywords')!.split(', ');
    expect(keywords[0]).toBe('alpha');
    expect(keywords.filter((k) => k === 'ng-mapcn')).toHaveLength(1);
  });

  it('falls back to the site description without route seo', () => {
    apply('Page', '/p', undefined);

    expect(meta('name', 'description')).toBe(SITE_DESCRIPTION);
  });

  it('builds an absolute canonical and og:url from the path', () => {
    apply('Page', '/docs/installation/', { description: 'd' });

    expect(canonical()).toBe(`${SITE_URL}/docs/installation`);
    expect(meta('property', 'og:url')).toBe(`${SITE_URL}/docs/installation`);
  });

  it('uses the root URL for "/"', () => {
    apply(null, '/', { home: true, description: 'd' });

    expect(canonical()).toBe(`${SITE_URL}/`);
  });

  it('lets seo.canonical override the path and reuses a single link element', () => {
    apply('Preview', '/view/x', { canonical: '/blocks', description: 'd' });
    apply('Preview', '/view/y', { canonical: '/blocks', description: 'd' });

    expect(canonical()).toBe(`${SITE_URL}/blocks`);
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
  });

  it('writes Open Graph and Twitter tags', () => {
    apply('Page', '/p', { title: 'Better title', description: 'desc' });

    expect(meta('property', 'og:title')).toBe('Better title - ng-mapcn');
    expect(meta('property', 'og:description')).toBe('desc');
    expect(meta('property', 'og:type')).toBe('article');
    expect(meta('property', 'og:image')).toBe(SITE_OG_IMAGE);
    expect(meta('name', 'twitter:title')).toBe('Better title - ng-mapcn');
    expect(meta('name', 'twitter:description')).toBe('desc');
    expect(meta('name', 'twitter:image')).toBe(SITE_OG_IMAGE);
  });

  it('marks the home page as a website', () => {
    apply(null, '/', { home: true, description: 'd' });

    expect(meta('property', 'og:type')).toBe('website');
  });

  it('indexes normally and noindexes previews, dropping their JSON-LD', () => {
    apply('Page', '/p', { description: 'd' });
    expect(meta('name', 'robots')).toBe('index, follow, max-image-preview:large');
    expect(jsonLd().map((s) => s['@type'])).toEqual(['TechArticle', 'BreadcrumbList']);

    apply('Preview', '/view/x', { noindex: true, canonical: '/blocks', description: 'd' });
    expect(meta('name', 'robots')).toBe('noindex, follow');
    expect(jsonLd()).toEqual([]);
  });

  it('emits WebSite JSON-LD on the home page', () => {
    apply(null, '/', { home: true, description: 'd' });

    expect(jsonLd().map((s) => s['@type'])).toEqual(['WebSite', 'SoftwareSourceCode']);
  });

  it('builds breadcrumbs from seo.breadcrumbs plus the page itself', () => {
    apply('Installation', '/docs/installation', {
      description: 'd',
      breadcrumbs: [{ name: 'Docs', path: '/docs' }],
    });

    const crumbs = jsonLd()[1];
    expect(crumbs.itemListElement.map((c: { name: string }) => c.name)).toEqual([
      'Home',
      'Docs',
      'Installation',
    ]);
  });
});
