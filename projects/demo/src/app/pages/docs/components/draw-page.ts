import { ChangeDetectionStrategy, Component, computed, signal, viewChild } from '@angular/core';
import { MapComponent } from 'ng-mapcn';
import {
  MapDrawComponent,
  type MapDrawEvent,
  type MapDrawFeatureCollection,
  type MapDrawMode,
} from 'ng-mapcn/draw';

import { CodeBlockComponent } from '../../../shared/code-block';
import { DocsImports } from '../../../shared/docs';
import { ExampleSectionComponent } from '../../../shared/example-section';

const INSTALL_CODE = `# terra-draw and its MapLibre adapter are optional peer dependencies
npm i terra-draw terra-draw-maplibre-gl-adapter

# Copy-paste distribution: copies the draw sources to <path>/draw and adds the dependencies
ng add ng-mapcn --draw`;

const BASIC_CODE = `import { Component, signal, viewChild } from '@angular/core';
import { MapComponent } from 'ng-mapcn';
import { MapDrawComponent, type MapDrawFeatureCollection, type MapDrawMode } from 'ng-mapcn/draw';

@Component({
  selector: 'app-draw-map',
  standalone: true,
  imports: [MapComponent, MapDrawComponent],
  template: \`
    <button (click)="mode.set('point')">Point</button>
    <button (click)="mode.set('line')">Line</button>
    <button (click)="mode.set('polygon')">Polygon</button>
    <button (click)="mode.set('select')">Select</button>
    <button (click)="mode.set('static')">Pan</button>
    <button (click)="draw().clear()">Clear</button>
    <p>{{ features().features.length }} features</p>

    <div class="h-[420px]">
      <ng-map [center]="[-46.6333, -23.5505]" [zoom]="11">
        <ng-map-draw [(mode)]="mode" [(features)]="features" />
      </ng-map>
    </div>
  \`,
})
export class DrawMapComponent {
  readonly draw = viewChild.required(MapDrawComponent);
  readonly mode = signal<MapDrawMode>('static');
  readonly features = signal<MapDrawFeatureCollection>({ type: 'FeatureCollection', features: [] });
}`;

const PRELOADED_CODE = `import { Component, signal } from '@angular/core';
import { MapComponent } from 'ng-mapcn';
import { MapDrawComponent, type MapDrawFeatureCollection, type MapDrawEvent } from 'ng-mapcn/draw';

@Component({
  selector: 'app-geofence-map',
  standalone: true,
  imports: [MapComponent, MapDrawComponent],
  template: \`
    <ng-map [center]="[-46.6333, -23.5505]" [zoom]="12">
      <ng-map-draw
        mode="select"
        [modes]="['polygon']"
        [(features)]="zones"
        (drawEnd)="last.set($event)"
        (featureEdit)="last.set($event)"
      />
    </ng-map>
  \`,
})
export class GeofenceMapComponent {
  readonly last = signal<MapDrawEvent | null>(null);
  // Features without an id get one; assigning a new collection replaces what is drawn.
  readonly zones = signal<MapDrawFeatureCollection>({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Depot' },
        geometry: {
          type: 'Polygon',
          coordinates: [[[-46.66, -23.54], [-46.62, -23.54], [-46.62, -23.56], [-46.66, -23.56], [-46.66, -23.54]]],
        },
      },
    ],
  });
}`;

const MODEL_CODE = `readonly features = signal<MapDrawFeatureCollection>({ type: 'FeatureCollection', features: [] });

// <ng-map-draw [(features)]="features" />
//
// - It updates when a draw, edit or delete completes (not on every mouse move).
// - Assigning a collection diffs by feature id: new ids are added, missing ones removed,
//   changed geometry/properties updated in place. Assigning the same data is a no-op.
// - Features without an id get one; unsupported geometries (MultiPolygon, ...) are dropped and
//   reported through (mapError) on <ng-map>.
// - properties.mode is the shape ('point' | 'line' | 'polygon'); other properties are yours.`;

