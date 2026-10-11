import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

import { type Breadcrumb, JsonLdService } from './json-ld.service';
import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_OG_IMAGE,
  SITE_TITLE,
  SITE_URL,
} from './site';

/** Per-route SEO, declared as `data: { seo: { ... } }` on the route. */
export interface RouteSeo {
  /** Meta description, ideally 120-160 characters. */
  description: string;
  /** Overrides the route `title` in the document title (keyword-richer). */
  title?: string;
  keywords?: string[];
  /** Trail between Home and this page, e.g. Docs > Components. */
  breadcrumbs?: Breadcrumb[];
  /** The landing page: site title as is, WebSite + SoftwareSourceCode JSON-LD. */
  home?: boolean;
  /** Kept out of search results (and pointed at `canonical` instead). */
  noindex?: boolean;
  /** Canonical path when it differs from the page's own path. */
  canonical?: string;
}

/**
 * zard/ui's `SeoService`, driven by route data instead of per-page calls:
 * `SiteTitleStrategy` applies it on every navigation, on the server as well,
 * so each prerendered page ships its own title, description, Open Graph,
 * Twitter card, canonical link and JSON-LD.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly titleService = inject(Title);
  private readonly jsonLd = inject(JsonLdService);

  /**
   * @param pageTitle route title (`null` on the home page)
   * @param path the page path, without query string or fragment
   */
  apply(pageTitle: string | null, path: string, seo: RouteSeo | undefined): void {
    const name = seo?.title ?? pageTitle;
    const title = seo?.home || !name ? SITE_TITLE : `${name} - ${SITE_NAME}`;
    const description = seo?.description ?? SITE_DESCRIPTION;
    const url = this.absolute(seo?.canonical ?? path);
    const keywords = [...(seo?.keywords ?? []), ...SITE_KEYWORDS];

    this.titleService.setTitle(title);

    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'keywords', content: [...new Set(keywords)].join(', ') });
    this.meta.updateTag({
      name: 'robots',
      content: seo?.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large',
    });

    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({
      property: 'og:type',
      content: seo?.home || !name ? 'website' : 'article',
    });
    this.meta.updateTag({ property: 'og:image', content: SITE_OG_IMAGE });

    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: SITE_OG_IMAGE });

    this.setCanonical(url);

    if (seo?.noindex) {
      this.jsonLd.remove();
    } else if (seo?.home || !name) {
      this.jsonLd.setHome();
    } else {
      this.jsonLd.setPage(name, description, path, [...(seo?.breadcrumbs ?? []), { name, path }]);
    }
  }

  private absolute(path: string): string {
    return path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path.replace(/\/$/, '')}`;
  }

  private setCanonical(url: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
