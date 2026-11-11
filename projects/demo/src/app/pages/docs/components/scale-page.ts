import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MapComponent, MapControlsComponent, MapScaleComponent } from 'ng-mapcn';

import { DocsImports } from '../../../shared/docs';
import { ExampleSectionComponent } from '../../../shared/example-section';

const SCALE_CODE = `import { Component } from '@angular/core';
import { MapComponent, MapScaleComponent } from 'ng-mapcn';

@Component({
  selector: 'app-scale-map',
  standalone: true,
  imports: [MapComponent, MapScaleComponent],
  template: \`
    <div class="h-[420px]">
      <ng-map [center]="[2.3522, 48.8566]" [zoom]="10">
        <!-- bottom-left by default; unit="both" shows metric and imperial bars -->
        <ng-map-scale unit="both" [maxWidth]="120" />
      </ng-map>
    </div>
  \`,
})
export class ScaleMapComponent {}`;

const WITH_CONTROLS_CODE = `import { Component } from '@angular/core';
import { MapComponent, MapControlsComponent, MapScaleComponent } from 'ng-mapcn';

@Component({
  selector: 'app-scale-controls-map',
  standalone: true,
  imports: [MapComponent, MapControlsComponent, MapScaleComponent],
  template: \`
    <div class="h-[420px]">
      <ng-map [center]="[2.3522, 48.8566]" [zoom]="10">
        <ng-map-scale unit="both" [maxWidth]="120" />
        <ng-map-controls position="bottom-right" />
      </ng-map>
    </div>
  \`,
})
export class ScaleControlsMapComponent {}`;

@Component({
  selector: 'app-scale-page',
  standalone: true,
  imports: [
    DocsImports,
    ExampleSectionComponent,
    MapComponent,
    MapControlsComponent,
    MapScaleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-docs-page
      title="Scale"
      description="A distance bar that follows the map as you zoom and pan."
    >
      <app-example-section title="Basic Usage" sectionId="basic-usage" [code]="scaleCode">
        <span description>
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map-scale</code>
          draws a distance bar that follows the map as you zoom and pan. Use
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">unit</code>
          for metric, imperial or both, and
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">maxWidth</code>
          for the longest bar in pixels. It sits bottom-left by default.
        </span>
        <ng-map [center]="[2.3522, 48.8566]" [zoom]="10">
          <ng-map-scale unit="both" [maxWidth]="120" />
        </ng-map>
      </app-example-section>

      <app-example-section
        title="Next to other controls"
        sectionId="with-controls"
        [code]="withControlsCode"
      >
        <span description>
          The scale shares the map corners with
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map-controls</code>
          and the attribution without overlapping them.
        </span>
        <ng-map [center]="[2.3522, 48.8566]" [zoom]="10">
          <ng-map-scale unit="both" [maxWidth]="120" />
          <ng-map-controls position="bottom-right" />
        </ng-map>
      </app-example-section>
    </app-docs-page>
  `,
})
export class ScalePageComponent {
  readonly scaleCode = SCALE_CODE;
  readonly withControlsCode = WITH_CONTROLS_CODE;
}
