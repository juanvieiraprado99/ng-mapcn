import { ViewportScroller } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { DocsSidebarComponent } from './docs-sidebar';

/**
 * mapcn docs `layout.tsx`: sidebar + page. Each page renders its own body and
 * "On This Page" rail through `app-docs-page`.
 */
@Component({
  selector: 'app-docs-layout',
  standalone: true,
  imports: [RouterOutlet, DocsSidebarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1' },
  template: `
    <div class="container flex min-h-min w-full px-0">
      <app-docs-sidebar />
      <!-- The routed page renders next to <router-outlet>; make it the flex child. -->
      <div
        class="flex min-w-0 flex-1 [&>:not(router-outlet)]:flex [&>:not(router-outlet)]:min-w-0 [&>:not(router-outlet)]:flex-1"
      >
        <router-outlet />
      </div>
    </div>
  `,
})
export class DocsLayoutComponent {
  constructor() {
    // Anchor scrolling ignores CSS scroll-margin; clear the sticky header
    // (h-14) plus breathing room, matching the sections' `scroll-m-24`.
    inject(ViewportScroller).setOffset([0, 96]);
  }
}
