import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideCopy } from '@ng-icons/lucide';

import { ZardButtonComponent } from '@/shared/components/button';
import { LanguageService } from '@/shared/i18n/language.service';

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
      [attr.aria-label]="
        copied() ? i18n.messages().docs.copied : (label() ?? i18n.messages().docs.copyCode)
      "
      class="text-muted-foreground bg-code"
      (click)="copy()"
    >
      <ng-icon [name]="copied() ? 'lucideCheck' : 'lucideCopy'" size="16" />
    </button>
  `,
})
export class CodeCopyButtonComponent {
  readonly text = input.required<string>();
  readonly label = input<string>();
  protected readonly i18n = inject(LanguageService);
  readonly copiedText = output<void>();

  protected readonly copied = signal(false);

  protected async copy(): Promise<void> {
    await navigator.clipboard.writeText(this.text());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
    this.copiedText.emit();
  }
}
