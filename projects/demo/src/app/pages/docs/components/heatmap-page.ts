import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MapComponent, MapHeatmapComponent } from 'ng-mapcn';

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

const WEIGHT_CODE = `<!-- Every point weighs the same -->
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
  readonly earthquakesUrl =
    'https://maplibre.org/maplibre-gl-js/docs/assets/earthquakes.geojson';
}
