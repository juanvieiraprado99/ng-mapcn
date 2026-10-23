import { CdkDrag, type CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBoxes,
  lucideBuilding2,
  lucideEye,
  lucideEyeOff,
  lucideFlame,
  lucideGrid3x3,
  lucideGripVertical,
  lucideImage,
  lucideLayers,
  lucideMapPin,
  lucideMessageSquare,
  lucideMountain,
  lucidePencil,
  lucideRoute,
  lucideShapes,
  lucideSpline,
  lucideTrash2,
} from '@ng-icons/lucide';

import { ZardButtonComponent } from '@/shared/components/button';

import type { SceneLayer } from './playground-scene';
import type { PlaygroundSpec } from './playground-schema';

/** Palette and stack list ids, connected for drag and drop. */
export const PALETTE_LIST_ID = 'pg-palette';
export const STACK_LIST_ID = 'pg-stack';

const BLOCK_ICONS: Record<string, string> = {
  marker: 'lucideMapPin',
  route: 'lucideRoute',
  geojson: 'lucideShapes',
  arc: 'lucideSpline',
  cluster: 'lucideBoxes',
  heatmap: 'lucideFlame',
  raster: 'lucideGrid3x3',
  'fill-extrusion': 'lucideBuilding2',
  terrain: 'lucideMountain',
  image: 'lucideImage',
  popup: 'lucideMessageSquare',
  draw: 'lucidePencil',
};

export const blockIcon = (specId: string) => BLOCK_ICONS[specId] ?? 'lucideLayers';

/** Every icon of the blocks and the stack, for the components that show them. */
export const BLOCK_ICON_SET = {
  lucideBoxes,
  lucideBuilding2,
  lucideEye,
  lucideEyeOff,
  lucideFlame,
  lucideGrid3x3,
  lucideGripVertical,
  lucideLayers,
  lucideImage,
  lucideMapPin,
  lucideMessageSquare,
  lucideMountain,
  lucidePencil,
  lucideRoute,
  lucideShapes,
  lucideSpline,
  lucideTrash2,
};

/**
 * The blocks to build a scene from. Each one is dragged onto the layer stack (CDK drag and drop)
 * or added on top of it with a click / Enter, so the palette also works without a pointer.
 */
