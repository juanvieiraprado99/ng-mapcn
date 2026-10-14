import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import type { ExpressionSpecification } from 'maplibre-gl';
import {
  MapArcComponent,
  type MapArcDatum,
  type MapArcEvent,
  MapComponent,
  MapMarkerComponent,
  MapPopupComponent,
  MarkerContentComponent,
  MarkerLabelComponent,
} from 'ng-mapcn';

import { DocsImports } from '../../../shared/docs';
import { ExampleSectionComponent } from '../../../shared/example-section';

const BASIC_CODE = `import { Component } from '@angular/core';
import { MapArcComponent, MapArcDatum, MapComponent } from 'ng-mapcn';

const hub = { name: 'London', lng: -0.1276, lat: 51.5074 };

const destinations = [
  { name: 'New York', lng: -74.006, lat: 40.7128 },
  { name: 'São Paulo', lng: -46.6333, lat: -23.5505 },
  { name: 'Cape Town', lng: 18.4241, lat: -33.9249 },
  { name: 'Dubai', lng: 55.2708, lat: 25.2048 },
  // ...
];

@Component({
  selector: 'app-basic-arc',
  standalone: true,
  imports: [MapComponent, MapArcComponent],
  template: \`
    <div class="h-[420px]">
      <ng-map [center]="[-0.1276, 51.5074]" [zoom]="1" [projection]="{ type: 'globe' }">
        <ng-map-arc
          [data]="arcs"
          [paint]="{ 'line-color': '#3b82f6', 'line-dasharray': [2, 2] }"
          [interactive]="false"
        />
      </ng-map>
    </div>
  \`,
})
export class BasicArcComponent {
  readonly arcs: MapArcDatum[] = destinations.map((dest) => ({
    id: dest.name,
    from: [hub.lng, hub.lat],
    to: [dest.lng, dest.lat],
  }));
}`;

const INTERACTIVE_CODE = `import { Component, signal } from '@angular/core';
import type { ExpressionSpecification } from 'maplibre-gl';
import {
  MapArcComponent,
  MapArcDatum,
  MapArcEvent,
  MapComponent,
  MapPopupComponent,
} from 'ng-mapcn';

interface Lane extends MapArcDatum {
  origin: string;
  destination: string;
  volume: string;
  mode: 'air' | 'sea';
}

const lanes: Lane[] = [
  { id: 'shg-lax', origin: 'Shanghai', destination: 'Los Angeles',
    from: [121.4737, 31.2304], to: [-118.2437, 34.0522],
    volume: '24.8k TEU', mode: 'sea' },
  { id: 'dxb-jfk', origin: 'Dubai', destination: 'New York',
    from: [55.2708, 25.2048], to: [-74.006, 40.7128],
    volume: '980 tons', mode: 'air' },
  // ...
];

// Extra datum properties are exposed to paint expressions via ["get", ...]
const modeColor: ExpressionSpecification = [
  'match', ['get', 'mode'],
  'air', '#a78bfa',
  'sea', '#34d399',
  '#888',
];

@Component({
  selector: 'app-interactive-arc',
  standalone: true,
  imports: [MapComponent, MapArcComponent, MapPopupComponent],
  template: \`
    <div class="h-[420px]">
      <ng-map [center]="[20, 20]" [zoom]="0.8">
        <ng-map-arc
          [data]="lanes"
          [paint]="{ 'line-color': modeColor, 'line-width': 1.5 }"
          [hoverPaint]="{ 'line-width': 3, 'line-opacity': 1 }"
          (arcHover)="onHover($event)"
        />
        @if (selected(); as sel) {
          <ng-map-popup
            [longitude]="sel.longitude"
            [latitude]="sel.latitude"
            [offset]="12"
            [closeOnClick]="false"
            className="ng-popup-passthrough"
          >
            {{ sel.lane.origin }} → {{ sel.lane.destination }} · {{ sel.lane.volume }}
          </ng-map-popup>
        }
      </ng-map>
    </div>
  \`,
})
export class InteractiveArcComponent {
  readonly lanes = lanes;
  readonly modeColor = modeColor;
  readonly selected = signal<{
    lane: Lane;
    longitude: number;
    latitude: number;
  } | null>(null);

  onHover(event: MapArcEvent<Lane> | null): void {
    this.selected.set(
      event
        ? { lane: event.arc, longitude: event.longitude, latitude: event.latitude }
        : null
    );
  }
}`;

