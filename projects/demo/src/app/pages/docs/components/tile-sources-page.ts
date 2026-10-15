import { afterNextRender, ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  type ImageOverlayCoordinates,
  MapComponent,
  MapImageOverlayComponent,
  MapRasterSourceComponent,
  MapVectorSourceComponent,
} from 'ng-mapcn';

import { ParcelsLayerComponent, registerPmtilesProtocol } from '../../../blocks/pmtiles/pmtiles';
import { CodeBlockComponent } from '../../../shared/code-block';
import { DocsImports } from '../../../shared/docs';
import { ExampleSectionComponent } from '../../../shared/example-section';

const RASTER_CODE = `import { Component, signal } from '@angular/core';
import { MapComponent, MapRasterSourceComponent } from 'ng-mapcn';

@Component({
  selector: 'app-raster-map',
  standalone: true,
  imports: [MapComponent, MapRasterSourceComponent],
  template: \`
    <input type="range" min="0" max="1" step="0.05" [value]="opacity()"
      (input)="opacity.set(+$any($event.target).value)" />
    <button (click)="visible.set(!visible())">Toggle</button>
    <ng-map [center]="[10, 50]" [zoom]="3.5">
      <ng-map-raster-source
        id="osm"
        [tiles]="['https://tile.openstreetmap.org/{z}/{x}/{y}.png']"
        [tileSize]="256"
        [maxzoom]="19"
        attribution="&copy; OpenStreetMap contributors"
        [opacity]="opacity()"
        [visible]="visible()"
      />
    </ng-map>
  \`,
})
export class RasterMapComponent {
  readonly opacity = signal(0.7);
  readonly visible = signal(true);
}`;

const IMAGE_CODE = `import { Component, signal } from '@angular/core';
import {
  type ImageOverlayCoordinates,
  MapComponent,
  MapImageOverlayComponent,
} from 'ng-mapcn';

@Component({
  selector: 'app-image-overlay-map',
  standalone: true,
  imports: [MapComponent, MapImageOverlayComponent],
  template: \`
    <button (click)="shift()">Move east</button>
    <ng-map [center]="[-74, 24]" [zoom]="4.5">
      <!-- Corners are [lng, lat], clockwise from the top-left. -->
      <ng-map-image-overlay
        id="chart"
        url="/assets/sea-chart.png"
        [coordinates]="corners()"
        [opacity]="0.8"
      />
    </ng-map>
  \`,
})
export class ImageOverlayMapComponent {
  readonly corners = signal<ImageOverlayCoordinates>([
    [-80, 28],
    [-68, 28],
    [-68, 20],
    [-80, 20],
  ]);

  shift() {
    // A new array: only the changed coordinates are pushed to the live image source.
    this.corners.update((c) => c.map(([lng, lat]) => [lng + 2, lat]) as unknown as ImageOverlayCoordinates);
  }
}`;

const PMTILES_CODE = `import { Component, afterNextRender } from '@angular/core';
import { addProtocol } from 'maplibre-gl';
import { MapComponent, MapVectorSourceComponent } from 'ng-mapcn';
import { Protocol } from 'pmtiles'; // npm i pmtiles

// Once per page, before a source with a pmtiles:// url is added.
let registered = false;
function registerPmtilesProtocol() {
  if (registered) return;
  registered = true;
  addProtocol('pmtiles', new Protocol().tile);
}

@Component({
  selector: 'app-parcels-map',
  standalone: true,
  // ParcelsLayerComponent: see the "Draw the layers" section below.
  imports: [MapComponent, MapVectorSourceComponent, ParcelsLayerComponent],
  template: \`
    <ng-map [center]="[-74.0046, 40.5811]" [zoom]="11.6">
      <ng-map-vector-source
        id="parcels"
        url="pmtiles://https://example.com/parcels.pmtiles"
        promoteId="parcel"
      />
      <app-parcels-layer source="parcels" />
    </ng-map>
  \`,
})
export class ParcelsMapComponent {
  constructor() {
    afterNextRender(() => registerPmtilesProtocol());
  }
}`;

const PROTOCOL_CODE = `// main.ts or an app initializer: the library does not depend on pmtiles.
import { provideAppInitializer } from '@angular/core';
import { addProtocol } from 'maplibre-gl';
import { Protocol } from 'pmtiles';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer(() => {
      // Browser only: skip it during server rendering.
      if (typeof window !== 'undefined') addProtocol('pmtiles', new Protocol().tile);
    }),
  ],
};`;

