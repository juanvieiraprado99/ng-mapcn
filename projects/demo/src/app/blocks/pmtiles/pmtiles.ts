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

/**
 * Draws the buildings layer of a vector source, waiting for it through
 * `MapContextService.hasSource()`: `<ng-map-vector-source>` only adds the source. A theme switch
 * (`setStyle`) removes the source and the layers; the source component re-adds its source and this
 * effect re-adds the layers. Hover highlights a building with feature-state, using the feature
 * ids that the tiles already carry (the OpenStreetMap ids), so no `promoteId` is needed.
 */
@Component({
  selector: 'app-buildings-layer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
export class BuildingsLayerComponent {
  /** Id of the `ng-map-vector-source` to draw. */
  readonly source = input.required<string>();
  /** Name of the layer inside the vector tiles. */
  readonly sourceLayer = input('buildings');

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
          'fill-color': '#3b82f6',
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
  imports: [MapComponent, MapVectorSourceComponent, BuildingsLayerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-card relative h-screen">
      <ng-map [center]="[11.2543, 43.7672]" [zoom]="15.5">
        <!-- A PMTiles archive served as a static file: no tile server, just HTTP range requests. -->
        <ng-map-vector-source id="florence" [url]="archiveUrl" />
        <app-buildings-layer source="florence" />
      </ng-map>

      <div
        class="bg-card/90 absolute top-4 left-4 z-10 rounded-lg border px-3 py-2.5 backdrop-blur-sm"
      >
        <p class="text-foreground text-sm font-medium">Buildings of Florence</p>
        <p class="text-muted-foreground mt-1 text-xs">
          Read from a PMTiles archive. Hover a building.
        </p>
      </div>
    </div>
  `,
})
export class PmtilesBlockComponent {
  /**
   * `pmtiles://` + the archive URL: a Protomaps extract of central Florence (OpenStreetMap data,
   * ODbL). The protocol is registered in the browser only.
   */
  protected readonly archiveUrl =
    'pmtiles://https://pmtiles.io/protomaps%28vector%29ODbL_firenze.pmtiles';

  constructor() {
    afterNextRender(() => registerPmtilesProtocol());
  }
}
