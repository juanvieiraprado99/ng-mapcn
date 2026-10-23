import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  MapComponent,
  MapGeoJSONComponent,
  MapLegendComponent,
  type MapLegendSection,
  MapMarkerComponent,
  MapRouteComponent,
  MarkerContentComponent,
  MarkerTooltipComponent,
} from 'ng-mapcn';

import { DocsImports } from '../../../shared/docs';
import { ExampleSectionComponent } from '../../../shared/example-section';

const CATEGORIES_CODE = `import { Component } from '@angular/core';
import {
  MapComponent,
  MapLegendComponent,
  MapMarkerComponent,
  MarkerContentComponent,
  type MapLegendSection,
} from 'ng-mapcn';

@Component({
  selector: 'app-legend-categories-map',
  standalone: true,
  imports: [MapComponent, MapLegendComponent, MapMarkerComponent, MarkerContentComponent],
  template: \`
    <div class="h-[420px]">
      <ng-map [center]="[2.3522, 48.8566]" [zoom]="11.5">
        @for (place of places; track place.name) {
          <ng-map-marker [longitude]="place.lng" [latitude]="place.lat">
            <ng-marker-content>
              <span
                class="block size-4 rounded-full border-2 border-white shadow"
                [style.background-color]="place.color"
              ></span>
            </ng-marker-content>
          </ng-map-marker>
        }
        <ng-map-legend title="Places" [sections]="sections" />
      </ng-map>
    </div>
  \`,
})
export class LegendCategoriesMapComponent {
  // keep the sections array stable: define it once, not inline in the template
  readonly sections: MapLegendSection[] = [
    {
      type: 'categories',
      entries: [
        { color: '#ef4444', label: 'Museum' },
        { color: '#3b82f6', label: 'Park' },
        { color: '#22c55e', label: 'Market', shape: 'square' },
      ],
    },
  ];
  readonly places = [
    { name: 'Louvre', lng: 2.3376, lat: 48.8606, color: '#ef4444' },
    { name: 'Orsay', lng: 2.3266, lat: 48.86, color: '#ef4444' },
    { name: 'Luxembourg', lng: 2.3372, lat: 48.8462, color: '#3b82f6' },
    { name: 'Buttes-Chaumont', lng: 2.3828, lat: 48.8809, color: '#3b82f6' },
    { name: 'Bastille Market', lng: 2.3691, lat: 48.8533, color: '#22c55e' },
  ];
}`;

const GRADIENT_CODE = `import { Component } from '@angular/core';
import {
  MapComponent,
  MapGeoJSONComponent,
  MapLegendComponent,
  type MapLegendSection,
} from 'ng-mapcn';

const STOPS = [
  { color: '#fef3c7', value: 0 },
  { color: '#fcd34d', value: 25 },
  { color: '#f59e0b', value: 50 },
  { color: '#dc2626', value: 75 },
  { color: '#7f1d1d', value: 100 },
];

@Component({
  selector: 'app-legend-gradient-map',
  standalone: true,
  imports: [MapComponent, MapGeoJSONComponent, MapLegendComponent],
  template: \`
    <div class="h-[420px]">
      <ng-map [blank]="true" [center]="[0, 0]" [zoom]="3.2">
        @for (cell of cells; track cell.id) {
          <ng-map-geojson
            [id]="cell.id"
            [data]="cell.data"
            [fillPaint]="{ 'fill-color': cell.color, 'fill-opacity': 0.85 }"
            [linePaint]="false"
          />
        }
        <ng-map-legend position="bottom-left" [sections]="sections" />
      </ng-map>
    </div>
  \`,
})
export class LegendGradientMapComponent {
  readonly sections: MapLegendSection[] = [
    {
      type: 'gradient',
      title: 'Population density',
      stops: STOPS,
      format: (value) => value + ' / km²',
    },
  ];
  // one square per stop; square(i) returns a GeoJSON polygon west of the next one
  readonly cells = STOPS.map((stop, index) => ({
    id: 'legend-cell-' + index,
    color: stop.color,
    data: square(index),
  }));
}`;

const COLLAPSIBLE_CODE = `import { Component, signal } from '@angular/core';
import {
  MapComponent,
  MapLegendComponent,
  MapRouteComponent,
  type MapLegendSection,
} from 'ng-mapcn';

@Component({
  selector: 'app-legend-collapsible-map',
  standalone: true,
  imports: [MapComponent, MapLegendComponent, MapRouteComponent],
  template: \`
    <div class="h-[420px]">
      <ng-map [center]="[-0.12, 51.5]" [zoom]="11">
        <ng-map-route [coordinates]="route" color="#4285F4" />
        <!-- projected content renders below the sections -->
        <ng-map-legend
          title="Route"
          [collapsible]="true"
          [(collapsed)]="collapsed"
          [sections]="sections"
        >
          <p class="mt-2 text-xs">Length: 12.4 km</p>
          <button type="button" class="mt-1 text-xs underline" (click)="note.set('Thanks, reported.')">
            Report a problem
          </button>
          @if (note()) {
            <p class="text-xs">{{ note() }}</p>
          }
        </ng-map-legend>
      </ng-map>
    </div>
  \`,
})
export class LegendCollapsibleMapComponent {
  readonly collapsed = signal(false);
  readonly note = signal('');
  readonly sections: MapLegendSection[] = [
    { type: 'categories', entries: [{ color: '#4285F4', label: 'Cycle route', shape: 'line' }] },
  ];
  readonly route: [number, number][] = [
    [-0.19, 51.49],
    [-0.14, 51.51],
    [-0.09, 51.51],
    [-0.05, 51.52],
  ];
}`;

