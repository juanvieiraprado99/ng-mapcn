import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideMaximize, lucideTerminal } from '@ng-icons/lucide';
import { type BlockMeta, zardDocsUrl, zardInstallCommand } from '@/blocks/registry';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardSeparatorComponent } from '@/shared/components/separator';
import { BlockCodeViewerComponent } from './block-code-viewer';

type Tab = 'preview' | 'code';

/** shadcn new-york `TabsTrigger` on the default (muted pill) list. */
const TAB_TRIGGER =
  'text-foreground/60 hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-xs font-medium whitespace-nowrap transition-all data-[state=active]:shadow-sm';

/** mapcn `BlockDisplay` + `BlockPreview`: one block of the gallery. */
@Component({
  selector: 'app-block-display',
  standalone: true,
  imports: [NgIcon, ZardButtonComponent, ZardSeparatorComponent, BlockCodeViewerComponent],
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
          class="bg-muted text-muted-foreground inline-flex h-8 w-fit items-center justify-center rounded-lg p-[3px]"
        >
          @for (tab of tabs; track tab.id) {
            <button
              type="button"
              role="tab"
              [class]="trigger"
              [attr.aria-selected]="active() === tab.id"
              [attr.data-state]="active() === tab.id ? 'active' : 'inactive'"
              (click)="select(tab.id)"
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
            (click)="copyCommand()"
          >
            <ng-icon [name]="copied() ? 'lucideCheck' : 'lucideTerminal'" size="16" />
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
      <div class="mt-3" [hidden]="active() !== 'preview'">
        <div class="relative h-(--block-preview-height) w-full overflow-hidden rounded-xl border">
          <iframe
            [src]="frameUrl()"
            [title]="block().title"
            loading="lazy"
            class="size-full border-0"
          ></iframe>
        </div>
      </div>

      @if (codeOpened()) {
        <div class="mt-3" [hidden]="active() !== 'code'">
          <app-block-code-viewer [block]="block()" />
        </div>
      }
    </div>
  `,
})
export class BlockDisplayComponent {
  readonly block = input.required<BlockMeta>();

  protected readonly trigger = TAB_TRIGGER;
  protected readonly tabs: { id: Tab; label: string }[] = [
    { id: 'preview', label: 'Preview' },
    { id: 'code', label: 'Code' },
  ];
  protected readonly active = signal<Tab>('preview');
  protected readonly codeOpened = signal(false);
  protected readonly copied = signal(false);

  private readonly sanitizer = inject(DomSanitizer);

  protected readonly viewUrl = computed(() => `/view/${this.block().name}`);
  /** Same-origin route of this site, so it is safe as an iframe resource URL. */
  protected readonly frameUrl = computed(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(this.viewUrl()),
  );
  /** zard-cli for the block's UI, or the map library itself when it needs none. */
  protected readonly command = computed(
    () => zardInstallCommand(this.block()) ?? 'npx ng add ng-mapcn',
  );

  protected readonly docsUrl = zardDocsUrl;

  protected select(tab: Tab): void {
    this.active.set(tab);
    if (tab === 'code') this.codeOpened.set(true);
  }

  protected async copyCommand(): Promise<void> {
    await navigator.clipboard.writeText(this.command());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }
}
