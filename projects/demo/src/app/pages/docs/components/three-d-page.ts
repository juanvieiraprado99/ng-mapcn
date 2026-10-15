import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MapComponent, MapFillExtrusionComponent, MapTerrainComponent } from 'ng-mapcn';

import { CodeBlockComponent } from '../../../shared/code-block';
import { DocsImports } from '../../../shared/docs';
import { ExampleSectionComponent } from '../../../shared/example-section';

const BUILDINGS_CODE = `import { Component, signal } from '@angular/core';
import { MapComponent, MapFillExtrusionComponent } from 'ng-mapcn';

@Component({
  selector: 'app-buildings-map',
  standalone: true,
  imports: [MapComponent, MapFillExtrusionComponent],
  template: \`
    <input type="range" min="0.2" max="1" step="0.05" [value]="opacity()"
      (input)="opacity.set(+$any($event.target).value)" />
    <button (click)="byHeight.set(!byHeight())">Color by height</button>
    <ng-map
      [center]="[-74.0134, 40.7061]"
      [zoom]="15.5"
      [options]="{ pitch: 60, bearing: -20 }"
    >
      <!-- Defaults target the Carto basemap: source "carto", layer "building". -->
      <ng-map-fill-extrusion
        id="buildings"
        [opacity]="opacity()"
        [color]="byHeight() ? heightColor : undefined"
      />
    </ng-map>
  \`,
})
export class BuildingsMapComponent {
  readonly opacity = signal(0.8);
  readonly byHeight = signal(false);
  readonly heightColor = [
    'interpolate', ['linear'], ['coalesce', ['to-number', ['get', 'render_height']], 0],
    0, '#93c5fd', 50, '#818cf8', 150, '#c084fc', 300, '#f472b6',
  ];
}`;

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

const BASEMAP_CODE = `<!-- Defaults: source="carto" sourceLayer="building"
     heightProperty="render_height" baseProperty="render_min_height"
     [minZoom]="14" [opacity]="0.8" and a theme-aware color. -->
<ng-map-fill-extrusion />

<!-- Same thing, spelled out (any basemap source with an OpenMapTiles schema) -->
<ng-map-fill-extrusion
  source="openmaptiles"
  sourceLayer="building"
  heightProperty="render_height"
  baseProperty="render_min_height"
  [opacity]="0.8"
  beforeId="waterway_label"
/>`;

const OWN_SOURCE_CODE = `<ng-map [center]="[-74.0, 40.7]" [zoom]="15" [options]="{ pitch: 60 }">
  <!-- Your own vector tiles (here a PMTiles archive) ... -->
  <ng-map-vector-source id="footprints" url="pmtiles://https://example.com/footprints.pmtiles" />
  <!-- ... extruded by a property: the layer waits for the source and survives theme switches. -->
  <ng-map-fill-extrusion
    source="footprints"
    sourceLayer="footprints"
    heightProperty="floors"
    [paint]="{ 'fill-extrusion-height': ['*', ['get', 'floors'], 3.2] }"
  />
</ng-map>

<!-- A GeoJSON source needs no sourceLayer -->
<ng-map-fill-extrusion source="my-geojson-source" heightProperty="height" />`;

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
//   hillshade layer:   terrain-hillshade-relief
//
// <ng-map-fill-extrusion id="buildings" /> creates the layer
//   fill-extrusion-layer-buildings  (and no source of its own)`;

