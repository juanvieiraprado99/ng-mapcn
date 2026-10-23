import { isPlatformBrowser } from '@angular/common';
import {
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
      /** Formats the first and last stop values. */
      format?: (value: number | string) => string;
    };

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
  protected readonly bodyId = nextId('ng-legend-body');

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
    });
  }

  protected toggle(): void {
    this.collapsed.update((value) => !value);
  }

  protected gradientImage(stops: { color: string }[]): string {
    const colors = stops.map((stop) => stop.color);
    if (colors.length === 1) colors.push(colors[0]);
    return `linear-gradient(to right, ${colors.join(', ')})`;
  }

  protected gradientEnd(
    section: Extract<MapLegendSection, { type: 'gradient' }>,
    end: 'first' | 'last',
  ): string {
    const stop = section.stops.at(end === 'first' ? 0 : -1);
    if (!stop) return '';
    return section.format ? section.format(stop.value) : String(stop.value);
  }
}
