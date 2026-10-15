import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { type HeatmapGradient, MapComponent, MapHeatmapComponent } from 'ng-mapcn';

import { CodeBlockComponent } from '../../../shared/code-block';
import { DocsImports } from '../../../shared/docs';
import { ExampleSectionComponent } from '../../../shared/example-section';

const HEATMAP_CODE = `import { Component } from '@angular/core';
import { MapComponent, MapHeatmapComponent } from 'ng-mapcn';

@Component({
  selector: 'app-heatmap-map',
  standalone: true,
  imports: [MapComponent, MapHeatmapComponent],
  template: \`
    <div class="h-[420px]">
      <ng-map [center]="[-103.5917, 40.6699]" [zoom]="3">
        <ng-map-heatmap
          [data]="earthquakesUrl"
          weightProperty="mag"
          [weightRange]="[0, 7.5]"
          [radius]="20"
        />
      </ng-map>
    </div>
  \`,
})
export class HeatmapMapComponent {
  // USGS earthquake data (GeoJSON points)
  readonly earthquakesUrl =
    'https://maplibre.org/maplibre-gl-js/docs/assets/earthquakes.geojson';
}`;

const INLINE_CODE = `import { Component } from '@angular/core';
import { MapComponent, MapHeatmapComponent } from 'ng-mapcn';

// Inline GeoJSON: no network request. Each point carries a "visits" weight.
const points: GeoJSON.FeatureCollection<GeoJSON.Point, { visits: number }> = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { visits: 120 }, geometry: { type: 'Point', coordinates: [-46.6333, -23.5505] } },
    { type: 'Feature', properties: { visits: 80 }, geometry: { type: 'Point', coordinates: [-46.6565, -23.5614] } },
    // ...
  ],
};

@Component({
  selector: 'app-inline-heatmap',
  standalone: true,
  imports: [MapComponent, MapHeatmapComponent],
  template: \`
    <ng-map [center]="[-46.6333, -23.5505]" [zoom]="10.5">
      <ng-map-heatmap
        [data]="points"
        weightProperty="visits"
        [weightRange]="[0, 120]"
        [radius]="40"
      />
    </ng-map>
  \`,
})
export class InlineHeatmapComponent {
  readonly points = points;
}`;

const GRADIENT_LIVE_CODE = `import { Component, signal } from '@angular/core';
import { type HeatmapGradient, MapComponent, MapHeatmapComponent } from 'ng-mapcn';

@Component({
  selector: 'app-gradient-map',
  standalone: true,
  imports: [MapComponent, MapHeatmapComponent],
  template: \`
    <button (click)="palette.set('fire')">Fire</button>
    <button (click)="palette.set('ocean')">Ocean</button>
    <button (click)="palette.set('mono')">Mono</button>
    <ng-map [center]="[-103.5917, 40.6699]" [zoom]="3">
      <ng-map-heatmap [data]="earthquakesUrl" [gradient]="gradients[palette()]" />
    </ng-map>
  \`,
})
export class GradientMapComponent {
  readonly gradients: Record<'fire' | 'ocean' | 'mono', HeatmapGradient> = {
    fire: [[0, 'rgba(255, 237, 160, 0)'], [0.4, '#fd8d3c'], [0.7, '#e31a1c'], [1, '#800026']],
    ocean: [[0, 'rgba(8, 81, 156, 0)'], [0.4, '#4292c6'], [0.7, '#2171b5'], [1, '#08306b']],
    mono: [[0, 'rgba(255, 255, 255, 0)'], [1, '#ffffff']],
  };
  readonly palette = signal<'fire' | 'ocean' | 'mono'>('fire');
  readonly earthquakesUrl =
    'https://maplibre.org/maplibre-gl-js/docs/assets/earthquakes.geojson';
}`;

