import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  type ClusterPointClickEvent,
  MapClusterLayerComponent,
  MapComponent,
} from 'ng-mapcn';

import { CodeBlockComponent } from '../../../shared/code-block';
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

const IDS_CODE = `<ng-map-cluster-layer id="stores" beforeId="labels" [data]="stores" />

// Layer ids derived from id="stores":
//   source:               cluster-source-stores
//   cluster circles:      clusters-stores
//   cluster count labels: cluster-count-stores
//   unclustered points:   unclustered-point-stores
// Without id they are auto-generated (e.g. clusters-ng-cluster-1).`;

const TYPED_CODE = `interface Store {
  name: string;
  open: boolean;
}

readonly stores: GeoJSON.FeatureCollection<GeoJSON.Point, Store> = { /* ... */ };

// P is inferred from [data]: event.feature.properties is typed as Store
onPoint(event: ClusterPointClickEvent<Store>): void {
  console.log(event.feature.properties.name);
}`;

const COLORS_CODE = `<!-- ng-mapcn defaults: ['#22c55e', '#eab308', '#ef4444'] (green/yellow/red) -->
<!-- mapcn defaults, for an identical look: -->
<ng-map-cluster-layer
  [data]="stores"
  [clusterColors]="['#3b82f6', '#1d4ed8', '#1e3a8a']"
/>`;

@Component({
  selector: 'app-clusters-page',
  standalone: true,
  imports: [
    DocsImports,
    CodeBlockComponent,
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

      <app-docs-section title="Ids and z-order" anchor="ids-and-z-order">
        <p>
          Set <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">id</code> to get
          stable source and layer ids you can target with
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">queryRenderedFeatures</code>
          or custom layers, and
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">beforeId</code> to
          insert the cluster layers below an existing layer. Both follow
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map-geojson</code>:
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">beforeId</code> is
          applied when the layers are created, and changing
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">id</code> re-creates
          them.
        </p>
        <app-code-block [code]="idsCode" />
      </app-docs-section>

      <app-docs-section title="Typed properties" anchor="typed-properties">
        <p>
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map-cluster-layer</code>
          and
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map-geojson</code>
          are generic over the feature properties. The type is inferred from
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">[data]</code>, so
          click and hover payloads are typed. It defaults to
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">Record&lt;string, unknown&gt;</code>.
        </p>
        <app-code-block [code]="typedCode" />
      </app-docs-section>

      <app-docs-section title="Default colors" anchor="default-colors">
        <p>
          ng-mapcn clusters default to green, yellow and red
          (<code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">#22c55e</code>,
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">#eab308</code>,
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">#ef4444</code>),
          while mapcn uses blues
          (<code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">#3b82f6</code>,
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">#1d4ed8</code>,
          <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">#1e3a8a</code>).
          Pass <code class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">clusterColors</code>
          to match mapcn.
        </p>
        <app-code-block [code]="colorsCode" />
      </app-docs-section>
    </app-docs-page>
  `,
})
export class ClustersPageComponent {
  readonly clusterCode = CLUSTER_CODE;
  readonly idsCode = IDS_CODE;
  readonly typedCode = TYPED_CODE;
  readonly colorsCode = COLORS_CODE;
  readonly earthquakesUrl =
    'https://maplibre.org/maplibre-gl-js/docs/assets/earthquakes.geojson';

  readonly magnitude = signal<string | null>(null);

  onPoint(event: ClusterPointClickEvent): void {
    const mag = (event.feature.properties as Record<string, unknown>)?.['mag'];
    this.magnitude.set(mag != null ? String(mag) : null);
  }
}
