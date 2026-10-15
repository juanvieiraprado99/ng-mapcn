import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

import { ZardButtonComponent } from '@/shared/components/button';

import { CodeCopyButtonComponent } from './code-copy-button';
import { CodeSurfaceComponent } from './code-surface';
import type { CodeLang } from './highlighter';

let nextId = 0;

/**
 * mapcn `ComponentPreview`: the live example on top, its source below —
 * collapsed behind a fade with a "View Code" button until expanded.
 */
@Component({
  selector: 'app-component-preview',
  standalone: true,
  imports: [ZardButtonComponent, CodeCopyButtonComponent, CodeSurfaceComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', '[attr.lang]': 'null' },
  template: `
    <div class="w-full overflow-hidden rounded-lg border" [style.--preview-height]="height()">
      <div class="h-(--preview-height) w-full overflow-hidden">
        <ng-content />
      </div>

      @if (code()) {
        <div class="relative w-full overflow-hidden border-t">
          <div class="absolute top-2 right-2 z-10">
            <app-code-copy-button [text]="code()" />
          </div>
          <app-code-surface
            [id]="codeId"
            [code]="code()"
            [lang]="lang()"
            [class]="expanded() ? 'max-h-[420px] overflow-auto' : 'max-h-32 overflow-hidden'"
          />
          @if (!expanded()) {
            <div
              class="from-surface to-surface/0 pointer-events-none absolute inset-x-0 bottom-0 flex w-full items-center justify-center bg-linear-to-t pt-20 pb-4"
            >
              <button
                z-button
                zType="outline"
                zSize="sm"
                type="button"
                class="bg-background hover:bg-muted dark:bg-background dark:hover:bg-muted pointer-events-auto"
                [attr.aria-expanded]="expanded()"
                [attr.aria-controls]="codeId"
                (click)="expanded.set(true)"
              >
                View Code
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ComponentPreviewComponent {
  readonly code = input('');
  /** Defaults to a guess based on the snippet (see `detectLang`). */
  readonly lang = input<CodeLang>();
  /** Height of the preview panel. The expanded code block caps separately. */
  readonly height = input('420px');

  protected readonly codeId = `component-preview-code-${nextId++}`;
  protected readonly expanded = signal(false);
}
