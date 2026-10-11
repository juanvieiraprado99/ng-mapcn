import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  MapComponent,
  MapMarkerComponent,
  MapRouteComponent,
  MarkerContentComponent,
  MarkerLabelComponent,
} from 'ng-mapcn';
import { DocsImports } from '../../../shared/docs';
import { ExampleSectionComponent } from '../../../shared/example-section';

const BASIC_CODE = `import { Component } from '@angular/core';
import { MapComponent, MapRouteComponent } from 'ng-mapcn';

@Component({
  selector: 'app-basic-route',
  standalone: true,
  imports: [MapComponent, MapRouteComponent],
  template: \`
    <div class="h-[420px]">
      <ng-map [center]="[-73.97, 40.782]" [zoom]="12">
        <ng-map-route
          [coordinates]="coordinates"
          color="#3b82f6"
          [width]="4"
          [opacity]="0.9"
        />
      </ng-map>
    </div>
  \`,
})
export class BasicRouteComponent {
  readonly coordinates: [number, number][] = [
    [-73.9585, 40.8004],
    [-73.9718, 40.7821],
    [-73.9819, 40.7679],
    // ...
  ];
}`;

const OSRM_CODE = `import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { MapComponent, MapRouteComponent } from 'ng-mapcn';

@Component({
  selector: 'app-osrm-route',
  standalone: true,
  imports: [MapComponent, MapRouteComponent],
  template: \`
    <div class="h-[420px]">
      <ng-map [center]="[2.34, 48.86]" [zoom]="12.5">
        @if (route().length > 0) {
          <ng-map-route [coordinates]="route()" color="#3b82f6" [width]="4" />
        }
      </ng-map>
    </div>
  \`,
})
export class OsrmRouteComponent {
  private readonly http = inject(HttpClient);
  readonly route = signal<[number, number][]>([]);

  constructor() {
    const url =
      'https://router.project-osrm.org/route/v1/driving/' +
      '2.3522,48.8566;2.2945,48.8584?overview=full&geometries=geojson';
    this.http.get<any>(url).subscribe((res) => {
      this.route.set(res.routes[0].geometry.coordinates);
    });
  }
}`;

// Central Park cycling loop (same data as the landing page card)
const TRAIL: [number, number][] = [
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

interface OsrmResponse {
  routes: { geometry: { coordinates: [number, number][] } }[];
}

@Component({
  selector: 'app-routes-page',
  standalone: true,
  imports: [
    DocsImports,
    ExampleSectionComponent,
    MapComponent,
    MapRouteComponent,
    MapMarkerComponent,
    MarkerContentComponent,
    MarkerLabelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-docs-page
      title="Routes"
      description="Draw polylines for trails, deliveries, and directions."
    >
      <app-example-section
        title="Basic Route"
        sectionId="basic-route"
        [code]="basicCode"
      >
        <span description>
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map-route</code>
          renders a line from an array of
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">[lng, lat]</code>
          coordinates. Customize color, width, opacity, and dash pattern.
        </span>
        <ng-map [center]="[-73.97, 40.782]" [zoom]="12">
          <ng-map-route
            [coordinates]="trail"
            color="#3b82f6"
            [width]="4"
            [opacity]="0.9"
          />
        </ng-map>
      </app-example-section>

      <app-example-section
        title="Route Planning"
        sectionId="route-planning"
        [code]="osrmCode"
      >
        <span description>
          Fetch real driving directions from the free OSRM API and render the
          returned GeoJSON geometry. This example routes from the Louvre to the
          Eiffel Tower in Paris.
        </span>
        <ng-map [center]="[2.325, 48.859]" [zoom]="12.5">
          @if (osrmRoute().length > 0) {
            <ng-map-route
              [coordinates]="osrmRoute()"
              color="#3b82f6"
              [width]="4"
            />
          }
          <ng-map-marker [longitude]="2.3376" [latitude]="48.8606">
            <ng-marker-content>
              <div
                class="size-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-lg"
              ></div>
              <ng-marker-label>Louvre</ng-marker-label>
            </ng-marker-content>
          </ng-map-marker>
          <ng-map-marker [longitude]="2.2945" [latitude]="48.8584">
            <ng-marker-content>
              <div
                class="size-3.5 rounded-full border-2 border-white bg-red-500 shadow-lg"
              ></div>
              <ng-marker-label>Eiffel Tower</ng-marker-label>
            </ng-marker-content>
          </ng-map-marker>
        </ng-map>
      </app-example-section>
    </app-docs-page>
  `,
})
export class RoutesPageComponent {
  readonly basicCode = BASIC_CODE;
  readonly osrmCode = OSRM_CODE;
  readonly trail = TRAIL;

  private readonly http = inject(HttpClient);
  readonly osrmRoute = signal<[number, number][]>([]);

  constructor() {
    const url =
      'https://router.project-osrm.org/route/v1/driving/' +
      '2.3376,48.8606;2.2945,48.8584?overview=full&geometries=geojson';
    this.http.get<OsrmResponse>(url).subscribe({
      next: (res) => this.osrmRoute.set(res.routes[0]?.geometry.coordinates ?? []),
      error: () => this.osrmRoute.set([]),
    });
  }
}
