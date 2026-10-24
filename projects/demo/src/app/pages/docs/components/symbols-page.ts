import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import type { FilterSpecification } from 'maplibre-gl';
import { MapComponent, type MapSymbolImage, MapSymbolLayerComponent } from 'ng-mapcn';

import { DocsImports } from '../../../shared/docs';
import { ExampleSectionComponent } from '../../../shared/example-section';

const LABELS_CODE = `import { Component } from '@angular/core';
import { MapComponent, MapSymbolLayerComponent } from 'ng-mapcn';

// Fictional places: the basemap does not label them, so every label here comes from the layer.
const places: GeoJSON.FeatureCollection<GeoJSON.Point, { name: string; kind: string }> = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: 'Café Aurora', kind: 'cafe' }, geometry: { type: 'Point', coordinates: [-9.152, 38.727] } },
    { type: 'Feature', properties: { name: 'Torre Norte', kind: 'viewpoint' }, geometry: { type: 'Point', coordinates: [-9.143, 38.7335] } },
    // ...
  ],
};

@Component({
  selector: 'app-symbol-labels',
  standalone: true,
  imports: [MapComponent, MapSymbolLayerComponent],
  template: \`
    <ng-map [center]="[-9.14, 38.722]" [zoom]="13.5">
      <ng-map-symbol-layer
        [data]="places"
        [textField]="['get', 'name']"
        textColor="#ffffff"
        [textHaloColor]="halo"
        [textHaloWidth]="2.5"
      />
    </ng-map>
  \`,
})
export class SymbolLabelsComponent {
  readonly places = places;
  readonly halo = ['match', ['get', 'kind'],
    'cafe', '#c2410c', 'viewpoint', '#15803d', 'station', '#1d4ed8', '#334155'];
}`;

const ICONS_CODE = `import { Component } from '@angular/core';
import { MapComponent, type MapSymbolImage, MapSymbolLayerComponent } from 'ng-mapcn';

@Component({
  selector: 'app-symbol-icons',
  standalone: true,
  imports: [MapComponent, MapSymbolLayerComponent],
  template: \`
    <ng-map [center]="[-9.14, 38.722]" [zoom]="13.5">
      <ng-map-symbol-layer
        [data]="places"
        [images]="images"
        [icon]="['get', 'kind']"
        textField="{name}"
        textColor="#ffffff"
        [textHaloColor]="halo"
        [textHaloWidth]="2.5"
      />
    </ng-map>
  \`,
})
export class SymbolIconsComponent {
  // Each feature has a "kind" property; it picks the image registered under that id.
  // PNG, WebP or JPEG: SVG cannot be decoded by map.loadImage.
  readonly images: Record<string, MapSymbolImage> = {
    cafe: { url: '/pin-orange.png', pixelRatio: 4 },
    viewpoint: { url: '/pin-green.png', pixelRatio: 4 },
    station: { url: '/pin-blue.png', pixelRatio: 4 },
  };
  readonly places = places;
  readonly halo = ['match', ['get', 'kind'],
    'cafe', '#c2410c', 'viewpoint', '#15803d', 'station', '#1d4ed8', '#334155'];
}`;

const LIVE_CODE = `import { Component, signal } from '@angular/core';
import { MapComponent, MapSymbolLayerComponent } from 'ng-mapcn';

@Component({
  selector: 'app-symbol-live',
  standalone: true,
  imports: [MapComponent, MapSymbolLayerComponent],
  template: \`
    <button (click)="overlap.set(!overlap())">Allow overlap: {{ overlap() }}</button>
    <button (click)="size.set(size() === 12 ? 18 : 12)">Text size: {{ size() }}</button>
    <ng-map [center]="[-9.14, 38.722]" [zoom]="12.8">
      <ng-map-symbol-layer
        [data]="places"
        textField="{name}"
        textColor="#ffffff"
        [textHaloColor]="halo"
        [textHaloWidth]="2.5"
        [allowOverlap]="overlap()"
        [textSize]="size()"
      />
    </ng-map>
  \`,
})
export class SymbolLiveComponent {
  readonly overlap = signal(false);
  readonly size = signal(12);
  readonly places = places;
  readonly halo = ['match', ['get', 'kind'],
    'cafe', '#c2410c', 'viewpoint', '#15803d', 'station', '#1d4ed8', '#334155'];
}`;

