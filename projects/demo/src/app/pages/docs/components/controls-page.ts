import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  MapComponent,
  MapControlsComponent,
  MapGeoJSONComponent,
  MapMinimapComponent,
  MapScaleComponent,
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

const CONTROLS_CODE = `import { Component } from '@angular/core';
import { MapComponent, MapControlsComponent } from 'ng-mapcn';

@Component({
  selector: 'app-controls-map',
  standalone: true,
  imports: [MapComponent, MapControlsComponent],
  template: \`
    <div class="h-[420px]">
      <ng-map [center]="[2.3522, 48.8566]" [zoom]="12">
        <ng-map-controls
          position="top-right"
          [showZoom]="true"
          [showCompass]="true"
          [showLocate]="true"
          [showFullscreen]="true"
        />
      </ng-map>
    </div>
  \`,
})
export class ControlsMapComponent {}`;

const SCALE_CODE = `import { Component } from '@angular/core';
import { MapComponent, MapControlsComponent, MapScaleComponent } from 'ng-mapcn';

@Component({
  selector: 'app-scale-map',
  standalone: true,
  imports: [MapComponent, MapControlsComponent, MapScaleComponent],
  template: \`
    <div class="h-[420px]">
      <ng-map [center]="[2.3522, 48.8566]" [zoom]="10">
        <!-- bottom-left by default; unit="both" shows metric and imperial bars -->
        <ng-map-scale unit="both" [maxWidth]="120" />
        <ng-map-controls position="bottom-right" />
      </ng-map>
    </div>
  \`,
})
export class ScaleMapComponent {}`;

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

const MINIMAP_CODE = `import { Component } from '@angular/core';
import { MapComponent, MapControlsComponent, MapMinimapComponent } from 'ng-mapcn';

@Component({
  selector: 'app-minimap-map',
  standalone: true,
  imports: [MapComponent, MapControlsComponent, MapMinimapComponent],
  template: \`
    <div class="h-[420px]">
      <ng-map [center]="[2.3522, 48.8566]" [zoom]="11">
        <!-- bottom-left by default; click, drag or use the arrow keys to move the main map -->
        <ng-map-minimap />
        <ng-map-controls position="top-right" />
      </ng-map>
    </div>
  \`,
})
export class MinimapMapComponent {}`;

const MINIMAP_BLANK_CODE = `import { Component } from '@angular/core';
import { MapComponent, MapMinimapComponent } from 'ng-mapcn';

@Component({
  selector: 'app-minimap-blank-map',
  standalone: true,
  imports: [MapComponent, MapMinimapComponent],
  template: \`
    <div class="h-[420px]">
      <ng-map [center]="[2.3522, 48.8566]" [zoom]="11">
        <!-- no basemap tiles in the overview; it sits 3 zoom levels below the main map -->
        <ng-map-minimap position="top-left" [blank]="true" [zoomOffset]="3" />
      </ng-map>
    </div>
  \`,
})
export class MinimapBlankMapComponent {}`;

@Component({
  selector: 'app-controls-page',
  standalone: true,
  imports: [
    DocsImports,
    ExampleSectionComponent,
    MapComponent,
    MapControlsComponent,
    MapGeoJSONComponent,
    MapMinimapComponent,
    MapScaleComponent,
    MapStyleSwitcherComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-docs-page
      title="Controls"
      description="Map control buttons (zoom, compass, locate, fullscreen), a distance scale and a basemap style switcher."
    >
      <app-example-section
        title="Basic Usage"
        sectionId="basic-usage"
        [code]="controlsCode"
      >
        <span description>
          The
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map-controls</code>
          component renders map control buttons. Choose a corner with
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">position</code>
          and toggle individual controls with the
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">show*</code>
          inputs.
        </span>
        <ng-map [center]="[2.3522, 48.8566]" [zoom]="12">
          <ng-map-controls
            position="top-right"
            [showZoom]="true"
            [showCompass]="true"
            [showLocate]="true"
            [showFullscreen]="true"
          />
        </ng-map>
      </app-example-section>

      <app-example-section title="Scale" sectionId="scale" [code]="scaleCode">
        <span description>
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map-scale</code>
          draws a distance bar that follows the map as you zoom and pan. Use
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">unit</code>
          for metric, imperial or both, and
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">maxWidth</code>
          for the longest bar in pixels. It sits bottom-left by default.
        </span>
        <ng-map [center]="[2.3522, 48.8566]" [zoom]="10">
          <ng-map-scale unit="both" [maxWidth]="120" />
          <ng-map-controls position="bottom-right" />
        </ng-map>
      </app-example-section>

      <app-example-section
        title="Style switcher"
        sectionId="style-switcher"
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

      <app-example-section
        title="Minimap"
        sectionId="minimap"
        [code]="minimapCode"
      >
        <span description>
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map-minimap</code>
          adds an overview map that follows the main viewport a few zoom levels
          out and outlines what the main map shows. Click, drag or use the arrow
          keys on it to navigate the main map, and collapse it with the toggle.
          It sits bottom-left by default.
        </span>
        <ng-map [center]="[2.3522, 48.8566]" [zoom]="11">
          <ng-map-minimap />
          <ng-map-controls position="top-right" />
        </ng-map>
      </app-example-section>

      <app-example-section
        title="Blank minimap"
        sectionId="minimap-blank"
        [code]="minimapBlankCode"
      >
        <span description>
          Set
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">[blank]="true"</code>
          to draw only the footprint without basemap tiles, and
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">zoomOffset</code>
          to change how far out the overview sits.
        </span>
        <ng-map [center]="[2.3522, 48.8566]" [zoom]="11">
          <ng-map-minimap position="top-left" [blank]="true" [zoomOffset]="3" />
        </ng-map>
      </app-example-section>
    </app-docs-page>
  `,
})
export class ControlsPageComponent {
  readonly controlsCode = CONTROLS_CODE;
  readonly scaleCode = SCALE_CODE;
  readonly switcherCode = SWITCHER_CODE;
  readonly minimapCode = MINIMAP_CODE;
  readonly minimapBlankCode = MINIMAP_BLANK_CODE;

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
