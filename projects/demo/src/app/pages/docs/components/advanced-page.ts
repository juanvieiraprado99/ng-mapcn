import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import type { Map as MapLibreMap } from 'maplibre-gl';
import {
  MapComponent,
  MapMarkerComponent,
  type MapViewport,
  MarkerContentComponent,
  MarkerLabelComponent,
} from 'ng-mapcn';

import { CodeBlockComponent } from '../../../shared/code-block';
import { DocsImports } from '../../../shared/docs';
import { ExampleSectionComponent } from '../../../shared/example-section';

const MAP_READY_CODE = `import { Component } from '@angular/core';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { MapComponent } from 'ng-mapcn';

@Component({
  selector: 'app-globe-flyto',
  standalone: true,
  imports: [MapComponent],
  template: \`
    <div class="h-[420px]">
      <ng-map
        [center]="[0, 20]"
        [zoom]="1.5"
        [projection]="{ type: 'globe' }"
        (mapReady)="onMapReady($event)"
      />
    </div>
  \`,
})
export class GlobeFlytoComponent {
  private map?: MapLibreMap;

  onMapReady(map: MapLibreMap): void {
    this.map = map;
  }

  flyTo(center: [number, number]): void {
    // Full access to the raw MapLibre instance.
    this.map?.flyTo({ center, zoom: 8, duration: 2500, essential: true });
  }
}`;

const FLYTO_MARKERS_CODE = `<ng-map [center]="[10, 48]" [zoom]="4" (mapReady)="onMapReady($event)">
  @for (city of cities; track city.name) {
    <ng-map-marker
      [longitude]="city.lng"
      [latitude]="city.lat"
      (markerClick)="flyTo(city)"
    >
      <ng-marker-content>
        <div class="size-3.5 cursor-pointer rounded-full border-2 border-white bg-blue-500 shadow-lg"></div>
        <ng-marker-label position="top">{{ city.name }}</ng-marker-label>
      </ng-marker-content>
    </ng-map-marker>
  }
</ng-map>`;

const SYNCED_CODE = `import { Component, signal } from '@angular/core';
import { MapComponent, MapViewport } from 'ng-mapcn';

@Component({
  selector: 'app-synced-viewports',
  standalone: true,
  imports: [MapComponent],
  template: \`
    <div class="grid h-[420px] grid-cols-2 gap-2">
      <!-- Single source of truth shared by both maps (controlled viewport). -->
      <ng-map [viewport]="viewport()" (viewportChange)="viewport.set($event)" />
      <ng-map [viewport]="viewport()" (viewportChange)="viewport.set($event)" />
    </div>
  \`,
})
export class SyncedViewportsComponent {
  readonly viewport = signal<MapViewport>({
    center: [-46.63, -23.55],
    zoom: 10,
    bearing: 0,
    pitch: 0,
  });
}`;

const CONTEXT_CODE = `import { Component, effect, inject } from '@angular/core';
import { MapContextService } from 'ng-mapcn';

// Any component placed inside <ng-map> can inject the map context —
// the Angular equivalent of mapcn's useMap() hook.
@Component({
  selector: 'app-my-custom-control',
  standalone: true,
  template: \`...\`,
})
export class MyCustomControlComponent {
  private readonly ctx = inject(MapContextService);

  constructor() {
    effect(() => {
      if (!this.ctx.isLoaded()) return;
      const map = this.ctx.map(); // raw maplibre-gl Map
      // add sources, layers, event handlers...
    });
  }
}`;

const CITIES = [
  { name: 'Lisbon', lng: -9.1393, lat: 38.7223 },
  { name: 'Paris', lng: 2.3522, lat: 48.8566 },
  { name: 'Berlin', lng: 13.405, lat: 52.52 },
  { name: 'Rome', lng: 12.4964, lat: 41.9028 },
];

