import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The site icon (the favicon's gradient pin). An `<img>` rather than inline SVG:
 * the gradient `id` stays scoped to the file, so several marks on one page (one
 * of them `display: none` below `lg`) never resolve each other's `url(#…)`.
 * Size it with a class on the host.
 */
@Component({
  selector: 'app-brand-mark',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block shrink-0' },
  template: `<img src="/icon-192x192.svg" alt="" width="24" height="24" class="size-full" />`,
})
export class BrandMarkComponent {}