const LAYER_CODE = `import { Component, effect, inject, input } from '@angular/core';
import { MapContextService } from 'ng-mapcn';

@Component({ selector: 'app-parcels-layer', standalone: true, template: '' })
export class ParcelsLayerComponent {
  readonly source = input.required<string>();
  private readonly ctx = inject(MapContextService);

  constructor() {
    effect((onCleanup) => {
      const map = this.ctx.map();
      const source = this.source();
      // isLoaded() closes during a theme switch; hasSource() closes until the source
      // component has re-added the source, so addLayer never runs before it.
      if (!map || !this.ctx.isLoaded() || !this.ctx.hasSource(source)) return;

      map.addLayer({
        id: \`\${source}-fill\`,
        type: 'fill',
        source,
        'source-layer': 'parcels',
        paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.5 },
      });
      onCleanup(() => {
        try {
          if (map.getLayer(\`\${source}-fill\`)) map.removeLayer(\`\${source}-fill\`);
        } catch {
          // style may be mid-reload
        }
      });
    });
  }
}`;

const TILEJSON_CODE = `<!-- URL templates -->
<ng-map-vector-source id="roads" [tiles]="['https://tiles.example.com/roads/{z}/{x}/{y}.mvt']" [maxzoom]="14" />

<!-- A TileJSON document: zoom range, bounds and attribution come from it -->
<ng-map-vector-source id="roads" url="https://tiles.example.com/roads.json" />

<!-- WMS served as raster tiles -->
<ng-map-raster-source
  id="wms"
  [tiles]="['https://geo.example.com/wms?service=WMS&request=GetMap&layers=land&bbox={bbox-epsg-3857}&width=256&height=256&srs=EPSG:3857&format=image/png&transparent=true']"
  [tileSize]="256"
/>`;

const REGISTRY_CODE = `import { effect, inject } from '@angular/core';
import { MapContextService } from 'ng-mapcn';

const ctx = inject(MapContextService);

effect(() => {
  // Reactive: true only while a source component has the source on the map.
  if (ctx.hasSource('parcels')) {
    // safe to add a layer with source: 'parcels'
  }
  // ctx.sourceIds() is the whole set (a ReadonlySet<string> signal).
});`;

