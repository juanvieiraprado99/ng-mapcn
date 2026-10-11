import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import type { Map as MapLibreMap } from 'maplibre-gl';
import {
  MapComponent,
  MapMarkerComponent,
  MarkerContentComponent,
} from 'ng-mapcn';
import { ExampleCardComponent } from '../../../shared/example-card';

const DESTINATIONS = [
  { name: 'New York', center: [-74.006, 40.7128] as [number, number] },
  { name: 'London', center: [-0.1276, 51.5074] as [number, number] },
  { name: 'Tokyo', center: [139.6917, 35.6895] as [number, number] },
  { name: 'Sydney', center: [151.2093, -33.8688] as [number, number] },
];

@Component({
  selector: 'app-flyto-example',
  standalone: true,
  imports: [
    ExampleCardComponent,
    MapComponent,
    MapMarkerComponent,
    MarkerContentComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-example-card class="aspect-square">
      <ng-map
        [center]="destinations[0].center"
        [zoom]="5.5"
        [options]="{ scrollZoom: false, dragRotate: false, pitchWithRotate: false }"
        (mapReady)="onMapReady($event)"
      >
        <ng-map-marker
          [longitude]="active().center[0]"
          [latitude]="active().center[1]"
        >
          <ng-marker-content>
            <div
              class="size-3.5 rounded-full border-2 border-white bg-blue-500 shadow-lg"
            ></div>
          </ng-marker-content>
        </ng-map-marker>
      </ng-map>

      <div class="absolute inset-x-3 top-3 flex flex-wrap gap-1.5">
        @for (dest of destinations; track dest.name; let i = $index) {
          <button
            type="button"
            (click)="flyTo(i)"
            class="rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm transition-colors"
            [class]="
              i === activeIndex()
                ? 'bg-primary text-primary-foreground border-transparent'
                : 'bg-secondary text-secondary-foreground hover:bg-accent'
            "
          >
            {{ dest.name }}
          </button>
        }
      </div>
    </app-example-card>
  `,
})
export class FlytoExampleComponent {
  readonly destinations = DESTINATIONS;
  readonly activeIndex = signal(0);
  readonly active = () => DESTINATIONS[this.activeIndex()];

  private map?: MapLibreMap;

  onMapReady(map: MapLibreMap): void {
    this.map = map;
  }

  flyTo(index: number): void {
    this.activeIndex.set(index);
    this.map?.flyTo({
      center: DESTINATIONS[index].center,
      zoom: 6,
      duration: 2000,
      essential: true,
    });
  }
}