const HUB = { name: 'London', lng: -0.1276, lat: 51.5074 };

const DESTINATIONS = [
  { name: 'New York', lng: -74.006, lat: 40.7128 },
  { name: 'São Paulo', lng: -46.6333, lat: -23.5505 },
  { name: 'Cape Town', lng: 18.4241, lat: -33.9249 },
  { name: 'Dubai', lng: 55.2708, lat: 25.2048 },
  { name: 'Mumbai', lng: 72.8777, lat: 19.076 },
  { name: 'Singapore', lng: 103.8198, lat: 1.3521 },
  { name: 'Tokyo', lng: 139.6917, lat: 35.6895 },
  { name: 'Sydney', lng: 151.2093, lat: -33.8688 },
];

interface Lane extends MapArcDatum {
  origin: string;
  destination: string;
  volume: string;
  mode: 'air' | 'sea';
}

const LANES: Lane[] = [
  {
    id: 'shg-lax',
    origin: 'Shanghai',
    destination: 'Los Angeles',
    from: [121.4737, 31.2304],
    to: [-118.2437, 34.0522],
    volume: '24.8k TEU',
    mode: 'sea',
  },
  {
    id: 'sin-rtm',
    origin: 'Singapore',
    destination: 'Rotterdam',
    from: [103.8198, 1.3521],
    to: [4.4777, 51.9244],
    volume: '9.4k TEU',
    mode: 'sea',
  },
  {
    id: 'san-cpt',
    origin: 'Santos',
    destination: 'Cape Town',
    from: [-46.3322, -23.9608],
    to: [18.4241, -33.9249],
    volume: '3.2k TEU',
    mode: 'sea',
  },
  {
    id: 'syd-nrt',
    origin: 'Sydney',
    destination: 'Tokyo',
    from: [151.2093, -33.8688],
    to: [139.6917, 35.6895],
    volume: '640 tons',
    mode: 'air',
  },
  {
    id: 'dxb-jfk',
    origin: 'Dubai',
    destination: 'New York',
    from: [55.2708, 25.2048],
    to: [-74.006, 40.7128],
    volume: '980 tons',
    mode: 'air',
  },
  {
    id: 'dxb-bom',
    origin: 'Dubai',
    destination: 'Mumbai',
    from: [55.2708, 25.2048],
    to: [72.8777, 19.076],
    volume: '1.2k tons',
    mode: 'sea',
  },
];

const MODE_COLORS = { air: '#a78bfa', sea: '#34d399' } as const;

const MODE_COLOR_EXPRESSION: ExpressionSpecification = [
  'match',
  ['get', 'mode'],
  'air',
  MODE_COLORS.air,
  'sea',
  MODE_COLORS.sea,
  '#888',
];