@Component({
  selector: 'app-tile-sources-page',
  standalone: true,
  imports: [
    DocsImports,
    CodeBlockComponent,
    ExampleSectionComponent,
    MapComponent,
    MapRasterSourceComponent,
    MapImageOverlayComponent,
    MapVectorSourceComponent,
    ParcelsLayerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-docs-page
      title="Tile Sources"
      description="Raster tiles, vector tiles (including PMTiles) and georeferenced images as declarative sources."
    >
      <app-example-section
        title="Raster tiles"
        sectionId="raster-tiles"
        [code]="rasterCode"
      >
        <span description>
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map-raster-source</code>
          adds a raster tile source and the layer that draws it (XYZ, TMS or WMS templates).
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">opacity</code> and
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">visible</code> are
          reconciled on the existing layer.
        </span>
        <div after-description class="mb-3 flex flex-wrap items-center gap-4 text-sm">
          <label class="flex items-center gap-2">
            Opacity: {{ opacity() }}
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              [value]="opacity()"
              (input)="opacity.set(+$any($event.target).value)"
            />
          </label>
          <button
            type="button"
            class="border-border bg-background hover:bg-muted rounded-md border px-3 py-1"
            (click)="visible.set(!visible())"
          >
            {{ visible() ? 'Hide' : 'Show' }}
          </button>
        </div>
        <ng-map [center]="[10, 50]" [zoom]="3.5">
          <ng-map-raster-source
            id="osm"
            [tiles]="osmTiles"
            [tileSize]="256"
            [maxzoom]="19"
            attribution="&copy; OpenStreetMap contributors"
            [opacity]="opacity()"
            [visible]="visible()"
          />
        </ng-map>
      </app-example-section>

      <app-example-section title="Image overlay" sectionId="image-overlay" [code]="imageCode">
        <span description>
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map-image-overlay</code>
          pins an image to four corner coordinates. Changing
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">coordinates</code>
          moves the live image source (<code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">setCoordinates</code>)
          without re-creating it.
        </span>
        <div after-description class="mb-3 flex gap-2">
          <button
            type="button"
            class="border-border bg-background hover:bg-muted rounded-md border px-3 py-1 text-sm"
            (click)="shift()"
          >
            Move east
          </button>
        </div>
        <ng-map [center]="[-74, 24]" [zoom]="4.5">
          <ng-map-image-overlay
            id="compass"
            url="/compass.png"
            [coordinates]="corners()"
            [opacity]="0.85"
          />
        </ng-map>
      </app-example-section>

      <app-example-section
        title="Vector tiles from PMTiles"
        sectionId="vector-tiles-pmtiles"
        [code]="pmtilesCode"
      >
        <span description>
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map-vector-source</code>
          adds the source only. This example reads a single static
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">.pmtiles</code>
          archive (no tile server) and draws it with a small layer component that waits for the
          source by id. Hover a parcel to highlight it with feature-state.
        </span>
        <ng-map [center]="[-74.0046, 40.5811]" [zoom]="11.6">
          <ng-map-vector-source id="parcels" [url]="archiveUrl" promoteId="parcel" />
          <app-parcels-layer source="parcels" />
        </ng-map>
      </app-example-section>

      <app-docs-section title="Registering the PMTiles protocol" anchor="pmtiles-protocol">
        <p>
          ng-mapcn does not depend on
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">pmtiles</code>.
          Install it in your app and register the protocol once, before a
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">pmtiles://</code>
          source is added. The URL is
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">pmtiles://</code>
          followed by the archive URL; the server must support HTTP range requests.
        </p>
        <app-code-block [code]="protocolCode" />
      </app-docs-section>

      <app-docs-section title="Draw the layers" anchor="draw-the-layers">
        <p>
          A vector source has no layers of its own. Add them with
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">map.addLayer</code>
          from a component that reads
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">MapContextService</code>
          and waits for the source with
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">hasSource(id)</code>.
        </p>
        <app-code-block [code]="layerCode" />
      </app-docs-section>

      <app-docs-section title="Source ids and the registry" anchor="source-ids">
        <p>
          The MapLibre source id is exactly the
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">id</code> input
          (auto-generated when omitted), so layers can reference it as
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">source: 'parcels'</code>.
          Raster layers are named
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">raster-layer-&lt;id&gt;</code>
          and image layers
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">image-layer-&lt;id&gt;</code>.
          Each source component announces its source in
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">MapContextService</code>
          while it exists on the map: it disappears when a theme switch removes the style and comes
          back once the source is re-added, so a consumer re-runs by itself.
        </p>
        <app-code-block [code]="registryCode" />
      </app-docs-section>

      <app-docs-section title="URLs, TileJSON and WMS" anchor="urls-tilejson-wms">
        <p>
          Give <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">tiles</code> (URL
          templates) or <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">url</code>
          (a TileJSON document). Both are updated in place with
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">setTiles</code> /
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">setUrl</code>.
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">tileSize</code>,
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">minzoom</code>,
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">maxzoom</code>,
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">bounds</code>,
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">scheme</code>,
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">attribution</code> and
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">promoteId</code> are
          read when the source is created; change the
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">id</code> to rebuild it
          with new ones.
        </p>
        <app-code-block [code]="tileJsonCode" />
      </app-docs-section>
    </app-docs-page>
  `,
})
export class TileSourcesPageComponent {
  readonly rasterCode = RASTER_CODE;
  readonly imageCode = IMAGE_CODE;
  readonly pmtilesCode = PMTILES_CODE;
  readonly protocolCode = PROTOCOL_CODE;
  readonly layerCode = LAYER_CODE;
  readonly registryCode = REGISTRY_CODE;
  readonly tileJsonCode = TILEJSON_CODE;

  readonly osmTiles = ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'];
  readonly archiveUrl = 'pmtiles:///data/parcels.pmtiles';

  readonly opacity = signal(0.7);
  readonly visible = signal(true);

  readonly corners = signal<ImageOverlayCoordinates>([
    [-80, 28],
    [-68, 28],
    [-68, 20],
    [-80, 20],
  ]);

  constructor() {
    afterNextRender(() => registerPmtilesProtocol());
  }

  shift(): void {
    this.corners.update(
      (corners) =>
        corners.map(([lng, lat]) => [lng + 2, lat] as const) as unknown as ImageOverlayCoordinates,
    );
  }
}
