import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  signal,
} from '@angular/core';
import type { Map as MapLibreMap } from 'maplibre-gl';
import {
  MapComponent,
  MapGeoJSONComponent,
  MapMarkerComponent,
  type MapStylesConfig,
  type MapViewport,
  MarkerContentComponent,
} from 'ng-mapcn';

type StyleKey = 'default' | 'openstreetmap' | 'openstreetmap3d';
import { DocsImports } from '../../../shared/docs';
import { ExampleSectionComponent } from '../../../shared/example-section';

const WORLD_GEOJSON =
  'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson';

const BASIC_CODE = `import { Component } from '@angular/core';
import { MapComponent } from 'ng-mapcn';

@Component({
  selector: 'app-basic-map',
  standalone: true,
  imports: [MapComponent],
  template: \`
    <div class="h-[420px]">
      <ng-map [center]="[-74.006, 40.7128]" [zoom]="12" />
    </div>
  \`,
})
export class BasicMapComponent {}`;

const CONTROLLED_CODE = `import { Component, signal } from '@angular/core';
import { MapComponent, MapViewport } from 'ng-mapcn';

@Component({
  selector: 'app-controlled-map',
  standalone: true,
  imports: [MapComponent],
  template: \`
    <div class="h-[420px]">
      <ng-map
        [viewport]="viewport()"
        (viewportChange)="viewport.set($event)"
      />
    </div>
  \`,
})
export class ControlledMapComponent {
  readonly viewport = signal<MapViewport>({
    center: [-74.006, 40.713],
    zoom: 8,
    bearing: 0,
    pitch: 0,
  });
}`;

const BLANK_CODE = `import { Component } from '@angular/core';
import { MapComponent, MapGeoJSONComponent } from 'ng-mapcn';

@Component({
  selector: 'app-blank-map',
  standalone: true,
  imports: [MapComponent, MapGeoJSONComponent],
  template: \`
    <div class="h-[420px]">
      <!-- "blank" is a transparent canvas. Add your own layers on top. -->
      <ng-map [blank]="true" [center]="[0, 20]" [zoom]="1.2">
        <ng-map-geojson [data]="worldGeoJsonUrl" />
      </ng-map>
    </div>
  \`,
})
export class BlankMapComponent {
  readonly worldGeoJsonUrl = 'https://.../ne_110m_admin_0_countries.geojson';
}`;

const FIT_CODE = `import { Component, signal } from '@angular/core';
import { MapComponent, MapMarkerComponent, MarkerContentComponent } from 'ng-mapcn';

@Component({
  selector: 'app-fit-bounds-map',
  standalone: true,
  imports: [MapComponent, MapMarkerComponent, MarkerContentComponent],
  template: \`
    <button (click)="addFarCity()">Add Tokyo</button>
    <div class="h-[420px]">
      <!-- Fits the markers once loaded, and again whenever their bounds change. -->
      <ng-map [fitBounds]="{ padding: 64, maxZoom: 8 }">
        @for (city of cities(); track city.name) {
          <ng-map-marker [longitude]="city.lng" [latitude]="city.lat">
            <ng-marker-content>
              <div class="size-3 rounded-full bg-blue-500"></div>
            </ng-marker-content>
          </ng-map-marker>
        }
      </ng-map>
    </div>
  \`,
})
export class FitBoundsMapComponent {
  readonly cities = signal([
    { name: 'Paris', lng: 2.35, lat: 48.85 },
    { name: 'Berlin', lng: 13.4, lat: 52.52 },
    { name: 'Rome', lng: 12.5, lat: 41.9 },
  ]);

  addFarCity() {
    this.cities.update((c) => [...c, { name: 'Tokyo', lng: 139.69, lat: 35.69 }]);
  }
}`;

