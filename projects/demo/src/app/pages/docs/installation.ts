import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MapComponent, MapControlsComponent } from 'ng-mapcn';

import { CodeBlockComponent } from '../../shared/code-block';
import { DocsImports } from '../../shared/docs';
import { InstallCommandComponent } from '../../shared/install-command';
import { PropTableComponent } from '../../shared/prop-table';
import { REGISTRY_ITEMS } from './registry-items.generated';

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
    PropTableComponent,
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
        <p>Run the following command to set up the map:</p>
        <app-install-command cli="init" />
        <p>
          This installs <code [class]="code">maplibre-gl</code>, registers its CSS and worker
          assets, adds the global popup styles and copies only the core
          <code [class]="code">&lt;ng-map&gt;</code> component into your app (shadcn-style). It
          installs with your workspace's package manager (npm, pnpm, yarn or bun). The Angular CLI
          equivalent is <code [class]="code">ng add ng-mapcn</code>; pass
          <code [class]="code">--path</code> to change the target folder (default
          <code [class]="code">src/app/components/ui/map</code>).
        </p>
        <p>Alternatively, install it as a regular npm package:</p>
        <app-install-command packages="ng-mapcn maplibre-gl" />
      </app-docs-section>

      <app-docs-section title="Add components" anchor="add-components">
        <p>Then copy the components you need, one command for as many as you want:</p>
        <app-install-command cli="add marker route" />
        <p>
          Each item brings the files it depends on, and the core is always included. Files that
          already exist are skipped (and logged), so your edits are safe; pass
          <code [class]="code">--overwrite</code> to replace them. Pass
          <code [class]="code">--all</code> to copy every item except
          <code [class]="code">draw</code>, which is opt-in because it adds
          <code [class]="code">terra-draw</code>. Run
          <code [class]="code">npx ng-mapcn@latest list</code> to see the items and which ones are
          already installed. The Angular CLI equivalent is
          <code [class]="code">ng g ng-mapcn:add marker route</code>.
        </p>
        <p>
          Dependencies point one way: <code [class]="code">marker-popup</code> pulls in
          <code [class]="code">marker</code>, but adding
          <code [class]="code">marker</code> alone does not copy the popup or tooltip. Names accept
          the component form too (<code [class]="code">map-marker</code>,
          <code [class]="code">Marker</code>) and commas
          (<code [class]="code">marker,route</code>).
        </p>
        <app-prop-table
          [rows]="items"
          nameLabel="Item"
          typeLabel="Depends on"
          [showDefault]="false"
        />
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

      <app-docs-section title="AI agent skill">
        <p>
          Using a coding agent (Claude Code, Cursor, Codex, GitHub Copilot, Windsurf, Gemini and
          others)? Install the
          <a [href]="skillUrl" target="_blank" rel="noopener noreferrer" [class]="link"
            >ng-mapcn skill</a
          >
          so it uses the real API (selectors, inputs, outputs, setup and recipes) instead of
          guessing:
        </p>
        <app-code-block [code]="skillCommand" lang="bash" [showLineNumbers]="false" />
        <p>
          It works with the
          <a href="https://skills.sh" target="_blank" rel="noopener noreferrer" [class]="link"
            >skills.sh</a
          >
          CLI. Pass <code [class]="code">--list</code> to preview the skill, or
          <code [class]="code">--skill ng-mapcn</code> to install it explicitly. Agents that do not
          support skills can read
          <a href="/llms-full.txt" target="_blank" rel="noopener" [class]="link">llms-full.txt</a> instead.
        </p>
      </app-docs-section>
    </app-docs-page>
  `,
})
export class InstallationComponent {
  readonly usageCode = USAGE_CODE;
  /** Every item except the core, which `init` already copies. */
  protected readonly items = REGISTRY_ITEMS.filter((item) => item.name !== 'core').map((item) => ({
    name: item.name,
    type: [...item.dependsOn, ...item.packages].join(', ') || '—',
    default: '',
    description: item.description,
  }));
  readonly skillCommand = 'npx skills add juanvieiraprado99/ng-mapcn';
  readonly skillUrl = 'https://github.com/juanvieiraprado99/ng-mapcn/tree/main/skills/ng-mapcn';

  /** mapcn `DocsLink` / `DocsCode`. */
  protected readonly link = 'text-foreground font-medium underline underline-offset-4';
  protected readonly code = 'bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm';
}
