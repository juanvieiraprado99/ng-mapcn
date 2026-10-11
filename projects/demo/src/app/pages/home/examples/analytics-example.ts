import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  MapComponent,
  MapMarkerComponent,
  MarkerContentComponent,
  MarkerTooltipComponent,
} from 'ng-mapcn';
import { ExampleCardComponent } from '../../../shared/example-card';

const ANALYTICS_DATA = [
  { lng: -74.006, lat: 40.7128, city: 'New York', users: 847, size: 14 },
  { lng: -0.1276, lat: 51.5074, city: 'London', users: 623, size: 12 },
  { lng: 139.6917, lat: 35.6895, city: 'Tokyo', users: 412, size: 10 },
  { lng: 114.1694, lat: 22.3193, city: 'Hong Kong', users: 364, size: 10 },
  { lng: -122.4194, lat: 37.7749, city: 'San Francisco', users: 298, size: 9 },
  { lng: 72.8777, lat: 19.076, city: 'Mumbai', users: 271, size: 9 },
  { lng: 13.405, lat: 52.52, city: 'Berlin', users: 187, size: 8 },
  { lng: 77.209, lat: 28.6139, city: 'Delhi', users: 156, size: 7 },
  { lng: 151.2093, lat: -33.8688, city: 'Sydney', users: 134, size: 7 },
  { lng: 18.4241, lat: -33.9249, city: 'Cape Town', users: 118, size: 6 },
  { lng: -43.1729, lat: -22.9068, city: 'Rio', users: 89, size: 6 },
  { lng: 126.978, lat: 37.5665, city: 'Seoul', users: 45, size: 5 },
];

@Component({
  selector: 'app-analytics-example',
  standalone: true,
  imports: [
    ExampleCardComponent,
    MapComponent,
    MapMarkerComponent,
    MarkerContentComponent,
    MarkerTooltipComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-example-card
      class="aspect-square sm:col-span-2 sm:aspect-video lg:aspect-auto"
    >
      <div
        class="bg-background/95 border-border/50 absolute top-3 left-3 z-10 rounded-lg border p-3 shadow-lg backdrop-blur-md"
      >
        <div class="text-muted-foreground mb-1 text-[10px] tracking-wider uppercase">
          Active Users
        </div>
        <div class="text-2xl leading-tight font-semibold">3,544</div>
        <div class="mt-1 flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-3"
          >
            <path d="M16 7h6v6" />
            <path d="m22 7-8.5 8.5-5-5L2 17" />
          </svg>
          <span class="text-foreground text-xs">+12.5%</span>
          <span class="text-muted-foreground text-xs">vs last hour</span>
        </div>
      </div>

      <ng-map
        [center]="[0, 30]"
        [zoom]="1.1"
        [options]="{ scrollZoom: false, dragRotate: false, pitchWithRotate: false }"
      >
        @for (loc of data; track loc.city) {
          <ng-map-marker [longitude]="loc.lng" [latitude]="loc.lat">
            <ng-marker-content>
              <div
                class="rounded-full bg-blue-500/80 shadow-sm"
                [style.width.px]="loc.size * 1.8"
                [style.height.px]="loc.size * 1.8"
              ></div>
            </ng-marker-content>
            <ng-marker-tooltip>
              <div class="text-center">
                <div class="font-medium">{{ loc.city }}</div>
                <div class="text-background/80">{{ loc.users }} users</div>
              </div>
            </ng-marker-tooltip>
          </ng-map-marker>
        }
      </ng-map>
    </app-example-card>
  `,
})
export class AnalyticsExampleComponent {
  readonly data = ANALYTICS_DATA;
}
