import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MapComponent, type MapSymbolImage, MapSymbolLayerComponent } from 'ng-mapcn';

import { CodeBlockComponent } from '../../../shared/code-block';
import { DocsImports } from '../../../shared/docs';
import { ExampleSectionComponent } from '../../../shared/example-section';

const LABELS_CODE = `import { Component } from '@angular/core';
import { MapComponent, MapSymbolLayerComponent } from 'ng-mapcn';

const cities: GeoJSON.FeatureCollection<GeoJSON.Point, { name: string }> = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: 'Florence' }, geometry: { type: 'Point', coordinates: [11.2558, 43.7696] } },
    { type: 'Feature', properties: { name: 'Rome' }, geometry: { type: 'Point', coordinates: [12.4964, 41.9028] } },
    // ...
  ],
};

@Component({
  selector: 'app-symbol-labels',
  standalone: true,
  imports: [MapComponent, MapSymbolLayerComponent],
  template: \`
    <ng-map [center]="[12, 43]" [zoom]="5">
      <ng-map-symbol-layer [data]="cities" [textField]="['get', 'name']" />
    </ng-map>
  \`,
})
export class SymbolLabelsComponent {
  readonly cities = cities;
}`;

const ICONS_CODE = `import { Component } from '@angular/core';
import { MapComponent, type MapSymbolImage, MapSymbolLayerComponent } from 'ng-mapcn';

@Component({
  selector: 'app-symbol-icons',
  standalone: true,
  imports: [MapComponent, MapSymbolLayerComponent],
  template: \`
    <ng-map [center]="[12, 43]" [zoom]="5">
      <ng-map-symbol-layer
        [data]="places"
        [images]="images"
        [icon]="['get', 'kind']"
        textField="{name}"
      />
    </ng-map>
  \`,
})
export class SymbolIconsComponent {
  // Each feature has a "kind" property; it picks the image registered under that id.
  // PNG, WebP or JPEG: SVG cannot be decoded by map.loadImage.
  readonly images: Record<string, MapSymbolImage> = {
    pin: { url: '/my_location.png', pixelRatio: 16 },
    compass: { url: '/compass.png', pixelRatio: 16 },
    locate: { url: '/locateme.png', pixelRatio: 6 },
  };
  readonly places = places;
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
    <ng-map [center]="[11.4, 43.5]" [zoom]="6">
      <ng-map-symbol-layer
        [data]="cities"
        textField="{name}"
        [allowOverlap]="overlap()"
        [textSize]="size()"
      />
    </ng-map>
  \`,
})
export class SymbolLiveComponent {
  readonly overlap = signal(false);
  readonly size = signal(12);
  readonly cities = cities;
}`;

const IMAGES_CODE = `// A URL, a URL with options, or decoded pixels.
readonly images: Record<string, MapSymbolImage> = {
  pin: '/pin.png',
  sdf: { url: '/marker-sdf.png', sdf: true, pixelRatio: 2 },
  generated: { data: new ImageData(new Uint8ClampedArray(16 * 16 * 4), 16, 16) },
};

// <ng-map-symbol-layer [data]="places" [images]="images" icon="pin" iconColor="#ef4444" />
// iconColor only recolors SDF images. Images are decoded once per URL and registered again
// after a theme switch. A failed image is reported through (mapError) and skipped.`;

const TEXT_CODE = `<!-- Text needs the style's glyphs: the default Carto basemaps have them. -->
<ng-map-symbol-layer
  [data]="places"
  textField="{name}"
  [textSize]="['interpolate', ['linear'], ['zoom'], 4, 11, 10, 16]"
  textColor="#0f766e"
  textHaloColor="#ffffff"
  [filter]="['==', ['get', 'kind'], 'pin']"
  [minZoom]="3"
/>

<!-- On the blank style (no glyphs) every text option is ignored, with a console warning once. -->`;

const INTERACTION_CODE = `<ng-map-symbol-layer
  [data]="places"
  textField="{name}"
  [interactive]="true"
  (featureClick)="selected.set($event.feature.properties?.name ?? null)"
  (featureHover)="hovered.set($event?.feature.properties?.name ?? null)"
/>

// Ids: symbol-source-<id> and symbol-layer-<id> (auto-generated without id).`;

interface City {
  name: string;
  kind: 'pin' | 'compass' | 'locate';
  coordinates: [number, number];
}

