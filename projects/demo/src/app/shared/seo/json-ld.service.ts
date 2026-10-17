import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

import {
  SITE_AUTHOR,
  SITE_AUTHOR_URL,
  SITE_DESCRIPTION,
  SITE_LOGO,
  SITE_NAME,
  SITE_OG_IMAGE,
  SITE_REPO,
  SITE_URL,
} from './site';

type JsonLdSchema = Record<string, unknown> & { '@type': string };

export interface Breadcrumb {
  name: string;
  path: string;
}

const SELECTOR = 'script[type="application/ld+json"][data-seo]';

const author = { '@type': 'Person', name: SITE_AUTHOR, url: SITE_AUTHOR_URL };
const publisher = {
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: { '@type': 'ImageObject', url: SITE_LOGO },
};

/**
 * zard/ui's `JsonLdService`, adapted for SSR: scripts are written through
 * `DOCUMENT` on the server too, so the prerendered HTML already carries the
 * structured data, and the browser replaces them (by selector) on navigation.
 */
@Injectable({ providedIn: 'root' })
export class JsonLdService {
  private readonly document = inject(DOCUMENT);

  set(schemas: JsonLdSchema[]): void {
    this.remove();
    for (const schema of schemas) {
      const script = this.document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('data-seo', '');
      // `<` escaped so a value containing `</script>` cannot close the tag in the prerendered HTML.
      const json = JSON.stringify({ '@context': 'https://schema.org', ...schema });
      script.textContent = json.replace(/</g, '\\u003c');
      this.document.head.appendChild(script);
    }
  }

  remove(): void {
    this.document.head.querySelectorAll(SELECTOR).forEach((script) => script.remove());
  }

  /** Home: the site itself plus the library as a free developer tool. */
  setHome(): void {
    this.set([
      {
        '@type': 'WebSite',
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        inLanguage: 'en',
        author,
        publisher,
      },
      {
        '@type': 'SoftwareSourceCode',
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        url: SITE_URL,
        image: SITE_OG_IMAGE,
        codeRepository: SITE_REPO,
        programmingLanguage: ['TypeScript', 'Angular'],
        runtimePlatform: 'Angular',
        license: 'https://opensource.org/licenses/MIT',
        author,
      },
    ]);
  }

  /** Docs and other content pages: an article with its breadcrumb trail. */
  setPage(title: string, description: string, path: string, breadcrumbs: Breadcrumb[]): void {
    const url = `${SITE_URL}${path}`;
    this.set([
      {
        '@type': 'TechArticle',
        headline: title,
        description,
        url,
        image: SITE_OG_IMAGE,
        inLanguage: 'en',
        proficiencyLevel: 'Beginner',
        author,
        publisher,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [{ name: 'Home', path: '/' }, ...breadcrumbs].map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.name,
          item: `${SITE_URL}${crumb.path === '/' ? '' : crumb.path}`,
        })),
      },
    ]);
  }
}