const IMAGES_CODE = `import { Component } from '@angular/core';
import { MapComponent, type MapSymbolImage, MapSymbolLayerComponent } from 'ng-mapcn';

// A diamond signed-distance field: alpha encodes the distance to the edge (192 on it),
// which is what lets MapLibre recolor it with iconColor.
function diamondSdf(size: number, radius: number, buffer = 8): MapSymbolImage {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.abs(x + 0.5 - size / 2);
      const dy = Math.abs(y + 0.5 - size / 2);
      const distance = (dx + dy) / Math.SQRT2 - radius;
      data[(y * size + x) * 4 + 3] = Math.max(0, Math.min(255, 255 * (0.75 - distance / buffer)));
    }
  }
  return { data: { width: size, height: size, data }, sdf: true, pixelRatio: 2 };
}

// A soft pink dot, decoded pixels built in code (RGBA, straight alpha).
function pinkDot(size: number, radius: number): MapSymbolImage {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const distance = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2);
      const i = (y * size + x) * 4;
      data.set([219, 39, 119, Math.max(0, Math.min(255, 255 * (radius + 1 - distance)))], i);
    }
  }
  return { data: { width: size, height: size, data }, pixelRatio: 2 };
}

@Component({
  selector: 'app-symbol-images',
  standalone: true,
  imports: [MapComponent, MapSymbolLayerComponent],
  template: \`
    <ng-map [center]="[-9.14, 38.722]" [zoom]="13.5">
      <!-- SDF and regular images cannot share a layer: one layer each. -->
      <ng-map-symbol-layer
        [data]="places"
        [images]="images"
        [filter]="['!=', ['get', 'kind'], 'viewpoint']"
        [icon]="['match', ['get', 'kind'], 'station', 'pin', 'dot']"
        textField="{name}"
        textColor="#ffffff"
        [textHaloColor]="halo"
        [textHaloWidth]="2.5"
      />
      <ng-map-symbol-layer
        [data]="places"
        [images]="images"
        [filter]="['==', ['get', 'kind'], 'viewpoint']"
        icon="badge"
        iconColor="#7c3aed"
        textField="{name}"
        textColor="#ffffff"
        [textHaloColor]="halo"
        [textHaloWidth]="2.5"
      />
    </ng-map>
  \`,
})
export class SymbolImagesComponent {
  readonly images: Record<string, MapSymbolImage> = {
    // A URL (or { url, sdf, pixelRatio }): decoded once with map.loadImage.
    pin: { url: '/pin-blue.png', pixelRatio: 4 },
    // Decoded pixels: { data: ImageData | ImageBitmap | { width, height, data } }.
    dot: pinkDot(48, 18),
    // An SDF image: iconColor recolors it (only SDF images are recolored).
    badge: diamondSdf(64, 18),
  };
  readonly places = places;
  readonly halo = ['match', ['get', 'kind'],
    'cafe', '#c2410c', 'viewpoint', '#15803d', 'station', '#1d4ed8', '#334155'];
}
// Images are decoded once per URL and registered again after a theme switch.
// A failed image is reported through (mapError) and skipped.`;

const TEXT_CODE = `import { Component, computed, signal } from '@angular/core';
import type { FilterSpecification } from 'maplibre-gl';
import { MapComponent, MapSymbolLayerComponent } from 'ng-mapcn';

@Component({
  selector: 'app-symbol-filters',
  standalone: true,
  imports: [MapComponent, MapSymbolLayerComponent],
  template: \`
    @for (option of kinds; track option) {
      <button (click)="kind.set(option)" [attr.aria-pressed]="kind() === option">{{ option }}</button>
    }
    <ng-map [center]="[-9.14, 38.722]" [zoom]="13">
      <ng-map-symbol-layer
        [data]="places"
        textField="{name}"
        textColor="#ffffff"
        [textHaloColor]="halo"
        [textHaloWidth]="2.5"
        [textSize]="['interpolate', ['linear'], ['zoom'], 11, 9, 16, 18]"
        [filter]="filter()"
        [minZoom]="11"
        [maxZoom]="19"
      />
    </ng-map>
  \`,
})
export class SymbolFiltersComponent {
  readonly kinds = ['all', 'cafe', 'viewpoint', 'station'];
  readonly kind = signal('all');
  readonly places = places;
  readonly halo = ['match', ['get', 'kind'],
    'cafe', '#c2410c', 'viewpoint', '#15803d', 'station', '#1d4ed8', '#334155'];

  // undefined removes the filter; changing it never re-creates the layer.
  readonly filter = computed<FilterSpecification | undefined>(() =>
    this.kind() === 'all' ? undefined : ['==', ['get', 'kind'], this.kind()],
  );
}
// Text needs the style's glyphs (the default Carto basemaps have them). On the blank style
// every text option is ignored, with a console warning once.`;

