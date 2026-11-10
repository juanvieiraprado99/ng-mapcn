import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ComponentPreviewComponent } from './component-preview';
import { COPY_PASTE_ALIAS, toCopyPasteImports } from './copy-paste-imports';
import { DocsSectionComponent } from './docs';
import type { CodeLang } from './highlighter';
import { InstallCommandComponent } from './install-command';
import { installItemsFor } from './install-items';

/**
 * A docs section with a live example: mapcn's `DocsSection` + `ComponentPreview`
 * pair. Text marked `description` becomes the paragraph above the preview. When the snippet
 * imports registry items, an `npx ng-mapcn@latest add …` command for them sits under it. The code
 * shows `ng-mapcn` imports as the copy-paste alias, with a one-line note for npm package users.
 */
@Component({
  selector: 'app-example-section',
  standalone: true,
  imports: [ComponentPreviewComponent, DocsSectionComponent, InstallCommandComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', '[attr.lang]': 'null' },
  template: `
    <app-docs-section [title]="title()" [anchor]="sectionId()">
      <p><ng-content select="[description]" /></p>
      <ng-content select="[after-description]" />
      @if (installCli(); as cli) {
        <app-install-command data-testid="example-install" [cli]="cli" />
      }
      @if (importsAlias()) {
        <p class="text-muted-foreground text-xs" data-testid="example-import-note">
          Imports use <code class="font-mono">{{ alias }}</code
          >, the folder <code class="font-mono">init</code> sets up. With the npm package, import
          from <code class="font-mono">ng-mapcn</code>.
        </p>
      }
      <app-component-preview [code]="code()" [lang]="lang()" [height]="height()">
        <ng-content />
      </app-component-preview>
    </app-docs-section>
  `,
})
export class ExampleSectionComponent {
  readonly title = input.required<string>();
  readonly sectionId = input.required<string>();
  readonly code = input('');
  /** Defaults to a guess based on the snippet (see `detectLang`). */
  readonly lang = input<CodeLang>();
  readonly height = input('420px');

  protected readonly alias = COPY_PASTE_ALIAS;
  /** Whether the shown code imports ng-mapcn (displayed as the copy-paste alias). */
  protected readonly importsAlias = computed(() => toCopyPasteImports(this.code()) !== this.code());

  /** `add <items>` for what the snippet imports, or null when it only needs the core. */
  protected readonly installCli = computed(() => {
    const items = installItemsFor(this.code());
    return items.length ? `add ${items.join(' ')}` : null;
  });
}
