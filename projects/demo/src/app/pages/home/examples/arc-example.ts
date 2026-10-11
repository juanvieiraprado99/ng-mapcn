import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  MapArcComponent,
  type MapArcDatum,
  MapComponent,
  MapMarkerComponent,
  MarkerContentComponent,
  MarkerLabelComponent,
} from 'ng-mapcn';

import { ExampleCardComponent } from '../../../shared/example-card';

const HUB = { name: 'London', lng: -0.1276, lat: 51.5074 };

const DESTINATIONS = [
  { name: 'New York', lng: -74.006, lat: 40.7128 },
  { name: 'São Paulo', lng: -46.6333, lat: -23.5505 },
  { name: 'Cape Town', lng: 18.4241, lat: -33.9249 },
  { name: 'Mumbai', lng: 72.8777, lat: 19.076 },
  { name: 'Tokyo', lng: 139.6917, lat: 35.6895 },
];

@Component({
  selector: 'app-arc-example',
  standalone: true,
  imports: [
    ExampleCardComponent,
    MapComponent,
    MapArcComponent,
    MapMarkerComponent,
    MarkerContentComponent,
    MarkerLabelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-example-card class="aspect-square">
      <ng-map
        [center]="[-0.1276, 41.5074]"
        [zoom]="1"
        [projection]="{ type: 'globe' }"
        [options]="{ scrollZoom: false }"
      >
        <ng-map-arc
          [data]="arcs"
          [paint]="{
            'line-color': '#3b82f6',
            'line-opacity': 0.9,
            'line-dasharray': [2, 2],
          }"
          [interactive]="false"
        />

        <ng-map-marker [longitude]="hub.lng" [latitude]="hub.lat">
          <ng-marker-content>
            <div class="size-3 rounded-full border-2 border-white bg-blue-500"></div>
            <ng-marker-label position="top">{{ hub.name }}</ng-marker-label>
          </ng-marker-content>
        </ng-map-marker>

        @for (dest of destinations; track dest.name) {
          <ng-map-marker [longitude]="dest.lng" [latitude]="dest.lat">
            <ng-marker-content>
              <div class="size-2 rounded-full border-2 border-white bg-blue-500"></div>
              <ng-marker-label position="top">{{ dest.name }}</ng-marker-label>
            </ng-marker-content>
          </ng-map-marker>
        }
      </ng-map>
    </app-example-card>
  `,
})
export class ArcExampleComponent {
  readonly hub = HUB;
  readonly destinations = DESTINATIONS;
  readonly arcs: MapArcDatum[] = DESTINATIONS.map((dest) => ({
    id: dest.name,
    from: [HUB.lng, HUB.lat] as [number, number],
    to: [dest.lng, dest.lat] as [number, number],
  }));
}
