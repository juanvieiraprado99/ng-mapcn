import { afterNextRender, ChangeDetectionStrategy, Component } from '@angular/core';
import { MapComponent, MapVectorSourceComponent } from 'ng-mapcn';

import { BuildingsLayerComponent, registerPmtilesProtocol } from '../../../blocks/pmtiles/pmtiles';
import { CodeBlockComponent } from '../../../shared/code-block';
import { DocsImports } from '../../../shared/docs';
import { ExampleSectionComponent } from '../../../shared/example-section';

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
  selector: 'app-florence-map',
  standalone: true,
  // BuildingsLayerComponent: see the "Draw the layers" section below.
  imports: [MapComponent, MapVectorSourceComponent, BuildingsLayerComponent],
  template: \`
    <ng-map [center]="[11.2543, 43.7672]" [zoom]="15.5">
      <ng-map-vector-source
        id="florence"
        url="pmtiles://https://pmtiles.io/protomaps%28vector%29ODbL_firenze.pmtiles"
      />
      <app-buildings-layer source="florence" />
    </ng-map>
  \`,
})
export class FlorenceMapComponent {
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

@Component({ selector: 'app-buildings-layer', standalone: true, template: '' })
export class BuildingsLayerComponent {
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
        'source-layer': 'buildings',
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
<ng-map-vector-source id="roads" url="https://tiles.example.com/roads.json" />`;

const REGISTRY_CODE = `import { effect, inject } from '@angular/core';
import { MapContextService } from 'ng-mapcn';

const ctx = inject(MapContextService);

effect(() => {
  // Reactive: true only while a source component has the source on the map.
  if (ctx.hasSource('florence')) {
    // safe to add a layer with source: 'florence'
  }
  // ctx.sourceIds() is the whole set (a ReadonlySet<string> signal).
});`;

@Component({
  selector: 'app-vector-source-page',
  standalone: true,
  imports: [
    DocsImports,
    CodeBlockComponent,
    ExampleSectionComponent,
    MapComponent,
    MapVectorSourceComponent,
    BuildingsLayerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-docs-page
      title="Vector Tiles"
      description="Vector tiles, including PMTiles archives, as a declarative source your layers draw from."
    >
      <app-example-section
        title="Basic Usage"
        sectionId="basic-usage"
        [code]="pmtilesCode"
      >
        <span description>
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map-vector-source</code>
          adds the source only. This example reads a real static
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">.pmtiles</code>
          archive (no tile server): a small Protomaps extract of central Florence, built from
          OpenStreetMap data. A small layer component draws its
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">buildings</code>
          layer once it finds the source by id. Hover a building to highlight it with
          feature-state (the tiles already carry feature ids, so no
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">promoteId</code>
          is needed). The same code is the
          <a class="underline" href="/blocks">pmtiles block</a>; copying it requires
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">npm i pmtiles</code>.
        </span>
        <ng-map [center]="[11.2543, 43.7672]" [zoom]="15.5">
          <ng-map-vector-source id="florence" [url]="archiveUrl" />
          <app-buildings-layer source="florence" />
        </ng-map>
      </app-example-section>

      <app-docs-section title="Registering the PMTiles protocol" anchor="pmtiles-protocol">
        <p>
          ng-mapcn does not depend on
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">pmtiles</code>.
          Run <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">npm i pmtiles</code> in your app (also required to copy the pmtiles block) and register the protocol once, before a
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
          When a source component is torn down, or a theme switch reloads the style, it removes
          <strong>every layer still using its source</strong> (yours included) and then the source.
          Gate on <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">hasSource(id)</code>
          so your layers are re-added when the source comes back.
        </p>
        <app-code-block [code]="layerCode" />
      </app-docs-section>

      <app-docs-section title="Source ids and the registry" anchor="source-ids">
        <p>
          The MapLibre source id is exactly the
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">id</code> input
          (auto-generated when omitted), so layers can reference it as
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">source: 'florence'</code>.
          Each source component (vector,
          <a class="underline" href="/docs/components/raster-source">raster</a> and
          <a class="underline" href="/docs/components/image-overlay">image</a>) announces its
          source in
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">MapContextService</code>
          while it exists on the map: it disappears when a theme switch removes the style and comes
          back once the source is re-added, so a consumer re-runs by itself.
        </p>
        <app-code-block [code]="registryCode" />
      </app-docs-section>

      <app-docs-section title="URLs and TileJSON" anchor="urls-tilejson">
        <p>
          Give <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">tiles</code> (URL templates) or <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">url</code> (a TileJSON document). Both are
          updated in place with <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">setTiles</code> / <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">setUrl</code>. <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">tileSize</code>,
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">minzoom</code>, <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">maxzoom</code>, <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">bounds</code>, <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">scheme</code>,
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">attribution</code> and <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">promoteId</code> are read when the source is created, and
          so is the mode (<code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">url</code> or <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">tiles</code>): switching between them later is
          ignored. Change the <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">id</code> to rebuild it with new ones.
        </p>
        <app-code-block [code]="tileJsonCode" />
      </app-docs-section>
    </app-docs-page>
  `,
})
export class VectorSourcePageComponent {
  readonly pmtilesCode = PMTILES_CODE;
  readonly protocolCode = PROTOCOL_CODE;
  readonly layerCode = LAYER_CODE;
  readonly registryCode = REGISTRY_CODE;
  readonly tileJsonCode = TILEJSON_CODE;

  readonly archiveUrl =
    'pmtiles://https://pmtiles.io/protomaps%28vector%29ODbL_firenze.pmtiles';

  constructor() {
    afterNextRender(() => registerPmtilesProtocol());
  }
}
