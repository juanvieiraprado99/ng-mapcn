import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ClassValue } from 'clsx';

import { mergeClasses } from '@/shared/utils/merge-classes';

import { BrandMarkComponent } from './brand-mark';

/** Wordmark: brand mark + "ng-mapcn" (mapcn `Logo`). */
@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [RouterLink, BrandMarkComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    @if (isLink()) {
      <a routerLink="/" [class]="classes()">
        <app-brand-mark class="size-6" />
        ng-mapcn
      </a>
    } @else {
      <div [class]="classes()">
        <app-brand-mark class="size-6" />
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
      'inline-flex items-center gap-2 text-lg leading-none font-bold',
      this.isLink() && 'h-8',
      this.class(),
    ),
  );
}
