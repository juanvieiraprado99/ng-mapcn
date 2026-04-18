import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Map as MapLibreMap } from 'maplibre-gl';
import { MapContextService } from '../../services/map-context.service';
import { MapService } from '../../services/map.service';

@Component({
  selector: 'ng-map-controls',
  templateUrl: './map-controls.component.html',
  styleUrl: './map-controls.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ng-map-controls-host' },
})
export class MapControlsComponent {
  readonly position = input<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('top-right');
  readonly showZoom = input(true);
  readonly showCompass = input(false);
  readonly showLocate = input(false);
  readonly showFullscreen = input(false);
  /**
   * Optional: only needed when the component is placed **outside** <ng-map>.
   * When placed inside <ng-map>, the map is resolved automatically via
   * MapContextService (hierarchical DI).
   */
  readonly mapId = input<string>('default-map');

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
    return map[this.position()] ?? 'ng-controls--top-right';
  });

  // Hierarchical DI — only available when placed inside <ng-map>
  private readonly ctx = inject(MapContextService, { optional: true });
  // Global registry — fallback for legacy usage outside <ng-map>
  private readonly mapService = inject(MapService);

  /** Resolves the MapLibre instance from context or MapService fallback */
  private readonly resolvedMap = computed<MapLibreMap | null>(() => {
    const ctxMap = this.ctx?.map() ?? null;
    if (ctxMap) return ctxMap;
    return this.mapService.getMapSignal(this.mapId())() ?? null;
  });

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

      this.fullscreenHandler = () =>
        this.isFullscreen.set(!!document.fullscreenElement);
      document.addEventListener('fullscreenchange', this.fullscreenHandler);

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
          duration: 1000,
        });
        this.locating.set(false);
      },
      () => this.locating.set(false),
      { enableHighAccuracy: true, timeout: 10000 }
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
