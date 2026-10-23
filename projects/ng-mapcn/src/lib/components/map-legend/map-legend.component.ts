import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  input,
  model,
  PLATFORM_ID,
  type TemplateRef,
  viewChild,
} from '@angular/core';
import { type Map as MapLibreMap } from 'maplibre-gl';

import { injectMapLabels, type MapLabels } from '../../providers/map-labels.provider';
import { MapContextService } from '../../services/map-context.service';
import { classTokens } from '../../utils/class-name';
import { type MapControlPosition, mountMapControl } from '../../utils/map-control';
import { nextId } from '../../utils/map-utils';

export interface MapLegendCategory {
  color: string;
  label: string;
  /** Swatch shape (default `'circle'`). */
  shape?: 'circle' | 'square' | 'line';
}

export type MapLegendSection =
  | { type: 'categories'; title?: string; entries: MapLegendCategory[] }
  | {
      type: 'gradient';
      title?: string;
      stops: { color: string; value: number | string }[];
      /** Formats every stop value. */
      format?: (value: number | string) => string;
    };

/** Minimum gap (px) kept between two visible gradient labels. */
const LABEL_GAP = 4;

@Component({
  selector: 'ng-map-legend',
  templateUrl: './map-legend.component.html',
  styleUrl: './map-legend.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ng-map-legend-host' },
})
export class MapLegendComponent {
  readonly sections = input<MapLegendSection[]>([]);
  /** Heading of the legend; also its accessible name. */
  readonly title = input<string>();
  readonly position = input<MapControlPosition>('top-left');
  /** Shows a header button that hides the legend body. */
  readonly collapsible = input(false);
  readonly collapsed = model(false);

  /** Per-component label overrides, merged over `provideMapLabels` and the English defaults. */
  readonly labels = input<Partial<MapLabels>>();
  /** Extra space-separated classes for the rendered `.ng-legend` element (reactive; built-in classes are kept). */
  readonly className = input<string>();

  private readonly control = viewChild.required<TemplateRef<unknown>>('control');
  protected readonly id = nextId('ng-legend');
  protected readonly bodyId = `${this.id}-body`;

  protected readonly rootClass = computed(() =>
    classTokens(this.className(), ['ng-legend']).join(' '),
  );

  // Hierarchical DI — throws when placed outside <ng-map>, like mapcn's useMap()
  protected readonly l = injectMapLabels(this.labels);
  private readonly ctx = inject(MapContextService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly injector = inject(Injector);

  constructor() {
    // Mounted as a MapLibre control, so the corner containers stack it with the other controls.
    effect((onCleanup) => {
      const map = this.ctx.map();
      if (!map || !this.isBrowser) return;
      onCleanup(mountMapControl(map, this.control(), this.injector, this.position()));
      // The portal view renders on the next application render; measure the labels then.
      afterNextRender(() => this.fitAll(map), { injector: this.injector });
    });

    // Once the portal view has rendered (and whenever the sections change), hide the middle
    // gradient labels that would overlap a neighbour. Browser only: it needs layout.
    afterRenderEffect(() => {
      const map = this.ctx.map();
      if (!map || !this.isBrowser) return;
      this.sections();
      this.collapsed();
      this.position();
      this.fitAll(map);
    });
  }

  private fitAll(map: MapLibreMap): void {
    const root = map.getContainer().querySelector<HTMLElement>(`[data-legend-id="${this.id}"]`);
    if (!root) return;
    for (const group of root.querySelectorAll<HTMLElement>('.ng-legend-gradient-labels')) {
      this.fitLabels(group);
    }
  }

  /** Greedy left-to-right: a middle label stays only if it clears the previous visible label and the last one. */
  private fitLabels(group: HTMLElement): void {
    const labels = Array.from(group.querySelectorAll<HTMLElement>('.ng-legend-gradient-label'));
    if (labels.length < 3) return;
    for (const label of labels) label.hidden = false;

    const last = labels[labels.length - 1].getBoundingClientRect();
    let previousRight = labels[0].getBoundingClientRect().right;
    for (const label of labels.slice(1, -1)) {
      const rect = label.getBoundingClientRect();
      if (rect.left >= previousRight + LABEL_GAP && rect.right + LABEL_GAP <= last.left) {
        previousRight = rect.right;
      } else {
        label.hidden = true;
      }
    }
  }

  protected toggle(): void {
    this.collapsed.update((value) => !value);
  }

  protected gradientImage(stops: { color: string }[]): string {
    const colors = stops.map((stop) => stop.color);
    if (colors.length === 1) colors.push(colors[0]);
    return `linear-gradient(to right, ${colors.join(', ')})`;
  }

  /** One label per stop; the middle ones are hidden after render when they would overlap. */
  protected gradientLabels(
    section: Extract<MapLegendSection, { type: 'gradient' }>,
  ): { text: string; left: number; edge: 'first' | 'last' | null }[] {
    const { stops, format } = section;
    const last = stops.length - 1;
    return stops.map((_, index) => {
      const { value } = stops[index];
      return {
        text: format ? format(value) : String(value),
        left: last > 0 ? (index / last) * 100 : 0,
        edge: index === 0 ? 'first' : index === last ? 'last' : null,
      };
    });
  }
}
