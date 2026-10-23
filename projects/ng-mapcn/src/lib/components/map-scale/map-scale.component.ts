import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  input,
  LOCALE_ID,
  NgZone,
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
import { computeScale, metersPerPixel, type ScaleReading } from '../../utils/scale';

type ScaleSystem = 'metric' | 'imperial';

/** Mercator pixels shrink to nothing at the poles; clamp so the reading stays finite. */
const MAX_LATITUDE = 85;

@Component({
  selector: 'ng-map-scale',
  templateUrl: './map-scale.component.html',
  styleUrl: './map-scale.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ng-map-scale-host' },
})
export class MapScaleComponent {
  readonly unit = input<'metric' | 'imperial' | 'both'>('metric');
  /** Longest bar length in pixels. */
  readonly maxWidth = input(100);
  readonly position = input<MapControlPosition>('bottom-left');

  /** Per-component label overrides, merged over `provideMapLabels` and the English defaults. */
  readonly labels = input<Partial<MapLabels>>();
  /** Extra space-separated classes for the rendered `.ng-scale` element (reactive; built-in classes are kept). */
  readonly className = input<string>();

  private readonly control = viewChild.required<TemplateRef<unknown>>('control');
  protected readonly id = nextId('ng-scale');

  protected readonly systems = computed<ScaleSystem[]>(() =>
    this.unit() === 'both' ? ['metric', 'imperial'] : [this.unit() as ScaleSystem],
  );
  protected readonly rootClass = computed(() =>
    classTokens(this.className(), ['ng-scale']).join(' '),
  );

  // Hierarchical DI — throws when placed outside <ng-map>, like mapcn's useMap()
  private readonly l = injectMapLabels(this.labels);
  private readonly ctx = inject(MapContextService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly injector = inject(Injector);
  private readonly zone = inject(NgZone);
  private readonly locale = inject(LOCALE_ID);
  private readonly formatters = new Map<string, Intl.NumberFormat>();

  constructor() {
    // Mounted as a MapLibre control, so the corner containers stack it with the other controls.
    effect((onCleanup) => {
      const map = this.ctx.map();
      if (!map || !this.isBrowser) return;
      onCleanup(mountMapControl(map, this.control(), this.injector, this.position()));
      // The portal renders synchronously, but the view is not laid out yet: draw the initial
      // reading once this render is done (covers a mount that does not change the signals below).
      afterNextRender(() => this.write(map), { injector: this.injector });
    });

    // Per-frame updates write the DOM directly (no signals, so no change detection per move),
    // outside the zone and coalesced to one write per animation frame.
    effect((onCleanup) => {
      const map = this.ctx.map();
      if (!map || !this.isBrowser) return;

      let frame = 0;
      const onMove = () => {
        if (frame) return;
        // Scheduled outside the zone whichever zone fired the event.
        frame = this.zone.runOutsideAngular(() =>
          requestAnimationFrame(() => {
            frame = 0;
            this.write(map);
          }),
        );
      };
      this.zone.runOutsideAngular(() => map.on('move', onMove));
      onCleanup(() => {
        map.off('move', onMove);
        if (frame) cancelAnimationFrame(frame);
      });
    });

    // Draw after the portal view has rendered, and again whenever its inputs change.
    afterRenderEffect(() => {
      const map = this.ctx.map();
      if (!map || !this.isBrowser) return;
      this.systems();
      this.maxWidth();
      this.l();
      this.write(map);
    });

    inject(DestroyRef).onDestroy(() => this.formatters.clear());
  }

  private write(map: MapLibreMap): void {
    const root = map.getContainer().querySelector<HTMLElement>(`[data-scale-id="${this.id}"]`);
    if (!root) return;

    const latitude = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, map.getCenter().lat));
    const mpp = metersPerPixel(latitude, map.getZoom());
    const texts: string[] = [];

    for (const row of root.querySelectorAll<HTMLElement>('.ng-scale-row')) {
      const system = row.dataset['system'] as ScaleSystem;
      const reading = computeScale(mpp, this.maxWidth(), system);
      if (!Number.isFinite(reading.width) || !Number.isFinite(reading.value)) continue;
      const text = this.format(reading);
      row.querySelector<HTMLElement>('.ng-scale-bar')!.style.width =
        `${Number(reading.width.toFixed(2))}px`;
      row.querySelector<HTMLElement>('.ng-scale-label')!.textContent = text;
      texts.push(text);
    }
    if (texts.length) root.setAttribute('aria-label', `${this.l().scale}: ${texts.join(' / ')}`);
  }

  private format({ value, unit }: ScaleReading): string {
    let formatter = this.formatters.get(unit);
    if (!formatter) {
      formatter = new Intl.NumberFormat(this.locale, {
        style: 'unit',
        unit,
        unitDisplay: 'short',
      });
      this.formatters.set(unit, formatter);
    }
    return formatter.format(value);
  }
}
