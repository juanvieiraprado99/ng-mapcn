import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MapComponent, MapControlsComponent } from 'ng-mapcn';

import { CodeBlockComponent } from '../../shared/code-block';
import { DocsImports } from '../../shared/docs';
import { InstallCommandComponent } from '../../shared/install-command';

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
    DocsImports,
    CodeBlockComponent,
    InstallCommandComponent,
    MapComponent,
    MapControlsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-docs-page
      title="Installation"
      description="How to install and set up ng-mapcn in your project."
    >
      <app-docs-section title="Prerequisites">
        <p>
          An Angular 22+ project.
          <a href="https://tailwindcss.com" target="_blank" rel="noopener noreferrer" [class]="link"
            >Tailwind CSS</a
          >
          is optional but recommended for styling marker and popup content.
        </p>
      </app-docs-section>

      <app-docs-section title="Installation">
        <p>Run the following command to add the map components:</p>
        <app-install-command />
        <p>
          This copies the component sources into your app (shadcn-style), installs
          <code [class]="code">maplibre-gl</code> and registers its CSS.
        </p>
        <p>Alternatively, install it as a regular npm package:</p>
        <app-code-block code="npm install ng-mapcn maplibre-gl" lang="bash" [showLineNumbers]="false" />
      </app-docs-section>

      <app-docs-section title="Usage">
        <p>Import and use the map components:</p>
        <app-code-block [code]="usageCode" />
        <div class="bg-card h-[320px] overflow-hidden rounded-lg border shadow-sm">
          <ng-map [center]="[-74.006, 40.7128]" [zoom]="11">
            <ng-map-controls />
          </ng-map>
        </div>
        <app-docs-note>
          <strong>Note:</strong> The map uses free CARTO basemap tiles by default. Tiles
          automatically switch between light and dark themes.
        </app-docs-note>
      </app-docs-section>
    </app-docs-page>
  `,
})
export class InstallationComponent {
  readonly usageCode = USAGE_CODE;

  /** mapcn `DocsLink` / `DocsCode`. */
  protected readonly link = 'text-foreground font-medium underline underline-offset-4';
  protected readonly code = 'bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm';
}
