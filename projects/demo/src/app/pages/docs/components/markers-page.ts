import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  MapComponent,
  MapMarkerComponent,
  MapPopupComponent,
  MarkerContentComponent,
  MarkerLabelComponent,
  MarkerTooltipComponent,
} from 'ng-mapcn';

import { ZardButtonComponent } from '@/shared/components/button';

import { DocsImports } from '../../../shared/docs';
import { ExampleSectionComponent } from '../../../shared/example-section';

const BASIC_CODE = `import { Component } from '@angular/core';
import {
  MapComponent,
  MapMarkerComponent,
  MarkerContentComponent,
  MarkerLabelComponent,
  MarkerTooltipComponent,
} from 'ng-mapcn';

@Component({
  selector: 'app-markers-map',
  standalone: true,
  imports: [
    MapComponent,
    MapMarkerComponent,
    MarkerContentComponent,
    MarkerLabelComponent,
    MarkerTooltipComponent,
  ],
  template: \`
    <div class="h-[420px]">
      <ng-map [center]="[139.6917, 35.6895]" [zoom]="10">
        @for (place of places; track place.name) {
          <ng-map-marker [longitude]="place.lng" [latitude]="place.lat">
            <ng-marker-content>
              <!-- empty = default blue dot; or project your own element -->
            </ng-marker-content>
            <ng-marker-tooltip>{{ place.name }}</ng-marker-tooltip>
          </ng-map-marker>
        }
      </ng-map>
    </div>
  \`,
})
export class MarkersMapComponent {
  readonly places = [
    { name: 'Shibuya', lng: 139.7016, lat: 35.658 },
    { name: 'Shinjuku', lng: 139.7036, lat: 35.6938 },
    { name: 'Asakusa', lng: 139.7967, lat: 35.7118 },
  ];
}`;

const POPUP_CODE = `// A single ng-map-popup driven by a signal → only one open at a time.
// mapClick clears it (clicking a marker doesn't fire the map click).
selected = signal<RichPlace | null>(null);

selectPlace(place: RichPlace, event: MouseEvent) {
  event.stopPropagation(); // don't let it bubble to mapClick
  this.selected.set(this.selected()?.name === place.name ? null : place);
}

// template
<ng-map [center]="[-73.98, 40.74]" [zoom]="11" (mapClick)="selected.set(null)">
  @for (place of places; track place.name) {
    <ng-map-marker
      [longitude]="place.lng"
      [latitude]="place.lat"
      (markerClick)="selectPlace(place, $event)"
    >
      <ng-marker-content>
        <!-- a real <button>: focusable, and Enter/Space fire the same click as the mouse -->
        <button type="button" [attr.aria-label]="place.name" class="size-5 cursor-pointer rounded-full border-2 border-white bg-rose-500 shadow-lg transition-transform hover:scale-110"></button>
        <ng-marker-label position="bottom">{{ place.label }}</ng-marker-label>
      </ng-marker-content>
    </ng-map-marker>
  }

  @if (selected(); as place) {
    <ng-map-popup
      [longitude]="place.lng"
      [latitude]="place.lat"
      (popupClose)="selected.set(null)"
    >
      <!-- .demo-rich-popup lets the popup card go edge-to-edge (padding: 0) -->
      <div class="demo-rich-popup w-[15.5rem]">
        <img [src]="place.image" [alt]="place.name" class="h-32 w-full object-cover" />
        <div class="space-y-2 p-3">
          <p class="text-muted-foreground text-[11px] uppercase tracking-wide">{{ place.category }}</p>
          <h3 class="font-semibold leading-tight">{{ place.name }}</h3>
          <!-- rating · hours · Directions / link buttons -->
        </div>
      </div>
    </ng-map-popup>
  }
</ng-map>`;

const DRAGGABLE_CODE = `import { Component, signal } from '@angular/core';
import {
  MapComponent,
  MapMarkerComponent,
  MarkerContentComponent,
} from 'ng-mapcn';

@Component({
  selector: 'app-draggable-marker',
  standalone: true,
  imports: [MapComponent, MapMarkerComponent, MarkerContentComponent],
  template: \`
    <div class="h-[420px]">
      <ng-map [center]="[-3.7038, 40.4168]" [zoom]="12">
        <ng-map-marker
          [longitude]="-3.7038"
          [latitude]="40.4168"
          [draggable]="true"
          (dragEnd)="position.set($event)"
        >
          <ng-marker-content>
            <div class="size-4 cursor-grab rounded-full border-2 border-white bg-blue-500 shadow-lg"></div>
          </ng-marker-content>
        </ng-map-marker>
      </ng-map>
    </div>
  \`,
})
export class DraggableMarkerComponent {
  readonly position = signal({ lng: -3.7038, lat: 40.4168 });
}`;

