import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

export interface TocItem {
  title: string;
  slug: string;
}

/** mapcn `DocsToc`: "On This Page" with the section in view highlighted. */
@Component({
  selector: 'app-docs-toc',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav aria-label="On this page" class="flex flex-col">
      <p class="text-muted-foreground/70 mb-3 text-[11px] font-semibold tracking-wide uppercase">
        On This Page
      </p>
      <div class="flex flex-col gap-1.5">
        @for (item of ordered(); track item.slug) {
          <a
            [routerLink]="[]"
            [fragment]="item.slug"
            class="py-0.5 text-sm no-underline transition-colors"
            [class]="
              item.slug === active()
                ? 'text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground'
            "
            >{{ item.title }}</a
          >
        }
      </div>
    </nav>
  `,
})
export class DocsTocComponent {
  readonly items = input.required<TocItem[]>();

  protected readonly active = signal<string | null>(null);
  /** Items in document order — sections inside @for blocks register late. */
  protected readonly ordered = signal<TocItem[]>([]);

  constructor() {
    afterRenderEffect((onCleanup) => {
      const items = [...this.items()].sort((a, b) => {
        const elA = document.getElementById(a.slug);
        const elB = document.getElementById(b.slug);
        if (!elA || !elB) return 0;
        return elA.compareDocumentPosition(elB) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      });
      this.ordered.set(items);
      const ids = items.map((item) => item.slug);
      this.active.set(ids[0] ?? null);

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) this.active.set(entry.target.id);
          }
        },
        { rootMargin: '0% 0% -80% 0%' },
      );
      for (const id of ids) {
        const element = document.getElementById(id);
        if (element) observer.observe(element);
      }
      onCleanup(() => observer.disconnect());
    });
  }
}
