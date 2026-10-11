import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  MapArcComponent,
  MapComponent,
  MapControlsComponent,
  MapMarkerComponent,
  MarkerContentComponent,
  MarkerTooltipComponent,
  type MapArcDatum,
} from 'ng-mapcn';
import { ZardSeparatorComponent } from '@/shared/components/separator';
import { ZardSidebarImports } from '@/shared/components/sidebar';
import { modeConfig, regionLabels, statusConfig, type Hub, type Route } from '../data';

@Component({
  selector: 'app-network-map',
  standalone: true,
  imports: [
    DecimalPipe,
    MapArcComponent,
    MapComponent,
    MapControlsComponent,
    MapMarkerComponent,
    MarkerContentComponent,
    MarkerTooltipComponent,
    ZardSeparatorComponent,
    ZardSidebarImports,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block h-full' },
  template: `
    <div
      class="border-border/40 bg-background/70 absolute top-4 left-4 z-20 flex items-center gap-3 rounded-lg border px-2.5 py-1.5 backdrop-blur-sm"
    >
      <button z-sidebar-trigger></button>
      <z-separator zOrientation="vertical" class="h-4! self-center!" />
      <div class="flex items-center gap-3 text-xs">
        <div class="flex items-center gap-1.5">
          <span
            class="h-0.5 w-4 shrink-0 rounded-full"
            [style.background-color]="mode.air.color"
          ></span>
          <span>{{ mode.air.label }}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span
            class="h-0.5 w-4 shrink-0 rounded-full"
            [style.background-color]="mode.ground.color"
          ></span>
          <span>{{ mode.ground.label }}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span
            class="h-0.5 w-4 shrink-0 rounded-full"
            [style.background-color]="status.delayed.color"
          ></span>
          <span>{{ status.delayed.label }}</span>
        </div>
        <z-separator zOrientation="vertical" class="h-4! self-center!" />
        <div class="flex items-center gap-1.5">
          <div
            class="size-2.5 shrink-0 rounded-full border border-white bg-blue-500 shadow-sm"
          ></div>
          <span>Hub</span>
        </div>
      </div>
    </div>

    <ng-map [center]="[-98, 39]" [zoom]="4" [projection]="{ type: 'globe' }">
      <ng-map-controls />
      <ng-map-arc [data]="arcs()" [curvature]="0.3" [paint]="arcPaint" [interactive]="false" />

      @for (hub of hubs(); track hub.id) {
        <ng-map-marker [longitude]="hub.lng" [latitude]="hub.lat">
          <ng-marker-content>
            <div class="size-3 rounded-full border-2 border-white bg-blue-500 shadow-md"></div>
          </ng-marker-content>
          <ng-marker-tooltip [offset]="16">
            <!-- map-tooltip-surface: draws its own surface (see styles.scss). -->
            <div
              class="map-tooltip-surface bg-background text-foreground rounded-md border px-2.5 py-1.5 text-xs shadow-md"
            >
              <p class="font-medium">{{ hub.city }}</p>
              <p class="text-muted-foreground mt-1">
                {{ hub.shipments | number }} shipments
                <span class="mx-1">•</span>
                {{ regionLabels[hub.region] }}
              </p>
            </div>
          </ng-marker-tooltip>
        </ng-map-marker>
      }
    </ng-map>
  `,
})
export class NetworkMapComponent {
  readonly hubs = input.required<Hub[]>();
  readonly routes = input.required<Route[]>();

  protected readonly mode = modeConfig;
  protected readonly status = statusConfig;
  protected readonly regionLabels = regionLabels;

  protected readonly arcPaint = {
    'line-color': ['get', 'color'] as never,
    'line-width': 2,
    'line-opacity': 0.65,
  };

  protected readonly arcs = computed<MapArcDatum[]>(() => {
    const hubById: Record<string, Hub> = Object.fromEntries(
      this.hubs().map((hub) => [hub.id, hub]),
    );
    return this.routes().flatMap((route) => {
      const fromHub = hubById[route.from];
      const toHub = hubById[route.to];
      if (!fromHub || !toHub) return [];
      return [
        {
          id: `${route.from}-${route.to}`,
          from: [fromHub.lng, fromHub.lat] as [number, number],
          to: [toHub.lng, toHub.lat] as [number, number],
          color:
            route.status === 'delayed' ? statusConfig.delayed.color : modeConfig[route.mode].color,
        },
      ];
    });
  });
}
