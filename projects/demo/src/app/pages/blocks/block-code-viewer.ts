import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronRight, lucideFile, lucideFolder } from '@ng-icons/lucide';

import type { BlockMeta } from '@/blocks/registry';
import { CodeCopyButtonComponent } from '@/shared/code-copy-button';
import { CodeSurfaceComponent } from '@/shared/code-surface';
import { ZardCollapsibleImports } from '@/shared/components/collapsible';

interface FileTree {
  name: string;
  /** Set on files: the displayed target path. */
  path?: string;
  children?: FileTree[];
}

/** Where the block's files land in a consumer app (mapcn shows `app/<block>/...`). */
function targetOf(path: string): string {
  return `app/${path}`;
}

/** mapcn `createFileTreeForRegistryItemFiles`. */
function buildTree(paths: string[]): FileTree[] {
  const root: FileTree[] = [];
  for (const filePath of paths) {
    const parts = filePath.split('/');
    let level = root;
    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1;
      let node = level.find((n) => n.name === part);
      if (!node) {
        node = isFile ? { name: part, path: filePath } : { name: part, children: [] };
        level.push(node);
      }
      if (!isFile) level = node.children!;
    });
  }
  return root;
}

/** Shared look of the tree rows (mapcn's SidebarMenuButton overrides). */
const ROW =
  'hover:bg-muted-foreground/15 focus-visible:bg-muted-foreground/15 data-[active=true]:bg-muted-foreground/15 flex h-8 w-full items-center gap-2 overflow-hidden rounded-none p-2 pl-(--index) text-left text-sm whitespace-nowrap outline-hidden [&_ng-icon]:shrink-0';

/** mapcn `BlockViewerCode`: file tree on the left, the selected file on the right. */
@Component({
  selector: 'app-block-code-viewer',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    NgIcon,
    ZardCollapsibleImports,
    CodeCopyButtonComponent,
    CodeSurfaceComponent,
  ],
  viewProviders: [provideIcons({ lucideChevronRight, lucideFile, lucideFolder })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="flex h-(--block-preview-height) overflow-hidden rounded-xl border">
      <div class="bg-sidebar text-sidebar-foreground flex w-64 shrink-0 flex-col border-r">
        <div
          class="text-sidebar-foreground/70 flex h-12 shrink-0 items-center border-b px-4 text-sm font-medium"
        >
          Files
        </div>
        <ul class="flex min-h-0 flex-1 flex-col gap-1.5 overflow-auto py-2">
          @for (node of tree(); track node.name) {
            <ng-container *ngTemplateOutlet="treeNode; context: { $implicit: node, depth: 1 }" />
          }
        </ul>
      </div>

      <div class="flex min-w-0 flex-1 flex-col">
        <div class="bg-surface flex h-12 shrink-0 items-center gap-2 border-b px-4 text-sm">
          <span class="text-muted-foreground truncate">{{ activeFile() }}</span>
          <div class="ml-auto">
            <app-code-copy-button [text]="activeSource()" />
          </div>
        </div>
        @if (sources()) {
          <app-code-surface
            [code]="activeSource()"
            lang="angular-ts"
            class="min-h-0 flex-1 overflow-auto"
          />
        } @else {
          <div class="bg-code text-muted-foreground flex-1 p-4 text-sm">Loading…</div>
        }
      </div>
    </div>

    <ng-template #treeNode let-node let-depth="depth">
      <li class="relative">
        @if (node.children) {
          <div z-collapsible [zOpen]="true" class="group/collapsible">
            <button
              z-collapsible-trigger
              [class]="row"
              [style.--index]="depth * (depth === 1 ? 1 : 1.2) + 'rem'"
            >
              <ng-icon
                name="lucideChevronRight"
                size="16"
                class="transition-transform group-data-[state=open]/collapsible:rotate-90"
              />
              <ng-icon name="lucideFolder" size="16" />
              {{ node.name }}
            </button>
            <z-collapsible-content>
              <ul class="flex w-full flex-col gap-1.5 pt-1.5">
                @for (child of node.children; track child.name) {
                  <ng-container
                    *ngTemplateOutlet="treeNode; context: { $implicit: child, depth: depth + 1 }"
                  />
                }
              </ul>
            </z-collapsible-content>
          </div>
        } @else {
          <button
            type="button"
            [class]="row"
            [attr.data-active]="node.path === activeFile()"
            [style.--index]="depth * (depth === 2 ? 1.2 : 1.3) + 'rem'"
            (click)="activeFile.set(node.path)"
          >
            <ng-icon name="lucideChevronRight" size="16" class="invisible" />
            <ng-icon name="lucideFile" size="16" />
            {{ node.name }}
          </button>
        }
      </li>
    </ng-template>
  `,
})
export class BlockCodeViewerComponent {
  readonly block = input.required<BlockMeta>();

  protected readonly row = ROW;
  protected readonly tree = computed(() =>
    buildTree(this.block().files.map((file) => targetOf(file.path))),
  );
  protected readonly activeFile = linkedSignal(() => targetOf(this.block().files[0].path));

  /** Generated sources, loaded the first time a Code tab opens. */
  protected readonly sources = signal<Record<string, string> | null>(null);
  protected readonly activeSource = computed(() => {
    const path = this.activeFile().replace(/^app\//, '');
    return this.sources()?.[path] ?? '';
  });

  constructor() {
    // The viewer only exists once a Code tab is opened, so this is that moment.
    void import('@/blocks/block-sources.generated').then((m) => this.sources.set(m.BLOCK_SOURCES));
  }
}
