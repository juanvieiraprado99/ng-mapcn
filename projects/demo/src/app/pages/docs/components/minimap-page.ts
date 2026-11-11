import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MapComponent, MapMinimapComponent } from 'ng-mapcn';

import { DocsImports } from '../../../shared/docs';
import { ExampleSectionComponent } from '../../../shared/example-section';

const MINIMAP_CODE = `import { Component } from '@angular/core';
import { MapComponent, MapMinimapComponent } from 'ng-mapcn';

@Component({
  selector: 'app-minimap-map',
  standalone: true,
  imports: [MapComponent, MapMinimapComponent],
  template: \`
    <div class="h-[420px]">
      <ng-map [center]="[2.3522, 48.8566]" [zoom]="11">
        <!-- bottom-left by default; click, drag or use the arrow keys to move the main map -->
        <ng-map-minimap />
      </ng-map>
    </div>
  \`,
})
export class MinimapMapComponent {}`;

const MINIMAP_BLANK_CODE = `import { Component } from '@angular/core';
import { MapComponent, MapMinimapComponent } from 'ng-mapcn';

@Component({
  selector: 'app-minimap-blank-map',
  standalone: true,
  imports: [MapComponent, MapMinimapComponent],
  template: \`
    <div class="h-[420px]">
      <ng-map [center]="[2.3522, 48.8566]" [zoom]="11">
        <!-- no basemap tiles in the overview; it sits 3 zoom levels below the main map -->
        <ng-map-minimap position="top-left" [blank]="true" [zoomOffset]="3" />
      </ng-map>
    </div>
  \`,
})
export class MinimapBlankMapComponent {}`;

@Component({
  selector: 'app-minimap-page',
  standalone: true,
  imports: [DocsImports, ExampleSectionComponent, MapComponent, MapMinimapComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-docs-page
      title="Minimap"
      description="An overview map that follows the main viewport and navigates it."
    >
      <app-example-section title="Basic Usage" sectionId="basic-usage" [code]="minimapCode">
        <span description>
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map-minimap</code>
          adds an overview map that follows the main viewport a few zoom levels
          out and outlines what the main map shows. Click, drag or use the arrow
          keys on it to navigate the main map, and collapse it with the toggle.
          It sits bottom-left by default.
        </span>
        <ng-map [center]="[2.3522, 48.8566]" [zoom]="11">
          <ng-map-minimap />
        </ng-map>
      </app-example-section>

      <app-example-section
        title="Blank minimap"
        sectionId="minimap-blank"
        [code]="minimapBlankCode"
      >
        <span description>
          Set
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">[blank]="true"</code>
          to draw only the footprint without basemap tiles, and
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">zoomOffset</code>
          to change how far out the overview sits.
        </span>
        <ng-map [center]="[2.3522, 48.8566]" [zoom]="11">
          <ng-map-minimap position="top-left" [blank]="true" [zoomOffset]="3" />
        </ng-map>
      </app-example-section>
    </app-docs-page>
  `,
})
export class MinimapPageComponent {
  readonly minimapCode = MINIMAP_CODE;
  readonly minimapBlankCode = MINIMAP_BLANK_CODE;
}
