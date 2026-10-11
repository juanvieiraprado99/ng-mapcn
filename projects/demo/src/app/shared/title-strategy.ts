import { inject, Injectable } from '@angular/core';
import {
  type ActivatedRouteSnapshot,
  type RouterStateSnapshot,
  TitleStrategy,
} from '@angular/router';

import { type RouteSeo, SeoService } from '@/shared/seo/seo.service';

/**
 * mapcn's metadata template ("%s - mapcn", with a default for the home page),
 * extended with the rest of the page metadata through `SeoService`.
 */
@Injectable({ providedIn: 'root' })
export class SiteTitleStrategy extends TitleStrategy {
  private readonly seo = inject(SeoService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const path = snapshot.url.split(/[?#]/)[0] || '/';
    this.seo.apply(this.buildTitle(snapshot) ?? null, path, routeSeo(snapshot.root));
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
