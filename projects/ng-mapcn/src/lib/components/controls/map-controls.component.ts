import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
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

  private readonly resolvedMap = computed<MapLibreMap | null>(() => this.ctx.map());

  private rotateHandler?: () => void;
  private pitchHandler?: () => void;
  private fullscreenHandler?: () => void;

  constructor() {
    effect((onCleanup) => {
      const map = this.resolvedMap();
      if (!map) return;

      if (this.showCompass()) {
        this.rotateHandler = () => this.syncCompass(map);
        this.pitchHandler = () => this.syncCompass(map);
        map.on('rotate', this.rotateHandler);
        map.on('pitch', this.pitchHandler);
        this.syncCompass(map);
      }

      if (this.isBrowser) {
        this.fullscreenHandler = () => this.isFullscreen.set(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', this.fullscreenHandler);
      }

      onCleanup(() => {
        if (this.rotateHandler) map.off('rotate', this.rotateHandler);
        if (this.pitchHandler) map.off('pitch', this.pitchHandler);
        if (this.fullscreenHandler)
          document.removeEventListener('fullscreenchange', this.fullscreenHandler!);
      });
    });
  }

  protected zoomIn(): void {
    const map = this.resolvedMap();
    if (map) map.zoomTo(map.getZoom() + 1, { duration: 300 });
  }

  protected zoomOut(): void {
    const map = this.resolvedMap();
    if (map) map.zoomTo(map.getZoom() - 1, { duration: 300 });
  }

  protected resetNorthPitch(): void {
    const map = this.resolvedMap();
    if (map) map.resetNorthPitch({ duration: 300 });
  }

  protected locate(): void {
    const map = this.resolvedMap();
    if (!map || this.locating()) return;
    this.locating.set(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        map.flyTo({
          center: [coords.longitude, coords.latitude],
          zoom: 14,
          duration: 1500,
        });
        this.locateChange.emit({ longitude: coords.longitude, latitude: coords.latitude });
        this.locating.set(false);
      },
      () => this.locating.set(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  protected toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      this.resolvedMap()?.getContainer().requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  private syncCompass(map: MapLibreMap): void {
    const el = this.compassSvg()?.nativeElement;
    if (!el) return;
    el.style.transform = `rotateX(${map.getPitch()}deg) rotateZ(${-map.getBearing()}deg)`;
  }
}
