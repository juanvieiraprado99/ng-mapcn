import { ChangeDetectionStrategy, Component, computed, signal, viewChild } from '@angular/core';
import { MapComponent } from 'ng-mapcn';
import { MapDrawComponent, type MapDrawFeatureCollection, type MapDrawMode } from 'ng-mapcn/draw';

const TOOLS: readonly { mode: MapDrawMode; label: string }[] = [
  { mode: 'static', label: 'Pan' },
  { mode: 'point', label: 'Point' },
  { mode: 'line', label: 'Line' },
  { mode: 'polygon', label: 'Polygon' },
  { mode: 'select', label: 'Select' },
];

/** Draw tools over a map: a toolbar for the mode and a live readout of the drawn features. */
@Component({
  selector: 'app-draw-block',
  standalone: true,
  imports: [MapComponent, MapDrawComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-card relative h-screen">
      <ng-map [center]="[-46.6333, -23.5505]" [zoom]="11">
        <ng-map-draw
          [(mode)]="mode"
          [(features)]="features"
          (featureSelect)="selectedId.set($event.id)"
          (featureDeselect)="selectedId.set(null)"
        />
      </ng-map>

      <div
        class="bg-card/90 absolute top-4 left-4 z-10 flex flex-col gap-3 rounded-lg border p-3 backdrop-blur-sm"
      >
        <p class="text-foreground text-sm font-medium">Draw on the map</p>
        <div class="flex flex-wrap gap-1" role="toolbar" aria-label="Draw tools">
          @for (tool of tools; track tool.mode) {
            <button
              type="button"
              class="border-border hover:bg-muted rounded-md border px-2.5 py-1 text-xs"
              [class.bg-primary]="mode() === tool.mode"
              [class.text-primary-foreground]="mode() === tool.mode"
              [attr.aria-pressed]="mode() === tool.mode"
              (click)="mode.set(tool.mode)"
            >
              {{ tool.label }}
            </button>
          }
        </div>
        <p class="text-muted-foreground text-xs">
          @switch (mode()) {
            @case ('point') {
              Click the map to place a point.
            }
            @case ('line') {
              Click to add vertices; click the last one again to finish.
            }
            @case ('polygon') {
              Click to add vertices; click the last one again to close.
            }
            @case ('select') {
              Click a shape to edit it; Delete removes it.
            }
            @default {
              Pick a tool to start drawing.
            }
          }
        </p>
        <dl class="text-muted-foreground grid grid-cols-3 gap-2 text-xs">
          @for (stat of stats(); track stat.label) {
            <div>
              <dt>{{ stat.label }}</dt>
              <dd class="text-foreground text-base font-medium" [attr.data-stat]="stat.label">
                {{ stat.count }}
              </dd>
            </div>
          }
        </dl>
        @if (selectedId() !== null) {
          <p class="text-muted-foreground text-xs">Selected: {{ selectedId() }}</p>
        }
        <button
          type="button"
          class="border-border hover:bg-muted rounded-md border px-2.5 py-1 text-xs disabled:opacity-50"
          [disabled]="features().features.length === 0"
          (click)="draw().clear()"
        >
          Clear all
        </button>
      </div>
    </div>
  `,
})
export class DrawBlockComponent {
  protected readonly tools = TOOLS;
  protected readonly draw = viewChild.required(MapDrawComponent);

  protected readonly mode = signal<MapDrawMode>('static');
  protected readonly features = signal<MapDrawFeatureCollection>({
    type: 'FeatureCollection',
    features: [],
  });
  protected readonly selectedId = signal<string | number | null>(null);

  protected readonly stats = computed(() => {
    const features = this.features().features;
    const count = (type: string) => features.filter((f) => f.geometry.type === type).length;
    return [
      { label: 'Points', count: count('Point') },
      { label: 'Lines', count: count('LineString') },
      { label: 'Polygons', count: count('Polygon') },
    ];
  });
}