const STYLES_CODE = `import { Component, computed, effect, signal } from '@angular/core';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { MapComponent, MapStylesConfig } from 'ng-mapcn';

type StyleKey = 'default' | 'openstreetmap' | 'openstreetmap3d';

// Free vector tiles from OpenFreeMap, data from OpenStreetMap.
const STYLE_URLS: Record<StyleKey, MapStylesConfig | undefined> = {
  default: undefined, // falls back to the built-in Carto light/dark styles
  openstreetmap: {
    light: 'https://tiles.openfreemap.org/styles/bright',
    dark: 'https://tiles.openfreemap.org/styles/bright',
  },
  openstreetmap3d: {
    light: 'https://tiles.openfreemap.org/styles/liberty',
    dark: 'https://tiles.openfreemap.org/styles/liberty',
  },
};

@Component({
  selector: 'app-custom-style-map',
  standalone: true,
  imports: [MapComponent],
  template: \`
    <div class="relative h-[420px] w-full">
      <ng-map
        [center]="[-0.1276, 51.5074]"
        [zoom]="15"
        [styles]="styles()"
        (mapReady)="map.set($event)"
      />
      <select
        aria-label="Map style"
        class="bg-background text-foreground absolute top-2 right-2 z-10 rounded-md border px-2 py-1 text-sm shadow"
        [value]="styleKey()"
        (change)="styleKey.set($any($event.target).value)"
      >
        <option value="default">Default (Carto)</option>
        <option value="openstreetmap">OpenStreetMap</option>
        <option value="openstreetmap3d">OpenStreetMap 3D</option>
      </select>
    </div>
  \`,
})
export class CustomStyleMapComponent {
  readonly styleKey = signal<StyleKey>('default');
  readonly styles = computed(() => STYLE_URLS[this.styleKey()]);
  readonly map = signal<MapLibreMap | null>(null);

  constructor() {
    // "3D" simply tilts the camera — the liberty style already has buildings.
    effect(() => {
      const m = this.map();
      if (!m) return;
      m.easeTo({ pitch: this.styleKey() === 'openstreetmap3d' ? 60 : 0, duration: 500 });
    });
  }
}`;

