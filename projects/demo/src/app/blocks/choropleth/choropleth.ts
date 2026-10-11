import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  MapComponent,
  MapControlsComponent,
  MapGeoJSONComponent,
  type MapGeoJSONEvent,
  MapPopupComponent,
} from 'ng-mapcn';

import { ZardDarkMode } from '@/shared/services/dark-mode';

import { mapConfig, type Theme, visitorsByCountry } from './data';
import { injectWorldData } from './world-data';

// WebGL paint can't read CSS variables, so we build a concrete value→color
// expression per theme. The hovered country is highlighted in place via the
// `hover` feature-state, restricted to countries that actually have data.
function buildFillColor(theme: Theme): unknown[] {
  const { base, ramp, hover } = mapConfig.colors[theme];
  const [s0, s1, s2, s3, s4] = mapConfig.scaleStops;
  const ramped = [
    'interpolate',
    ['linear'],
    ['coalesce', ['get', 'visitors'], 0],
    s0,
    base,
    s1,
    ramp[0],
    s2,
    ramp[1],
    s3,
    ramp[2],
    s4,
    ramp[3],
  ];
  return [
    'case',
    [
      'all',
      ['boolean', ['feature-state', 'hover'], false],
      ['>', ['coalesce', ['get', 'visitors'], 0], 0],
    ],
    hover,
    ramped,
  ];
}

interface HoverInfo {
  name: string;
  visitors: number;
  lng: number;
  lat: number;
}

interface CountryProperties {
  NAME_LONG: string;
  visitors: number;
}

type CountryFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, CountryProperties>;

@Component({
  selector: 'app-choropleth-block',
  standalone: true,
  imports: [
    DecimalPipe,
    MapComponent,
    MapControlsComponent,
    MapGeoJSONComponent,
    MapPopupComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-card relative h-screen overflow-hidden">
      <ng-map
        [blank]="true"
        [center]="view.center"
        [zoom]="view.zoom"
        [options]="mapOptions"
        [loading]="!countries()"
      >
        @if (countries(); as data) {
          <ng-map-geojson
            [data]="data"
            promoteId="NAME_LONG"
            [fillPaint]="fillPaint()"
            [interactive]="true"
            (featureHover)="onHover($event)"
          />
        }
        <ng-map-controls class="[&_.ng-controls]:bottom-2!" />
        @if (hover(); as info) {
          <ng-map-popup [longitude]="info.lng" [latitude]="info.lat" [offset]="12">
            <div
              class="map-popup-surface bg-popover text-popover-foreground pointer-events-none relative rounded-md border p-2 shadow-md"
            >
              <p class="text-xs font-medium">{{ info.name }}</p>
              <div class="flex items-center justify-between gap-4 pt-1">
                <span class="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                  <span class="size-2 rounded-full" [style.background-color]="hoverColor()"></span>
                  Visitors
                </span>
                <span class="text-foreground text-xs font-semibold tabular-nums">{{
                  info.visitors | number
                }}</span>
              </div>
            </div>
          </ng-map-popup>
        }
      </ng-map>

      <div
        class="bg-card absolute bottom-4 left-4 z-10 rounded-lg border px-3 py-2.5 backdrop-blur-sm"
        [style.--choropleth-ramp-light]="rampLight"
        [style.--choropleth-ramp-dark]="rampDark"
      >
        <p class="text-foreground text-xs font-medium">Visitors by country</p>
        <div
          class="mt-2 h-2 w-40 rounded-full [background-image:var(--choropleth-ramp-light)] dark:[background-image:var(--choropleth-ramp-dark)]"
        ></div>
        <div class="text-muted-foreground flex items-center justify-between pt-1.5 text-[10px]">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>
    </div>
  `,
})
export class ChoroplethBlockComponent {
  private readonly darkMode = inject(ZardDarkMode);
  private readonly world = injectWorldData();

  protected readonly view = mapConfig.view;
  protected readonly mapOptions = {
    minZoom: mapConfig.view.minZoom,
    maxZoom: mapConfig.view.maxZoom,
    scrollZoom: false,
    dragRotate: false,
    pitchWithRotate: false,
  };

  protected readonly rampLight = `linear-gradient(to right, ${mapConfig.colors.light.ramp.join(', ')})`;
  protected readonly rampDark = `linear-gradient(to right, ${mapConfig.colors.dark.ramp.join(', ')})`;

  private readonly theme = computed<Theme>(() =>
    this.darkMode.themeMode() === 'dark' ? 'dark' : 'light',
  );
  protected readonly hoverColor = computed(() => mapConfig.colors[this.theme()].hover);
  protected readonly hover = signal<HoverInfo | null>(null);

  protected readonly countries = computed<CountryFeatureCollection | null>(() => {
    const world = this.world();
    if (!world) return null;
    return {
      type: 'FeatureCollection',
      features: world.features.map((f) => ({
        ...f,
        properties: {
          NAME_LONG: f.properties.NAME_LONG,
          visitors: visitorsByCountry[f.properties.NAME_LONG] ?? 0,
        },
      })),
    };
  });

  // Recomputed only when the theme changes; ng-map-geojson recolors in place.
  protected readonly fillPaint = computed(() => ({
    'fill-color': buildFillColor(this.theme()) as never,
    'fill-opacity': 0.92,
  }));

  protected onHover(event: MapGeoJSONEvent | null): void {
    const props = event?.feature.properties as CountryProperties | undefined;
    const visitors = props?.visitors ?? 0;
    // Only countries with data are interactive.
    if (!event || !props || visitors <= 0) {
      this.hover.set(null);
      return;
    }
    this.hover.set({
      name: props.NAME_LONG,
      visitors,
      lng: event.longitude,
      lat: event.latitude,
    });
  }
}
