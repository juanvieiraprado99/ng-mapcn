import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  signal,
  type Type,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { BLOCK_COMPONENTS, findBlock } from '@/blocks/registry';

/**
 * mapcn `/view/[name]`: a block alone on the page — the iframe source of the
 * gallery previews and the "Open in new tab" target.
 */
@Component({
  selector: 'app-block-view',
  standalone: true,
  imports: [NgComponentOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bg-background block min-h-screen' },
  template: `
    @if (component(); as block) {
      <ng-container *ngComponentOutlet="block" />
    } @else if (missing()) {
      <div class="flex min-h-screen flex-col items-center justify-center gap-2 text-sm">
        <p class="text-muted-foreground">Block not found.</p>
        <a routerLink="/blocks" class="text-foreground font-medium underline underline-offset-4"
          >Back to blocks</a
        >
      </div>
    }
  `,
})
export class BlockViewComponent {
  /** Route param, bound through `withComponentInputBinding`. */
  readonly name = input.required<string>();

  protected readonly component = signal<Type<unknown> | null>(null);
  protected readonly missing = signal(false);

  constructor() {
    effect(() => {
      const name = this.name();
      const block = findBlock(name);
      const load = BLOCK_COMPONENTS[name];
      if (!block || !load) {
        this.missing.set(true);
        return;
      }
      void load().then((type) => this.component.set(type));
    });
  }
}
