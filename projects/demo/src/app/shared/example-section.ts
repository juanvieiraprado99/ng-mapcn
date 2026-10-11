import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ComponentPreviewComponent } from './component-preview';
import { DocsSectionComponent } from './docs';
import type { CodeLang } from './highlighter';

/**
 * A docs section with a live example: mapcn's `DocsSection` + `ComponentPreview`
 * pair. Text marked `description` becomes the paragraph above the preview.
 */
@Component({
  selector: 'app-example-section',
  standalone: true,
  imports: [ComponentPreviewComponent, DocsSectionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <app-docs-section [title]="title()" [anchor]="sectionId()">
      <p><ng-content select="[description]" /></p>
      <ng-content select="[after-description]" />
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
}
