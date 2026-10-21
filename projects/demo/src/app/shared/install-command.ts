import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideCopy } from '@ng-icons/lucide';

import { ZardButtonComponent } from '@/shared/components/button';

const PACKAGE_MANAGERS = [
  { manager: 'pnpm', exec: 'pnpm', add: 'pnpm add' },
  { manager: 'npm', exec: 'npx', add: 'npm install' },
  { manager: 'yarn', exec: 'yarn', add: 'yarn add' },
  { manager: 'bun', exec: 'bunx', add: 'bun add' },
] as const;

/**
 * mapcn `InstallCommand`: one command per package manager on "line" tabs.
 * By default the command runs the project's own Angular CLI (`ng add`) through each manager,
 * which then installs with that same manager. With `packages`, it installs them directly.
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
          role="tablist"
          class="text-muted-foreground inline-flex h-10 w-fit items-center justify-center gap-1 bg-transparent p-[3px]"
        >
          @for (tab of tabs(); track tab.manager) {
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="tab.manager === active()"
              [attr.data-state]="tab.manager === active() ? 'active' : 'inactive'"
              class="text-foreground/60 hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground data-[state=active]:text-foreground after:bg-foreground relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 font-mono text-xs font-medium whitespace-nowrap transition-all after:absolute after:inset-x-0 after:bottom-[-5px] after:h-0.5 after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100"
              (click)="active.set(tab.manager)"
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
          [attr.aria-label]="copied() ? 'Copied' : 'Copy command'"
          (click)="copy()"
        >
          <ng-icon [name]="copied() ? 'lucideCheck' : 'lucideCopy'" size="16" />
        </button>
      </div>
      <pre class="overflow-x-auto p-4 text-sm"><code class="font-mono">{{ command() }}</code></pre>
    </div>
  `,
})
export class InstallCommandComponent {
  /** Package passed to `ng add`. */
  readonly name = input('ng-mapcn');
  /** Extra `ng add` arguments, e.g. `--draw`. */
  readonly args = input('');
  /** Space-separated packages to install directly (`npm install ...`) instead of `ng add`. */
  readonly packages = input<string>();

  protected readonly tabs = computed(() => {
    const packages = this.packages();
    const args = this.args() ? ` ${this.args()}` : '';
    return PACKAGE_MANAGERS.map(({ manager, exec, add }) => ({
      manager,
      command: packages ? `${add} ${packages}` : `${exec} ng add ${this.name()}${args}`,
    }));
  });
  protected readonly active = signal<string>(PACKAGE_MANAGERS[0].manager);
  protected readonly command = computed(
    () => this.tabs().find((tab) => tab.manager === this.active())?.command ?? '',
  );
  protected readonly copied = signal(false);

  protected async copy(): Promise<void> {
    await navigator.clipboard.writeText(this.command());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }
}
