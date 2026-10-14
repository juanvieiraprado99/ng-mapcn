import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  type ElementRef,
  inject,
  input,
  output,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { type Map as MapLibreMap } from 'maplibre-gl';

import { MapContextService } from '../../services/map-context.service';

@Component({
  selector: 'ng-map-controls',
  templateUrl: './map-controls.component.html',
  styleUrl: './map-controls.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ng-map-controls-host' },
})
export class MapControlsComponent {
  readonly position = input<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>(
    'bottom-right',
  );
  readonly showZoom = input(true);
  readonly showCompass = input(false);
  readonly showLocate = input(false);
  readonly showFullscreen = input(false);

  /** Emitted after a successful geolocation (mapcn `onLocate`). */
  readonly locateChange = output<{ longitude: number; latitude: number }>();

  /**
   * Emitted when the locate request fails (permission denied, timeout, unavailable position),
   * or with an `Error` when the browser has no geolocation (insecure context).
   */
  readonly locateError = output<GeolocationPositionError | Error>();

  protected readonly compassSvg = viewChild<ElementRef<SVGElement>>('compassSvg');
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

  // Hierarchical DI — throws when placed outside <ng-map>, like mapcn's useMap()
  private readonly ctx = inject(MapContextService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private destroyed = false;

  constructor() {
    // Compass sync. Reading compassSvg() makes the effect re-run once the @if'd SVG renders.
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
    const el = this.compassSvg()?.nativeElement;
    if (!el) return;
    el.style.transform = `rotateX(${map.getPitch()}deg) rotateZ(${-map.getBearing()}deg)`;
  }
}
