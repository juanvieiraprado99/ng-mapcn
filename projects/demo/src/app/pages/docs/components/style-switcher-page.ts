import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  MapComponent,
  MapGeoJSONComponent,
  type MapStyleOption,
  MapStyleSwitcherComponent,
} from 'ng-mapcn';

import { DocsImports } from '../../../shared/docs';
import { ExampleSectionComponent } from '../../../shared/example-section';

const CARTO = 'https://basemaps.cartocdn.com/gl';
const styleOf = (name: string) => {
  const url = `${CARTO}/${name}/style.json`;
  return { light: url, dark: url };
};

const SWITCHER_CODE = `import { Component, signal } from '@angular/core';
import {
  MapComponent,
  MapGeoJSONComponent,
  MapStyleSwitcherComponent,
  type MapStyleOption,
} from 'ng-mapcn';

const CARTO = 'https://basemaps.cartocdn.com/gl';
const styleOf = (name: string) => {
  const url = \`\${CARTO}/\${name}/style.json\`;
  return { light: url, dark: url };
};

@Component({
  selector: 'app-style-switcher-map',
  standalone: true,
  imports: [MapComponent, MapGeoJSONComponent, MapStyleSwitcherComponent],
  template: \`
    <div class="h-[420px]">
      <!-- the map starts on the selected option's styles, so it loads once -->
      <ng-map
        [center]="[2.3522, 48.8566]"
        [zoom]="11"
        [styles]="options[0].styles"
      >
        <ng-map-geojson
          id="switcher-area"
          [data]="area"
          [fillPaint]="{ 'fill-color': '#3b82f6', 'fill-opacity': 0.3 }"
          [linePaint]="{ 'line-color': '#3b82f6', 'line-width': 2 }"
        />
        <ng-map-style-switcher [options]="options" [(value)]="style" />
      </ng-map>
    </div>
  \`,
})
export class StyleSwitcherMapComponent {
  // keep the options array stable: define it once, not inline in the template
  readonly options: MapStyleOption[] = [
    { id: 'positron', label: 'Light', styles: styleOf('positron-gl-style') },
    { id: 'dark-matter', label: 'Dark', styles: styleOf('dark-matter-gl-style') },
    { id: 'voyager', label: 'Voyager', styles: styleOf('voyager-gl-style') },
  ];
  readonly style = signal<string | undefined>('positron');
  readonly area: GeoJSON.Feature<GeoJSON.Polygon> = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [2.28, 48.84],
          [2.4, 48.84],
          [2.4, 48.9],
          [2.28, 48.9],
          [2.28, 48.84],
        ],
      ],
    },
  };
}`;

@Component({
  selector: 'app-style-switcher-page',
  standalone: true,
  imports: [
    DocsImports,
    ExampleSectionComponent,
    MapComponent,
    MapGeoJSONComponent,
    MapStyleSwitcherComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-docs-page
      title="Style Switcher"
      description="Let users pick the basemap from a list of styles; your layers come back after every switch."
    >
      <app-example-section
        title="Basic Usage"
        sectionId="basic-usage"
        [code]="switcherCode"
      >
        <span description>
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map-style-switcher</code>
          lets users pick a basemap from a list of style options. Bind the
          selection with
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">[(value)]</code>
          and give
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map</code>
          the initially selected option's styles so the map loads once. Layers
          are re-added after every switch. On this map the switcher overrides the
          site's header basemap picker.
        </span>
        <ng-map
          [center]="[2.3522, 48.8566]"
          [zoom]="11"
          [styles]="styleOptions[0].styles"
        >
          <ng-map-geojson
            id="switcher-area"
            [data]="area"
            [fillPaint]="{ 'fill-color': '#3b82f6', 'fill-opacity': 0.3 }"
            [linePaint]="{ 'line-color': '#3b82f6', 'line-width': 2 }"
          />
          <ng-map-style-switcher [options]="styleOptions" [(value)]="style" />
        </ng-map>
      </app-example-section>
    </app-docs-page>
  `,
})
export class StyleSwitcherPageComponent {
  readonly switcherCode = SWITCHER_CODE;

  // Stable reference: defined once, not inline in the template.
  readonly styleOptions: MapStyleOption[] = [
    { id: 'positron', label: 'Light', styles: styleOf('positron-gl-style') },
    { id: 'dark-matter', label: 'Dark', styles: styleOf('dark-matter-gl-style') },
    { id: 'voyager', label: 'Voyager', styles: styleOf('voyager-gl-style') },
  ];
  readonly style = signal<string | undefined>('positron');
  readonly area: GeoJSON.Feature<GeoJSON.Polygon> = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [2.28, 48.84],
          [2.4, 48.84],
          [2.4, 48.9],
          [2.28, 48.9],
          [2.28, 48.84],
        ],
      ],
    },
  };
}
