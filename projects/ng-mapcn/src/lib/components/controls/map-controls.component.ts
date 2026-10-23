import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  input,
  output,
  PLATFORM_ID,
  signal,
  type TemplateRef,
  viewChild,
} from '@angular/core';
import { type Map as MapLibreMap } from 'maplibre-gl';

import { injectMapLabels, type MapLabels } from '../../providers/map-labels.provider';
import { MapContextService } from '../../services/map-context.service';
import { classTokens } from '../../utils/class-name';
import { type MapControlPosition, mountMapControl } from '../../utils/map-control';

@Component({
  selector: 'ng-map-controls',
  templateUrl: './map-controls.component.html',
  styleUrl: './map-controls.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ng-map-controls-host' },
})
export class MapControlsComponent {
  readonly position = input<MapControlPosition>('bottom-right');
  readonly showZoom = input(true);
  readonly showCompass = input(false);
  readonly showLocate = input(false);
  readonly showFullscreen = input(false);

  /** Per-component label overrides, merged over `provideMapLabels` and the English defaults. */
  readonly labels = input<Partial<MapLabels>>();
  /** Extra space-separated classes for the rendered `.ng-controls` element (reactive; built-in classes are kept). */
  readonly className = input<string>();

  /** Emitted after a successful geolocation (mapcn `onLocate`). */
  readonly locateChange = output<{ longitude: number; latitude: number }>();

  /**
   * Emitted when the locate request fails (permission denied, timeout, unavailable position),
   * or with an `Error` when the browser has no geolocation (insecure context).
   */
  readonly locateError = output<GeolocationPositionError | Error>();

  private readonly control = viewChild.required<TemplateRef<unknown>>('control');
  protected readonly compassTransform = signal('');
  protected readonly locating = signal(false);
  protected readonly isFullscreen = signal(false);

  protected readonly positionClass = computed(() => {
    const map: Record<string, string> = {
      'top-left': 'ng-controls--top-left',
      'top-right': 'ng-controls--top-right',
      'bottom-left': 'ng-controls--bottom-left',
      'bottom-right': 'ng-controls--bottom-right',
    };
    return map[this.position()] ?? 'ng-controls--bottom-right';
  });

  /** Position modifier plus the consumer's classes; the static `ng-controls` stays in the template. */
  protected readonly rootClass = computed(() => {
    const extra = classTokens(this.className(), ['ng-controls', this.positionClass()]);
    return [this.positionClass(), ...extra].join(' ');
  });

  // Hierarchical DI — throws when placed outside <ng-map>, like mapcn's useMap()
  protected readonly l = injectMapLabels(this.labels);
  private readonly ctx = inject(MapContextService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly injector = inject(Injector);
  private destroyed = false;

  constructor() {
    // Mounted as a MapLibre control, so the corner containers stack it with the other controls.
    effect((onCleanup) => {
      const map = this.ctx.map();
      if (!map || !this.isBrowser) return;
      onCleanup(mountMapControl(map, this.control(), this.injector, this.position()));
    });

    // Compass sync: rotate/pitch events feed the svg transform binding.
    effect((onCleanup) => {
      const map = this.ctx.map();
      if (!map || !this.showCompass()) return;

      const sync = () => this.syncCompass(map);
      map.on('rotate', sync);
      map.on('pitch', sync);
      sync();

      onCleanup(() => {
        map.off('rotate', sync);
        map.off('pitch', sync);
      });
    });

    effect((onCleanup) => {
      const map = this.ctx.map();
      if (!map || !this.isBrowser) return;

      // Only this map's container counts — another element in fullscreen is not "ours".
      const onChange = () =>
        this.isFullscreen.set(document.fullscreenElement === map.getContainer());
      document.addEventListener('fullscreenchange', onChange);
      onCleanup(() => document.removeEventListener('fullscreenchange', onChange));
    });

    inject(DestroyRef).onDestroy(() => (this.destroyed = true));
  }

  protected zoomIn(): void {
    const map = this.ctx.map();
    if (map) map.zoomTo(map.getZoom() + 1, { duration: 300 });
  }

  protected zoomOut(): void {
    const map = this.ctx.map();
    if (map) map.zoomTo(map.getZoom() - 1, { duration: 300 });
  }

  protected resetNorthPitch(): void {
    const map = this.ctx.map();
    if (map) map.resetNorthPitch({ duration: 300 });
  }

  protected locate(): void {
    const map = this.ctx.map();
    if (!map || this.locating() || !this.isBrowser) return;
    // Geolocation is missing in insecure contexts.
    if (!navigator.geolocation) {
      this.locateError.emit(new Error('Geolocation is not available in this browser.'));
      return;
    }
    this.locating.set(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (this.destroyed) return;
        map.flyTo({
          center: [coords.longitude, coords.latitude],
          zoom: 14,
          duration: 1500,
        });
        this.locateChange.emit({ longitude: coords.longitude, latitude: coords.latitude });
        this.locating.set(false);
      },
      (error) => {
        if (this.destroyed) return;
        this.locating.set(false);
        this.locateError.emit(error);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  protected toggleFullscreen(): void {
    const container = this.ctx.map()?.getContainer();
    if (!container) return;
    const request =
      document.fullscreenElement === container
        ? document.exitFullscreen()
        : container.requestFullscreen();
    // Rejected when the browser denies it (no user gesture, iframe without allowfullscreen).
    Promise.resolve(request).catch(() => {});
  }

  private syncCompass(map: MapLibreMap): void {
    this.compassTransform.set(`rotateX(${map.getPitch()}deg) rotateZ(${-map.getBearing()}deg)`);
  }
}
