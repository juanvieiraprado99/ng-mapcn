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
        <p>It asks two questions (press Enter to keep the defaults):</p>
        <app-code-block [code]="initPrompts" lang="bash" [showLineNumbers]="false" />
        <p>Then it:</p>
        <ul class="ml-6 list-disc space-y-1">
          <li>
            installs <code [class]="code">maplibre-gl</code> with your workspace's package manager
            (npm, pnpm, yarn or bun), and registers its CSS and worker assets;
          </li>
          <li>adds the global popup styles;</li>
          <li>
            copies only the core <code [class]="code">&lt;ng-map&gt;</code> into
            <code [class]="code">src/app/shared/components/map</code> (shadcn-style: the code is
            yours);
          </li>
          <li>
            maps the import alias in <code [class]="code">tsconfig.json</code>
            (<code [class]="code">"&#64;/*": ["./src/app/*"]</code> when your app has no
            <code [class]="code">&#64;/*</code> yet, never <code [class]="code">baseUrl</code>), so
            you import with <code [class]="code">from '&#64;/shared/components/map'</code>;
          </li>
          <li>
            saves both answers in <code [class]="code">ng-mapcn.json</code> at the workspace root,
            where <code [class]="code">add</code> and <code [class]="code">list</code> read them.
          </li>
        </ul>
        <p>
          Pass <code [class]="code">--yes</code> to skip the questions, or
          <code [class]="code">--path</code> and <code [class]="code">--alias</code> to answer
          them up front. The Angular CLI equivalent is <code [class]="code">ng add ng-mapcn</code>.
          Every example on this site imports from
          <code [class]="code">&#64;/shared/components/map</code>; if you chose another alias, use
          yours.
        </p>
        <p>
          In a workspace with several projects, <code [class]="code">init</code> sets up the
          application (and copies into its <code [class]="code">src/app</code>); with more than one
          application it takes the first and says so: pass
          <code [class]="code">--project &lt;name&gt;</code> to choose. Running it again keeps the
          folder, alias and project saved in <code [class]="code">ng-mapcn.json</code>.
        </p>
        <app-docs-note>
          <strong>Upgrading from 22.0.0-beta.9 or earlier:</strong> <code [class]="code">ng add</code>
          used to copy everything to <code [class]="code">src/app/components/ui/map</code>, without
          <code [class]="code">ng-mapcn.json</code>. <code [class]="code">add</code> keeps using
          that folder, and <code [class]="code">init</code> adopts it (no second copy): run it once
          to save the folder and map an import alias.
        </app-docs-note>
        <app-docs-note>
          <strong>Bundle budget:</strong> a fresh Angular app exceeds the default 1 MB initial
          budget once <code [class]="code">maplibre-gl</code> is used (about 1.4 MB). Lazy-load the
          route that holds the map, or use <code [class]="code">&#64;defer</code>, to keep it out
          of the initial bundle before you raise <code [class]="code">budgets</code> in
          <code [class]="code">angular.json</code>.
        </app-docs-note>
        <p>
          Alternatively, install it as a regular npm package, and import from
          <code [class]="code">ng-mapcn</code> instead of the alias:
        </p>
        <app-install-command packages="ng-mapcn maplibre-gl" />
      </app-docs-section>

      <app-docs-section title="Add components" anchor="add-components">
        <p>
          Then copy the components you need, one command for as many as you want. They land in
          the folder saved in <code [class]="code">ng-mapcn.json</code>:
        </p>
        <app-install-command cli="add marker-popup controls" />
        <p>
          Each item brings the files it depends on, and the core is always included. Files that
          already exist and differ from the source (line endings aside) are kept, so your edits are
          safe; <code [class]="code">add</code> lists them at the end, because the components it
          just copied may need their newer version. Pass
          <code [class]="code">--overwrite</code> to replace them (this also replaces customized
          core or shared files in the closure, such as
          <code [class]="code">map.component.ts</code>). The
          <code [class]="code">index.ts</code> barrel is regenerated on every
          <code [class]="code">add</code>, so hand edits to it are lost. Pass
          <code [class]="code">--all</code> to copy every item except
          <code [class]="code">draw</code>, which is opt-in because it adds
          <code [class]="code">terra-draw</code>. Run
          <code [class]="code">npx ng-mapcn@latest list</code> to see the items and which ones are
          already installed. The Angular CLI equivalent is
          <code [class]="code">ng g ng-mapcn:add marker-popup controls</code>.
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
        <p>Import the components from your alias and use them:</p>
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
  readonly initPrompts = `? Where should the map components be copied? (src/app/shared/components/map)
? Import alias for them? (@/shared/components/map)`;
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
