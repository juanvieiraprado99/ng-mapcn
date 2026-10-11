import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CodeCopyButtonComponent } from './code-copy-button';
import { CodeSurfaceComponent } from './code-surface';
import type { CodeLang } from './highlighter';

/** mapcn `CodeBlock`: a highlighted snippet with line numbers and a copy button. */
@Component({
  selector: 'app-code-block',
  standalone: true,
  imports: [CodeCopyButtonComponent, CodeSurfaceComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="relative w-full overflow-hidden rounded-lg">
      @if (filename(); as name) {
        <div
          class="bg-code border-border/60 flex items-center justify-between gap-3 border-b py-1 pr-2 pl-4"
        >
          <span class="text-muted-foreground truncate font-mono text-xs">{{ name }}</span>
          @if (showCopyButton()) {
            <app-code-copy-button [text]="code()" />
          }
        </div>
      } @else if (showCopyButton()) {
        <div class="absolute top-2 right-2 z-10">
          <app-code-copy-button [text]="code()" />
        </div>
      }
      <app-code-surface
        [code]="code()"
        [lang]="lang()"
        [class]="showLineNumbers() ? 'overflow-auto' : 'no-line-numbers overflow-auto pl-4'"
      />
    </div>
  `,
})
export class CodeBlockComponent {
  readonly code = input.required<string>();
  /** Defaults to a guess based on the snippet (see `detectLang`). */
  readonly lang = input<CodeLang>();
  readonly filename = input<string>();
  readonly showCopyButton = input(true);
  readonly showLineNumbers = input(true);
}