const INTERACTION_CODE = `import { Component, signal } from '@angular/core';
import { MapComponent, MapSymbolLayerComponent } from 'ng-mapcn';

@Component({
  selector: 'app-symbol-interaction',
  standalone: true,
  imports: [MapComponent, MapSymbolLayerComponent],
  template: \`
    <p>Clicked: {{ clicked() ?? 'none' }}</p>
    <p>Hovered: {{ hovered() ?? 'none' }}</p>
    <ng-map [center]="[-9.14, 38.722]" [zoom]="13.5">
      <!-- Two layers on one map: the id gives each its own source and layer. -->
      <ng-map-symbol-layer
        id="cafes"
        [data]="cafes"
        textField="{name}"
        textColor="#ffffff"
        textHaloColor="#c2410c"
        [textHaloWidth]="2.5"
        [interactive]="true"
        (featureClick)="clicked.set($event.feature.properties?.name ?? null)"
        (featureHover)="hovered.set($event?.feature.properties?.name ?? null)"
      />
      <ng-map-symbol-layer
        id="viewpoints"
        [data]="viewpoints"
        textField="{name}"
        textColor="#ffffff"
        textHaloColor="#15803d"
        [textHaloWidth]="2.5"
        [interactive]="true"
        (featureClick)="clicked.set($event.feature.properties?.name ?? null)"
        (featureHover)="hovered.set($event?.feature.properties?.name ?? null)"
      />
    </ng-map>
  \`,
})
export class SymbolInteractionComponent {
  readonly clicked = signal<string | null>(null);
  readonly hovered = signal<string | null>(null);
  readonly cafes = cafes; // GeoJSON points
  readonly viewpoints = viewpoints;
}
// Ids: symbol-source-<id> and symbol-layer-<id> (auto-generated without id), so the
// layers above are symbol-layer-cafes and symbol-layer-viewpoints.`;

type Kind = 'cafe' | 'viewpoint' | 'station';

interface Poi {
  name: string;
  kind: Kind;
  coordinates: [number, number];
}

/** Fictional places in one area: the basemap does not label them. */
const POIS: readonly Poi[] = [
  { name: 'Café Aurora', kind: 'cafe', coordinates: [-9.152, 38.727] },
  { name: 'Café Brisa', kind: 'cafe', coordinates: [-9.149, 38.7255] },
  { name: 'Café Cinza', kind: 'cafe', coordinates: [-9.145, 38.7285] },
  { name: 'Café Doce', kind: 'cafe', coordinates: [-9.141, 38.7265] },
  { name: 'Café Estrela', kind: 'cafe', coordinates: [-9.137, 38.7295] },
  { name: 'Café Fénix', kind: 'cafe', coordinates: [-9.133, 38.7255] },
  { name: 'Café Girassol', kind: 'cafe', coordinates: [-9.129, 38.7275] },
  { name: 'Café Horizonte', kind: 'cafe', coordinates: [-9.126, 38.7245] },
  { name: 'Torre Norte', kind: 'viewpoint', coordinates: [-9.143, 38.7335] },
  { name: 'Torre Sul', kind: 'viewpoint', coordinates: [-9.139, 38.7105] },
  { name: 'Torre Leste', kind: 'viewpoint', coordinates: [-9.118, 38.7215] },
  { name: 'Torre Oeste', kind: 'viewpoint', coordinates: [-9.162, 38.7205] },
  { name: 'Mirador Alto', kind: 'viewpoint', coordinates: [-9.135, 38.7235] },
  { name: 'Mirador Azul', kind: 'viewpoint', coordinates: [-9.147, 38.7195] },
  { name: 'Mirador Sol', kind: 'viewpoint', coordinates: [-9.131, 38.7185] },
  { name: 'Mirador Lua', kind: 'viewpoint', coordinates: [-9.155, 38.7305] },
  { name: 'Station Alba', kind: 'station', coordinates: [-9.146, 38.7235] },
  { name: 'Station Bruma', kind: 'station', coordinates: [-9.138, 38.7225] },
  { name: 'Station Cedro', kind: 'station', coordinates: [-9.134, 38.7215] },
  { name: 'Station Delta', kind: 'station', coordinates: [-9.128, 38.7225] },
  { name: 'Station Eco', kind: 'station', coordinates: [-9.15, 38.7165] },
  { name: 'Station Faro', kind: 'station', coordinates: [-9.14, 38.7155] },
  { name: 'Station Gema', kind: 'station', coordinates: [-9.124, 38.7175] },
  { name: 'Station Haven', kind: 'station', coordinates: [-9.157, 38.7255] },
];

