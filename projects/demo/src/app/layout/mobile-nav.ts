import { Overlay } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  PLATFORM_ID,
  signal,
  type TemplateRef,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';

import { siteNavigation } from '@/shared/site-navigation';

import { BasemapPickerCompactComponent } from './basemap-picker-compact';

/**
 * zard/ui docs `MobileNav`: a "Menu" toggle whose bars morph into an X, opening
 * a full-width panel under the sticky header with every page in large links.
 * Shown below `lg`, where the header has no logo or nav links.
 *
 * The panel is rendered through a CDK overlay (in `<body>`): the header's
 * `backdrop-filter` would otherwise become the containing block of its
 * `position: fixed` children and squeeze the panel into the header's height.
 */
@Component({
  selector: 'app-mobile-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, BasemapPickerCompactComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'contents',
    '(document:keydown.escape)': 'open.set(false)',
  },
  template: `
    <button
      type="button"
      class="-ml-1 flex h-8 shrink-0 items-center gap-2.5 rounded-md px-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 lg:hidden"
      [attr.aria-expanded]="open()"
      aria-controls="mobile-nav-panel"
      (click)="open.update((value) => !value)"
    >
      <span class="relative size-4" aria-hidden="true">
        <span
          class="bg-foreground absolute left-0 block h-0.5 w-4 transition-all duration-100"
          [class]="open() ? 'top-[0.4rem] rotate-45' : 'top-1'"
        ></span>
        <span
          class="bg-foreground absolute left-0 block h-0.5 w-4 transition-all duration-100"
          [class]="open() ? 'top-[0.4rem] -rotate-45' : 'top-2.5'"
        ></span>
      </span>
      <span class="text-lg leading-none font-medium">Menu</span>
    </button>

    <ng-template #panel>
      <div
        class="animate-in fade-in-0 fixed inset-x-0 top-14 bottom-0 z-40 bg-black/50 backdrop-blur-sm duration-200 lg:hidden"
        aria-hidden="true"
        (click)="open.set(false)"
      ></div>

      <div
        id="mobile-nav-panel"
        role="dialog"
        aria-label="Site navigation"
        class="bg-background/90 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 fixed inset-x-0 top-14 bottom-0 z-50 overflow-y-auto backdrop-blur duration-100 lg:hidden"
      >
        <nav class="flex flex-col gap-12 px-6 py-6">
          <div class="flex flex-col gap-4">
            <div class="text-muted-foreground text-sm font-medium">Map style</div>
            <app-basemap-picker-compact (picked)="open.set(false)" />
          </div>

          @for (group of groups; track group.title) {
            <div class="flex flex-col gap-4">
              <div class="text-muted-foreground text-sm font-medium">{{ group.title }}</div>
              <div class="flex flex-col gap-3">
                @for (item of group.items; track item.href) {
                  @if (item.file) {
                    <a
                      [href]="item.href"
                      target="_blank"
                      rel="noopener noreferrer"
                      [class]="link"
                      (click)="open.set(false)"
                    >
                      {{ item.title }}
                    </a>
                  } @else {
                    <a
                      [routerLink]="item.href"
                      routerLinkActive="font-semibold"
                      [routerLinkActiveOptions]="{ exact: true }"
                      [class]="link"
                      (click)="open.set(false)"
                    >
                      {{ item.title }}
                    </a>
                  }
                }
              </div>
            </div>
          }
        </nav>
      </div>
    </ng-template>
  `,
})
export class MobileNavComponent {
  protected readonly open = signal(false);
  private readonly panel = viewChild<TemplateRef<unknown>>('panel');
  // Read off the template itself: injecting ViewContainerRef in the constructor
  // would add an anchor comment next to the host and break hydration.
  private readonly panelContainer = viewChild('panel', { read: ViewContainerRef });
  protected readonly groups = siteNavigation;
  protected readonly link =
    'hover:text-foreground text-foreground/90 flex items-center gap-2 text-2xl font-medium transition-colors';

  constructor() {
    const destroyRef = inject(DestroyRef);

    const sub = inject(Router)
      .events.pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.open.set(false));
    destroyRef.onDestroy(() => sub.unsubscribe());

    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    const overlay = inject(Overlay);
    const overlayRef = overlay.create({
      positionStrategy: overlay.position().global(),
      scrollStrategy: overlay.scrollStrategies.noop(),
    });
    effect(() => {
      const panel = this.panel();
      const container = this.panelContainer();
      if (this.open() && panel && container && !overlayRef.hasAttached()) {
        overlayRef.attach(new TemplatePortal(panel, container));
      } else if (!this.open() && overlayRef.hasAttached()) {
        overlayRef.detach();
      }
    });
    destroyRef.onDestroy(() => overlayRef.dispose());

    // The page under the panel must not scroll while it is open.
    const root = inject(DOCUMENT).documentElement;
    effect(() => root.classList.toggle('overflow-hidden', this.open()));

    // Growing past `lg` hides the panel; close it so the scroll lock goes too.
    const desktop = window.matchMedia('(min-width: 64rem)');
    const onChange = (event: MediaQueryListEvent) => event.matches && this.open.set(false);
    desktop.addEventListener('change', onChange);
    destroyRef.onDestroy(() => {
      desktop.removeEventListener('change', onChange);
      root.classList.remove('overflow-hidden');
    });
  }
}
