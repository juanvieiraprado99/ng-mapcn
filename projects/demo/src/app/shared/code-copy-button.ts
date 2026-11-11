import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideCopy } from '@ng-icons/lucide';

import { ZardButtonComponent } from '@/shared/components/button';

import { injectCopyToClipboard } from './clipboard';

/** mapcn `CodeCopyButton`. */
@Component({
  selector: 'app-code-copy-button',
  standalone: true,
  imports: [NgIcon, ZardButtonComponent],
  viewProviders: [provideIcons({ lucideCheck, lucideCopy })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <button
      z-button
      zType="ghost"
      zSize="icon-sm"
      type="button"
      [attr.aria-label]="clipboard.copied() ? 'Copied' : label()"
      class="text-muted-foreground bg-code"
      (click)="copy()"
    >
      <ng-icon [name]="clipboard.copied() ? 'lucideCheck' : 'lucideCopy'" size="16" />
    </button>
  `,
})
export class CodeCopyButtonComponent {
  readonly text = input.required<string>();
  readonly label = input('Copy code');
  /** Emitted after a successful copy only. */
  readonly copiedText = output<void>();

  protected readonly clipboard = injectCopyToClipboard();

  protected async copy(): Promise<void> {
    if (await this.clipboard.copy(this.text())) this.copiedText.emit();
  }
}