function toCollection(
  pois: readonly Poi[],
): GeoJSON.FeatureCollection<GeoJSON.Point, { name: string; kind: string }> {
  return {
    type: 'FeatureCollection',
    features: pois.map((p) => ({
      type: 'Feature',
      properties: { name: p.name, kind: p.kind },
      geometry: { type: 'Point', coordinates: p.coordinates },
    })),
  };
}

// A diamond signed-distance field: alpha encodes the distance to the edge (192 on it),
// which is what lets MapLibre recolor it with iconColor.
function diamondSdf(size: number, radius: number, buffer = 8): MapSymbolImage {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.abs(x + 0.5 - size / 2);
      const dy = Math.abs(y + 0.5 - size / 2);
      const distance = (dx + dy) / Math.SQRT2 - radius;
      data[(y * size + x) * 4 + 3] = Math.max(0, Math.min(255, 255 * (0.75 - distance / buffer)));
    }
  }
  return { data: { width: size, height: size, data }, sdf: true, pixelRatio: 2 };
}

// A soft pink dot, decoded pixels built in code (RGBA, straight alpha).
function pinkDot(size: number, radius: number): MapSymbolImage {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const distance = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2);
      const i = (y * size + x) * 4;
      data.set([219, 39, 119, Math.max(0, Math.min(255, 255 * (radius + 1 - distance)))], i);
    }
  }
  return { data: { width: size, height: size, data }, pixelRatio: 2 };
}

