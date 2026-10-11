import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, RouterOutlet, type Routes, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { SITE_TITLE } from './seo/site';
import { SiteTitleStrategy } from './title-strategy';

@Component({ selector: 'app-stub', imports: [RouterOutlet], template: '<router-outlet />' })
class StubComponent {}

const routes: Routes = [
  { path: '', component: StubComponent, data: { seo: { home: true, description: 'home' } } },
  {
    path: 'docs',
    component: StubComponent,
    title: 'Docs',
    data: { seo: { description: 'parent seo', keywords: ['parent'] } },
    children: [
      {
        path: 'child',
        component: StubComponent,
        title: 'Child',
        data: { seo: { description: 'child seo', title: 'Child SEO title' } },
      },
      { path: 'plain', component: StubComponent, title: 'Plain' },
    ],
  },
  { path: 'untitled', component: StubComponent },
];

const description = () =>
  document.head.querySelector('meta[name="description"]')?.getAttribute('content');
const canonical = () => document.head.querySelector('link[rel="canonical"]')?.getAttribute('href');

async function navigate(url: string): Promise<void> {
  TestBed.configureTestingModule({
    providers: [provideRouter(routes), { provide: TitleStrategy, useClass: SiteTitleStrategy }],
  });
  await RouterTestingHarness.create(url);
}

describe('SiteTitleStrategy', () => {
  afterEach(() => {
    document.head
      .querySelectorAll('meta, link[rel="canonical"], script[data-seo]')
      .forEach((n) => n.remove());
    document.title = '';
    TestBed.resetTestingModule();
  });

  it('shows the site title on the home route', async () => {
    await navigate('/');

    expect(document.title).toBe(SITE_TITLE);
  });

  it('applies the "%s - ng-mapcn" template to the route title', async () => {
    await navigate('/docs/plain');

    expect(document.title).toBe('Plain - ng-mapcn');
  });

  it('the deepest data.seo wins over its parent', async () => {
    await navigate('/docs/child');

    expect(document.title).toBe('Child SEO title - ng-mapcn');
    expect(description()).toBe('child seo');
  });

  it('inherits the parent seo when the child declares none', async () => {
    await navigate('/docs/plain');

    expect(description()).toBe('parent seo');
  });

  it('falls back to the site title for a route without a title', async () => {
    await navigate('/untitled');

    expect(document.title).toBe(SITE_TITLE);
  });

  it('ignores the query string and fragment in the canonical URL', async () => {
    await navigate('/docs/plain?x=1#frag');

    expect(canonical()).toMatch(/\/docs\/plain$/);
  });
});
