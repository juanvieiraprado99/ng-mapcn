import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  MapComponent,
  MapMarkerComponent,
  MapRouteComponent,
  MarkerContentComponent,
  MarkerLabelComponent,
  MarkerTooltipComponent,
} from 'ng-mapcn';

import { ExampleCardComponent } from '../../../shared/example-card';

const STORE = { lng: -0.14, lat: 51.5154 };
const HOME = { lng: -0.07, lat: 51.51 };

// Precomputed driving route (OSRM result)
const ROUTE: [number, number][] = [
  [-0.14, 51.5155],
  [-0.1418, 51.5153],
  [-0.1417, 51.5145],
  [-0.1414, 51.514],
  [-0.1407, 51.5133],
  [-0.1398, 51.5122],
  [-0.1393, 51.5117],
  [-0.1388, 51.5111],
  [-0.1381, 51.5103],
  [-0.1376, 51.5101],
  [-0.1364, 51.5099],
  [-0.136, 51.5099],
  [-0.1354, 51.5101],
  [-0.1348, 51.5101],
  [-0.134, 51.51],
  [-0.1333, 51.5101],
  [-0.1326, 51.5094],
  [-0.1319, 51.5086],
  [-0.1311, 51.5078],
  [-0.1301, 51.508],
  [-0.1292, 51.5083],
  [-0.129, 51.5082],
  [-0.1286, 51.5075],
  [-0.128, 51.5075],
  [-0.1275, 51.5076],
  [-0.1272, 51.5074],
  [-0.1255, 51.507],
  [-0.1233, 51.5067],
  [-0.1226, 51.5066],
  [-0.1219, 51.5072],
  [-0.1208, 51.5084],
  [-0.1193, 51.5094],
  [-0.1187, 51.5097],
  [-0.1165, 51.5104],
  [-0.1154, 51.5107],
  [-0.1135, 51.5109],
  [-0.112, 51.511],
  [-0.1082, 51.511],
  [-0.1072, 51.511],
  [-0.1035, 51.511],
  [-0.1015, 51.5112],
  [-0.0958, 51.5112],
  [-0.0932, 51.5109],
  [-0.0912, 51.5105],
  [-0.0903, 51.5103],
  [-0.0896, 51.5102],
  [-0.0883, 51.5099],
  [-0.0871, 51.5097],
  [-0.0838, 51.5093],
  [-0.0818, 51.5091],
  [-0.0805, 51.5094],
  [-0.0797, 51.5096],
  [-0.0782, 51.5095],
  [-0.0768, 51.5095],
  [-0.0755, 51.5097],
  [-0.0748, 51.5099],
  [-0.0741, 51.5098],
  [-0.0736, 51.5093],
  [-0.0732, 51.5089],
  [-0.0715, 51.5084],
  [-0.0709, 51.5083],
  [-0.0705, 51.5091],
  [-0.0696, 51.5094],
  [-0.0699, 51.51],
];

@Component({
  selector: 'app-delivery-example',
  standalone: true,
  imports: [
    ExampleCardComponent,
    MapComponent,
    MapRouteComponent,
    MapMarkerComponent,
    MarkerContentComponent,
    MarkerLabelComponent,
    MarkerTooltipComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-example-card class="aspect-square sm:col-span-2 sm:aspect-video lg:aspect-auto">
      <ng-map
        [center]="[-0.105, 51.511]"
        [zoom]="12.6"
        [options]="{ scrollZoom: false, dragRotate: false, pitchWithRotate: false }"
      >
        <ng-map-route [coordinates]="route" [width]="4" color="#3b82f6" />

        <ng-map-marker [longitude]="store.lng" [latitude]="store.lat">
          <ng-marker-content>
            <div class="size-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-lg"></div>
            <ng-marker-label>Store</ng-marker-label>
          </ng-marker-content>
        </ng-map-marker>

        <ng-map-marker [longitude]="truckPosition[0]" [latitude]="truckPosition[1]">
          <ng-marker-content>
            <div class="rounded-full bg-blue-500 p-1.5 shadow-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="size-3"
              >
                <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
                <path d="M15 18H9" />
                <path
                  d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"
                />
                <circle cx="17" cy="18" r="2" />
                <circle cx="7" cy="18" r="2" />
              </svg>
            </div>
          </ng-marker-content>
          <ng-marker-tooltip>On the way</ng-marker-tooltip>
        </ng-map-marker>

        <ng-map-marker [longitude]="home.lng" [latitude]="home.lat">
          <ng-marker-content>
            <div class="size-3.5 rounded-full border-2 border-white bg-red-500 shadow-lg"></div>
            <ng-marker-label>Home</ng-marker-label>
          </ng-marker-content>
        </ng-map-marker>
      </ng-map>
    </app-example-card>
  `,
})
export class DeliveryExampleComponent {
  readonly store = STORE;
  readonly home = HOME;
  readonly route = ROUTE;
  readonly truckPosition = ROUTE[Math.floor(ROUTE.length * 0.6)];
}
