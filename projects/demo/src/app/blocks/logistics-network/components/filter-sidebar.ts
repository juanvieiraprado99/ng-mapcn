import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideNetwork, lucidePlane, lucideTruck } from '@ng-icons/lucide';

import { ZardSidebarImports } from '@/shared/components/sidebar';

import { type Hub, regionLabels, type Route, statusConfig } from '../data';

const regionIcons: Record<Hub['region'], string> = {
  west: 'W',
  midwest: 'MW',
  south: 'S',
  northeast: 'NE',
};

const REGIONS = ['west', 'midwest', 'south', 'northeast'] as const;

@Component({
  selector: 'app-filter-sidebar',
  standalone: true,
  imports: [DecimalPipe, NgIcon, ZardSidebarImports],
  viewProviders: [provideIcons({ lucideNetwork, lucidePlane, lucideTruck })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <z-sidebar zCollapsible="offcanvas">
      <z-sidebar-header class="p-4">
        <div class="flex items-center gap-2">
          <div
            class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg"
          >
            <ng-icon name="lucideNetwork" size="16" />
          </div>
          <div class="flex flex-col gap-0.5 leading-none">
            <span class="text-sm font-medium">Logistics Network</span>
            <span class="text-muted-foreground text-xs">Domestic Routes</span>
          </div>
        </div>
        <div class="mt-3 grid grid-cols-3 gap-2">
          <div class="bg-background rounded-md border px-2.5 py-2 text-center">
            <p class="text-lg leading-none font-bold tabular-nums">{{ hubs().length }}</p>
            <p class="text-muted-foreground mt-1 text-[10px]">Hubs</p>
          </div>
          <div class="bg-background rounded-md border px-2.5 py-2 text-center">
            <p class="text-lg leading-none font-bold tabular-nums">{{ activeCount() }}</p>
            <p class="text-muted-foreground mt-1 text-[10px]">Active</p>
          </div>
          <div class="bg-background rounded-md border px-2.5 py-2 text-center">
            <p class="text-lg leading-none font-bold tabular-nums">{{ delayedCount() }}</p>
            <p class="text-muted-foreground mt-1 text-[10px]">Delayed</p>
          </div>
        </div>
      </z-sidebar-header>

      <z-sidebar-separator class="mx-0" />

      <z-sidebar-content>
        <z-sidebar-group>
          <z-sidebar-group-label>Transport Mode</z-sidebar-group-label>
          <z-sidebar-group-content>
            <ul z-sidebar-menu>
              <li z-sidebar-menu-item>
                <button z-sidebar-menu-button zTooltip="Air" class="pointer-events-none">
                  <ng-icon name="lucidePlane" size="16" />
                  <span>Air Freight</span>
                </button>
                <z-sidebar-menu-badge>{{ airRouteCount() }}</z-sidebar-menu-badge>
              </li>
              <li z-sidebar-menu-item>
                <button z-sidebar-menu-button zTooltip="Ground" class="pointer-events-none">
                  <ng-icon name="lucideTruck" size="16" />
                  <span>Ground</span>
                </button>
                <z-sidebar-menu-badge>{{ groundRouteCount() }}</z-sidebar-menu-badge>
              </li>
            </ul>
          </z-sidebar-group-content>
        </z-sidebar-group>

        <z-sidebar-group>
          <z-sidebar-group-label>Status</z-sidebar-group-label>
          <z-sidebar-group-content>
            <ul z-sidebar-menu>
              <li z-sidebar-menu-item>
                <button
                  z-sidebar-menu-button
                  [zTooltip]="status.active.label"
                  class="pointer-events-none"
                >
                  <span class="flex size-4 items-center justify-center">
                    <span
                      class="size-2 rounded-full"
                      [style.background-color]="status.active.color"
                    ></span>
                  </span>
                  <span>{{ status.active.label }}</span>
                </button>
                <z-sidebar-menu-badge>{{ activeCount() }}</z-sidebar-menu-badge>
              </li>
              <li z-sidebar-menu-item>
                <button
                  z-sidebar-menu-button
                  [zTooltip]="status.delayed.label"
                  class="pointer-events-none"
                >
                  <span class="flex size-4 items-center justify-center">
                    <span
                      class="size-2 rounded-full"
                      [style.background-color]="status.delayed.color"
                    ></span>
                  </span>
                  <span>{{ status.delayed.label }}</span>
                </button>
                <z-sidebar-menu-badge>{{ delayedCount() }}</z-sidebar-menu-badge>
              </li>
            </ul>
          </z-sidebar-group-content>
        </z-sidebar-group>

        <z-sidebar-group>
          <z-sidebar-group-label>Region</z-sidebar-group-label>
          <z-sidebar-group-content>
            <ul z-sidebar-menu>
              @for (region of regions; track region) {
                <li z-sidebar-menu-item>
                  <button
                    z-sidebar-menu-button
                    [zTooltip]="regionLabels[region]"
                    class="pointer-events-none"
                  >
                    <span
                      class="bg-muted text-muted-foreground flex size-4 items-center justify-center rounded text-[9px] font-bold"
                      >{{ regionIcons[region] }}</span
                    >
                    <span>{{ regionLabels[region] }}</span>
                  </button>
                  <z-sidebar-menu-badge>{{ hubsIn(region) }}</z-sidebar-menu-badge>
                </li>
              }
            </ul>
          </z-sidebar-group-content>
        </z-sidebar-group>
      </z-sidebar-content>

      <z-sidebar-footer class="p-4 pt-0">
        <p class="text-muted-foreground mb-2 text-[11px] font-medium tracking-wider uppercase">
          Summary
        </p>
        <div class="bg-background space-y-1.5 rounded-md border px-3 py-2 text-xs">
          <div class="flex justify-between">
            <span class="text-muted-foreground">Shipments</span>
            <span class="font-medium tabular-nums">{{ totalShipments() | number }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Routes</span>
            <span class="font-medium tabular-nums">{{ routes().length }}</span>
          </div>
        </div>
      </z-sidebar-footer>
    </z-sidebar>
  `,
})
export class FilterSidebarComponent {
  readonly hubs = input.required<Hub[]>();
  readonly routes = input.required<Route[]>();

  protected readonly regions = REGIONS;
  protected readonly regionIcons = regionIcons;
  protected readonly regionLabels = regionLabels;
  protected readonly status = statusConfig;

  protected readonly totalShipments = computed(() =>
    this.routes().reduce((sum, route) => sum + route.shipments, 0),
  );
  protected readonly activeCount = computed(
    () => this.routes().filter((route) => route.status === 'active').length,
  );
  protected readonly delayedCount = computed(
    () => this.routes().filter((route) => route.status === 'delayed').length,
  );
  protected readonly airRouteCount = computed(
    () => this.routes().filter((route) => route.mode === 'air').length,
  );
  protected readonly groundRouteCount = computed(
    () => this.routes().filter((route) => route.mode === 'ground').length,
  );

  protected hubsIn(region: Hub['region']): number {
    return this.hubs().filter((hub) => hub.region === region).length;
  }
}
