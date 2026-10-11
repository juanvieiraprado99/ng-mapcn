import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  MapComponent,
  MapMarkerComponent,
  MarkerContentComponent,
  MarkerTooltipComponent,
} from 'ng-mapcn';
import { ExampleCardComponent } from '../../../shared/example-card';

type Status = 'available' | 'in-use' | 'offline';

interface ChargingStation {
  name: string;
  lng: number;
  lat: number;
  status: Status;
  detail: string;
}

const STATIONS: ChargingStation[] = [
  { name: 'Union Square', lng: -122.4074, lat: 37.7879, status: 'available', detail: '50 kW • $0.28/kWh' },
  { name: 'Castro Station', lng: -122.435, lat: 37.7625, status: 'in-use', detail: '~15 min remaining' },
  { name: 'Hayes Valley', lng: -122.4264, lat: 37.7759, status: 'offline', detail: '' },
  { name: 'Embarcadero', lng: -122.3934, lat: 37.7935, status: 'available', detail: '350 kW • $0.40/kWh' },
  { name: 'Marina District', lng: -122.437, lat: 37.801, status: 'available', detail: '150 kW • $0.32/kWh' },
  { name: 'SoMa Charger', lng: -122.401, lat: 37.778, status: 'available', detail: '50 kW • $0.30/kWh' },
  { name: 'Noe Valley', lng: -122.431, lat: 37.75, status: 'available', detail: '150 kW • $0.33/kWh' },
  { name: 'Richmond Charger', lng: -122.478, lat: 37.781, status: 'in-use', detail: '~8 min remaining' },
  { name: 'Potrero Hill', lng: -122.401, lat: 37.76, status: 'offline', detail: '' },
  { name: 'Mission Bay', lng: -122.391, lat: 37.77, status: 'available', detail: '350 kW • $0.38/kWh' },
  { name: 'Golden Gate Park', lng: -122.466, lat: 37.77, status: 'available', detail: '150 kW • $0.34/kWh' },
];

const STATUS_CONFIG: Record<Status, { bg: string; label: string; textClass: string }> = {
  available: { bg: 'bg-emerald-500', label: 'Available', textClass: 'text-emerald-500' },
  'in-use': { bg: 'bg-amber-500', label: 'In Use', textClass: 'text-amber-500' },
  offline: { bg: 'bg-zinc-400', label: 'Offline', textClass: 'text-muted-foreground' },
};

@Component({
  selector: 'app-ev-charging-example',
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
    <app-example-card class="aspect-square">
      <ng-map
        [center]="[-122.434, 37.776]"
        [zoom]="11"
        [options]="{ scrollZoom: false, dragRotate: false, pitchWithRotate: false }"
      >
        @for (station of stations; track station.name) {
          <ng-map-marker [longitude]="station.lng" [latitude]="station.lat">
            <ng-marker-content>
              <div class="rounded-full p-1.5 shadow-lg {{ config[station.status].bg }}">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="white"
                  stroke="white"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="size-3"
                >
                  <path
                    d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"
                  />
                </svg>
              </div>
            </ng-marker-content>
            <ng-marker-tooltip>
              <div
                class="demo-tooltip-card bg-popover text-popover-foreground space-y-1 rounded-md border px-2.5 py-1.5 text-xs shadow-md"
              >
                <div class="font-medium">{{ station.name }}</div>
                <div class="flex items-center gap-1">
                  <span
                    class="size-1.5 rounded-full {{ config[station.status].bg }}"
                  ></span>
                  <span class="{{ config[station.status].textClass }}">{{
                    config[station.status].label
                  }}</span>
                </div>
                @if (station.detail) {
                  <div class="text-muted-foreground text-[11px]">
                    {{ station.detail }}
                  </div>
                }
              </div>
            </ng-marker-tooltip>
          </ng-map-marker>
        }
      </ng-map>
    </app-example-card>
  `,
})
export class EvChargingExampleComponent {
  readonly stations = STATIONS;
  readonly config = STATUS_CONFIG;
}
