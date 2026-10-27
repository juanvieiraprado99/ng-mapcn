import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  input,
  PLATFORM_ID,
  type TemplateRef,
  viewChild,
} from '@angular/core';

import { injectMapLabels, type MapLabels } from '../../providers/map-labels.provider';
import { MapContextService } from '../../services/map-context.service';
import { classTokens } from '../../utils/class-name';
import { type MapControlPosition, mountMapControl } from '../../utils/map-control';
import { clamp01, type RoutePlaybackComponent } from '../route-playback/route-playback.component';

/**
 * Play/pause button, scrubber and speed selector for an `<ng-route-playback>`, mounted as a
 * MapLibre control. Place it as a direct child of `<ng-map>` and point `[for]` at the playback.
 */
@Component({
  selector: 'ng-route-playback-control',
  templateUrl: './route-playback-control.component.html',
  styleUrl: './route-playback-control.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ng-route-playback-control-host' },
})
export class RoutePlaybackControlComponent {
  /** The playback to drive. */
  readonly for = input.required<RoutePlaybackComponent>();
  readonly position = input<MapControlPosition>('bottom-left');
  /** Speeds offered by the selector; the current speed is added when missing. */
  readonly speeds = input<number[]>([0.5, 1, 2, 4]);

  /** Per-component label overrides, merged over `provideMapLabels` and the English defaults. */
  readonly labels = input<Partial<MapLabels>>();
  /** Extra space-separated classes for the rendered `.ng-playback` element (reactive; built-in classes are kept). */
  readonly className = input<string>();

  private readonly control = viewChild.required<TemplateRef<unknown>>('control');

  protected readonly rootClass = computed(() =>
    classTokens(this.className(), ['ng-playback']).join(' '),
  );
  protected readonly progress = computed(() => clamp01(this.for().progress()));
  protected readonly percent = computed(() => Math.round(this.progress() * 100));
  protected readonly speedOptions = computed(() => {
    const speeds = this.speeds();
    const current = this.for().speed();
    return (speeds.includes(current) ? [...speeds] : [...speeds, current]).sort((a, b) => a - b);
  });

  // Hierarchical DI — throws when placed outside <ng-map>, like mapcn's useMap()
  protected readonly l = injectMapLabels(this.labels);
  private readonly ctx = inject(MapContextService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly injector = inject(Injector);

  constructor() {
    effect((onCleanup) => {
      const map = this.ctx.map();
      if (!map || !this.isBrowser) return;
      onCleanup(mountMapControl(map, this.control(), this.injector, this.position()));
    });
  }

  protected onSeek(event: Event): void {
    this.for().seek(Number((event.target as HTMLInputElement).value));
  }

  protected onSpeed(event: Event): void {
    this.for().speed.set(Number((event.target as HTMLSelectElement).value));
  }
}
