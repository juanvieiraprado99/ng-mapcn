import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  MapComponent,
  MapControlsComponent,
  MapGeoJSONComponent,
  MapMarkerComponent,
  MarkerContentComponent,
  MarkerTooltipComponent,
} from 'ng-mapcn';
import { BreakdownCardComponent } from './components/breakdown-card';
import { OverviewCardComponent } from './components/overview-card';
import { browsersRows, countriesRows, locations, referrersRows, visitedPagesRows } from './data';

const MAP_HEIGHT = '38rem';

// Country borders from a public CDN, or swap in your own GeoJSON.
const WORLD_GEOJSON =
  'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@v5.1.2/geojson/ne_110m_admin_0_countries.geojson';

@Component({
  selector: 'app-analytics-map-block',
  standalone: true,
  imports: [
    MapComponent,
    MapControlsComponent,
    MapGeoJSONComponent,
    MapMarkerComponent,
    MarkerContentComponent,
    MarkerTooltipComponent,
    BreakdownCardComponent,
    OverviewCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-background relative min-h-screen" [style.--map-height]="mapHeight">
      <div class="bg-card relative h-(--map-height)">
        <ng-map [center]="[-2, 16]" [zoom]="1.4" [blank]="true" [options]="mapOptions">
          <ng-map-geojson [data]="worldGeoJson" [linePaint]="false" />
          <ng-map-controls class="[&_.ng-controls]:bottom-2!" />
          @for (location of locations; track location.city) {
            <ng-map-marker [longitude]="location.lng" [latitude]="location.lat">
              <ng-marker-content>
                <div class="group">
                  <div
                    class="bg-chart-2/80 group-hover:bg-chart-2/90 rounded-full transition-[transform,background-color] group-hover:scale-110"
                    [style.width.px]="location.size * 3"
                    [style.height.px]="location.size * 3"
                  ></div>
                </div>
              </ng-marker-content>
              <ng-marker-tooltip [offset]="20">
                <!-- map-tooltip-surface: this content draws its own surface
                     instead of the default dark pill (see styles.scss). -->
                <div
                  class="map-tooltip-surface bg-popover text-popover-foreground rounded-md border px-2 py-1 text-xs shadow-md"
                >
                  <p class="font-medium">{{ location.city }}</p>
                  <p class="text-muted-foreground mt-0.5">{{ location.size }} active users</p>
                </div>
              </ng-marker-tooltip>
            </ng-map-marker>
          }
        </ng-map>
        <div
          class="via-background/30 to-background pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-b from-transparent"
          aria-hidden="true"
        ></div>
        <app-overview-card />
      </div>

      <div class="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <app-breakdown-card title="Visited pages" [rows]="visitedPagesRows" />
        <app-breakdown-card title="Referrers" [rows]="referrersRows" />
        <app-breakdown-card title="Countries" [rows]="countriesRows" />
        <app-breakdown-card title="Browsers" [rows]="browsersRows" />
      </div>
    </div>
  `,
})
export class AnalyticsMapBlockComponent {
  protected readonly mapHeight = MAP_HEIGHT;
  protected readonly worldGeoJson = WORLD_GEOJSON;
  protected readonly locations = locations;
  protected readonly visitedPagesRows = visitedPagesRows;
  protected readonly referrersRows = referrersRows;
  protected readonly countriesRows = countriesRows;
  protected readonly browsersRows = browsersRows;

  protected readonly mapOptions = {
    minZoom: 1.4,
    maxZoom: 4,
    scrollZoom: false,
    dragRotate: false,
    pitchWithRotate: false,
    renderWorldCopies: true,
  };
}
