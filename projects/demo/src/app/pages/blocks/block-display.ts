import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideMaximize, lucideTerminal } from '@ng-icons/lucide';

import { blockInstallCommands, blockUsage } from '@/blocks/block-usage';
import { type BlockMeta, zardDocsUrl } from '@/blocks/registry';
import { injectCopyToClipboard } from '@/shared/clipboard';
import { CodeBlockComponent } from '@/shared/code-block';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardSeparatorComponent } from '@/shared/components/separator';

import { BlockCodeViewerComponent } from './block-code-viewer';

type Tab = 'preview' | 'code' | 'usage';

/** shadcn new-york `TabsTrigger` on the default (muted pill) list. */
const TAB_TRIGGER =
  'text-foreground/60 hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-xs font-medium whitespace-nowrap transition-all data-[state=active]:shadow-sm';

/** mapcn `BlockDisplay` + `BlockPreview`: one block of the gallery. */
@Component({
  selector: 'app-block-display',
  standalone: true,
  imports: [
    NgIcon,
    ZardButtonComponent,
    ZardSeparatorComponent,
    BlockCodeViewerComponent,
    CodeBlockComponent,
  ],
  viewProviders: [provideIcons({ lucideCheck, lucideMaximize, lucideTerminal })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block space-y-4',
    '[attr.id]': 'block().name',
    '[style.--block-preview-height]': 'block().iframeHeight',
  },
  template: `
    <div>
      <h2 class="text-lg font-semibold tracking-tight">{{ block().title }}</h2>
      <p class="text-muted-foreground mt-0.5 text-sm">{{ block().description }}</p>
      <p class="text-muted-foreground mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        @if (block().zard.length) {
          <span>UI from zard/ui:</span>
          @for (component of block().zard; track component) {
            <a
              [href]="docsUrl(component)"
              target="_blank"
              rel="noopener noreferrer"
              class="bg-muted text-foreground hover:bg-accent rounded-md px-1.5 py-0.5 font-mono transition-colors"
              >{{ component }}</a
            >
          }
        } @else {
          <span>No zard/ui components - built with ng-mapcn and Tailwind only.</span>
        }
      </p>
    </div>

    <div class="w-full">
      <div class="flex items-center justify-between">
        <div
          role="tablist"
          [attr.aria-label]="block().title"
          class="bg-muted text-muted-foreground inline-flex h-8 w-fit items-center justify-center rounded-lg p-[3px]"
        >
          @for (tab of tabs(); track tab.id) {
            <button
              type="button"
              role="tab"
              [id]="tabId(tab.id)"
              [class]="trigger"
              [attr.aria-selected]="active() === tab.id"
              [attr.aria-controls]="panelId(tab.id)"
              [attr.tabindex]="active() === tab.id ? 0 : -1"
              [attr.data-state]="active() === tab.id ? 'active' : 'inactive'"
              (click)="select(tab.id)"
              (keydown)="onTabKeydown($event)"
            >
              {{ tab.label }}
            </button>
          }
        </div>

        <div class="hidden items-center gap-2.5 md:flex">
          <button
            z-button
            zType="outline"
            zSize="sm"
            type="button"
            class="font-mono text-xs"
            [attr.aria-label]="'Copy install command: ' + command()"
            (click)="clipboard.copy(command())"
          >
            <ng-icon [name]="clipboard.copied() ? 'lucideCheck' : 'lucideTerminal'" size="16" />
            {{ command() }}
          </button>
          <z-separator zOrientation="vertical" class="h-4! self-center!" />
          <a
            z-button
            zType="outline"
            zSize="icon-sm"
            [href]="viewUrl()"
            target="_blank"
            rel="noopener"
            aria-label="Open in new tab"
          >
            <ng-icon name="lucideMaximize" size="16" />
          </a>
        </div>
      </div>

      <!-- The preview stays mounted while the code is shown, so the iframe
           does not reload every time the tab flips back. -->
      <div
        class="mt-3"
        role="tabpanel"
        [id]="panelId('preview')"
        [attr.aria-labelledby]="tabId('preview')"
        [hidden]="active() !== 'preview'"
      >
        <div class="relative h-(--block-preview-height) w-full overflow-hidden rounded-xl border">
          <iframe
            [src]="frameUrl()"
            [title]="block().title"
            loading="lazy"
            class="size-full border-0"
          ></iframe>
        </div>
      </div>

      <!-- The panel always exists (aria-controls points at it); the viewer loads on first open. -->
      <div
        class="mt-3"
        role="tabpanel"
        [id]="panelId('code')"
        [attr.aria-labelledby]="tabId('code')"
        [hidden]="active() !== 'code'"
      >
        @if (codeOpened()) {
          <app-block-code-viewer [block]="block()" />
        }
      </div>

      @if (usage(); as snippet) {
        <div
          class="mt-3"
          role="tabpanel"
          [id]="panelId('usage')"
          [attr.aria-labelledby]="tabId('usage')"
          [hidden]="active() !== 'usage'"
        >
          <p class="text-muted-foreground mb-2 text-sm">
            In an app set up with <code class="font-mono">npx ng-mapcn@latest init</code>, add what
            the block uses:
          </p>
          <app-code-block
            class="mb-4"
            [code]="installCommands()"
            lang="bash"
            [showLineNumbers]="false"
          />
          <p class="text-muted-foreground mb-2 text-sm">
            After copying the files into your app, render the block like this.
          </p>
          <app-code-block [code]="snippet" lang="angular-ts" filename="page.component.ts" />
        </div>
      }
    </div>
  `,
})
export class BlockDisplayComponent {
  readonly block = input.required<BlockMeta>();