const GRADIENT_STOPS = [
  { color: '#fef3c7', value: 0 },
  { color: '#fcd34d', value: 25 },
  { color: '#f59e0b', value: 50 },
  { color: '#dc2626', value: 75 },
  { color: '#7f1d1d', value: 100 },
];

function square(index: number): GeoJSON.Feature<GeoJSON.Polygon> {
  const west = -4 + index * 1.6;
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [west, -1],
          [west + 1.5, -1],
          [west + 1.5, 1],
          [west, 1],
          [west, -1],
        ],
      ],
    },
  };
}

@Component({
  selector: 'app-legend-page',
  standalone: true,
  imports: [
    DocsImports,
    ExampleSectionComponent,
    MapComponent,
    MapGeoJSONComponent,
    MapLegendComponent,
    MapMarkerComponent,
    MapRouteComponent,
    MarkerContentComponent,
    MarkerTooltipComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-docs-page
      title="Legend"
      description="Explain what the colours and symbols on your map mean, with category swatches, gradients and your own content."
    >
      <app-example-section
        title="Categories"
        sectionId="categories"
        [code]="categoriesCode"
      >
        <span description>
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map-legend</code>
          renders a card from
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">sections</code>.
          A
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">categories</code>
          section lists swatches (circle, square or line) with labels. It sits
          top-left by default.
        </span>
        <ng-map [center]="[2.3522, 48.8566]" [zoom]="11.5">
          @for (place of places; track place.name) {
            <ng-map-marker [longitude]="place.lng" [latitude]="place.lat">
              <ng-marker-content>
                <span
                  class="block size-4 rounded-full border-2 border-white shadow"
                  [style.background-color]="place.color"
                ></span>
              </ng-marker-content>
              <ng-marker-tooltip>{{ place.name }}</ng-marker-tooltip>
            </ng-map-marker>
          }
          <ng-map-legend title="Places" [sections]="categorySections" />
        </ng-map>
      </app-example-section>

      <app-example-section
        title="Gradient"
        sectionId="gradient"
        [code]="gradientCode"
      >
        <span description>
          A
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">gradient</code>
          section draws a colour ramp from its stops. Every stop is labelled up
          to five stops; use
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">format</code>
          to render the values.
        </span>
        <ng-map [blank]="true" [center]="[0, 0]" [zoom]="3.2">
          @for (cell of cells; track cell.id) {
            <ng-map-geojson
              [id]="cell.id"
              [data]="cell.data"
              [fillPaint]="{ 'fill-color': cell.color, 'fill-opacity': 0.85 }"
              [linePaint]="false"
            />
          }
          <ng-map-legend position="bottom-left" [sections]="gradientSections" />
        </ng-map>
      </app-example-section>

      <app-example-section
        title="Collapsible with custom content"
        sectionId="collapsible"
        [code]="collapsibleCode"
      >
        <span description>
          Set
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">collapsible</code>
          to add a header button; bind
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">[(collapsed)]</code>
          to control it. Anything you project into the legend renders below its
          sections.
        </span>
        <ng-map [center]="[-0.12, 51.5]" [zoom]="11">
          <ng-map-route [coordinates]="route" color="#4285F4" />
          <ng-map-legend
            title="Route"
            [collapsible]="true"
            [(collapsed)]="collapsed"
            [sections]="routeSections"
          >
            <p class="mt-2 text-xs">Length: 12.4 km</p>
            <button
              type="button"
              class="mt-1 text-xs underline"
              (click)="note.set('Thanks, reported.')"
            >
              Report a problem
            </button>
            @if (note()) {
              <p class="text-xs">{{ note() }}</p>
            }
          </ng-map-legend>
        </ng-map>
      </app-example-section>
    </app-docs-page>
  `,
})
export class LegendPageComponent {
  readonly categoriesCode = CATEGORIES_CODE;
  readonly gradientCode = GRADIENT_CODE;
  readonly collapsibleCode = COLLAPSIBLE_CODE;

  // Stable references: defined once, not inline in the template.
  readonly categorySections: MapLegendSection[] = [
    {
      type: 'categories',
      entries: [
        { color: '#ef4444', label: 'Museum' },
        { color: '#3b82f6', label: 'Park' },
        { color: '#22c55e', label: 'Market', shape: 'square' },
      ],
    },
  ];
  readonly places = [
    { name: 'Louvre', lng: 2.3376, lat: 48.8606, color: '#ef4444' },
    { name: 'Orsay', lng: 2.3266, lat: 48.86, color: '#ef4444' },
    { name: 'Luxembourg', lng: 2.3372, lat: 48.8462, color: '#3b82f6' },
    { name: 'Buttes-Chaumont', lng: 2.3828, lat: 48.8809, color: '#3b82f6' },
    { name: 'Bastille Market', lng: 2.3691, lat: 48.8533, color: '#22c55e' },
  ];

  readonly gradientSections: MapLegendSection[] = [
    {
      type: 'gradient',
      title: 'Population density',
      stops: GRADIENT_STOPS,
      format: (value) => `${value} / km²`,
    },
  ];
  readonly cells = GRADIENT_STOPS.map((stop, index) => ({
    id: `legend-cell-${index}`,
    color: stop.color,
    data: square(index),
  }));

  readonly collapsed = signal(false);
  readonly note = signal('');
  readonly routeSections: MapLegendSection[] = [
    {
      type: 'categories',
      entries: [{ color: '#4285F4', label: 'Cycle route', shape: 'line' }],
    },
  ];
  readonly route: [number, number][] = [
    [-0.19, 51.49],
    [-0.14, 51.51],
    [-0.09, 51.51],
    [-0.05, 51.52],
  ];
}