@Component({
  selector: 'app-map-page',
  standalone: true,
  imports: [
    DocsImports,
    ExampleSectionComponent,
    MapComponent,
    MapGeoJSONComponent,
    MapMarkerComponent,
    MarkerContentComponent,
    DecimalPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-docs-page
      title="Map"
      description="The simplest way to add an interactive map to your application."
    >
      <app-example-section
        title="Basic Usage"
        sectionId="basic-usage"
        [code]="basicCode"
      >
        <span description>
          The
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map</code>
          component handles MapLibre GL setup, theming, and provides context
          for child components.
        </span>
        <ng-map [center]="[-74.006, 40.7128]" [zoom]="12" />
      </app-example-section>

      <app-example-section
        title="Controlled Mode"
        sectionId="controlled-mode"
        [code]="controlledCode"
      >
        <span description>
          Use the
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">viewport</code>
          input and
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">viewportChange</code>
          output to control the map's viewport externally. This is useful when
          you need to sync the map state with your application or respond to
          viewport changes.
        </span>
        <div class="relative h-full">
          <div
            class="bg-background/95 absolute top-3 left-3 z-10 rounded-md border px-3 py-2 font-mono text-xs shadow-md"
          >
            lng: {{ viewport().center[0] | number: '1.3-3' }} lat:
            {{ viewport().center[1] | number: '1.3-3' }} zoom:
            {{ viewport().zoom | number: '1.1-1' }}
          </div>
          <ng-map
            [viewport]="viewport()"
            (viewportChange)="viewport.set($event)"
          />
        </div>
      </app-example-section>

      <app-example-section
        title="Blank Basemap"
        sectionId="blank-basemap"
        [code]="blankCode"
      >
        <span description>
          The
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">blank</code>
          input swaps the default street basemap for a transparent, tile-less
          canvas — perfect for data visualizations where you draw your own
          layers instead of showing streets and labels. Here, a
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map-geojson</code>
          layer renders world country borders on top of the transparent
          canvas.
        </span>
        <ng-map [blank]="true" [center]="[0, 20]" [zoom]="1.2">
          <ng-map-geojson [data]="worldGeoJsonUrl" />
        </ng-map>
      </app-example-section>

      <app-example-section
        title="Custom Styles"
        sectionId="custom-styles"
        [code]="stylesCode"
      >
        <span description>
          Use the
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">styles</code>
          input to provide custom map styles. This example uses free vector
          tiles from OpenFreeMap, an open-source project; the data comes from
          OpenStreetMap.
        </span>
        <div class="relative h-[420px] w-full">
          <ng-map
            [center]="[-0.1276, 51.5074]"
            [zoom]="15"
            [styles]="customStyles()"
            (mapReady)="customMap.set($event)"
          />
          <select
            aria-label="Map style"
            class="bg-background text-foreground absolute top-2 right-2 z-10 rounded-md border px-2 py-1 text-sm shadow"
            [value]="styleKey()"
            (change)="styleKey.set($any($event.target).value)"
          >
            <option value="default">Default (Carto)</option>
            <option value="openstreetmap">OpenStreetMap</option>
            <option value="openstreetmap3d">OpenStreetMap 3D</option>
          </select>
        </div>
      </app-example-section>

      <app-example-section
        title="Fit to Bounds"
        sectionId="fit-bounds"
        [code]="fitCode"
      >
        <span description>
          The
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">fitBounds</code>
          input fits the camera to the data of the map's children (markers,
          GeoJSON, routes, arcs, clusters, heatmaps) once the map is loaded,
          and again only when those bounds change. Pass
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">bounds</code>
          to fit explicit bounds, or call
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">MapContextService.fitBounds()</code>
          imperatively. It does not fight a controlled
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">viewport</code>.
          A draggable marker bound to signals refits continuously while
          dragged: pass explicit
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">bounds</code>
          for that case.
        </span>
        <div class="relative h-full">
          <button
            type="button"
            data-testid="fit-toggle"
            class="bg-background text-foreground absolute top-3 left-3 z-10 rounded-md border px-3 py-1.5 text-xs shadow-md"
            (click)="toggleFarCity()"
          >
            {{ fitCities().length > 3 ? 'Remove Tokyo' : 'Add Tokyo' }}
          </button>
          <ng-map [fitBounds]="{ padding: 64, maxZoom: 8 }">
            @for (city of fitCities(); track city.name) {
              <ng-map-marker [longitude]="city.lng" [latitude]="city.lat">
                <ng-marker-content>
                  <div class="size-3 rounded-full bg-blue-500"></div>
                </ng-marker-content>
              </ng-map-marker>
            }
          </ng-map>
        </div>
      </app-example-section>
    </app-docs-page>
  `,
})
export class MapPageComponent {
  readonly fitCode = FIT_CODE;
  readonly fitCities = signal([
    { name: 'Paris', lng: 2.35, lat: 48.85 },
    { name: 'Berlin', lng: 13.4, lat: 52.52 },
    { name: 'Rome', lng: 12.5, lat: 41.9 },
  ]);

  toggleFarCity() {
    this.fitCities.update((c) =>
      c.length > 3 ? c.slice(0, 3) : [...c, { name: 'Tokyo', lng: 139.69, lat: 35.69 }],
    );
  }

  readonly basicCode = BASIC_CODE;
  readonly controlledCode = CONTROLLED_CODE;
  readonly blankCode = BLANK_CODE;
  readonly stylesCode = STYLES_CODE;

  readonly worldGeoJsonUrl = WORLD_GEOJSON;

  readonly viewport = signal<MapViewport>({
    center: [-74.006, 40.713],
    zoom: 8,
    bearing: 0,
    pitch: 0,
  });

  // Free vector tiles from OpenFreeMap, data from OpenStreetMap.
  readonly styleKey = signal<StyleKey>('default');
  readonly customMap = signal<MapLibreMap | null>(null);
  readonly customStyles = computed<MapStylesConfig | undefined>(() => {
    switch (this.styleKey()) {
      case 'openstreetmap':
        return {
          light: 'https://tiles.openfreemap.org/styles/bright',
          dark: 'https://tiles.openfreemap.org/styles/bright',
        };
      case 'openstreetmap3d':
        return {
          light: 'https://tiles.openfreemap.org/styles/liberty',
          dark: 'https://tiles.openfreemap.org/styles/liberty',
        };
      default:
        return undefined; // built-in Carto light/dark defaults
    }
  });

  constructor() {
    // "OpenStreetMap 3D" just tilts the camera; the liberty style has buildings.
    effect(() => {
      const m = this.customMap();
      if (!m) return;
      m.easeTo({ pitch: this.styleKey() === 'openstreetmap3d' ? 60 : 0, duration: 500 });
    });
  }
}
