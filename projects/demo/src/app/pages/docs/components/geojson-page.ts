import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MapComponent, MapGeoJSONComponent, MapGeoJSONEvent } from 'ng-mapcn';
import { DocsImports } from '../../../shared/docs';
import { ExampleSectionComponent } from '../../../shared/example-section';

const WORLD_GEOJSON =
  'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson';

const US_STATES_GEOJSON =
  'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json';

const BASIC_CODE = `import { Component } from '@angular/core';
import { MapComponent, MapGeoJSONComponent } from 'ng-mapcn';

@Component({
  selector: 'app-basic-geojson',
  standalone: true,
  imports: [MapComponent, MapGeoJSONComponent],
  template: \`
    <div class="h-[420px]">
      <!-- world borders on a blank canvas; pass a URL or a GeoJSON object -->
      <ng-map [blank]="true" [center]="[0, 20]" [zoom]="1.2">
        <ng-map-geojson [data]="worldUrl" />
      </ng-map>
    </div>
  \`,
})
export class BasicGeojsonComponent {
  readonly worldUrl = 'https://.../ne_110m_admin_0_countries.geojson';
}`;

const OVERLAY_CODE = `import { Component, signal } from '@angular/core';
import { MapComponent, MapGeoJSONComponent, MapGeoJSONEvent } from 'ng-mapcn';

@Component({
  selector: 'app-geojson-overlay',
  standalone: true,
  imports: [MapComponent, MapGeoJSONComponent],
  template: \`
    <div class="h-[420px]">
      <ng-map [center]="[-96, 38]" [zoom]="3.3">
        <ng-map-geojson
          [data]="statesUrl"
          promoteId="name"
          [fillPaint]="{ 'fill-color': '#3b82f6', 'fill-opacity': 0.25 }"
          [linePaint]="{ 'line-color': '#3b82f6', 'line-width': 1 }"
          [fillHoverPaint]="{ 'fill-opacity': 0.55 }"
          [interactive]="true"
          (featureHover)="onHover($event)"
        />
      </ng-map>
    </div>
  \`,
})
export class GeojsonOverlayComponent {
  readonly statesUrl = 'https://.../us-states.json';
  readonly hovered = signal<string | null>(null);

  onHover(event: MapGeoJSONEvent | null): void {
    this.hovered.set(event ? String(event.feature.properties?.['name']) : null);
  }
}`;

@Component({
  selector: 'app-geojson-page',
  standalone: true,
  imports: [
    DocsImports,
    ExampleSectionComponent,
    MapComponent,
    MapGeoJSONComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-docs-page
      title="GeoJSON"
      description="Render polygons and lines from GeoJSON with declarative hover states."
    >
      <app-example-section
        title="Basic GeoJSON"
        sectionId="basic-geojson"
        [code]="basicCode"
      >
        <span description>
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map-geojson</code>
          accepts a URL or an inline GeoJSON object. On a blank basemap it uses
          theme-aware monochrome defaults — here rendering world country
          borders.
        </span>
        <ng-map [blank]="true" [center]="[0, 20]" [zoom]="1.2">
          <ng-map-geojson [data]="worldUrl" />
        </ng-map>
      </app-example-section>

      <app-example-section
        title="Overlay on a Map"
        sectionId="overlay-on-a-map"
        [code]="overlayCode"
      >
        <span description>
          Layer GeoJSON over a street basemap with custom paints. Set
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">promoteId</code>
          and a
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">fillHoverPaint</code>
          to get declarative hover highlighting via feature-state.
        </span>
        <div class="relative h-full">
          <div
            class="bg-background/95 absolute top-3 left-3 z-10 rounded-md border px-3 py-2 text-xs shadow-md"
          >
            @if (hovered(); as name) {
              <span class="font-medium">{{ name }}</span>
            } @else {
              <span class="text-muted-foreground">Hover a state</span>
            }
          </div>
          <ng-map [center]="[-96, 38]" [zoom]="3.3">
            <ng-map-geojson
              [data]="statesUrl"
              promoteId="name"
              [fillPaint]="{ 'fill-color': '#3b82f6', 'fill-opacity': 0.25 }"
              [linePaint]="{ 'line-color': '#3b82f6', 'line-width': 1 }"
              [fillHoverPaint]="{ 'fill-opacity': 0.55 }"
              [interactive]="true"
              (featureHover)="onHover($event)"
            />
          </ng-map>
        </div>
      </app-example-section>
    </app-docs-page>
  `,
})
export class GeojsonPageComponent {
  readonly basicCode = BASIC_CODE;
  readonly overlayCode = OVERLAY_CODE;
  readonly worldUrl = WORLD_GEOJSON;
  readonly statesUrl = US_STATES_GEOJSON;

  readonly hovered = signal<string | null>(null);

  onHover(event: MapGeoJSONEvent | null): void {
    this.hovered.set(
      event ? String(event.feature.properties?.['name'] ?? '') : null
    );
  }
}