const TUNING_CODE = `import { Component, signal } from '@angular/core';
import { MapComponent, MapHeatmapComponent } from 'ng-mapcn';

@Component({
  selector: 'app-tuning-map',
  standalone: true,
  imports: [MapComponent, MapHeatmapComponent],
  template: \`
    <input type="range" min="5" max="60" [value]="radius()"
      (input)="radius.set(+$any($event.target).value)" />
    <input type="range" min="0.2" max="3" step="0.1" [value]="intensity()"
      (input)="intensity.set(+$any($event.target).value)" />
    <input type="range" min="0.1" max="1" step="0.05" [value]="opacity()"
      (input)="opacity.set(+$any($event.target).value)" />
    <ng-map [center]="[-103.5917, 40.6699]" [zoom]="3">
      <ng-map-heatmap
        [data]="earthquakesUrl"
        weightProperty="mag"
        [weightRange]="[0, 7.5]"
        [radius]="radius()"
        [intensity]="intensity()"
        [opacity]="opacity()"
      />
    </ng-map>
  \`,
})
export class TuningMapComponent {
  readonly radius = signal(20);
  readonly intensity = signal(1);
  readonly opacity = signal(1);
  readonly earthquakesUrl =
    'https://maplibre.org/maplibre-gl-js/docs/assets/earthquakes.geojson';
}`;

const ZOOM_LIVE_CODE = `import { Component } from '@angular/core';
import { MapComponent, MapHeatmapComponent } from 'ng-mapcn';

@Component({
  selector: 'app-zoom-map',
  standalone: true,
  imports: [MapComponent, MapHeatmapComponent],
  template: \`
    <ng-map [center]="[-103.5917, 40.6699]" [zoom]="3">
      <ng-map-heatmap
        [data]="earthquakesUrl"
        weightProperty="mag"
        [weightRange]="[0, 7.5]"
        [radius]="radius"
        [intensity]="intensity"
        [maxZoom]="7"
      />
    </ng-map>
  \`,
})
export class ZoomMapComponent {
  // Blobs grow and brighten as you zoom in; the layer stops at zoom 7.
  readonly radius = ['interpolate', ['linear'], ['zoom'], 0, 6, 6, 40];
  readonly intensity = ['interpolate', ['linear'], ['zoom'], 0, 0.6, 6, 2];
  readonly earthquakesUrl =
    'https://maplibre.org/maplibre-gl-js/docs/assets/earthquakes.geojson';
}`;

const WEIGHT_CODE =`<!-- Every point weighs the same -->
<ng-map-heatmap [data]="points" />

<!-- Weight by a numeric property; [min, max] is mapped linearly to 0..1.
     Missing or non-numeric values count as 0. -->
<ng-map-heatmap [data]="points" weightProperty="mag" [weightRange]="[0, 7.5]" />`;

const GRADIENT_CODE = `import { type HeatmapGradient, defaultHeatmapGradients } from 'ng-mapcn';

// [density 0..1, color] stops. A transparent stop at 0 is prepended when you
// start higher, so empty areas stay clear; unsorted stops are sorted.
readonly gradient: HeatmapGradient = [
  [0, 'rgba(34, 197, 94, 0)'],
  [0.5, '#eab308'],
  [1, '#ef4444'],
];

// <ng-map-heatmap [data]="points" [gradient]="gradient" />
// Without [gradient], defaultHeatmapGradients.light / .dark follow the map theme.`;

const ZOOM_CODE = `// radius, intensity and opacity accept numbers or MapLibre expressions
readonly radius = ['interpolate', ['linear'], ['zoom'], 0, 8, 6, 34];
readonly opacity = ['interpolate', ['linear'], ['zoom'], 4.5, 0.75, 6.5, 0.08];

// <ng-map-heatmap
//   [data]="points"
//   [radius]="radius"
//   [opacity]="opacity"
//   [minZoom]="0"
//   [maxZoom]="7"      // stop rendering from zoom 7 (e.g. a point layer takes over)
//   [paint]="{ 'heatmap-intensity': 1.5 }"  // escape hatch, merged last
// />`;

const IDS_CODE = `<ng-map-heatmap id="earthquakes" beforeId="labels" [data]="earthquakes" />

// Layer ids derived from id="earthquakes":
//   source: heatmap-source-earthquakes
//   layer:  heatmap-layer-earthquakes
// Without id they are auto-generated (e.g. heatmap-layer-ng-heatmap-1).`;

const VISIT_HOTSPOTS: readonly { lng: number; lat: number; weight: number }[] = [
  { lng: -46.6333, lat: -23.5505, weight: 120 },
  { lng: -46.6565, lat: -23.5614, weight: 90 },
  { lng: -46.6914, lat: -23.5629, weight: 70 },
  { lng: -46.7, lat: -23.6, weight: 50 },
  { lng: -46.5, lat: -23.54, weight: 60 },
];

