import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight } from '@ng-icons/lucide';
import { DocsTocComponent, type TocItem } from '@/layout/docs-toc';
import { ZardButtonComponent } from '@/shared/components/button';
import { docsNeighbours } from '@/shared/site-navigation';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * mapcn `DocsLayout` (the page body, not the sidebar shell): title and
 * description, the sections, prev/next links and the "On This Page" rail.
 * Sections register themselves here to build the table of contents.
 */
@Component({
  selector: 'app-docs-page',
  standalone: true,
  imports: [RouterLink, NgIcon, ZardButtonComponent, DocsTocComponent],
  viewProviders: [provideIcons({ lucideChevronLeft, lucideChevronRight })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-w-0 flex-1' },
  template: `
    <div class="mx-auto flex max-w-[50rem] min-w-0 flex-1 flex-col pt-10 pb-20 lg:px-4">
      <div class="space-y-2">
        <h1 class="text-foreground text-3xl font-semibold tracking-tight">{{ title() }}</h1>
        <p class="text-muted-foreground text-base leading-relaxed">{{ description() }}</p>
      </div>
      <div class="mt-12 mb-12 space-y-12">
        <ng-content />
      </div>
      @if (neighbours.prev || neighbours.next) {
        <div class="mt-auto flex items-center justify-between gap-4">
          @if (neighbours.prev; as prev) {
            <a
              z-button
              zType="ghost"
              zSize="sm"
              class="-ml-2 h-auto py-2"
              [routerLink]="prev.href"
            >
              <ng-icon name="lucideChevronLeft" size="16" />
              {{ prev.title }}
            </a>
          } @else {
            <div></div>
          }
          @if (neighbours.next; as next) {
            <a
              z-button
              zType="ghost"
              zSize="sm"
              class="-mr-2 h-auto py-2"
              [routerLink]="next.href"
            >
              {{ next.title }}
              <ng-icon name="lucideChevronRight" size="16" />
            </a>
          }
        </div>
      }
    </div>

    <aside class="hidden w-48 shrink-0 xl:block">
      <nav
        class="sticky top-14 max-h-[calc(100svh-3.5rem)] overflow-y-auto pt-10 pb-10 [scrollbar-gutter:stable]"
      >
        @if (tocItems().length > 0) {
          <app-docs-toc [items]="tocItems()" />
        }
      </nav>
    </aside>
  `,
})
export class DocsPageComponent {
  readonly title = input.required<string>();
  readonly description = input('');

  protected readonly neighbours = docsNeighbours(routePath(inject(ActivatedRoute)));

  private readonly sections = signal<DocsSectionComponent[]>([]);
  protected readonly tocItems = computed<TocItem[]>(() =>
    this.sections()
      .map((section) => ({ title: section.title() ?? '', slug: section.slug() }))
      .filter((item) => item.title),
  );

  register(section: DocsSectionComponent): void {
    this.sections.update((sections) => [...sections, section]);
  }

  unregister(section: DocsSectionComponent): void {
    this.sections.update((sections) => sections.filter((s) => s !== section));
  }
}

/** mapcn `DocsSection`: an anchored h2 and prose-styled content. */
@Component({
  selector: 'app-docs-section',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section class="scroll-m-24 space-y-5" [attr.id]="title() ? slug() : null">
      @if (title(); as heading) {
        <div class="group flex w-fit items-baseline gap-2">
          <h2 class="text-foreground text-xl font-semibold tracking-tight">{{ heading }}</h2>
          <a
            [routerLink]="[]"
            [fragment]="slug()"
            [attr.aria-label]="'Link to ' + heading"
            class="text-muted-foreground/60 hover:text-foreground text-xl font-semibold opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >#</a
          >
        </div>
      }
      <div
        class="[&_em]:text-muted-foreground space-y-4 text-base leading-7 [&_strong]:font-medium [&>ol]:list-decimal [&>ol]:space-y-2 [&>ol]:pl-5 [&>ol>li]:leading-7 [&>p]:leading-7 [&>ul]:list-disc [&>ul]:space-y-2 [&>ul]:pl-5 [&>ul>li]:leading-7"
      >
        <ng-content />
      </div>
    </section>
  `,
})
export class DocsSectionComponent {
  readonly title = input<string>();
  /** Anchor id; derived from the title when omitted. */
  readonly anchor = input<string>();

  readonly slug = computed(() => this.anchor() ?? slugify(this.title() ?? ''));

  constructor() {
    const page = inject(DocsPageComponent, { optional: true });
    page?.register(this);
    inject(DestroyRef).onDestroy(() => page?.unregister(this));
  }
}

/** mapcn `DocsNote`: a highlighted callout. */
@Component({
  selector: 'app-docs-note',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'bg-surface text-foreground/80 [&_strong]:text-foreground block rounded-lg px-5 py-4 text-[15px] leading-relaxed [&_strong]:font-medium',
  },
  template: `<ng-content />`,
})
export class DocsNoteComponent {}

/** Absolute path of the route a page component was activated for. */
function routePath(route: ActivatedRoute): string {
  const segments = route.snapshot.pathFromRoot.flatMap((r) => r.url.map((s) => s.path));
  return '/' + segments.filter(Boolean).join('/');
}

export const DocsImports = [DocsPageComponent, DocsSectionComponent, DocsNoteComponent] as const;