  protected readonly trigger = TAB_TRIGGER;
  protected readonly tabs = computed<{ id: Tab; label: string }[]>(() => [
    { id: 'preview', label: 'Preview' },
    { id: 'code', label: 'Code' },
    ...(this.usage() ? [{ id: 'usage' as const, label: 'Usage' }] : []),
  ]);
  protected readonly active = signal<Tab>('preview');
  protected readonly codeOpened = signal(false);
  protected readonly clipboard = injectCopyToClipboard();
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  /** Block sources, loaded once (lazy chunk) to derive the usage snippet. */
  private readonly sources = signal<Record<string, string> | null>(null);
  /** `null` until the sources load, and for a block whose entry component cannot be read. */
  protected readonly usage = computed(() => {
    const sources = this.sources();
    return sources ? blockUsage(this.block(), sources) : null;
  });

  private readonly sanitizer = inject(DomSanitizer);

  constructor() {
    void import('@/blocks/block-sources.generated').then((m) => this.sources.set(m.BLOCK_SOURCES));
  }

  protected readonly viewUrl = computed(() => `/view/${this.block().name}`);
  /** Same-origin route of this site, so it is safe as an iframe resource URL. */
  protected readonly frameUrl = computed(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(this.viewUrl()),
  );
  /** `ng-mapcn add` for the map items the block uses, then zard-cli for its UI (one per line). */
  protected readonly installCommands = computed(() =>
    blockInstallCommands(this.block()).join('\n'),
  );
  /** The header button: the ng-mapcn command (the zard one is in the Usage tab). */
  protected readonly command = computed(() => this.installCommands().split('\n')[0]);

  protected readonly docsUrl = zardDocsUrl;

  protected tabId(tab: Tab): string {
    return `${this.block().name}-tab-${tab}`;
  }

  protected panelId(tab: Tab): string {
    return `${this.block().name}-panel-${tab}`;
  }

  protected select(tab: Tab): void {
    this.active.set(tab);
    if (tab === 'code') this.codeOpened.set(true);
  }

  /** WAI-ARIA tabs: arrows, Home and End move to (and activate) a tab; focus follows. */
  protected onTabKeydown(event: KeyboardEvent): void {
    const tabs = this.tabs();
    const index = tabs.findIndex((tab) => tab.id === this.active());
    const next =
      event.key === 'ArrowRight'
        ? (index + 1) % tabs.length
        : event.key === 'ArrowLeft'
          ? (index - 1 + tabs.length) % tabs.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? tabs.length - 1
              : -1;
    if (next === -1) return;
    event.preventDefault();
    const id = tabs[next].id;
    this.select(id);
    queueMicrotask(() =>
      this.host.nativeElement.querySelector<HTMLElement>(`#${this.tabId(id)}`)?.focus(),
    );
  }
}