function buildVisits(): GeoJSON.Feature<GeoJSON.Point, { visits: number }>[] {
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return VISIT_HOTSPOTS.flatMap((spot) =>
    Array.from({ length: 40 }, () => ({
      type: 'Feature' as const,
      properties: { visits: Math.round(spot.weight * (0.4 + rand() * 0.6)) },
      geometry: {
        type: 'Point' as const,
        coordinates: [spot.lng + (rand() - 0.5) * 0.08, spot.lat + (rand() - 0.5) * 0.06],
      },
    })),
  );
}

@Component({
  selector: 'app-heatmap-page',
  standalone: true,
  imports: [
    DocsImports,
    CodeBlockComponent,
    ExampleSectionComponent,
    MapComponent,
    MapHeatmapComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-docs-page
      title="Heatmap"
      description="Visualize point density with a declarative, theme-aware heatmap layer."
    >
      <app-example-section
        title="Basic Example"
        sectionId="basic-example"
        [code]="heatmapCode"
      >
        <span description>
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map-heatmap</code>
          renders a GeoJSON point source as a MapLibre heatmap layer. The default gradient follows
          the map theme. This example weights USGS earthquakes by magnitude.
        </span>
        <ng-map [center]="[-103.5917, 40.6699]" [zoom]="3">
          <ng-map-heatmap
            [data]="earthquakesUrl"
            weightProperty="mag"
            [weightRange]="[0, 7.5]"
            [radius]="20"
          />
        </ng-map>
      </app-example-section>

      <app-example-section title="Inline data" sectionId="inline-data" [code]="inlineCode">
        <span description>
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">data</code> also takes a
          GeoJSON FeatureCollection directly, so no request is needed. Here a per-point
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">visits</code> count is
          the weight.
        </span>
        <ng-map [center]="[-46.6333, -23.5505]" [zoom]="10.5">
          <ng-map-heatmap
            [data]="visits"
            weightProperty="visits"
            [weightRange]="[0, 120]"
            [radius]="40"
          />
        </ng-map>
      </app-example-section>

      <app-example-section
        title="Custom gradient"
        sectionId="custom-gradient"
        [code]="gradientLiveCode"
      >
        <span description>
          Pass <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">gradient</code> to
          replace the theme default. Changing it at runtime updates the existing layer instead of
          re-creating it.
        </span>
        <div after-description class="mb-3 flex gap-2">
          <button
            type="button"
            class="border-border bg-background hover:bg-muted rounded-md border px-3 py-1 text-sm"
            (click)="palette.set('fire')"
          >
            Fire
          </button>
          <button
            type="button"
            class="border-border bg-background hover:bg-muted rounded-md border px-3 py-1 text-sm"
            (click)="palette.set('ocean')"
          >
            Ocean
          </button>
          <button
            type="button"
            class="border-border bg-background hover:bg-muted rounded-md border px-3 py-1 text-sm"
            (click)="palette.set('mono')"
          >
            Mono
          </button>
        </div>
        <ng-map [center]="[-103.5917, 40.6699]" [zoom]="3">
          <ng-map-heatmap [data]="earthquakesUrl" [gradient]="gradients[palette()]" />
        </ng-map>
      </app-example-section>

      <app-example-section title="Live tuning" sectionId="live-tuning" [code]="tuningCode">
        <span description>
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">radius</code>,
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">intensity</code> and
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">opacity</code> are
          applied with diffed setters, so dragging the sliders never re-creates the layer.
        </span>
        <div after-description class="mb-3 grid gap-3 text-sm sm:grid-cols-3">
          <label class="flex flex-col gap-1">
            Radius: {{ radius() }}
            <input
              type="range"
              min="5"
              max="60"
              [value]="radius()"
              (input)="radius.set(+$any($event.target).value)"
            />
          </label>
          <label class="flex flex-col gap-1">
            Intensity: {{ intensity() }}
            <input
              type="range"
              min="0.2"
              max="3"
              step="0.1"
              [value]="intensity()"
              (input)="intensity.set(+$any($event.target).value)"
            />
          </label>
          <label class="flex flex-col gap-1">
            Opacity: {{ opacity() }}
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              [value]="opacity()"
              (input)="opacity.set(+$any($event.target).value)"
            />
          </label>
        </div>
        <ng-map [center]="[-103.5917, 40.6699]" [zoom]="3">
          <ng-map-heatmap
            [data]="earthquakesUrl"
            weightProperty="mag"
            [weightRange]="[0, 7.5]"
            [radius]="radius()"
            [intensity]="intensity()"
            [opacity]="opacity()"
          />
        </ng-map>
      </app-example-section>

      <app-example-section
        title="Zoom-dependent heatmap"
        sectionId="zoom-dependent-heatmap"
        [code]="zoomLiveCode"
      >
        <span description>
          Zoom in and out: the radius and intensity expressions scale with the zoom level, and the
          layer stops rendering from
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">maxZoom</code> 7.
        </span>
        <ng-map [center]="[-103.5917, 40.6699]" [zoom]="3">
          <ng-map-heatmap
            [data]="earthquakesUrl"
            weightProperty="mag"
            [weightRange]="[0, 7.5]"
            [radius]="zoomRadius"
            [intensity]="zoomIntensity"
            [maxZoom]="7"
          />
        </ng-map>
      </app-example-section>

      <app-docs-section title="Weight" anchor="weight">
        <p>
          Set <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">weightProperty</code>
          to weight points by a numeric feature property.
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">weightRange</code>
          is the <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">[min, max]</code>
          of that property, mapped linearly to a weight of 0 to 1.
        </p>
        <app-code-block [code]="weightCode" />
      </app-docs-section>

      <app-docs-section title="Gradient and theme" anchor="gradient-and-theme">
        <p>
          Without
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">gradient</code>
          the layer uses
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">defaultHeatmapGradients</code>
          for the resolved theme and re-adds itself with the matching one after a theme switch. A
          custom gradient is kept across theme changes.
        </p>
        <app-code-block [code]="gradientCode" />
      </app-docs-section>

      <app-docs-section title="Zoom-dependent styling" anchor="zoom-dependent-styling">
        <p>
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">radius</code>,
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">intensity</code>
          and
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">opacity</code>
          accept MapLibre expressions. Use
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">minZoom</code> /
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">maxZoom</code>
          to limit the zoom range; the heatmap is not rendered from
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">maxZoom</code> up, so a
          circle layer can take over when zoomed in.
        </p>
        <app-code-block [code]="zoomCode" />
      </app-docs-section>

      <app-docs-section title="Ids and z-order" anchor="ids-and-z-order">
        <p>
          Set <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">id</code> to get
          stable source and layer ids, and
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">beforeId</code> to
          insert the layer below an existing one. Like the other layer components,
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">beforeId</code> is
          applied at creation only, and changing
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">id</code> re-creates
          the layer.
        </p>
        <app-code-block [code]="idsCode" />
      </app-docs-section>
    </app-docs-page>
  `,
})
export class HeatmapPageComponent {
  readonly heatmapCode = HEATMAP_CODE;
  readonly weightCode = WEIGHT_CODE;
  readonly gradientCode = GRADIENT_CODE;
  readonly zoomCode = ZOOM_CODE;
  readonly idsCode = IDS_CODE;
  readonly inlineCode = INLINE_CODE;
  readonly gradientLiveCode = GRADIENT_LIVE_CODE;
  readonly tuningCode = TUNING_CODE;
  readonly zoomLiveCode = ZOOM_LIVE_CODE;

  readonly gradients: Record<'fire' | 'ocean' | 'mono', HeatmapGradient> = {
    fire: [
      [0, 'rgba(255, 237, 160, 0)'],
      [0.4, '#fd8d3c'],
      [0.7, '#e31a1c'],
      [1, '#800026'],
    ],
    ocean: [
      [0, 'rgba(8, 81, 156, 0)'],
      [0.4, '#4292c6'],
      [0.7, '#2171b5'],
      [1, '#08306b'],
    ],
    mono: [
      [0, 'rgba(255, 255, 255, 0)'],
      [1, '#ffffff'],
    ],
  };
  readonly palette = signal<'fire' | 'ocean' | 'mono'>('fire');

  readonly radius = signal(20);
  readonly intensity = signal(1);
  readonly opacity = signal(1);

  readonly zoomRadius = ['interpolate', ['linear'], ['zoom'], 0, 6, 6, 40];
  readonly zoomIntensity = ['interpolate', ['linear'], ['zoom'], 0, 0.6, 6, 2];

  /** Deterministic scatter around São Paulo hot spots (no network). */
  readonly visits: GeoJSON.FeatureCollection<GeoJSON.Point, { visits: number }> = {
    type: 'FeatureCollection',
    features: buildVisits(),
  };
  readonly earthquakesUrl =
    'https://maplibre.org/maplibre-gl-js/docs/assets/earthquakes.geojson';
}
