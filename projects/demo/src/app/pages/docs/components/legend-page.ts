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
  MarkerTooltipComponent,
  type MapLegendSection,
} from 'ng-mapcn';

@Component({
  selector: 'app-legend-categories-map',
  standalone: true,
  imports: [
    MapComponent,
    MapLegendComponent,
    MapMarkerComponent,
    MarkerContentComponent,
    MarkerTooltipComponent,
  ],
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
            <ng-marker-tooltip>{{ place.name }}</ng-marker-tooltip>
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

// visitors (in thousands) per country, keyed by the feature's NAME_LONG
const VISITORS: Record<string, number> = {
  'United States': 100,
  'United Kingdom': 95,
  India: 90,
  Germany: 80,
  Canada: 70,
  Brazil: 65,
  France: 55,
  China: 45,
  Japan: 35,
  Australia: 25,
  'South Africa': 20,
};

@Component({
  selector: 'app-legend-gradient-map',
  standalone: true,
  imports: [MapComponent, MapGeoJSONComponent, MapLegendComponent],
  template: \`
    <div class="h-[420px]">
      <ng-map [blank]="true" [center]="[12, 28]" [zoom]="1.4">
        <ng-map-geojson [data]="worldUrl" [fillPaint]="fillPaint" />
        <ng-map-legend position="bottom-left" [sections]="sections" />
      </ng-map>
    </div>
  \`,
})
export class LegendGradientMapComponent {
  readonly worldUrl =
    'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@v5.1.2/geojson/ne_110m_admin_0_countries.geojson';

  // The legend only explains the colours; the map paints them. Both read the same STOPS.
  readonly fillPaint = {
    'fill-color': [
      'let',
      'visitors',
      ['match', ['get', 'NAME_LONG'], ...Object.entries(VISITORS).flat(), -1],
      [
        'case',
        ['<', ['var', 'visitors'], 0],
        '#d4d4d8', // no data
        ['interpolate', ['linear'], ['var', 'visitors'], ...STOPS.flatMap((s) => [s.value, s.color])],
      ],
    ] as never,
  };

  readonly sections: MapLegendSection[] = [
    {
      type: 'gradient',
      title: 'Visitors',
      stops: STOPS,
      format: (value) => value + 'k',
    },
  ];
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

const WORLD_GEOJSON =
  'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@v5.1.2/geojson/ne_110m_admin_0_countries.geojson';

// visitors (in thousands) per country, keyed by the feature's NAME_LONG
const VISITORS: Record<string, number> = {
  'United States': 100,
  'United Kingdom': 95,
  India: 90,
  Germany: 80,
  Canada: 70,
  Brazil: 65,
  France: 55,
  China: 45,
  Japan: 35,
  Australia: 25,
  'South Africa': 20,
};

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
          section draws a colour ramp from its stops. The first and last stops are
          always labelled; middle stops are labelled when they fit. Use
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">format</code>
          to render the values.
        </span>
        <ng-map [blank]="true" [center]="[12, 28]" [zoom]="1.4">
          <ng-map-geojson [data]="worldUrl" [fillPaint]="fillPaint" />
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
      title: 'Visitors',
      stops: GRADIENT_STOPS,
      format: (value) => `${value}k`,
    },
  ];
  readonly worldUrl = WORLD_GEOJSON;
  // Countries without data stay grey; the rest follow the same stops as the legend.
  readonly fillPaint = {
    'fill-color': [
      'let',
      'visitors',
      ['match', ['get', 'NAME_LONG'], ...Object.entries(VISITORS).flat(), -1],
      [
        'case',
        ['<', ['var', 'visitors'], 0],
        '#d4d4d8',
        [
          'interpolate',
          ['linear'],
          ['var', 'visitors'],
          ...GRADIENT_STOPS.flatMap((stop) => [stop.value, stop.color]),
        ],
      ],
    ] as never,
  };

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
