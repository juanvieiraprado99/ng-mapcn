import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideTrendingUp } from '@ng-icons/lucide';
import {
  MapComponent,
  MapGeoJSONComponent,
  MapMarkerComponent,
  MarkerContentComponent,
} from 'ng-mapcn';

import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardCardComponent } from '@/shared/components/card';

import { totalVisitors, visitorGrowth, visitorLocations } from './data';

// Country borders from a public CDN, or swap in your own GeoJSON.
const WORLD_GEOJSON =
  'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@v5.1.2/geojson/ne_110m_admin_0_countries.geojson';

function bubbleSize(visitors: number): number {
  return Math.round(10 + Math.sqrt(visitors) * 2.2);
}

@Component({
  selector: 'app-analytics-card-block',
  standalone: true,
  imports: [
    NgIcon,
    MapComponent,
    MapGeoJSONComponent,
    MapMarkerComponent,
    MarkerContentComponent,
    ZardBadgeComponent,
    ZardCardComponent,
  ],
  viewProviders: [provideIcons({ lucideTrendingUp })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-screen items-center justify-center p-8">
      <z-card class="relative aspect-16/10 w-full max-w-md overflow-hidden py-0">
        <div class="absolute inset-0">
          <ng-map
            [center]="[1, 30]"
            [zoom]="0"
            [blank]="true"
            [options]="mapOptions"
            class="[&_.maplibregl-canvas]:cursor-default! [&_.maplibregl-canvas-container]:cursor-default!"
          >
            <ng-map-geojson [data]="worldGeoJson" [linePaint]="false" />
            @for (location of locations; track location.city) {
              <ng-map-marker [longitude]="location.lng" [latitude]="location.lat">
                <ng-marker-content>
                  <span
                    class="bg-chart-2/80 block cursor-default rounded-full"
                    [style.width.px]="size(location.visitors)"
                    [style.height.px]="size(location.visitors)"
                  ></span>
                </ng-marker-content>
              </ng-map-marker>
            }
          </ng-map>
        </div>

        <!-- Card header: fades out over the map below it. -->
        <div
          class="from-card via-card/85 to-card/0 relative z-10 -mx-4 grid grid-cols-[1fr_auto] items-start gap-1 rounded-t-[inherit] bg-linear-to-b px-4 pt-4 pb-10 mask-[linear-gradient(to_bottom,black_calc(100%_-_2.5rem),transparent)] backdrop-blur-[2px]"
        >
          <div class="text-muted-foreground text-sm">Visitors</div>
          <z-badge zType="outline" class="row-span-2 self-start justify-self-end">
            <ng-icon name="lucideTrendingUp" />
            {{ growth }} growth
          </z-badge>
          <div class="text-lg font-semibold tabular-nums">{{ total }}</div>
        </div>
      </z-card>
    </div>
  `,
})
export class AnalyticsCardBlockComponent {
  protected readonly worldGeoJson = WORLD_GEOJSON;
  protected readonly locations = visitorLocations;
  protected readonly total = totalVisitors;
  protected readonly growth = visitorGrowth;
  protected readonly size = bubbleSize;

  protected readonly mapOptions = {
    scrollZoom: false,
    dragRotate: false,
    dragPan: false,
    doubleClickZoom: false,
    pitchWithRotate: false,
  };
}
