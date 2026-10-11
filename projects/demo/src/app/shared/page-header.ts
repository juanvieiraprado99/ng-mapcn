import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { ClassValue } from 'clsx';
import { mergeClasses } from '@/shared/utils/merge-classes';

type HeaderAlign = 'center' | 'left';
type HeaderSize = 'default' | 'sm';

/**
 * mapcn `PageHeader` family. Children read `align`/`size` from the parent
 * (React context there, DI here) and fade up in a stagger.
 */
@Component({
  selector: 'app-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `<section [class]="classes()"><ng-content /></section>`,
})
export class PageHeaderComponent {
  readonly align = input<HeaderAlign>('center');
  readonly size = input<HeaderSize>('default');
  readonly class = input<ClassValue>('');

  protected readonly classes = computed(() =>
    mergeClasses(
      'container mx-auto flex w-full max-w-6xl flex-col',
      this.size() === 'sm' ? 'gap-3 py-14 md:py-18' : 'gap-4 py-16 md:py-20 lg:py-24 lg:pb-20',
      this.align() === 'center' ? 'items-center text-center' : 'items-start text-left',
      this.class(),
    ),
  );
}

@Component({
  selector: 'app-page-header-heading',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `<h1 [class]="classes()" style="--stagger: 1"><ng-content /></h1>`,
})
export class PageHeaderHeadingComponent {
  private readonly header = inject(PageHeaderComponent);
  readonly class = input<ClassValue>('');

  protected readonly classes = computed(() =>
    mergeClasses(
      'animate-fade-up animate-stagger text-primary max-w-4xl font-bold tracking-tight',
      this.header.size() === 'sm'
        ? 'text-4xl font-semibold md:text-5xl'
        : 'text-4xl sm:text-5xl md:text-6xl',
      this.header.align() === 'center' ? 'text-center' : 'text-left',
      this.class(),
    ),
  );
}

@Component({
  selector: 'app-page-header-description',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `<p [class]="classes()" style="--stagger: 2"><ng-content /></p>`,
})
export class PageHeaderDescriptionComponent {
  private readonly header = inject(PageHeaderComponent);
  readonly class = input<ClassValue>('');

  protected readonly classes = computed(() =>
    mergeClasses(
      'text-foreground/80 animate-fade-up animate-stagger max-w-2xl leading-relaxed',
      this.header.size() === 'sm'
        ? 'text-muted-foreground text-base sm:text-lg'
        : 'sm:text-lg md:text-xl',
      this.header.align() === 'center' ? 'text-center' : 'text-left',
      this.class(),
    ),
  );
}

@Component({
  selector: 'app-page-actions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `<div [class]="classes()" style="--stagger: 3"><ng-content /></div>`,
})
export class PageActionsComponent {
  private readonly header = inject(PageHeaderComponent);
  readonly class = input<ClassValue>('');

  protected readonly classes = computed(() =>
    mergeClasses(
      'animate-fade-up animate-stagger mt-3 flex flex-wrap items-center gap-3',
      this.header.align() === 'center' ? 'justify-center' : 'justify-start',
      this.class(),
    ),
  );
}

export const PageHeaderImports = [
  PageHeaderComponent,
  PageHeaderHeadingComponent,
  PageHeaderDescriptionComponent,
  PageActionsComponent,
] as const;