const EVENTS_CODE = `// <ng-map-draw
//   (drawEnd)="onDrawEnd($event)"          // a new shape was completed
//   (featureEdit)="onEdit($event)"         // moved, reshaped, vertex added/removed
//   (featureSelect)="onSelect($event)"     // select mode: the Feature
//   (featureDeselect)="onDeselect($event)" // select mode: the feature id
// />

onDrawEnd(event: MapDrawEvent) {
  // { feature, mode: 'polygon', action: 'draw' }
}`;

const MODES_CODE = `<!-- Only polygons can be drawn; features stay selectable and editable -->
<ng-map-draw [modes]="['polygon']" [(mode)]="mode" [(features)]="features" />

<!-- Display only: no select mode, no editing -->
<ng-map-draw [editable]="false" [(features)]="features" />

<!-- mode: 'point' | 'line' | 'polygon' | 'select' | 'static' (default). A mode that is not
     enabled falls back to 'static'. -->`;

const THEME_CODE = `<!-- Accent color of the drawn shapes (#rrggbb); defaults to a theme-aware blue -->
<ng-map-draw color="#16a34a" [(features)]="features" />

import { buildDrawStyles, defaultDrawPalettes } from 'ng-mapcn/draw';
// buildDrawStyles('dark') -> the terra-draw styles used for each mode`;