@Component({
  selector: 'app-advanced-page',
  standalone: true,
  imports: [
    DocsImports,
    ExampleSectionComponent,
    CodeBlockComponent,
    MapComponent,
    MapMarkerComponent,
    MarkerContentComponent,
    MarkerLabelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-docs-page
      title="Advanced"
      description="Raw map access, synced viewports, and the map context service."
    >
      <app-example-section
        title="Using the Map Instance"
        sectionId="using-the-map-instance"
        [code]="mapReadyCode"
      >
        <span description>
          The
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">mapReady</code>
          output hands you the raw
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">maplibre-gl</code>
          Map instance for anything the declarative API doesn't cover. Here it
          drives
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">flyTo</code>
          on a globe projection.
        </span>
        <div class="relative h-full">
          <div class="absolute inset-x-3 top-3 z-10 flex flex-wrap gap-1.5">
            @for (city of cities; track city.name; let i = $index) {
              <button
                type="button"
                (click)="flyToGlobe(i)"
                class="rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm transition-colors"
                [class]="
                  i === activeGlobeIndex()
                    ? 'bg-primary text-primary-foreground border-transparent'
                    : 'bg-secondary text-secondary-foreground hover:bg-accent'
                "
              >
                {{ city.name }}
              </button>
            }
          </div>
          <ng-map
            [center]="[0, 30]"
            [zoom]="1.5"
            [projection]="{ type: 'globe' }"
            (mapReady)="globeMap = $event"
          />
        </div>
      </app-example-section>

      <app-example-section
        title="Fly to Markers"
        sectionId="fly-to-markers"
        [code]="flytoMarkersCode"
      >
        <span description>
          Combine
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">markerClick</code>
          with the map instance: click a marker to fly to its city.
        </span>
        <ng-map [center]="[7, 46.5]" [zoom]="4" (mapReady)="markersMap = $event">
          @for (city of cities; track city.name) {
            <ng-map-marker
              [longitude]="city.lng"
              [latitude]="city.lat"
              (markerClick)="flyToCity(city)"
            >
              <ng-marker-content>
                <div
                  class="size-3.5 cursor-pointer rounded-full border-2 border-white bg-blue-500 shadow-lg"
                ></div>
                <ng-marker-label position="top">{{ city.name }}</ng-marker-label>
              </ng-marker-content>
            </ng-map-marker>
          }
        </ng-map>
      </app-example-section>

      <app-example-section
        title="Synced Viewports"
        sectionId="synced-viewports"
        [code]="syncedCode"
      >
        <span description>
          Two maps sharing one controlled
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">viewport</code>
          signal. Pan or zoom either map and the other follows.
        </span>
        <div class="grid h-full grid-cols-2 gap-2">
          <ng-map
            [viewport]="viewport()"
            (viewportChange)="viewport.set($event)"
          />
          <ng-map
            [viewport]="viewport()"
            (viewportChange)="viewport.set($event)"
          />
        </div>
      </app-example-section>

      <app-docs-section title="Using the Context Service" anchor="using-the-context-service">
        <p>
          Build your own map components: any component projected inside
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map</code>
          can inject
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">MapContextService</code>
          to access the map instance,
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">isLoaded</code>,
          and the resolved theme — the Angular equivalent of mapcn's
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">useMap()</code>
          hook.
        </p>
        <app-code-block [code]="contextCode" />
      </app-docs-section>
    </app-docs-page>
  `,
})
export class AdvancedPageComponent {
  readonly mapReadyCode = MAP_READY_CODE;
  readonly flytoMarkersCode = FLYTO_MARKERS_CODE;
  readonly syncedCode = SYNCED_CODE;
  readonly contextCode = CONTEXT_CODE;

  readonly cities = CITIES;

  globeMap?: MapLibreMap;
  markersMap?: MapLibreMap;

  readonly activeGlobeIndex = signal(-1);

  readonly viewport = signal<MapViewport>({
    center: [-46.63, -23.55],
    zoom: 10,
    bearing: 0,
    pitch: 0,
  });

  flyToGlobe(index: number): void {
    this.activeGlobeIndex.set(index);
    const city = CITIES[index];
    this.globeMap?.flyTo({
      center: [city.lng, city.lat],
      zoom: 6,
      duration: 2500,
      essential: true,
    });
  }

  flyToCity(city: { lng: number; lat: number }): void {
    this.markersMap?.flyTo({
      center: [city.lng, city.lat],
      zoom: 9,
      duration: 1800,
      essential: true,
    });
  }
}
