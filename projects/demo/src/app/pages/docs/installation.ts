import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlockComponent } from '../../shared/code-block';
import { DocsPageComponent } from '../../shared/docs-page';
import { MapComponent, MapControlsComponent } from 'ng-mapcn';

const USAGE_CODE = `import { Component } from '@angular/core';
import { MapComponent, MapControlsComponent } from 'ng-mapcn';

@Component({
  selector: 'app-my-map',
  standalone: true,
  imports: [MapComponent, MapControlsComponent],
  template: \`
    <div class="h-[320px] overflow-hidden rounded-lg border">
      <ng-map [center]="[-74.006, 40.7128]" [zoom]="11">
        <ng-map-controls />
      </ng-map>
    </div>
  \`,
})
export class MyMapComponent {}`;

@Component({
  selector: 'app-installation',
  standalone: true,
  imports: [
    DocsPageComponent,
    CodeBlockComponent,
    RouterLink,
    MapComponent,
    MapControlsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-docs-page
      title="Installation"
      description="How to install and set up ng-mapcn in your project."
    >
      <h2 id="prerequisites" class="mb-3 scroll-mt-24 text-xl font-semibold">
        Prerequisites
      </h2>
      <p class="text-muted-foreground mb-10 text-sm leading-relaxed">
        An Angular 22+ project. Tailwind CSS is optional but recommended for
        styling marker and popup content.
      </p>

      <h2 id="installation" class="mb-3 scroll-mt-24 text-xl font-semibold">
        Installation
      </h2>
      <p class="text-muted-foreground mb-4 text-sm leading-relaxed">
        Run the following command to add the map components to your project
        (shadcn-style — the sources are copied into your app and
        <code class="bg-muted rounded px-1.5 py-0.5 text-xs">maplibre-gl</code>
        is installed automatically):
      </p>
      <div class="mb-6">
        <app-code-block code="ng add ng-mapcn" [collapsible]="false" />
      </div>
      <p class="text-muted-foreground mb-4 text-sm leading-relaxed">
        Alternatively, install it as a regular npm package:
      </p>
      <div class="mb-10">
        <app-code-block
          code="npm install ng-mapcn maplibre-gl"
          [collapsible]="false"
        />
      </div>

      <h2 id="usage" class="mb-3 scroll-mt-24 text-xl font-semibold">Usage</h2>
      <p class="text-muted-foreground mb-4 text-sm leading-relaxed">
        Import and use the map components:
      </p>
      <div class="mb-6">
        <app-code-block [code]="usageCode" />
      </div>
      <div class="mb-6 h-[320px] overflow-hidden rounded-xl border">
        <ng-map [center]="[-74.006, 40.7128]" [zoom]="11">
          <ng-map-controls />
        </ng-map>
      </div>

      <div class="bg-muted/40 mb-10 rounded-lg border p-4 text-sm leading-relaxed">
        <span class="font-medium">Note:</span>
        <span class="text-muted-foreground">
          The map uses free CARTO basemap tiles by default. Tiles automatically
          switch between light and dark themes.</span
        >
      </div>

      <div class="flex items-center justify-between border-t pt-6">
        <a
          routerLink="/docs"
          class="hover:bg-accent rounded-md border px-4 py-2 text-sm font-medium transition-colors"
          >← Introduction</a
        >
        <a
          routerLink="/docs/api-reference"
          class="hover:bg-accent rounded-md border px-4 py-2 text-sm font-medium transition-colors"
          >API Reference →</a
        >
      </div>
    </app-docs-page>
  `,
})
export class InstallationComponent {
  readonly usageCode = USAGE_CODE;
}
