import { effect, inject, Injectable, untracked } from '@angular/core';
import {
  type ActivatedRouteSnapshot,
  type RouterStateSnapshot,
  TitleStrategy,
} from '@angular/router';

import { LanguageService } from '@/shared/i18n/language.service';
import { type RouteSeo, SeoService } from '@/shared/seo/seo.service';

interface AppliedRoute {
  title: string | null;
  path: string;
  seo: RouteSeo | undefined;
}

/**
 * mapcn's metadata template ("%s - mapcn", with a default for the home page),
 * extended with the rest of the page metadata through `SeoService`.
 *
 * In pt-BR the route's `seo.pt` texts replace the English ones, and switching
 * language re-applies the current page. The prerendered HTML stays English.
 */
@Injectable({ providedIn: 'root' })
export class SiteTitleStrategy extends TitleStrategy {
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(LanguageService);

  private current: AppliedRoute | null = null;

  constructor() {
    super();
    effect(() => {
      const pt = this.i18n.isPt();
      untracked(() => this.apply(pt));
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const path = snapshot.url.split(/[?#]/)[0] || '/';
    this.current = { title: this.buildTitle(snapshot) ?? null, path, seo: routeSeo(snapshot.root) };
    this.apply(this.i18n.isPt());
  }

  private apply(pt: boolean): void {
    if (!this.current) return;
    const { title, path, seo } = this.current;
    const localized =
      pt && seo?.pt
        ? {
            ...seo,
            title: seo.pt.title ?? seo.title,
            description: seo.pt.description ?? seo.description,
          }
        : seo;
    this.seo.apply(title, path, localized);
  }
}

/** The deepest `data.seo` on the active route chain. */
function routeSeo(route: ActivatedRouteSnapshot): RouteSeo | undefined {
  let seo: RouteSeo | undefined;
  for (let current: ActivatedRouteSnapshot | null = route; current; current = current.firstChild) {
    seo = (current.data['seo'] as RouteSeo | undefined) ?? seo;
  }
  return seo;
}
