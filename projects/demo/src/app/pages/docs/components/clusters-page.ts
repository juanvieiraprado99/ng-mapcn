import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ClusterPointClickEvent,
  MapClusterLayerComponent,
  MapComponent,
} from 'ng-mapcn';
import { DocsImports } from '../../../shared/docs';
import { ExampleSectionComponent } from '../../../shared/example-section';

const CLUSTER_CODE = `import { Component } from '@angular/core';
import { MapClusterLayerComponent, MapComponent } from 'ng-mapcn';

@Component({
  selector: 'app-cluster-map',
  standalone: true,
  imports: [MapComponent, MapClusterLayerComponent],
  template: \`
    <div class="h-[420px]">
      <ng-map [center]="[-103.5917, 40.6699]" [zoom]="3">
        <ng-map-cluster-layer
          [data]="earthquakesUrl"
          [clusterMaxZoom]="14"
          [clusterRadius]="50"
          (pointClick)="onPoint($event)"
        />
      </ng-map>
    </div>
  \`,
})
export class ClusterMapComponent {
  // USGS earthquake data (GeoJSON points)
  readonly earthquakesUrl =
    'https://maplibre.org/maplibre-gl-js/docs/assets/earthquakes.geojson';

  onPoint(event: ClusterPointClickEvent): void {
    console.log(event.feature.properties);
  }
}`;

@Component({
  selector: 'app-clusters-page',
  standalone: true,
  imports: [
    DocsImports,
    ExampleSectionComponent,
    MapComponent,
    MapClusterLayerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-docs-page
      title="Clusters"
      description="Cluster large point datasets with zoom-to-expand behavior."
    >
      <app-example-section
        title="Basic Example"
        sectionId="basic-example"
        [code]="clusterCode"
      >
        <span description>
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map-cluster-layer</code>
          clusters point features automatically. Circle color and size scale
          with the cluster count; clicking a cluster zooms in, clicking a point
          emits
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">pointClick</code>.
          This example shows USGS earthquake data.
        </span>
        <div class="relative h-full">
          @if (magnitude(); as mag) {
            <div
              class="bg-background/95 absolute top-3 left-3 z-10 rounded-md border px-3 py-2 text-xs shadow-md"
            >
              Earthquake magnitude: <span class="font-medium">{{ mag }}</span>
            </div>
          }
          <ng-map [center]="[-103.5917, 40.6699]" [zoom]="3">
            <ng-map-cluster-layer
              [data]="earthquakesUrl"
              [clusterMaxZoom]="14"
              [clusterRadius]="50"
              (pointClick)="onPoint($event)"
            />
          </ng-map>
        </div>
      </app-example-section>
    </app-docs-page>
  `,
})
export class ClustersPageComponent {
  readonly clusterCode = CLUSTER_CODE;
  readonly earthquakesUrl =
    'https://maplibre.org/maplibre-gl-js/docs/assets/earthquakes.geojson';

  readonly magnitude = signal<string | null>(null);

  onPoint(event: ClusterPointClickEvent): void {
    const mag = (event.feature.properties as Record<string, unknown>)?.['mag'];
    this.magnitude.set(mag != null ? String(mag) : null);
  }
}
