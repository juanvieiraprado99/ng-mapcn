import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MapComponent, MapTerrainComponent } from 'ng-mapcn';

import { CodeBlockComponent } from '../../../shared/code-block';
import { DocsImports } from '../../../shared/docs';
import { ExampleSectionComponent } from '../../../shared/example-section';

const TERRAIN_CODE = `import { Component, signal } from '@angular/core';
import { MapComponent, MapTerrainComponent } from 'ng-mapcn';

@Component({
  selector: 'app-terrain-map',
  standalone: true,
  imports: [MapComponent, MapTerrainComponent],
  template: \`
    <input type="range" min="0.5" max="3" step="0.1" [value]="exaggeration()"
      (input)="exaggeration.set(+$any($event.target).value)" />
    <label><input type="checkbox" [checked]="hillshade()"
      (change)="hillshade.set($any($event.target).checked)" /> Hillshade</label>
    <ng-map
      [center]="[138.7274, 35.3606]"
      [zoom]="10.5"
      [options]="{ pitch: 70, bearing: 30, maxPitch: 85 }"
    >
      <!-- No tiles given: public Terrarium elevation tiles are used. -->
      <ng-map-terrain id="relief" [exaggeration]="exaggeration()" [hillshade]="hillshade()" />
    </ng-map>
  \`,
})
export class TerrainMapComponent {
  readonly exaggeration = signal(1.5);
  readonly hillshade = signal(true);
}`;

const TERRAIN_SOURCE_CODE = `<!-- Mapbox Terrain-RGB / MapTiler tiles instead of the default Terrarium ones -->
<ng-map-terrain
  [tiles]="['https://api.maptiler.com/tiles/terrain-rgb-v2/{z}/{x}/{y}.webp?key=KEY']"
  encoding="mapbox"
  [tileSize]="512"
  [maxzoom]="12"
  attribution="&copy; MapTiler"
  [exaggeration]="1.5"
  [hillshade]="true"
  [hillshadeShadowColor]="'#1e293b'"
  beforeId="waterway_label"
/>`;

const IDS_CODE = `<ng-map-terrain id="relief" [hillshade]="true" />

// Ids derived from id="relief":
//   DEM source:        terrain-source-relief            (announced via MapContextService.hasSource)
//   hillshade source:  terrain-hillshade-source-relief  (only while hillshade is true)
//   hillshade layer:   terrain-hillshade-relief`;

@Component({
  selector: 'app-terrain-page',
  standalone: true,
  imports: [DocsImports, CodeBlockComponent, ExampleSectionComponent, MapComponent, MapTerrainComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-docs-page
      title="Terrain"
      description="Drape the map over real elevation, with optional hillshade, declaratively."
    >
      <app-example-section title="Basic Usage" sectionId="basic-usage" [code]="terrainCode">
        <span description>
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map-terrain</code>
          turns a raster elevation (DEM) source into real 3D relief with
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">map.setTerrain</code>.
          Without tiles it uses public Terrarium tiles. Raise the pitch (up to
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">maxPitch</code>) to see
          Mount Fuji rise.
        </span>
        <div after-description class="mb-3 flex flex-wrap items-center gap-4 text-sm">
          <label class="flex items-center gap-2">
            Exaggeration: {{ exaggeration() }}
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              [value]="exaggeration()"
              (input)="exaggeration.set(+$any($event.target).value)"
            />
          </label>
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              [checked]="hillshade()"
              (change)="hillshade.set($any($event.target).checked)"
            />
            Hillshade
          </label>
        </div>
        <ng-map
          [center]="[138.7274, 35.3606]"
          [zoom]="10.5"
          [options]="{ pitch: 70, bearing: 30, maxPitch: 85 }"
        >
          <ng-map-terrain id="relief" [exaggeration]="exaggeration()" [hillshade]="hillshade()" />
        </ng-map>
      </app-example-section>

      <app-docs-section title="Elevation tiles" anchor="elevation-tiles">
        <p>
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">tiles</code> /
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">url</code>,
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">encoding</code>
          (<code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">terrarium</code> or
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">mapbox</code>),
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">tileSize</code> and the
          zoom limits are read when the source is created. The terrain is style-level state that a
          theme switch discards: the component enables it again with its sources once the new style
          is loaded. Changing
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">exaggeration</code>
          re-applies the terrain (MapLibre rebuilds its mesh), so a slider is fine but not free. A
          map has one terrain at a time. The default tiles come from a public open-data bucket with no SLA: in production pass your own provider with <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">tiles</code> or <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">url</code>, and allow the host (<code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">s3.amazonaws.com</code>) if your CSP is strict. The hillshade has its own DEM source because MapLibre
          warns when it shares one with the terrain; it is added and removed with
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">hillshade</code>
          and styled with
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">hillshadeExaggeration</code>,
          the three color inputs and
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">hillshadePaint</code>.
        </p>
        <app-code-block [code]="terrainSourceCode" />
      </app-docs-section>

      <app-docs-section title="Ids and z-order" anchor="ids-and-z-order">
        <p>
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">beforeId</code>
          inserts the hillshade layer below an existing layer (for example the labels). It is applied at
          creation only, and changing
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">id</code> re-creates
          the layers.
        </p>
        <app-code-block [code]="idsCode" />
      </app-docs-section>
    </app-docs-page>
  `,
})
export class TerrainPageComponent {
  readonly terrainCode = TERRAIN_CODE;
  readonly terrainSourceCode = TERRAIN_SOURCE_CODE;
  readonly idsCode = IDS_CODE;

  readonly exaggeration = signal(1.5);
  readonly hillshade = signal(true);
}
