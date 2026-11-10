import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MapComponent, MapRasterSourceComponent } from 'ng-mapcn';

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
        id="tiles"
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

const TILEJSON_CODE = `<!-- URL templates -->
<ng-map-raster-source id="osm" [tiles]="['https://tile.openstreetmap.org/{z}/{x}/{y}.png']" [tileSize]="256" />

<!-- A TileJSON document: zoom range, bounds and attribution come from it -->
<ng-map-raster-source id="satellite" url="https://tiles.example.com/satellite.json" />

<!-- WMS served as raster tiles -->
<ng-map-raster-source
  id="wms"
  [tiles]="['https://geo.example.com/wms?service=WMS&request=GetMap&layers=land&bbox={bbox-epsg-3857}&width=256&height=256&srs=EPSG:3857&format=image/png&transparent=true']"
  [tileSize]="256"
/>`;

@Component({
  selector: 'app-raster-source-page',
  standalone: true,
  imports: [
    DocsImports,
    CodeBlockComponent,
    ExampleSectionComponent,
    MapComponent,
    MapRasterSourceComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-docs-page
      title="Raster Tiles"
      description="XYZ, TMS and WMS raster tiles as a declarative source and layer."
    >
      <app-example-section
        title="Basic Usage"
        sectionId="basic-usage"
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
            id="tiles"
            [tiles]="osmTiles"
            [tileSize]="256"
            [maxzoom]="19"
            attribution="&copy; OpenStreetMap contributors"
            [opacity]="opacity()"
            [visible]="visible()"
          />
        </ng-map>
      </app-example-section>

      <app-docs-section title="URLs, TileJSON and WMS" anchor="urls-tilejson-wms">
        <p>
          Give <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">tiles</code> (URL templates, including WMS <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">GetMap</code> requests) or
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">url</code> (a TileJSON document). Both are updated in place with
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">setTiles</code> / <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">setUrl</code>. <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">tileSize</code>, <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">minzoom</code>,
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">maxzoom</code>, <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">bounds</code>, <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">scheme</code> and <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">attribution</code> are read
          when the source is created, and so is the mode (<code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">url</code> or <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">tiles</code>):
          switching between them later is ignored. Change the <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">id</code> to rebuild it with new
          ones.
        </p>
        <app-code-block [code]="tileJsonCode" />
      </app-docs-section>

      <app-docs-section title="Ids" anchor="ids">
        <p>
          The MapLibre source id is exactly the <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">id</code> input (auto-generated when omitted)
          and its layer is <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">raster-layer-&lt;id&gt;</code>. The source is announced in
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">MapContextService.hasSource(id)</code> while it is on the map (see
          <a class="underline" href="/docs/components/vector-source#source-ids">Vector Tiles</a>).
        </p>
      </app-docs-section>
    </app-docs-page>
  `,
})
export class RasterSourcePageComponent {
  readonly rasterCode = RASTER_CODE;
  readonly tileJsonCode = TILEJSON_CODE;

  readonly osmTiles = ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'];
  readonly opacity = signal(0.7);
  readonly visible = signal(true);
}
