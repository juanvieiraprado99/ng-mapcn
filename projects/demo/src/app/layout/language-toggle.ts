import { afterNextRender, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLanguages } from '@ng-icons/lucide';

import { ZardButtonComponent } from '@/shared/components/button';
import { ZardSkeletonComponent } from '@/shared/components/skeleton';
import { LanguageService } from '@/shared/i18n/language.service';

/**
 * EN / pt-BR switch. Like the theme toggle, a skeleton stands in until the first
 * client render: the server cannot know the visitor's language.
 */
@Component({
  selector: 'app-language-toggle',
  standalone: true,
  imports: [NgIcon, ZardButtonComponent, ZardSkeletonComponent],
  viewProviders: [provideIcons({ lucideLanguages })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (mounted()) {
      <button
        z-button
        zType="ghost"
        zSize="sm"
        type="button"
        class="gap-1 px-2 text-xs font-medium"
        [attr.aria-label]="i18n.messages().language.switchTo"
        [title]="i18n.messages().language.switchTo"
        (click)="i18n.toggle()"
      >
        <ng-icon name="lucideLanguages" size="16" aria-hidden="true" />
        <span aria-hidden="true">{{ i18n.messages().language.short }}</span>
      </button>
    } @else {
      <z-skeleton class="block h-8 w-14" />
    }
  `,
})
export class LanguageToggleComponent {
  protected readonly i18n = inject(LanguageService);
  protected readonly mounted = signal(false);

  constructor() {
    afterNextRender(() => this.mounted.set(true));
  }
}
