import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MapComponent, MapFillExtrusionComponent, MapTerrainComponent } from 'ng-mapcn';

/** Buildings are colored by height: low-rise blue to skyscraper pink. */
const HEIGHT_COLOR = [
  'interpolate',
  ['linear'],
  ['coalesce', ['to-number', ['get', 'height']], 0],
  0,
  '#93c5fd',
  50,
  '#818cf8',
  150,
  '#c084fc',
  300,
  '#f472b6',
];

@Component({
  selector: 'app-city-3d-block',
  standalone: true,
  imports: [MapComponent, MapFillExtrusionComponent, MapTerrainComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-card relative h-screen">
      <ng-map
        [center]="[-74.0134, 40.7061]"
        [zoom]="15.6"
        [options]="{ pitch: 62, bearing: -24, maxPitch: 85 }"
      >
        <ng-map-fill-extrusion
          id="buildings"
          [color]="byHeight() ? heightColor : undefined"
          [opacity]="0.85"
        />
        @if (terrain()) {
          <ng-map-terrain id="relief" [exaggeration]="1.5" [hillshade]="true" />
        }
      </ng-map>

      <div
        class="bg-card/90 absolute top-4 left-4 z-10 flex flex-col gap-2 rounded-lg border px-3 py-2.5 text-sm backdrop-blur-sm"
      >
        <p class="text-foreground font-medium">Lower Manhattan in 3D</p>
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            [checked]="byHeight()"
            (change)="byHeight.set($any($event.target).checked)"
          />
          Color by height
        </label>
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            [checked]="terrain()"
            (change)="terrain.set($any($event.target).checked)"
          />
          Terrain and hillshade
        </label>
        <p class="text-muted-foreground text-xs">Right-drag or Ctrl-drag to tilt and rotate.</p>
      </div>
    </div>
  `,
})
export class City3dBlockComponent {
  protected readonly byHeight = signal(true);
  protected readonly terrain = signal(false);
  protected readonly heightColor = HEIGHT_COLOR;
}
