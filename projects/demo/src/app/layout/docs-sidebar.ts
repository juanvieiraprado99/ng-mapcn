import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { docsNavigation } from '@/shared/site-navigation';

/**
 * mapcn `DocsSidebar` — a non-collapsible shadcn `Sidebar`; the classes below
 * are the ones its SidebarGroup / GroupLabel / Menu / MenuButton render.
 */
@Component({
  selector: 'app-docs-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'text-sidebar-foreground sticky top-14 z-30 hidden h-[calc(100svh-3.5rem)] w-55 shrink-0 flex-col overscroll-none bg-transparent lg:flex',
  },
  template: `
    <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-auto pt-10">
      @for (group of groups; track group.title) {
        <div class="relative flex w-full min-w-0 flex-col">
          <div
            class="text-sidebar-foreground/70 flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium"
          >
            {{ group.title }}
          </div>
          <ul class="flex w-full min-w-0 flex-col gap-1">
            @for (item of group.items; track item.href) {
              <li class="relative">
                @if (item.file) {
                  <a
                    [href]="item.href"
                    target="_blank"
                    class="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground ring-sidebar-ring flex h-8 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm font-medium outline-hidden focus-visible:ring-2"
                  >
                    <span class="truncate">{{ item.title }}</span>
                  </a>
                } @else {
                  <a
                    [routerLink]="item.href"
                    routerLinkActive
                    #rla="routerLinkActive"
                    [routerLinkActiveOptions]="{ exact: true }"
                    [attr.data-active]="rla.isActive"
                    class="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground ring-sidebar-ring flex h-8 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm font-medium outline-hidden focus-visible:ring-2"
                  >
                    <span class="truncate">{{ item.title }}</span>
                  </a>
                }
              </li>
            }
          </ul>
        </div>
      }
    </div>
  `,
})
export class DocsSidebarComponent {
  protected readonly groups = docsNavigation;
}