@Component({
  selector: 'app-markers-page',
  standalone: true,
  imports: [
    DocsImports,
    ExampleSectionComponent,
    MapComponent,
    MapMarkerComponent,
    MapPopupComponent,
    MarkerContentComponent,
    MarkerLabelComponent,
    MarkerTooltipComponent,
    DecimalPipe,
    ZardButtonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-docs-page
      title="Markers"
      description="Add markers with custom content, labels, tooltips, and popups."
    >
      <app-example-section
        title="Basic Example"
        sectionId="basic-example"
        [code]="basicCode"
      >
        <span description>
          Place markers with
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map-marker</code>.
          Project any HTML into
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-marker-content</code>
          — leave it empty for the default dot. Add
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-marker-tooltip</code>
          for hover tooltips and
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-marker-label</code>
          for always-visible labels.
        </span>
        <ng-map [center]="[139.735, 35.69]" [zoom]="10.5">
          @for (place of places; track place.name) {
            <ng-map-marker [longitude]="place.lng" [latitude]="place.lat">
              <ng-marker-content>
                <div
                  class="size-3.5 rounded-full border-2 border-white bg-blue-500 shadow-lg"
                ></div>
                <ng-marker-label position="top">{{ place.name }}</ng-marker-label>
              </ng-marker-content>
              <ng-marker-tooltip>{{ place.description }}</ng-marker-tooltip>
            </ng-map-marker>
          }
        </ng-map>
      </app-example-section>

      <app-example-section
        title="Rich Popups"
        sectionId="rich-popups"
        [code]="popupCode"
      >
        <span description>
          Attach a popup with
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-marker-popup</code>.
          It opens when the marker is clicked and can contain any projected
          HTML — here with images, ratings, and action buttons. Only one is
          open at a time; clicking the map closes it.
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-marker-popup</code>
          also takes <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">[closeButton]</code>,
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">offset</code>,
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">anchor</code>,
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">maxWidth</code> and
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">closeOnClick</code>.
        </span>
        <ng-map [center]="[-73.98, 40.74]" [zoom]="11" (mapClick)="selected.set(null)">
          @for (place of richPlaces; track place.name) {
            <ng-map-marker
              [longitude]="place.lng"
              [latitude]="place.lat"
              (markerClick)="selectPlace(place, $event)"
            >
              <ng-marker-content>
                <button
                  type="button"
                  [attr.aria-label]="place.name"
                  class="size-5 cursor-pointer rounded-full border-2 border-white bg-rose-500 shadow-lg transition-transform hover:scale-110"
                ></button>
                <ng-marker-label position="bottom">{{ place.label }}</ng-marker-label>
              </ng-marker-content>
            </ng-map-marker>
          }

          @if (selected(); as place) {
            <ng-map-popup
              [longitude]="place.lng"
              [latitude]="place.lat"
              (popupClose)="selected.set(null)"
            >
              <div class="demo-rich-popup w-[15.5rem]">
                <img
                  [src]="place.image"
                  [alt]="place.name"
                  class="h-32 w-full object-cover"
                />
                <div class="space-y-2 p-3">
                  <div>
                    <p
                      class="text-muted-foreground pb-0.5 text-[11px] font-medium tracking-wide uppercase"
                    >
                      {{ place.category }}
                    </p>
                    <h3 class="text-foreground leading-tight font-semibold">
                      {{ place.name }}
                    </h3>
                  </div>
                  <div class="flex items-center gap-1 text-sm">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      class="size-3.5 fill-amber-400 text-amber-400"
                    >
                      <path
                        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                      />
                    </svg>
                    <span class="font-medium">{{ place.rating }}</span>
                    <span class="text-muted-foreground"
                      >({{ place.reviews | number }})</span
                    >
                  </div>
                  <div
                    class="text-muted-foreground flex items-center gap-1.5 text-sm"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="size-3.5"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    <span>{{ place.hours }}</span>
                  </div>
                  <div class="flex gap-2 pt-1">
                    <button z-button zSize="sm" type="button" class="flex-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="size-3.5"
                      >
                        <polygon points="3 11 22 2 13 21 11 13 3 11" />
                      </svg>
                      Directions
                    </button>
                    <button
                      z-button
                      zType="outline"
                      zSize="icon-sm"
                      type="button"
                      aria-label="Open"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="size-3.5"
                      >
                        <path d="M15 3h6v6" />
                        <path d="M10 14 21 3" />
                        <path
                          d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </ng-map-popup>
          }
        </ng-map>
      </app-example-section>

      <app-example-section
        title="Draggable Marker"
        sectionId="draggable-marker"
        [code]="draggableCode"
      >
        <span description>
          Set
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">draggable</code>
          and listen to
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">dragEnd</code>
          to track the marker position.
        </span>
        <div class="relative h-full">
          <div
            class="bg-background/95 absolute top-3 left-3 z-10 rounded-md border px-3 py-2 font-mono text-xs shadow-md"
          >
            lng: {{ position().lng | number: '1.4-4' }} lat:
            {{ position().lat | number: '1.4-4' }}
          </div>
          <ng-map [center]="[-3.7038, 40.4168]" [zoom]="12">
            <ng-map-marker
              [longitude]="-3.7038"
              [latitude]="40.4168"
              [draggable]="true"
              (dragEnd)="position.set($event)"
            >
              <ng-marker-content>
                <div
                  class="size-4 cursor-grab rounded-full border-2 border-white bg-blue-500 shadow-lg"
                ></div>
              </ng-marker-content>
            </ng-map-marker>
          </ng-map>
        </div>
      </app-example-section>
    </app-docs-page>
  `,
})
export class MarkersPageComponent {
  readonly basicCode = BASIC_CODE;
  readonly popupCode = POPUP_CODE;
  readonly draggableCode = DRAGGABLE_CODE;

  readonly places = [
    { name: 'Shibuya', lng: 139.7016, lat: 35.658, description: 'Famous crossing & shopping' },
    { name: 'Shinjuku', lng: 139.7036, lat: 35.6938, description: 'Skyscrapers & nightlife' },
    { name: 'Asakusa', lng: 139.7967, lat: 35.7118, description: 'Sensō-ji temple district' },
  ];

  readonly richPlaces: RichPlace[] = [
    {
      name: 'The Metropolitan Museum of Art',
      label: 'Museum',
      category: 'Museum',
      rating: 4.8,
      reviews: 12453,
      hours: '10:00 AM - 5:00 PM',
      image:
        'https://images.unsplash.com/photo-1575223970966-76ae61ee7838?w=300&h=200&fit=crop',
      lng: -73.9632,
      lat: 40.7794,
    },
    {
      name: 'Brooklyn Bridge',
      label: 'Landmark',
      category: 'Landmark',
      rating: 4.9,
      reviews: 8234,
      hours: 'Open 24 hours',
      image:
        'https://images.unsplash.com/photo-1496588152823-86ff7695e68f?w=300&h=200&fit=crop',
      lng: -73.9969,
      lat: 40.7061,
    },
    {
      name: 'Grand Central Terminal',
      label: 'Transit',
      category: 'Transit',
      rating: 4.7,
      reviews: 5621,
      hours: '5:15 AM - 2:00 AM',
      image:
        'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=300&h=200&fit=crop',
      lng: -73.9772,
      lat: 40.7527,
    },
  ];

  readonly selected = signal<RichPlace | null>(null);

  selectPlace(place: RichPlace, event: MouseEvent): void {
    // Stop the click bubbling to the map, which would fire mapClick and
    // immediately clear the selection we're about to set.
    event.stopPropagation();
    // Toggle: clicking the active marker closes; another marker switches.
    this.selected.set(this.selected()?.name === place.name ? null : place);
  }

  readonly position = signal({ lng: -3.7038, lat: 40.4168 });
}

interface RichPlace {
  name: string;
  label: string;
  category: string;
  rating: number;
  reviews: number;
  hours: string;
  image: string;
  lng: number;
  lat: number;
}
