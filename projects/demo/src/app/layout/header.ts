import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ZardButtonComponent } from '@/shared/components/button';
import { ZardSeparatorComponent } from '@/shared/components/separator';
import { mainNavItems } from '@/shared/site-navigation';

import { BasemapPickerComponent } from './basemap-picker';
import { BrandMarkComponent } from './brand-mark';
import { CommandSearchComponent } from './command-search';
import { GithubButtonComponent } from './github-button';
import { LogoComponent } from './logo';
import { MobileNavComponent } from './mobile-nav';
import { ThemeToggleComponent } from './theme-toggle';

/** mapcn `Header`: sticky, translucent, no bottom border. */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterLink,
    ZardButtonComponent,
    ZardSeparatorComponent,
    BasemapPickerComponent,
    BrandMarkComponent,
    CommandSearchComponent,
    GithubButtonComponent,
    LogoComponent,
    MobileNavComponent,
    ThemeToggleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // contents: the sticky <header> must sit directly in the page column.
  host: { class: 'contents' },
  template: `
    <header
      class="bg-background/85 supports-backdrop-filter:bg-background/70 sticky top-0 z-50 h-14 w-full backdrop-blur"
    >
      <nav class="container flex size-full items-center gap-2">
        <a
          routerLink="/"
          class="-ml-1 flex size-8 items-center justify-center lg:hidden"
          aria-label="ng-mapcn home"
        >
          <app-brand-mark class="size-6" />
        </a>
        <app-mobile-nav />
        <app-logo class="hidden shrink-0 lg:flex" />
        <z-separator
          zOrientation="vertical"
          class="bg-primary/15 ml-2.5 hidden h-4! self-center! lg:block"
        />
        <div class="hidden items-center gap-0.5 lg:flex">
          @for (item of navItems; track item.href) {
            <a z-button zType="ghost" zSize="sm" [routerLink]="item.href">{{ item.title }}</a>
          }
        </div>

        <div class="ml-auto flex items-center gap-1.5">
          <app-basemap-picker class="mr-1 hidden xl:block" />
          <app-command-search />
          <app-github-button />
          <app-theme-toggle />
        </div>
      </nav>
    </header>
  `,
})
export class HeaderComponent {
  protected readonly navItems = mainNavItems;
}
