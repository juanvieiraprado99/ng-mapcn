import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { type ImageOverlayCoordinates, MapComponent, MapImageOverlayComponent } from 'ng-mapcn';

import { DocsImports } from '../../../shared/docs';
import { ExampleSectionComponent } from '../../../shared/example-section';

const IMAGE_CODE = `import { Component, signal } from '@angular/core';
import {
  type ImageOverlayCoordinates,
  MapComponent,
  MapImageOverlayComponent,
} from 'ng-mapcn';

@Component({
  selector: 'app-image-overlay-map',
  standalone: true,
  imports: [MapComponent, MapImageOverlayComponent],
  template: \`
    <button (click)="shift()">Move east</button>
    <ng-map [center]="[-74, 24]" [zoom]="4.5">
      <!-- Corners are [lng, lat], clockwise from the top-left. -->
      <ng-map-image-overlay
        id="chart"
        url="/assets/sea-chart.png"
        [coordinates]="corners()"
        [opacity]="0.8"
      />
    </ng-map>
  \`,
})
export class ImageOverlayMapComponent {
  readonly corners = signal<ImageOverlayCoordinates>([
    [-80, 28],
    [-68, 28],
    [-68, 20],
    [-80, 20],
  ]);

  shift() {
    // A new array: only the changed coordinates are pushed to the live image source.
    this.corners.update((c) => c.map(([lng, lat]) => [lng + 2, lat]) as unknown as ImageOverlayCoordinates);
  }
}`;

@Component({
  selector: 'app-image-overlay-page',
  standalone: true,
  imports: [DocsImports, ExampleSectionComponent, MapComponent, MapImageOverlayComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-docs-page
      title="Image Overlay"
      description="A georeferenced image pinned to four corner coordinates: a scanned map, a radar frame, a floor plan."
    >
      <app-example-section title="Basic Usage" sectionId="basic-usage" [code]="imageCode">
        <span description>
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map-image-overlay</code>
          pins an image to four corner coordinates. Changing
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">coordinates</code>
          moves the live image source (<code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">setCoordinates</code>)
          without re-creating it.
        </span>
        <div after-description class="mb-3 flex gap-2">
          <button
            type="button"
            class="border-border bg-background hover:bg-muted rounded-md border px-3 py-1 text-sm"
            (click)="shift()"
          >
            Move east
          </button>
        </div>
        <ng-map [center]="[-74, 24]" [zoom]="4.5">
          <ng-map-image-overlay
            id="compass"
            url="/compass.png"
            [coordinates]="corners()"
            [opacity]="0.85"
          />
        </ng-map>
      </app-example-section>

      <app-docs-section title="Ids" anchor="ids">
        <p>
          The MapLibre source id is exactly the <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">id</code> input (auto-generated when omitted)
          and its layer is <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">image-layer-&lt;id&gt;</code>. The source is announced in
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">MapContextService.hasSource(id)</code> while it is on the map (see
          <a class="underline" href="/docs/components/vector-source#source-ids">Vector Tiles</a>).
        </p>
      </app-docs-section>
    </app-docs-page>
  `,
})
export class ImageOverlayPageComponent {
  readonly imageCode = IMAGE_CODE;

  readonly corners = signal<ImageOverlayCoordinates>([
    [-80, 28],
    [-68, 28],
    [-68, 20],
    [-80, 20],
  ]);

  shift(): void {
    this.corners.update(
      (corners) =>
        corners.map(([lng, lat]) => [lng + 2, lat] as const) as unknown as ImageOverlayCoordinates,
    );
  }
}
