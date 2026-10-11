import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideClock, lucideMapPin, lucidePhone } from '@ng-icons/lucide';
import {
  MapComponent,
  MapContextService,
  MapControlsComponent,
  MapMarkerComponent,
  MapPopupComponent,
  MarkerContentComponent,
  MarkerTooltipComponent,
} from 'ng-mapcn';
import { ZardSidebarImports } from '@/shared/components/sidebar';
import type { Store } from '../data';

/** Flies to the selected store (mapcn `FlyToSelected`, through `MapContextService`). */
@Component({
  selector: 'app-fly-to-selected',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
export class FlyToSelectedComponent {
  readonly store = input<Store>();

  constructor() {
    const ctx = inject(MapContextService);
    effect(() => {
      const map = ctx.map();
      const store = this.store();
      if (!map || !store) return;
      map.flyTo({ center: [store.lng, store.lat], zoom: 14, duration: 800, essential: true });
    });
  }
}

@Component({
  selector: 'app-locator-map',
  standalone: true,
  imports: [
    NgIcon,
    MapComponent,
    MapControlsComponent,
    MapMarkerComponent,
    MapPopupComponent,
    MarkerContentComponent,
    MarkerTooltipComponent,
    ZardSidebarImports,
    FlyToSelectedComponent,
  ],
  viewProviders: [provideIcons({ lucideClock, lucideMapPin, lucidePhone })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block h-full' },
  template: `
    <button
      z-sidebar-trigger
      class="bg-background absolute top-3 left-3 z-10 border shadow-sm md:hidden"
    ></button>

    <ng-map
      [center]="center()"
      [zoom]="12"
      [options]="{ minZoom: 10, maxZoom: 17 }"
      (mapReady)="mapReady.set(true)"
    >
      <ng-map-controls [showFullscreen]="true" [showCompass]="true" />
      <app-fly-to-selected [store]="selected()" />

      @for (store of stores(); track store.id) {
        <ng-map-marker
          [longitude]="store.lng"
          [latitude]="store.lat"
          (markerClick)="selectStore.emit(store.id)"
        >
          <ng-marker-content>
            <div
              class="text-background flex items-center justify-center rounded-full shadow-md transition-all"
              [class]="
                store.id === selectedId()
                  ? 'bg-foreground/80 size-9 scale-110'
                  : 'bg-foreground hover:bg-muted-foreground size-7'
              "
            >
              <ng-icon name="lucideMapPin" [size]="store.id === selectedId() ? '18' : '14'" />
            </div>
          </ng-marker-content>
          <ng-marker-tooltip [offset]="24">{{ store.name }}</ng-marker-tooltip>
        </ng-map-marker>
      }

      <!-- ng-map-popup takes its content when it is created: mount it once the
           map is ready, so the selected store at load time renders inside it. -->
      @if (mapReady() && selected(); as store) {
        <ng-map-popup
          [longitude]="store.lng"
          [latitude]="store.lat"
          [offset]="26"
          [closeButton]="true"
          [closeOnClick]="false"
          (popupClose)="clearSelection.emit()"
        >
          <!-- map-popup-surface: draws its own surface (see styles.scss). -->
          <div
            class="map-popup-surface bg-popover text-popover-foreground relative max-w-62 min-w-56 rounded-md border p-3 shadow-md"
          >
            <p class="text-popover-foreground pr-5 font-medium">{{ store.name }}</p>
            <span
              class="mt-1 flex items-center gap-1.5 text-xs font-medium"
              [class]="store.openNow ? 'text-foreground' : 'text-muted-foreground'"
            >
              <span
                class="size-1.5 rounded-full"
                [class]="store.openNow ? 'bg-emerald-500' : 'bg-neutral-500'"
              ></span>
              {{ store.openNow ? 'Open now' : 'Closed' }}
            </span>

            <div class="text-muted-foreground mt-2.5 space-y-1.5 text-xs tabular-nums">
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
          </div>
        </ng-map-popup>
      }
    </ng-map>
  `,
})
export class LocatorMapComponent {
  readonly stores = input.required<Store[]>();
  readonly selectedId = input<string | null>(null);
  readonly center = input.required<[number, number]>();

  readonly selectStore = output<string>();
  readonly clearSelection = output<void>();

  protected readonly mapReady = signal(false);
  protected readonly selected = computed(() =>
    this.stores().find((store) => store.id === this.selectedId()),
  );
}