@Component({
  selector: 'app-draw-page',
  standalone: true,
  imports: [
    DocsImports,
    CodeBlockComponent,
    ExampleSectionComponent,
    MapComponent,
    MapDrawComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-docs-page
      title="Draw"
      description="Draw, select and edit points, lines and polygons, built on terra-draw."
    >
      <app-docs-section title="Installation" anchor="installation">
        <p>
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map-draw</code>
          lives in the optional
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">ng-mapcn/draw</code>
          entry point, so apps that do not draw never load
          <a class="underline" href="https://terradraw.dev">terra-draw</a>. Install it and its
          MapLibre adapter, then import from
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">ng-mapcn/draw</code>.
        </p>
        <app-code-block [code]="installCode" />
      </app-docs-section>

      <app-example-section
        title="Basic Example"
        sectionId="basic-example"
        [code]="basicCode"
        height="460px"
      >
        <span description>
          Pick a tool and click the map. Lines and polygons finish by clicking the last vertex
          again (or Enter); Escape cancels. In
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">select</code> mode drag
          a shape, drag its vertices, or press Delete to remove it.
        </span>
        <div
          after-description
          class="mb-3 flex flex-wrap items-center gap-2"
          role="toolbar"
          aria-label="Draw tools"
        >
          @for (tool of tools; track tool.mode) {
            <button
              type="button"
              class="border-border bg-background hover:bg-muted rounded-md border px-3 py-1 text-sm"
              [class.bg-primary]="mode() === tool.mode"
              [class.text-primary-foreground]="mode() === tool.mode"
              [attr.aria-pressed]="mode() === tool.mode"
              (click)="mode.set(tool.mode)"
            >
              {{ tool.label }}
            </button>
          }
          <button
            type="button"
            class="border-border bg-background hover:bg-muted rounded-md border px-3 py-1 text-sm"
            (click)="draw().clear()"
          >
            Clear
          </button>
          <button
            type="button"
            class="border-border bg-background hover:bg-muted rounded-md border px-3 py-1 text-sm"
            (click)="loadSample()"
          >
            Load zones
          </button>
          <span class="text-muted-foreground text-sm" data-testid="draw-count">
            {{ counts().polygons }} polygons, {{ counts().lines }} lines, {{ counts().points }}
            points
          </span>
        </div>
        <ng-map [center]="[-46.6333, -23.5505]" [zoom]="11">
          <ng-map-draw [(mode)]="mode" [(features)]="features" />
        </ng-map>
      </app-example-section>

      <app-example-section
        title="Preloaded features and events"
        sectionId="preloaded-features"
        [code]="preloadedCode"
        height="460px"
      >
        <span description>
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">features</code> is a
          two-way GeoJSON FeatureCollection. This geofence editor starts from one polygon in
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">select</code> mode;
          edits flow back into the model and out through
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">featureEdit</code>.
        </span>
        <p after-description class="text-muted-foreground mb-3 text-sm" data-testid="draw-last">
          Last event: {{ last()?.action ?? 'none' }} ({{ zones().features.length }} zones)
        </p>
        <ng-map [center]="[-46.6333, -23.5505]" [zoom]="12">
          <ng-map-draw
            mode="select"
            [modes]="['polygon']"
            [(features)]="zones"
            (drawEnd)="last.set($event)"
            (featureEdit)="last.set($event)"
          />
        </ng-map>
      </app-example-section>

      <app-docs-section title="Features model" anchor="features-model">
        <p>
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">features</code> is a
          GeoJSON
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">FeatureCollection</code>
          of points, lines and polygons, so it plugs straight into
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map-geojson</code>
          or your backend.
        </p>
        <app-code-block [code]="modelCode" />
      </app-docs-section>

      <app-docs-section title="Modes and editing" anchor="modes-and-editing">
        <p>
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">modes</code> lists the
          shapes the user can draw and
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">mode</code> is the
          active tool (two-way). With
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">editable</code> (the
          default) the
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">select</code> mode
          drags shapes, reshapes lines and polygons by their vertices, inserts vertices from
          midpoints and deletes vertices.
        </p>
        <app-code-block [code]="modesCode" />
      </app-docs-section>

      <app-docs-section title="Events" anchor="events">
        <app-code-block [code]="eventsCode" />
      </app-docs-section>

      <app-docs-section title="Theme and style changes" anchor="theme-and-style-changes">
        <p>
          The palette follows the resolved map theme. A theme switch replaces the map style, which
          removes terra-draw's layers, so the component stops terra-draw and starts it again on the
          new style with the same features and mode. The same restart happens when
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">modes</code> or
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">editable</code> change; a
          shape that is still being drawn is lost. Changing
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">color</code> restyles in
          place.
        </p>
        <app-code-block [code]="themeCode" />
      </app-docs-section>
    </app-docs-page>
  `,
})
export class DrawPageComponent {
  readonly installCode = INSTALL_CODE;
  readonly basicCode = BASIC_CODE;
  readonly preloadedCode = PRELOADED_CODE;
  readonly modelCode = MODEL_CODE;
  readonly eventsCode = EVENTS_CODE;
  readonly modesCode = MODES_CODE;
  readonly themeCode = THEME_CODE;

  readonly tools: readonly { mode: MapDrawMode; label: string }[] = [
    { mode: 'static', label: 'Pan' },
    { mode: 'point', label: 'Point' },
    { mode: 'line', label: 'Line' },
    { mode: 'polygon', label: 'Polygon' },
    { mode: 'select', label: 'Select' },
  ];

  readonly draw = viewChild.required(MapDrawComponent);
  readonly mode = signal<MapDrawMode>('static');
  readonly features = signal<MapDrawFeatureCollection>({
    type: 'FeatureCollection',
    features: [],
  });
  readonly counts = computed(() => {
    const features = this.features().features;
    const count = (type: string) => features.filter((f) => f.geometry.type === type).length;
    return { points: count('Point'), lines: count('LineString'), polygons: count('Polygon') };
  });

  private sampleIndex = 0;

  /** Replaces the whole model: a programmatic swap with your own ids, alternating two sets. */
  loadSample(): void {
    const square = (id: string, lng: number): MapDrawFeatureCollection['features'][number] => ({
      type: 'Feature',
      id,
      properties: { name: id },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [lng, -23.52],
            [lng + 0.03, -23.52],
            [lng + 0.03, -23.54],
            [lng, -23.54],
            [lng, -23.52],
          ],
        ],
      },
    });
    const sets = [[square('zone-1', -46.66)], [square('zone-2', -46.62), square('zone-3', -46.58)]];
    this.features.set({ type: 'FeatureCollection', features: sets[this.sampleIndex++ % 2] });
  }

  readonly last = signal<MapDrawEvent | null>(null);
  readonly zones = signal<MapDrawFeatureCollection>({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Depot' },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-46.66, -23.54],
              [-46.62, -23.54],
              [-46.62, -23.56],
              [-46.66, -23.56],
              [-46.66, -23.54],
            ],
          ],
        },
      },
    ],
  });
}