@Component({
  selector: 'app-symbols-page',
  standalone: true,
  imports: [DocsImports, ExampleSectionComponent, MapComponent, MapSymbolLayerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-docs-page
      title="Symbols"
      description="Draw icons and text labels for GeoJSON points with a collision-aware symbol layer."
    >
      <app-example-section title="Text labels" sectionId="text-labels" [code]="labelsCode">
        <span description>
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm"
            >ng-map-symbol-layer</code
          >
          renders a GeoJSON point source as a MapLibre symbol layer. Set
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">textField</code> to a
          property expression or a
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">{{ '{name}' }}</code>
          template. The places in these examples are fictional, so every label you see on the map
          comes from the layer, not from the basemap. Labels collide by default, so crowded ones
          thin out as you zoom out.
        </span>
        <ng-map [center]="[-9.14, 38.722]" [zoom]="13.5">
          <ng-map-symbol-layer
            [data]="places"
            [textField]="['get', 'name']"
            textColor="#ffffff"
            [textHaloColor]="halo"
            [textHaloWidth]="2.5"
          />
        </ng-map>
      </app-example-section>

      <app-example-section title="Icons" sectionId="icons" [code]="iconsCode">
        <span description>
          Register images by id with
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">images</code> and pick
          one per feature with
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">icon</code>, here the
          expression
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">['get', 'kind']</code>:
          orange pins are cafés, green pins viewpoints and blue pins stations. The label sits below
          the icon by default. The images survive theme switches.
        </span>
        <ng-map [center]="[-9.14, 38.722]" [zoom]="13.5">
          <ng-map-symbol-layer
            [data]="places"
            [images]="images"
            [icon]="['get', 'kind']"
            textField="{name}"
            textColor="#ffffff"
            [textHaloColor]="halo"
            [textHaloWidth]="2.5"
          />
        </ng-map>
      </app-example-section>

      <app-example-section title="Live options" sectionId="live-options" [code]="liveCode">
        <span description>
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">allowOverlap</code>
          and
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">textSize</code> are
          applied with diffed setters, so toggling them never re-creates the layer. The labels are
          packed on purpose: with overlap off, colliding ones are dropped.
        </span>
        <div after-description class="mb-3 flex gap-2">
          <button
            type="button"
            class="border-border bg-background hover:bg-muted rounded-md border px-3 py-1 text-sm"
            data-testid="toggle-overlap"
            (click)="overlap.set(!overlap())"
          >
            Allow overlap: {{ overlap() }}
          </button>
          <button
            type="button"
            class="border-border bg-background hover:bg-muted rounded-md border px-3 py-1 text-sm"
            data-testid="toggle-size"
            (click)="size.set(size() === 12 ? 18 : 12)"
          >
            Text size: {{ size() }}
          </button>
        </div>
        <ng-map [center]="[-9.14, 38.722]" [zoom]="12.8">
          <ng-map-symbol-layer
            [data]="places"
            textField="{name}"
            textColor="#ffffff"
            [textHaloColor]="halo"
            [textHaloWidth]="2.5"
            [allowOverlap]="overlap()"
            [textSize]="size()"
          />
        </ng-map>
      </app-example-section>

      <app-example-section title="Images" sectionId="images" [code]="imagesCode">
        <span description>
          An image is a URL (PNG, WebP or JPEG; SVG cannot be decoded), a URL with
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">sdf</code> or
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">pixelRatio</code>, or
          already decoded pixels. This map uses all three forms: the blue pin is a URL, the pink dot
          is raw pixels built in code, and the diamond is an SDF image that
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">iconColor</code>
          recolors to purple (only SDF images are recolored, and SDF and regular images cannot share a layer, so there is one layer for each). Changing
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">images</code> adds,
          swaps or removes only the images this component added, without re-creating the layer.
        </span>
        <ng-map [center]="[-9.14, 38.722]" [zoom]="13.5">
          <ng-map-symbol-layer
            [data]="places"
            [images]="sampleImages"
            [filter]="['!=', ['get', 'kind'], 'viewpoint']"
            [icon]="['match', ['get', 'kind'], 'station', 'pin', 'dot']"
            textField="{name}"
            textColor="#ffffff"
            [textHaloColor]="halo"
            [textHaloWidth]="2.5"
          />
          <ng-map-symbol-layer
            [data]="places"
            [images]="sampleImages"
            [filter]="['==', ['get', 'kind'], 'viewpoint']"
            icon="badge"
            iconColor="#7c3aed"
            textField="{name}"
            textColor="#ffffff"
            [textHaloColor]="halo"
            [textHaloWidth]="2.5"
          />
        </ng-map>
      </app-example-section>

      <app-example-section
        title="Text, filters and zoom"
        sectionId="text-filters-and-zoom"
        [code]="textCode"
      >
        <span description>
          Text options are reconciled live, and the default colors follow the map theme.
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">filter</code>,
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">minZoom</code> and
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">maxZoom</code> work like
          on the other layer components. Here the text size is interpolated over the zoom level and
          the buttons switch the filter.
        </span>
        <div after-description class="mb-3 flex flex-wrap items-center gap-2">
          <div class="flex gap-1" role="group" aria-label="Filter by kind">
            @for (option of kinds; track option) {
              <button
                type="button"
                class="border-border hover:bg-muted rounded-md border px-3 py-1 text-sm"
                [class.bg-muted]="kind() === option"
                [class.font-semibold]="kind() === option"
                [class.bg-background]="kind() !== option"
                [attr.aria-pressed]="kind() === option"
                [attr.data-testid]="'filter-' + option"
                (click)="kind.set(option)"
              >
                {{ option }}
              </button>
            }
          </div>
          <span class="text-muted-foreground text-sm">
            Zoom in to grow the labels and reveal more of them; below zoom 11 the layer hides
            (minZoom).
          </span>
        </div>
        <ng-map [center]="[-9.14, 38.722]" [zoom]="13">
          <ng-map-symbol-layer
            [data]="places"
            textField="{name}"
            textColor="#ffffff"
            [textHaloColor]="halo"
            [textHaloWidth]="2.5"
            [textSize]="textSize"
            [filter]="filter()"
            [minZoom]="11"
            [maxZoom]="19"
          />
        </ng-map>
      </app-example-section>

      <app-example-section
        title="Interaction and ids"
        sectionId="interaction-and-ids"
        [code]="interactionCode"
      >
        <span description>
          Set <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">interactive</code>
          to receive
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">featureClick</code> and
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">featureHover</code>
          events. The pointer turns into a hand over a symbol. Two layers share this map, each with
          its own
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">id</code>: the source
          and layer ids are
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">symbol-source-&lt;id&gt;</code>
          and
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">symbol-layer-&lt;id&gt;</code>.
        </span>
        <div after-description class="mb-3 grid gap-1 text-sm">
          <p data-testid="clicked">
            <span class="text-muted-foreground">Clicked:</span> {{ clicked() ?? 'none' }}
          </p>
          <p data-testid="hovered">
            <span class="text-muted-foreground">Hovered:</span> {{ hovered() ?? 'none' }}
          </p>
        </div>
        <ng-map [center]="[-9.14, 38.722]" [zoom]="13.5">
          <ng-map-symbol-layer
            id="cafes"
            [data]="cafes"
            textField="{name}"
            textColor="#ffffff"
            textHaloColor="#c2410c"
            [textHaloWidth]="2.5"
            [interactive]="true"
            (featureClick)="clicked.set($event.feature.properties?.name ?? null)"
            (featureHover)="hovered.set($event?.feature.properties?.name ?? null)"
          />
          <ng-map-symbol-layer
            id="viewpoints"
            [data]="viewpoints"
            textField="{name}"
            textColor="#ffffff"
            textHaloColor="#15803d"
            [textHaloWidth]="2.5"
            [interactive]="true"
            (featureClick)="clicked.set($event.feature.properties?.name ?? null)"
            (featureHover)="hovered.set($event?.feature.properties?.name ?? null)"
          />
        </ng-map>
      </app-example-section>
    </app-docs-page>
  `,
})
export class SymbolsPageComponent {
  readonly labelsCode = LABELS_CODE;
  readonly iconsCode = ICONS_CODE;
  readonly liveCode = LIVE_CODE;
  readonly imagesCode = IMAGES_CODE;
  readonly textCode = TEXT_CODE;
  readonly interactionCode = INTERACTION_CODE;

  /** Halo colored by kind; white text on top reads on light and dark basemaps. */
  readonly halo = [
    'match',
    ['get', 'kind'],
    'cafe',
    '#c2410c',
    'viewpoint',
    '#15803d',
    'station',
    '#1d4ed8',
    '#334155',
  ];

  /** Local PNGs from /public: remote images are blocked in the e2e run. */
  readonly images: Record<string, MapSymbolImage> = {
    cafe: { url: '/pin-orange.png', pixelRatio: 4 },
    viewpoint: { url: '/pin-green.png', pixelRatio: 4 },
    station: { url: '/pin-blue.png', pixelRatio: 4 },
  };

  /** One image per form: a URL, decoded pixels and an SDF image. */
  readonly sampleImages: Record<string, MapSymbolImage> = {
    pin: { url: '/pin-blue.png', pixelRatio: 4 },
    dot: pinkDot(48, 18),
    badge: diamondSdf(64, 18),
  };

  readonly overlap = signal(false);
  readonly size = signal(12);

  readonly kinds = ['all', 'cafe', 'viewpoint', 'station'];
  readonly kind = signal('all');
  readonly textSize = ['interpolate', ['linear'], ['zoom'], 11, 9, 16, 18];
  readonly filter = computed<FilterSpecification | undefined>(() =>
    this.kind() === 'all' ? undefined : ['==', ['get', 'kind'], this.kind()],
  );

  readonly clicked = signal<string | null>(null);
  readonly hovered = signal<string | null>(null);

  readonly places = toCollection(POIS);
  readonly cafes = toCollection(POIS.filter((p) => p.kind === 'cafe'));
  readonly viewpoints = toCollection(POIS.filter((p) => p.kind === 'viewpoint'));
}