@Component({
  selector: 'app-arcs-page',
  standalone: true,
  imports: [
    DocsImports,
    ExampleSectionComponent,
    MapComponent,
    MapArcComponent,
    MapMarkerComponent,
    MapPopupComponent,
    MarkerContentComponent,
    MarkerLabelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-docs-page
      title="Arcs"
      description="Curved great-circle-style lines between coordinate pairs."
    >
      <app-example-section
        title="Basic Arc"
        sectionId="basic-arc"
        [code]="basicCode"
      >
        <span description>
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map-arc</code>
          renders smooth Bézier arcs from
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">from</code>/<code
            class="bg-muted rounded px-1.5 py-0.5 text-xs"
            >to</code
          >
          pairs — here on a globe projection, connecting London to cities
          around the world.
        </span>
        <ng-map
          [center]="[hub.lng, hub.lat]"
          [zoom]="1"
          [projection]="{ type: 'globe' }"
        >
          <ng-map-arc
            [data]="basicArcs"
            [paint]="{ 'line-color': '#3b82f6', 'line-dasharray': [2, 2] }"
            [interactive]="false"
          />

          <ng-map-marker [longitude]="hub.lng" [latitude]="hub.lat">
            <ng-marker-content>
              <div
                class="size-3 rounded-full border-2 border-white bg-blue-500"
              ></div>
              <ng-marker-label position="top">{{ hub.name }}</ng-marker-label>
            </ng-marker-content>
          </ng-map-marker>

          @for (dest of destinations; track dest.name) {
            <ng-map-marker [longitude]="dest.lng" [latitude]="dest.lat">
              <ng-marker-content>
                <div
                  class="size-2 rounded-full border-2 border-white bg-blue-500"
                ></div>
                <ng-marker-label position="top">{{ dest.name }}</ng-marker-label>
              </ng-marker-content>
            </ng-map-marker>
          }
        </ng-map>
      </app-example-section>

      <app-example-section
        title="Interactive Arcs"
        sectionId="interactive-arcs"
        [code]="interactiveCode"
      >
        <span description>
          Extra datum properties drive the
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">paint</code>
          via expressions, and
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">hoverPaint</code>
          +
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">arcHover</code>
          power the popup. Hover a lane to see its details.
        </span>
        <div class="relative h-full">
          <ng-map [center]="[20, 20]" [zoom]="0.8">
            <ng-map-arc
              [data]="lanes"
              [paint]="{ 'line-color': modeColorExpression, 'line-width': 1.5 }"
              [hoverPaint]="{ 'line-width': 3, 'line-opacity': 1 }"
              (arcHover)="onHover($event)"
            />

            @for (point of endpoints; track point.name) {
              <ng-map-marker
                [longitude]="point.coords[0]"
                [latitude]="point.coords[1]"
              >
                <ng-marker-content>
                  <div class="bg-foreground/80 size-2 rounded-full shadow-sm"></div>
                  <ng-marker-label position="top">{{ point.name }}</ng-marker-label>
                </ng-marker-content>
              </ng-map-marker>
            }

            @if (selected(); as sel) {
              <ng-map-popup
                [longitude]="sel.longitude"
                [latitude]="sel.latitude"
                [offset]="12"
                [closeOnClick]="false"
                className="ng-popup-passthrough"
              >
                <div
                  class="bg-popover text-popover-foreground flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs shadow-lg"
                >
                  <span
                    class="size-1.5 rounded-full"
                    [style.background]="modeColors[sel.lane.mode]"
                  ></span>
                  <span class="font-medium"
                    >{{ sel.lane.origin }} → {{ sel.lane.destination }}</span
                  >
                  <span class="text-muted-foreground border-l pl-2">{{
                    sel.lane.volume
                  }}</span>
                </div>
              </ng-map-popup>
            }
          </ng-map>

          <div
            class="bg-background/80 absolute bottom-3 left-3 z-10 flex items-center gap-3 rounded-full border px-3 py-0.5 text-[11px] shadow-sm backdrop-blur"
          >
            <div class="flex items-center gap-1.5">
              <span
                class="size-1.5 rounded-full"
                [style.background]="modeColors.air"
              ></span>
              Air
            </div>
            <span class="bg-border h-3 w-px"></span>
            <div class="flex items-center gap-1.5">
              <span
                class="size-1.5 rounded-full"
                [style.background]="modeColors.sea"
              ></span>
              Sea
            </div>
          </div>
        </div>
      </app-example-section>
    </app-docs-page>
  `,
})
export class ArcsPageComponent {
  readonly basicCode = BASIC_CODE;
  readonly interactiveCode = INTERACTIVE_CODE;

  readonly hub = HUB;
  readonly destinations = DESTINATIONS;
  readonly basicArcs: MapArcDatum[] = DESTINATIONS.map((dest) => ({
    id: dest.name,
    from: [HUB.lng, HUB.lat] as [number, number],
    to: [dest.lng, dest.lat] as [number, number],
  }));

  readonly lanes = LANES;
  readonly modeColors = MODE_COLORS;
  readonly modeColorExpression = MODE_COLOR_EXPRESSION;

  readonly endpoints = (() => {
    const points: { name: string; coords: [number, number] }[] = [];
    const seen = new Set<string>();
    for (const lane of LANES) {
      if (!seen.has(lane.origin)) {
        seen.add(lane.origin);
        points.push({ name: lane.origin, coords: lane.from });
      }
      if (!seen.has(lane.destination)) {
        seen.add(lane.destination);
        points.push({ name: lane.destination, coords: lane.to });
      }
    }
    return points;
  })();

  readonly selected = signal<{
    lane: Lane;
    longitude: number;
    latitude: number;
  } | null>(null);

  onHover(event: MapArcEvent<Lane> | null): void {
    this.selected.set(
      event
        ? {
            lane: event.arc,
            longitude: event.longitude,
            latitude: event.latitude,
          }
        : null
    );
  }
}
