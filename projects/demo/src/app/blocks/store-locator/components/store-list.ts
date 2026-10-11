import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChildren,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideClock, lucideMapPin, lucidePhone, lucideSearch } from '@ng-icons/lucide';
import { ZardInputComponent } from '@/shared/components/input';
import { ZardSidebarImports } from '@/shared/components/sidebar';
import type { Store } from '../data';

@Component({
  selector: 'app-store-list',
  standalone: true,
  imports: [NgIcon, ZardInputComponent, ZardSidebarImports],
  viewProviders: [provideIcons({ lucideClock, lucideMapPin, lucidePhone, lucideSearch })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <z-sidebar zCollapsible="offcanvas">
      <z-sidebar-header class="gap-3 p-4">
        <div>
          <h2 class="text-foreground text-lg font-semibold tracking-tight">Find a store</h2>
          <p class="text-muted-foreground text-sm">
            {{ stores().length }} {{ stores().length === 1 ? 'location' : 'locations' }} near you
          </p>
        </div>
        <div class="relative">
          <ng-icon
            name="lucideSearch"
            size="16"
            class="text-muted-foreground absolute top-1/2 left-2.5 -translate-y-1/2"
          />
          <input
            z-input
            class="bg-background h-9 pl-8"
            placeholder="Search name or address"
            aria-label="Search stores"
            [value]="query()"
            (input)="queryChange.emit($any($event.target).value)"
          />
        </div>
      </z-sidebar-header>

      <z-sidebar-separator class="mx-0" />

      <z-sidebar-content>
        @if (stores().length === 0) {
          <div class="text-muted-foreground p-6 text-center text-sm">
            No stores match your search.
          </div>
        } @else {
          <z-sidebar-group class="p-2">
            <ul z-sidebar-menu class="gap-1">
              @for (store of stores(); track store.id) {
                <li z-sidebar-menu-item>
                  <button
                    #item
                    z-sidebar-menu-button
                    type="button"
                    class="h-auto flex-col items-stretch gap-0 p-3"
                    [attr.data-store-id]="store.id"
                    [zActive]="store.id === selectedId()"
                    [attr.aria-current]="store.id === selectedId()"
                    (click)="selectStore.emit(store.id)"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-foreground font-medium">{{ store.name }}</span>
                      <span
                        class="flex items-center gap-1.5 text-xs font-medium"
                        [class]="store.openNow ? 'text-foreground' : 'text-muted-foreground'"
                      >
                        <span
                          class="size-1.5 rounded-full"
                          [class]="store.openNow ? 'bg-emerald-500' : 'bg-neutral-500'"
                        ></span>
                        {{ store.openNow ? 'Open' : 'Closed' }}
                      </span>
                    </div>

                    <div
                      class="text-muted-foreground mt-2 space-y-1.5 text-xs font-normal tabular-nums"
                    >
                      <p class="flex items-center gap-1.5">
                        <ng-icon name="lucideMapPin" size="14" class="shrink-0" />
                        {{ store.address }}, {{ store.neighborhood }}
                      </p>
                      <p class="flex items-center gap-1.5">
                        <ng-icon name="lucideClock" size="14" class="shrink-0" />
                        {{ store.hours }}
                      </p>
                      <p class="flex items-center gap-1.5">
                        <ng-icon name="lucidePhone" size="14" class="shrink-0" />
                        {{ store.phone }}
                      </p>
                    </div>
                  </button>
                </li>
              }
            </ul>
          </z-sidebar-group>
        }
      </z-sidebar-content>
    </z-sidebar>
  `,
})
export class StoreListComponent {
  readonly stores = input.required<Store[]>();
  readonly query = input.required<string>();
  readonly selectedId = input<string | null>(null);

  readonly queryChange = output<string>();
  readonly selectStore = output<string>();

  private readonly items = viewChildren('item', { read: ElementRef<HTMLButtonElement> });

  constructor() {
    // Keep the selected store in view when it is picked from the map
    // (browser-only, after the list has rendered).
    afterRenderEffect(() => {
      const id = this.selectedId();
      if (!id) return;
      const item = this.items().find((ref) => ref.nativeElement.dataset['storeId'] === id);
      item?.nativeElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }
}
