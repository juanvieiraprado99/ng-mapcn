import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MapComponent, MapControlsComponent, MapGeoJSONComponent } from 'ng-mapcn';
import { EdgeNodeMarkerComponent } from './components/edge-node-marker';
import { StatusSidebarComponent } from './components/status-sidebar';
import { edgeNodes, mapView, WORLD_GEOJSON } from './data';

@Component({
  selector: 'app-uptime-monitor-block',
  standalone: true,
  imports: [
    MapComponent,
    MapControlsComponent,
    MapGeoJSONComponent,
    EdgeNodeMarkerComponent,
    StatusSidebarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-screen items-center justify-center p-4">
      <div
        class="bg-card flex h-[500px] w-full max-w-4xl overflow-hidden rounded-xl border shadow-sm"
      >
        <app-status-sidebar [nodes]="nodes" />

        <div class="relative min-w-0 flex-1">
          <ng-map [blank]="true" [center]="view.center" [zoom]="view.zoom" [options]="mapOptions">
            <ng-map-geojson [data]="worldGeoJson" [linePaint]="false" />

            @for (node of nodes; track node.id) {
              <app-edge-node-marker [node]="node" />
            }

            <ng-map-controls class="[&_.ng-controls]:bottom-2!" />
          </ng-map>
        </div>
      </div>
    </div>
  `,
})
export class UptimeMonitorBlockComponent {
  protected readonly nodes = edgeNodes;
  protected readonly view = mapView;
  protected readonly worldGeoJson = WORLD_GEOJSON;
  protected readonly mapOptions = {
    minZoom: mapView.minZoom,
    maxZoom: mapView.maxZoom,
    scrollZoom: false,
    dragRotate: false,
    pitchWithRotate: false,
  };
}
