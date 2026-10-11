import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  MapComponent,
  MapMarkerComponent,
  MapRouteComponent,
  MarkerContentComponent,
} from 'ng-mapcn';
import { ExampleCardComponent } from '../../../shared/example-card';

// Central Park cycling route
const TRAIL_COORDINATES: [number, number][] = [
  [-73.95846730810143, 40.80035246904919],
  [-73.9717593682683, 40.78210942124929],
  [-73.98192123136191, 40.76793032580281],
  [-73.97393759456651, 40.76462909128966],
  [-73.97291537521572, 40.765159628993814],
  [-73.96920618484948, 40.7637106622374],
  [-73.96383691302509, 40.77117117897504],
  [-73.9584024523858, 40.76889223221369],
  [-73.9470773638119, 40.784238113060894],
  [-73.95585246901248, 40.78786547226602],
  [-73.94937945594087, 40.79668351998197],
  [-73.9498273526222, 40.797167598041455],
  [-73.95699644240298, 40.80016017872583],
];

@Component({
  selector: 'app-trail-example',
  standalone: true,
  imports: [
    ExampleCardComponent,
    MapComponent,
    MapRouteComponent,
    MapMarkerComponent,
    MarkerContentComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-example-card class="aspect-square">
      <div
        class="bg-background/95 border-border/50 absolute top-3 left-3 z-10 rounded-lg border p-3 shadow-lg backdrop-blur-md"
      >
        <div class="mb-2 flex items-center gap-1.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-foreground size-3.5"
          >
            <circle cx="18.5" cy="17.5" r="3.5" />
            <circle cx="5.5" cy="17.5" r="3.5" />
            <circle cx="15" cy="5" r="1" />
            <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
          </svg>
          <span class="text-xs font-medium">Central Park Loop</span>
        </div>
        <div class="grid grid-cols-3 gap-3 text-center">
          <div>
            <div class="text-sm font-semibold">6.2</div>
            <div class="text-muted-foreground text-[9px] uppercase">Miles</div>
          </div>
          <div>
            <div class="text-sm font-semibold">32</div>
            <div class="text-muted-foreground text-[9px] uppercase">Mins</div>
          </div>
          <div>
            <div class="text-sm font-semibold">285</div>
            <div class="text-muted-foreground text-[9px] uppercase">Cal</div>
          </div>
        </div>
      </div>

      <ng-map
        [center]="[-73.97, 40.782]"
        [zoom]="11.8"
        [options]="{ scrollZoom: false, dragRotate: false, pitchWithRotate: false }"
      >
        <ng-map-route
          [coordinates]="coordinates"
          color="#3b82f6"
          [width]="3"
          [opacity]="0.9"
        />

        <ng-map-marker [longitude]="start[0]" [latitude]="start[1]">
          <ng-marker-content>
            <div
              class="size-3 rounded-full border-2 border-white bg-emerald-500 shadow-lg"
            ></div>
          </ng-marker-content>
        </ng-map-marker>

        <ng-map-marker [longitude]="end[0]" [latitude]="end[1]">
          <ng-marker-content>
            <div
              class="size-3 rounded-full border-2 border-white bg-red-500 shadow-lg"
            ></div>
          </ng-marker-content>
        </ng-map-marker>
      </ng-map>
    </app-example-card>
  `,
})
export class TrailExampleComponent {
  readonly coordinates = TRAIL_COORDINATES;
  readonly start = TRAIL_COORDINATES[0];
  readonly end = TRAIL_COORDINATES[TRAIL_COORDINATES.length - 1];
}