@Component({
  selector: 'app-three-d-page',
  standalone: true,
  imports: [
    DocsImports,
    CodeBlockComponent,
    ExampleSectionComponent,
    MapComponent,
    MapFillExtrusionComponent,
    MapTerrainComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-docs-page
      title="3D Buildings & Terrain"
      description="Extrude buildings and drape the map over real elevation, declaratively."
    >
      <app-example-section
        title="3D buildings"
        sectionId="3d-buildings"
        [code]="buildingsCode"
      >
        <span description>
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map-fill-extrusion</code>
          extrudes polygons by a height property. With no inputs it extrudes the
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">building</code> layer of
          the Carto basemap. Tilt the map with the
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">pitch</code> option (or
          right-drag) and zoom past 14. Opacity and color are applied with diffed setters.
        </span>
        <div after-description class="mb-3 flex flex-wrap items-center gap-4 text-sm">
          <label class="flex items-center gap-2">
            Opacity: {{ opacity() }}
            <input
              type="range"
              min="0.2"
              max="1"
              step="0.05"
              [value]="opacity()"
              (input)="opacity.set(+$any($event.target).value)"
            />
          </label>
          <button
            type="button"
            class="border-border bg-background hover:bg-muted rounded-md border px-3 py-1"
            (click)="byHeight.set(!byHeight())"
          >
            {{ byHeight() ? 'Default color' : 'Color by height' }}
          </button>
        </div>
        <ng-map
          [center]="[-74.0134, 40.7061]"
          [zoom]="15.5"
          [options]="{ pitch: 60, bearing: -20 }"
        >
          <ng-map-fill-extrusion
            id="buildings"
            [opacity]="opacity()"
            [color]="byHeight() ? heightColor : undefined"
          />
        </ng-map>
      </app-example-section>

      <app-example-section title="Terrain and hillshade" sectionId="terrain" [code]="terrainCode">
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

      <app-docs-section title="Basemap buildings" anchor="basemap-buildings">
        <p>
          The Carto styles (Positron, Dark Matter, Voyager) have one vector source named
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">carto</code>
          with an OpenMapTiles
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">building</code> layer
          carrying
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">render_height</code>,
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">render_min_height</code>
          and
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">hide_3d</code>. Those
          are the defaults, and the tiles stop at zoom 14, hence the default
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">minZoom</code> of 14.
          The default filter skips outlines flagged
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">hide_3d</code> (their
          parts carry the real heights); pass
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">[filter]="null"</code>
          for none. Another basemap with a vector source works the same way, naming its
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">source</code> and
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">sourceLayer</code>.
          The blank style and raster basemaps have no vector source, so use your own (below).
        </p>
        <app-code-block [code]="basemapCode" />
      </app-docs-section>

      <app-docs-section title="Your own source" anchor="own-source">
        <p>
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map-fill-extrusion</code>
          never creates a source. It waits until
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">map.getSource(source)</code>
          exists: a basemap source, one of the tile source components (it reacts to
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">hasSource</code>) or one
          your application adds later. After a theme switch the layer comes back as soon as its
          source does. A source component removes the extrusion layer with it when it is torn down.
          Use the
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">paint</code> input for
          any other fill-extrusion property.
        </p>
        <app-code-block [code]="ownSourceCode" />
      </app-docs-section>

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
          inserts the extrusion or the hillshade layer below an existing layer (for example the
          labels). It is applied at creation only, and changing
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">id</code> re-creates
          the layers.
        </p>
        <app-code-block [code]="idsCode" />
      </app-docs-section>
    </app-docs-page>
  `,
})
export class ThreeDPageComponent {
  readonly buildingsCode = BUILDINGS_CODE;
  readonly terrainCode = TERRAIN_CODE;
  readonly basemapCode = BASEMAP_CODE;
  readonly ownSourceCode = OWN_SOURCE_CODE;
  readonly terrainSourceCode = TERRAIN_SOURCE_CODE;
  readonly idsCode = IDS_CODE;

  readonly opacity = signal(0.8);
  readonly byHeight = signal(false);
  readonly heightColor = [
    'interpolate',
    ['linear'],
    ['coalesce', ['to-number', ['get', 'render_height']], 0],
    0,
    '#93c5fd',
    50,
    '#818cf8',
    150,
    '#c084fc',
    300,
    '#f472b6',
  ];

  readonly exaggeration = signal(1.5);
  readonly hillshade = signal(true);
}
