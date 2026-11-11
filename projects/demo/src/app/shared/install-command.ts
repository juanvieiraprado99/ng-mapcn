import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideCopy } from '@ng-icons/lucide';

import { ZardButtonComponent } from '@/shared/components/button';

import { injectCopyToClipboard } from './clipboard';
import {
  PACKAGE_MANAGERS,
  type PackageManager,
  PackageManagerService,
} from './package-manager.service';

/** Keys that move the selection in the package-manager radio group (WAI-ARIA radio pattern). */
const STEP: Record<string, (index: number, count: number) => number> = {
  ArrowRight: (i, n) => (i + 1) % n,
  ArrowDown: (i, n) => (i + 1) % n,
  ArrowLeft: (i, n) => (i - 1 + n) % n,
  ArrowUp: (i, n) => (i - 1 + n) % n,
  Home: () => 0,
  End: (_i, n) => n - 1,
};

/**
 * mapcn `InstallCommand`: one command per package manager, picked with a radio group (one choice
 * for the whole site, see PackageManagerService).
 * By default the command runs the project's own Angular CLI (`ng add`) through each manager,
 * which then installs with that same manager. With `cli`, it runs the standalone `ng-mapcn` CLI
 * (`npx ng-mapcn@latest <cli>`). With `packages`, it installs them directly.
 */
@Component({
  selector: 'app-install-command',
  standalone: true,
  imports: [NgIcon, ZardButtonComponent],
  viewProviders: [provideIcons({ lucideCheck, lucideCopy })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="bg-surface relative w-full overflow-hidden rounded-lg">
      <div class="flex items-center justify-between border-b pr-2 pl-[5px]">
        <div
          role="radiogroup"
          aria-label="Package manager"
          class="text-muted-foreground inline-flex h-10 w-fit items-center justify-center gap-1 bg-transparent p-[3px]"
        >
          @for (tab of tabs(); track tab.manager) {
            <button
              type="button"
              role="radio"
              [attr.aria-checked]="tab.manager === active()"
              [attr.tabindex]="tab.manager === active() ? 0 : -1"
              [attr.data-state]="tab.manager === active() ? 'active' : 'inactive'"
              class="text-foreground/60 hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground data-[state=active]:text-foreground after:bg-foreground relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 font-mono text-xs font-medium whitespace-nowrap transition-all after:absolute after:inset-x-0 after:bottom-[-5px] after:h-0.5 after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100"
              (click)="select(tab.manager)"
              (keydown)="onKeydown($event)"
            >
              {{ tab.manager }}
            </button>
          }
        </div>
        <button
          z-button
          zType="ghost"
          zSize="icon-sm"
          type="button"
          class="text-muted-foreground"
          [attr.aria-label]="clipboard.copied() ? 'Copied' : 'Copy command'"
          (click)="clipboard.copy(command())"
        >
          <ng-icon [name]="clipboard.copied() ? 'lucideCheck' : 'lucideCopy'" size="16" />
        </button>
      </div>
      <!-- tabindex: long commands scroll, and a scrollable region must be keyboard reachable. -->
      <pre
        class="overflow-x-auto p-4 text-sm"
        tabindex="0"
      ><code class="font-mono">{{ command() }}</code></pre>
    </div>
  `,
})
export class InstallCommandComponent {
  /** Package passed to `ng add`. */
  readonly name = input('ng-mapcn');
  /** Extra `ng add` arguments, e.g. `--skip-install`. */
  readonly args = input('');
  /** Space-separated packages to install directly (`npm install ...`) instead of `ng add`. */
  readonly packages = input<string>();
  /** `ng-mapcn` CLI arguments, e.g. `init` or `add marker route`, run with each manager's executor. */
  readonly cli = input<string>();

  private readonly managers = inject(PackageManagerService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly clipboard = injectCopyToClipboard();
  protected readonly active = this.managers.current;

  protected readonly tabs = computed(() => {
    const packages = this.packages();
    const cli = this.cli();
    const args = this.args() ? ` ${this.args()}` : '';
    return PACKAGE_MANAGERS.map(({ manager, exec, dlx, add }) => ({
      manager,
      command: cli
        ? `${dlx} ng-mapcn@latest ${cli}`
        : packages
          ? `${add} ${packages}`
          : `${exec} ng add ${this.name()}${args}`,
    }));
  });
  protected readonly command = computed(
    () => this.tabs().find((tab) => tab.manager === this.active())?.command ?? '',
  );

  constructor() {
    // After hydration, so the prerendered default does not mismatch the saved choice.
    afterNextRender(() => this.managers.restore());
  }

  protected select(manager: PackageManager): void {
    this.managers.select(manager);
  }

  /** Arrow keys, Home and End move the selection and the focus, as in a native radio group. */
  protected onKeydown(event: KeyboardEvent): void {
    const step = STEP[event.key];
    if (!step) return;
    event.preventDefault();
    const index = PACKAGE_MANAGERS.findIndex((entry) => entry.manager === this.active());
    const next = PACKAGE_MANAGERS[step(index, PACKAGE_MANAGERS.length)].manager;
    this.select(next);
    // Focus follows the selection once the roving tabindex is updated.
    queueMicrotask(() =>
      this.host.nativeElement
        .querySelectorAll<HTMLButtonElement>('[role="radio"]')
        [PACKAGE_MANAGERS.findIndex((entry) => entry.manager === next)]?.focus(),
    );
  }
}
