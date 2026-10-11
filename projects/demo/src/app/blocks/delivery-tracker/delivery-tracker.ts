import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideClock3,
  lucideHouse,
  lucideStore,
  lucideTruck,
  lucideUserRound,
  lucideUtensils,
} from '@ng-icons/lucide';
import {
  MapComponent,
  MapMarkerComponent,
  MapRouteComponent,
  MarkerContentComponent,
} from 'ng-mapcn';
import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardDarkMode } from '@/shared/services/dark-mode';
import {
  buildRouteUrl,
  deliveryMeals,
  dropoff,
  mapView,
  pickup,
  progressFraction,
  routeStyle,
  type OsrmRouteData,
} from './data';
import { splitRoute } from './route-progress';

function formatDistance(meters?: number): string {
  if (!meters) return '--';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '--';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

@Component({
  selector: 'app-delivery-tracker-block',
  standalone: true,
  imports: [
    NgIcon,
    MapComponent,
    MapMarkerComponent,
    MapRouteComponent,
    MarkerContentComponent,
    ZardBadgeComponent,
    ZardButtonComponent,
    ZardCardComponent,
  ],
  viewProviders: [
    provideIcons({
      lucideClock3,
      lucideHouse,
      lucideStore,
      lucideTruck,
      lucideUserRound,
      lucideUtensils,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-screen items-center justify-center p-8">
      <div class="bg-sidebar mx-auto grid w-[1200px] rounded-xl border md:grid-cols-[1.05fr_1fr]">
        <div class="flex flex-col p-5 md:p-6">
          <div class="space-y-1">
            <h3 class="text-2xl font-semibold tracking-tight">Track Delivery</h3>
            <p class="text-muted-foreground text-sm">Mon Feb 10 - 2-3 PM</p>
          </div>

          <z-card class="mt-5">
            <p class="mb-6 leading-none font-medium">Order items ({{ meals.length }})</p>
            <div class="space-y-5">
              @for (meal of meals; track meal.name) {
                <div class="flex items-center gap-3">
                  <div class="bg-muted grid size-8 place-items-center rounded-full text-xs">
                    <ng-icon name="lucideUtensils" size="16" class="text-muted-foreground" />
                  </div>
                  <div class="min-w-4 flex-1">
                    <p class="truncate pb-1 text-sm font-medium">{{ meal.name }}</p>
                    <p class="text-muted-foreground text-xs">{{ meal.price }}</p>
                  </div>
                  <z-badge zType="secondary" class="h-6 rounded-full px-2.5">
                    x{{ meal.quantity }}
                  </z-badge>
                </div>
              }
              <div class="border-border/60 flex items-center justify-between border-t pt-3 text-sm">
                <span class="text-muted-foreground">Bundle total</span>
                <span class="font-medium">$189.00</span>
              </div>
            </div>
          </z-card>

          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            <z-card>
              <div class="space-y-2">
                <p class="text-muted-foreground text-sm">Pickup confirmed</p>
                <p class="text-sm font-medium">Mon, Feb 10 at 1:48 PM</p>
              </div>
            </z-card>
            <z-card>
              <div class="space-y-2">
                <p class="text-muted-foreground text-sm">Remaining travel</p>
                <p class="text-sm font-medium">
                  {{ duration() }}
                  <span class="text-muted-foreground font-normal"> · {{ distance() }}</span>
                </p>
              </div>
            </z-card>
          </div>

          <div class="mt-6 flex flex-wrap items-center gap-2">
            <button z-button zSize="sm" type="button">
              <ng-icon name="lucideClock3" size="16" />
              View timeline
            </button>
            <button z-button zType="outline" zSize="sm" type="button">
              <ng-icon name="lucideUserRound" size="16" />
              Contact courier
            </button>
          </div>
        </div>

        <div class="relative h-[450px] overflow-hidden rounded-xl shadow-sm md:h-full">
          <ng-map
            [loading]="loading()"
            [center]="view.center"
            [zoom]="view.zoom"
            [options]="{ minZoom: view.minZoom, maxZoom: view.maxZoom }"
          >
            <!-- Road still ahead, then the covered part drawn on top of it. -->
            <ng-map-route
              id="delivery-route"
              [coordinates]="coordinates()"
              [color]="remainingColor()"
              [width]="style.remaining.width"
              [opacity]="style.remaining.opacity"
              [interactive]="false"
            />
            <ng-map-route
              id="delivery-route-progress"
              [coordinates]="progress().covered"
              [color]="style.progress.color"
              [width]="style.progress.width"
              [opacity]="style.progress.opacity"
              [interactive]="false"
            />

            @if (progress().position; as position) {
              <ng-map-marker [longitude]="position[0]" [latitude]="position[1]" [offset]="[0, 10]">
                <ng-marker-content>
                  <div
                    class="relative grid size-9 place-items-center rounded-full shadow-md"
                    [style.background-color]="style.progress.color"
                  >
                    <ng-icon name="lucideTruck" size="16" class="text-white" />
                    <div
                      class="bg-popover text-popover-foreground absolute bottom-full left-1/2 mb-2.5 -translate-x-1/2 rounded-md border px-2 py-1 text-xs font-medium whitespace-nowrap shadow-md"
                    >
                      {{ duration() }} away
                      <span
                        class="bg-popover absolute top-full left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-r border-b"
                      ></span>
                    </div>
                  </div>
                </ng-marker-content>
              </ng-map-marker>
            }

            <ng-map-marker [longitude]="pickup.lng" [latitude]="pickup.lat">
              <ng-marker-content>
                <div class="grid size-7 place-items-center rounded-full bg-emerald-500 shadow-md">
                  <ng-icon name="lucideStore" size="14" class="text-white" />
                </div>
              </ng-marker-content>
            </ng-map-marker>

            <ng-map-marker [longitude]="dropoff.lng" [latitude]="dropoff.lat">
              <ng-marker-content>
                <div class="grid size-7 place-items-center rounded-full bg-rose-500 shadow-md">
                  <ng-icon name="lucideHouse" size="14" class="text-white" />
                </div>
              </ng-marker-content>
            </ng-map-marker>
          </ng-map>
        </div>
      </div>
    </div>
  `,
})
export class DeliveryTrackerBlockComponent {
  private readonly darkMode = inject(ZardDarkMode);

  protected readonly meals = deliveryMeals;
  protected readonly pickup = pickup;
  protected readonly dropoff = dropoff;
  protected readonly view = mapView;
  protected readonly style = routeStyle;

  protected readonly routeData = signal<OsrmRouteData | null>(null);
  protected readonly loading = signal(true);

  protected readonly coordinates = computed(() => this.routeData()?.coordinates ?? []);
  protected readonly progress = computed(() => splitRoute(this.coordinates(), progressFraction));
  protected readonly duration = computed(() => formatDuration(this.routeData()?.duration));
  protected readonly distance = computed(() => formatDistance(this.routeData()?.distance));
  protected readonly remainingColor = computed(() =>
    this.darkMode.themeMode() === 'dark'
      ? routeStyle.remaining.color.dark
      : routeStyle.remaining.color.light,
  );

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) void this.fetchRoute();
  }

  private async fetchRoute(): Promise<void> {
    this.loading.set(true);
    try {
      const response = await fetch(buildRouteUrl(pickup, dropoff));
      const data = await response.json();
      const route = data?.routes?.[0];
      if (!route?.geometry?.coordinates) return;

      this.routeData.set({
        coordinates: route.geometry.coordinates as [number, number][],
        duration: route.duration as number,
        distance: route.distance as number,
      });
    } catch (error) {
      console.error('Failed to fetch route:', error);
    } finally {
      this.loading.set(false);
    }
  }
}
