import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMapPin } from '@ng-icons/lucide';
import type { ClassValue } from 'clsx';
import { mergeClasses } from '@/shared/utils/merge-classes';

/** Wordmark: map pin + "ng-mapcn" (mapcn `Logo`). */
@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [RouterLink, NgIcon],
  viewProviders: [provideIcons({ lucideMapPin })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    @if (isLink()) {
      <a routerLink="/" [class]="classes()">
        <ng-icon name="lucideMapPin" size="16" />
        ng-mapcn
      </a>
    } @else {
      <div [class]="classes()">
        <ng-icon name="lucideMapPin" size="16" />
        ng-mapcn
      </div>
    }
  `,
})
export class LogoComponent {
  readonly isLink = input(true);
  readonly class = input<ClassValue>('');

  protected readonly classes = computed(() =>
    mergeClasses(
      'inline-flex items-center gap-1.5 text-lg leading-none font-bold',
      this.isLink() && 'h-8',
      this.class(),
    ),
  );
}