@Component({
  selector: 'app-playground-palette',
  standalone: true,
  imports: [CdkDropList, CdkDrag, NgIcon],
  viewProviders: [provideIcons(BLOCK_ICON_SET)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul
      cdkDropList
      [id]="paletteId"
      [cdkDropListConnectedTo]="[stackId]"
      [cdkDropListSortingDisabled]="true"
      [cdkDropListEnterPredicate]="noDrop"
      aria-label="Blocks"
      class="grid grid-cols-2 gap-2"
    >
      @for (spec of specs(); track spec.id) {
        <li
          cdkDrag
          [cdkDragData]="spec.id"
          [cdkDragDisabled]="disabled().has(spec.id)"
          class="list-none"
        >
          <button
            type="button"
            [disabled]="disabled().has(spec.id)"
            class="bg-card hover:bg-accent flex w-full cursor-grab items-center gap-2 rounded-md border px-2.5 py-2 text-left text-sm font-medium transition-colors active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
            [attr.aria-label]="'Add ' + spec.label"
            [title]="
              disabled().has(spec.id) ? 'Already in the scene (one per map)' : spec.description
            "
            (click)="addBlock.emit(spec.id)"
          >
            <ng-icon [name]="icon(spec.id)" size="16" class="text-muted-foreground shrink-0" />
            <span class="truncate">{{ spec.label }}</span>
          </button>
        </li>
      }
    </ul>
  `,
})
export class PlaygroundPaletteComponent {
  readonly specs = input.required<readonly PlaygroundSpec[]>();
  /** Spec ids that cannot be added again (`single` blocks already in the scene). */
  readonly disabled = input<ReadonlySet<string>>(new Set());
  /** A block was clicked: add it on top of the stack. */
  readonly addBlock = output<string>();

  protected readonly paletteId = PALETTE_LIST_ID;
  protected readonly stackId = STACK_LIST_ID;
  protected readonly icon = blockIcon;
  /** Blocks are copied out of the palette, never dropped back into it. */
  protected readonly noDrop = () => false;
}

/**
 * The scene's layer stack, top of the map first. Reorder by dragging (the inspector also has
 * move buttons for keyboard users); a block dropped from the palette lands where it is released.
 */
@Component({
  selector: 'app-playground-layers',
  standalone: true,
  imports: [CdkDropList, CdkDrag, CdkDragHandle, NgIcon, ZardButtonComponent],
  viewProviders: [provideIcons(BLOCK_ICON_SET)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol
      cdkDropList
      [id]="stackId"
      [cdkDropListData]="layers()"
      (cdkDropListDropped)="dropped($event)"
      aria-label="Layers"
      class="flex min-h-24 flex-col gap-1.5 rounded-lg border border-dashed p-1.5"
    >
      @for (layer of layers(); track layer.uid) {
        <li
          cdkDrag
          [cdkDragData]="layer.uid"
          class="bg-card flex items-center gap-1 rounded-md border py-1 pr-1 pl-1.5 text-sm shadow-xs"
          [class.ring-2]="layer.uid === selected()"
          [class.ring-primary]="layer.uid === selected()"
          [attr.data-layer]="layer.name"
        >
          <span
            cdkDragHandle
            class="text-muted-foreground cursor-grab active:cursor-grabbing"
            aria-hidden="true"
          >
            <ng-icon name="lucideGripVertical" size="14" />
          </span>
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1 text-left"
            [class.opacity-50]="!layer.visible"
            [attr.aria-pressed]="layer.uid === selected()"
            (click)="selectLayer.emit(layer.uid)"
          >
            <ng-icon [name]="icon(layer.specId)" size="14" class="text-muted-foreground shrink-0" />
            <span class="min-w-0">
              <span class="block truncate font-medium">{{ labels()[layer.specId] }}</span>
              <span class="text-muted-foreground block truncate font-mono text-xs">{{
                layer.name
              }}</span>
            </span>
          </button>
          <button
            z-button
            zType="ghost"
            zSize="icon-sm"
            type="button"
            [attr.aria-label]="(layer.visible ? 'Hide ' : 'Show ') + layer.name"
            [attr.aria-pressed]="!layer.visible"
            (click)="toggleLayer.emit(layer.uid)"
          >
            <ng-icon [name]="layer.visible ? 'lucideEye' : 'lucideEyeOff'" size="14" />
          </button>
          <button
            z-button
            zType="ghost"
            zSize="icon-sm"
            type="button"
            [attr.aria-label]="'Remove ' + layer.name"
            (click)="removeLayer.emit(layer.uid)"
          >
            <ng-icon name="lucideTrash2" size="14" />
          </button>
        </li>
      } @empty {
        <li class="text-muted-foreground list-none px-2 py-6 text-center text-sm">
          Drag a block here, or click one to add it.
        </li>
      }
    </ol>
  `,
})
export class PlaygroundLayersComponent {
  readonly layers = input.required<readonly SceneLayer[]>();
  readonly selected = input<number>();
  /** Spec id -> label. */
  readonly labels = input.required<Record<string, string>>();

  readonly selectLayer = output<number>();
  readonly toggleLayer = output<number>();
  readonly removeLayer = output<number>();
  readonly moveLayer = output<{ from: number; to: number }>();
  /** A palette block was dropped at `index` of the stack. */
  readonly dropBlock = output<{ specId: string; index: number }>();

  protected readonly stackId = STACK_LIST_ID;
  protected readonly icon = blockIcon;

  protected dropped(event: CdkDragDrop<readonly SceneLayer[], unknown, unknown>): void {
    if (event.previousContainer === event.container) {
      if (event.previousIndex !== event.currentIndex) {
        this.moveLayer.emit({ from: event.previousIndex, to: event.currentIndex });
      }
      return;
    }
    this.dropBlock.emit({ specId: String(event.item.data), index: event.currentIndex });
  }
}
