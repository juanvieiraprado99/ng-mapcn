import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { MapComponent, MapContextService, nextId } from 'ng-mapcn';

const EARTHQUAKE_GEOJSON_URL =
  'https://maplibre.org/maplibre-gl-js/docs/assets/earthquakes.geojson';

const HEATMAP_GRADIENT_COLORS = ['#fff7bc', '#fee391', '#fec44f', '#fe9929', '#d7301f'];

const HEATMAP_COLOR_STOPS: [number, string][] = [
  [0.15, HEATMAP_GRADIENT_COLORS[0]],
  [0.35, HEATMAP_GRADIENT_COLORS[1]],
  [0.55, HEATMAP_GRADIENT_COLORS[2]],
  [0.75, HEATMAP_GRADIENT_COLORS[3]],
  [1, HEATMAP_GRADIENT_COLORS[4]],
];

/**
 * Custom layers through `MapContextService` (ng-mapcn's `useMap()`). Gated on
 * `isLoaded()`, so a theme switch (`setStyle`) re-adds them automatically.
 */
@Component({
  selector: 'app-globe-heatmap-layers',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
export class GlobeHeatmapLayersComponent {
  private readonly ctx = inject(MapContextService);

  private readonly id = nextId('heatmap');
  private readonly sourceId = `heatmap-source-${this.id}`;
  private readonly heatLayerId = `heatmap-layer-${this.id}`;
  private readonly pointLayerId = `heatmap-point-layer-${this.id}`;

  constructor() {
    effect((onCleanup) => {
      const map = this.ctx.map();
      if (!map || !this.ctx.isLoaded()) return;

      if (!map.getSource(this.sourceId)) {
        map.addSource(this.sourceId, { type: 'geojson', data: EARTHQUAKE_GEOJSON_URL });
      }

      if (!map.getLayer(this.heatLayerId)) {
        map.addLayer({
          id: this.heatLayerId,
          type: 'heatmap',
          source: this.sourceId,
          maxzoom: 6,
          paint: {
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'mag'], 0, 0, 6, 0.8],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.55, 6, 1.25],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0,
              'rgba(59, 130, 246, 0)',
              ...HEATMAP_COLOR_STOPS.flat(),
            ],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 8, 6, 34],
            'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 4.5, 0.75, 6.5, 0.08],
          },
        });
      }

      if (!map.getLayer(this.pointLayerId)) {
        map.addLayer({
          id: this.pointLayerId,
          type: 'circle',
          source: this.sourceId,
          minzoom: 4.5,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['get', 'mag'], 1, 3, 6, 10],
            'circle-color': [
              'interpolate',
              ['linear'],
              ['get', 'mag'],
              1,
              HEATMAP_GRADIENT_COLORS[1],
              2.5,
              HEATMAP_GRADIENT_COLORS[2],
              4,
              HEATMAP_GRADIENT_COLORS[3],
              6,
              HEATMAP_GRADIENT_COLORS[4],
            ],
            'circle-stroke-width': 1,
            'circle-stroke-color': 'rgba(255,255,255,0.8)',
            'circle-opacity': ['interpolate', ['linear'], ['zoom'], 4.5, 0, 6.5, 0.7],
          },
        });
      }

      onCleanup(() => {
        try {
          if (map.getLayer(this.pointLayerId)) map.removeLayer(this.pointLayerId);
          if (map.getLayer(this.heatLayerId)) map.removeLayer(this.heatLayerId);
          if (map.getSource(this.sourceId)) map.removeSource(this.sourceId);
        } catch {
          // style may be mid-reload
        }
      });
    });
  }
}

@Component({
  selector: 'app-heatmap-block',
  standalone: true,
  imports: [MapComponent, GlobeHeatmapLayersComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-card relative h-screen">
      <div class="relative h-full">
        <ng-map
          [center]="[-113, 43]"
          [zoom]="3.2"
          [projection]="{ type: 'globe' }"
          [options]="{ pitch: 24, minZoom: 1.2, maxZoom: 8 }"
        >
          <app-globe-heatmap-layers />
        </ng-map>
      </div>

      <div
        class="bg-card/90 absolute top-4 left-4 z-10 rounded-lg border px-3 py-2.5 backdrop-blur-sm"
      >
        <p class="text-foreground text-sm font-medium">Global Earthquakes Heatmap</p>

        <div class="mt-3 h-2 w-full rounded-full" [style.background-image]="gradient"></div>
        <div class="text-muted-foreground flex items-center justify-between pt-1.5 text-[10px]">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>
    </div>
  `,
})
export class HeatmapBlockComponent {
  protected readonly gradient = `linear-gradient(to right, ${HEATMAP_GRADIENT_COLORS.join(', ')})`;
}