const CITIES: readonly City[] = [
  { name: 'Florence', kind: 'pin', coordinates: [11.2558, 43.7696] },
  { name: 'Rome', kind: 'compass', coordinates: [12.4964, 41.9028] },
  { name: 'Milan', kind: 'locate', coordinates: [9.19, 45.4642] },
  { name: 'Naples', kind: 'pin', coordinates: [14.2681, 40.8518] },
  { name: 'Venice', kind: 'compass', coordinates: [12.3155, 45.4408] },
  { name: 'Turin', kind: 'locate', coordinates: [7.6869, 45.0703] },
  { name: 'Bologna', kind: 'pin', coordinates: [11.3426, 44.4949] },
  { name: 'Pisa', kind: 'compass', coordinates: [10.4017, 43.7228] },
  { name: 'Siena', kind: 'locate', coordinates: [11.3308, 43.3188] },
  { name: 'Arezzo', kind: 'pin', coordinates: [11.8798, 43.4631] },
  { name: 'Lucca', kind: 'compass', coordinates: [10.5027, 43.8429] },
  { name: 'Prato', kind: 'locate', coordinates: [11.0997, 43.8777] },
];

function toCollection(
  cities: readonly City[],
): GeoJSON.FeatureCollection<GeoJSON.Point, { name: string; kind: string }> {
  return {
    type: 'FeatureCollection',
    features: cities.map((c) => ({
      type: 'Feature',
      properties: { name: c.name, kind: c.kind },
      geometry: { type: 'Point', coordinates: c.coordinates },
    })),
  };
}

@Component({
  selector: 'app-symbols-page',
  standalone: true,
  imports: [
    DocsImports,
    CodeBlockComponent,
    ExampleSectionComponent,
    MapComponent,
    MapSymbolLayerComponent,
  ],
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
          template. Labels collide by default, so crowded ones thin out as you zoom out.
        </span>
        <ng-map [center]="[12, 43]" [zoom]="5">
          <ng-map-symbol-layer [data]="cities" [textField]="['get', 'name']" />
        </ng-map>
      </app-example-section>

      <app-example-section title="Icons" sectionId="icons" [code]="iconsCode">
        <span description>
          Register images by id with
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">images</code> and pick
          one per feature with
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm"
            >icon</code
          >, here the expression
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">['get', 'kind']</code>.
          The label sits below the icon by default. The images survive theme switches.
        </span>
        <ng-map [center]="[12, 43]" [zoom]="5">
          <ng-map-symbol-layer
            [data]="places"
            [images]="images"
            [icon]="['get', 'kind']"
            textField="{name}"
          />
        </ng-map>
      </app-example-section>

      <app-example-section title="Live options" sectionId="live-options" [code]="liveCode">
        <span description>
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">allowOverlap</code>
          and
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">textSize</code> are
          applied with diffed setters, so toggling them never re-creates the layer.
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
        <ng-map [center]="[11.4, 43.5]" [zoom]="6">
          <ng-map-symbol-layer
            [data]="cities"
            textField="{name}"
            [allowOverlap]="overlap()"
            [textSize]="size()"
          />
        </ng-map>
      </app-example-section>

      <app-docs-section title="Images" anchor="images">
        <p>
          An image is a URL (PNG, WebP or JPEG; SVG cannot be decoded), a URL with
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">sdf</code> or
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">pixelRatio</code>, or
          already decoded pixels. Changing
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">images</code> adds,
          swaps or removes only the images this component added, without re-creating the layer.
        </p>
        <app-code-block [code]="imagesCode" />
      </app-docs-section>

      <app-docs-section title="Text, filters and zoom" anchor="text-filters-and-zoom">
        <p>
          Text options are reconciled live, and the default colors follow the map theme.
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">filter</code>,
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">minZoom</code> and
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">maxZoom</code> work like
          on the other layer components.
        </p>
        <app-code-block [code]="textCode" />
      </app-docs-section>

      <app-docs-section title="Interaction and ids" anchor="interaction-and-ids">
        <p>
          Set <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">interactive</code>
          to receive
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">featureClick</code> and
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">featureHover</code>
          events. The pointer turns into a hand over a symbol.
        </p>
        <app-code-block [code]="interactionCode" />
      </app-docs-section>
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

  /** Local PNGs from /public: remote images are blocked in the e2e run. */
  readonly images: Record<string, MapSymbolImage> = {
    pin: { url: '/my_location.png', pixelRatio: 16 },
    compass: { url: '/compass.png', pixelRatio: 16 },
    locate: { url: '/locateme.png', pixelRatio: 6 },
  };

  readonly overlap = signal(false);
  readonly size = signal(12);

  readonly cities = toCollection(CITIES);
  readonly places = toCollection(CITIES.slice(0, 6));
}
