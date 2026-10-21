import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { JsonLdService } from './json-ld.service';
import { SITE_URL } from './site';

const scripts = () =>
  Array.from(document.head.querySelectorAll('script[type="application/ld+json"][data-seo]')).map(
    (s) => JSON.parse(s.textContent!),
  );

describe('JsonLdService', () => {
  afterEach(() => {
    document.head.querySelectorAll('script[data-seo]').forEach((s) => s.remove());
    TestBed.resetTestingModule();
  });

  it('writes one script per schema with the schema.org context', () => {
    TestBed.inject(JsonLdService).set([{ '@type': 'Thing', name: 'a' }]);

    expect(scripts()).toEqual([{ '@context': 'https://schema.org', '@type': 'Thing', name: 'a' }]);
  });

  it('escapes < so a value cannot close the script tag', () => {
    TestBed.inject(JsonLdService).set([{ '@type': 'Thing', name: '</script><b>' }]);

    const raw = document.head.querySelector('script[data-seo]')!.textContent!;
    expect(raw).not.toContain('<');
    expect(scripts()[0].name).toBe('</script><b>');
  });

  it('replaces the previous scripts and removes them on demand', () => {
    const service = TestBed.inject(JsonLdService);

    service.set([{ '@type': 'A' }, { '@type': 'B' }]);
    service.set([{ '@type': 'C' }]);
    expect(scripts().map((s) => s['@type'])).toEqual(['C']);

    service.remove();
    expect(scripts()).toEqual([]);
  });

  it('home: WebSite and SoftwareSourceCode', () => {
    TestBed.inject(JsonLdService).setHome();

    expect(scripts().map((s) => s['@type'])).toEqual(['WebSite', 'SoftwareSourceCode']);
  });

  it('page: TechArticle and a breadcrumb list starting at Home', () => {
    TestBed.inject(JsonLdService).setPage('Map', 'desc', '/docs/components/map', [
      { name: 'Docs', path: '/docs' },
      { name: 'Map', path: '/docs/components/map' },
    ]);

    const [article, crumbs] = scripts();
    expect(article['@type']).toBe('TechArticle');
    expect(article.headline).toBe('Map');
    expect(article.url).toBe(`${SITE_URL}/docs/components/map`);
    expect(crumbs['@type']).toBe('BreadcrumbList');
    expect(crumbs.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Docs', item: `${SITE_URL}/docs` },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Map',
        item: `${SITE_URL}/docs/components/map`,
      },
    ]);
  });
});
