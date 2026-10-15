// REQUIRES `npm i pmtiles` in your app. It is a demo-only dependency: ng-mapcn does not bundle it.
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
} from '@angular/core';
import { addProtocol, type MapLayerMouseEvent } from 'maplibre-gl';
import { MapComponent, MapContextService, MapVectorSourceComponent } from 'ng-mapcn';
import { Protocol } from 'pmtiles';

let protocolRegistered = false;

/**
 * Registers the `pmtiles://` protocol with MapLibre, once per page. Do this before the first
 * source that uses a `pmtiles://` URL is added (an app initializer is the usual place).
 */
export function registerPmtilesProtocol(): void {
  if (protocolRegistered) return;
  protocolRegistered = true;
  addProtocol('pmtiles', new Protocol().tile);
}

const KIND_COLORS = { residential: '#3b82f6', commercial: '#f59e0b', park: '#22c55e' } as const;

/**
 * Draws the layers of a vector source, waiting for it through `MapContextService.hasSource()`:
 * `<ng-map-vector-source>` only adds the source. A theme switch (`setStyle`) removes the source
 * and the layers; the source component re-adds its source and this effect re-adds the layers.
 * Hover highlights a parcel with feature-state, which needs the source's `promoteId`.
 */
@Component({
  selector: 'app-parcels-layer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
export class ParcelsLayerComponent {
  /** Id of the `ng-map-vector-source` to draw. */
  readonly source = input.required<string>();
  /** Name of the layer inside the vector tiles. */
  readonly sourceLayer = input('parcels');

  private readonly ctx = inject(MapContextService);

  constructor() {
    effect((onCleanup) => {
      const map = this.ctx.map();
      const source = this.source();
      if (!map || !this.ctx.isLoaded() || !this.ctx.hasSource(source)) return;

      const sourceLayer = this.sourceLayer();
      const fillId = `${source}-fill`;
      const lineId = `${source}-line`;
      map.addLayer({
        id: fillId,
        type: 'fill',
        source,
        'source-layer': sourceLayer,
        paint: {
          'fill-color': [
            'match',
            ['get', 'kind'],
            'residential',
            KIND_COLORS.residential,
            'commercial',
            KIND_COLORS.commercial,
            'park',
            KIND_COLORS.park,
            '#94a3b8',
          ],
          'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.9, 0.55],
        },
      });
      map.addLayer({
        id: lineId,
        type: 'line',
        source,
        'source-layer': sourceLayer,
        paint: { 'line-color': '#ffffff', 'line-width': 1, 'line-opacity': 0.8 },
      });

      let hovered: string | number | null = null;
      const setHover = (id: string | number | null) => {
        if (hovered !== null) {
          map.setFeatureState({ source, sourceLayer, id: hovered }, { hover: false });
        }
        hovered = id;
        if (id !== null) map.setFeatureState({ source, sourceLayer, id }, { hover: true });
      };
      const onMove = (event: MapLayerMouseEvent) => {
        map.getCanvas().style.cursor = 'pointer';
        setHover(event.features?.[0]?.id ?? null);
      };
      const onLeave = () => {
        map.getCanvas().style.cursor = '';
        setHover(null);
      };
      map.on('mousemove', fillId, onMove);
      map.on('mouseleave', fillId, onLeave);

      onCleanup(() => {
        map.off('mousemove', fillId, onMove);
        map.off('mouseleave', fillId, onLeave);
        for (const id of [lineId, fillId]) {
          try {
            if (map.getLayer(id)) map.removeLayer(id);
          } catch {
            // style may be mid-reload
          }
        }
      });
    });
  }
}

@Component({
  selector: 'app-pmtiles-block',
  standalone: true,
  imports: [MapComponent, MapVectorSourceComponent, ParcelsLayerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-card relative h-screen">
      <ng-map [center]="[-74.0046, 40.5811]" [zoom]="11.6">
        <!-- A PMTiles archive served as a static file: no tile server, just HTTP range requests. -->
        <ng-map-vector-source id="parcels" [url]="archiveUrl" promoteId="parcel" />
        <app-parcels-layer source="parcels" />
      </ng-map>

      <div
        class="bg-card/90 absolute top-4 left-4 z-10 rounded-lg border px-3 py-2.5 backdrop-blur-sm"
      >
        <p class="text-foreground text-sm font-medium">Parcels from a PMTiles archive</p>
        <ul class="text-muted-foreground mt-2 space-y-1 text-xs">
          @for (kind of kinds; track kind.name) {
            <li class="flex items-center gap-2">
              <span class="size-2.5 rounded-sm" [style.background-color]="kind.color"></span>
              {{ kind.name }}
            </li>
          }
        </ul>
      </div>
    </div>
  `,
})
export class PmtilesBlockComponent {
  /** `pmtiles://` + the archive URL. The protocol is registered in the browser only. */
  protected readonly archiveUrl = 'pmtiles:///data/parcels.pmtiles';
  protected readonly kinds = Object.entries(KIND_COLORS).map(([name, color]) => ({ name, color }));

  constructor() {
    afterNextRender(() => registerPmtilesProtocol());
  }
}
