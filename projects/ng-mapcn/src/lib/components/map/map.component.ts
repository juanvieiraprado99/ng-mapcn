import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  Map as MapLibreMap,
  MapMouseEvent,
  MapOptions,
  ProjectionSpecification,
  StyleSpecification,
} from 'maplibre-gl';
import { MapContextService } from '../../services/map-context.service';
import { MapService } from '../../services/map.service';
import { ThemeService } from '../../services/theme.service';
import { MapConfig, MapStylesConfig, MapViewport } from '../../models';
import { getDarkMapStyle, getLightMapStyle } from '../../styles/map-styles';

@Component({
  selector: 'ng-map',
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MapContextService],
})
export class MapComponent {
  private readonly container = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  // Inputs
  readonly config = input<MapConfig>();
  readonly center = input<[number, number]>([0, 0]);
  readonly zoom = input<number>(2);
  readonly styles = input<MapStylesConfig>();
  readonly projection = input<ProjectionSpecification>();
  readonly theme = input<'light' | 'dark' | 'auto'>('auto');
  readonly mapId = input<string>('default-map');
  readonly loading = input(false);
  readonly viewport = input<Partial<MapViewport> | undefined>(undefined);

  // Outputs
  readonly viewportChange = output<MapViewport>();
  readonly mapReady = output<MapLibreMap>();
  readonly mapClick = output<MapMouseEvent>();
  readonly mapError = output<Error>();

  // Internal state exposed to template
  protected readonly mapInstance = signal<MapLibreMap | null>(null);
  private readonly loadedFlag = signal(false);
  private readonly styleLoadedFlag = signal(false);
  protected readonly isLoaded = computed(
    () => this.loadedFlag() && this.styleLoadedFlag()
  );

  private readonly ctx = inject(MapContextService);
  private readonly mapService = inject(MapService);
  private readonly themeService = inject(ThemeService);
  private readonly destroyRef = inject(DestroyRef);

  private styleTimeoutRef: ReturnType<typeof setTimeout> | null = null;
  private internalUpdate = false;

  constructor() {
    afterNextRender(() => this.initializeMap());

    // Theme sync — reacts to ThemeService.theme() or explicit theme input
    effect(() => {
      const map = this.mapInstance();
      if (!map) return;
      const resolved =
        this.theme() === 'auto'
          ? this.themeService.theme()
          : (this.theme() as 'light' | 'dark');
      untracked(() => this.updateMapTheme(resolved));
    });

    // Controlled viewport sync
    effect(() => {
      const map = this.mapInstance();
      const vp = this.viewport();
      if (!map || !vp) return;
      this.internalUpdate = true;
      map.jumpTo({
        ...(vp.center !== undefined && { center: vp.center }),
        ...(vp.zoom !== undefined && { zoom: vp.zoom }),
        ...(vp.bearing !== undefined && { bearing: vp.bearing }),
        ...(vp.pitch !== undefined && { pitch: vp.pitch }),
      });
      setTimeout(() => (this.internalUpdate = false), 0);
    });

    this.destroyRef.onDestroy(() => this.destroyMap());
  }

  private initializeMap(): void {
    const container = this.container()?.nativeElement;
    if (!container) return;

    const w = container.offsetWidth || container.getBoundingClientRect().width;
    const h = container.offsetHeight || container.getBoundingClientRect().height;
    if (!w || !h) {
      setTimeout(() => this.initializeMap(), 100);
      return;
    }

    const config = this.config();
    const resolvedTheme =
      this.theme() === 'auto'
        ? this.themeService.getTheme()
        : (this.theme() as 'light' | 'dark');

    const minZoom = this.getValidMinZoom();
    const maxZoom = this.getValidMaxZoom();
    const pitch = this.getValidPitch();
    const bearing = this.getValidBearing();

    const options: MapOptions = {
      container,
      style: this.getMapStyle(resolvedTheme),
      center: this.getValidCenter(),
      zoom: this.getValidZoom(),
      ...(minZoom !== undefined && { minZoom }),
      ...(maxZoom !== undefined && { maxZoom }),
      ...(pitch !== undefined && { pitch }),
      ...(bearing !== undefined && { bearing }),
      doubleClickZoom: config?.doubleClickZoom ?? true,
      dragRotate: config?.dragRotate ?? true,
      dragPan: config?.dragPan ?? true,
      keyboard: config?.keyboard ?? true,
      scrollZoom: config?.scrollZoom ?? true,
      touchZoomRotate: config?.touchZoomRotate ?? true,
      boxZoom: config?.boxZoom ?? true,
      renderWorldCopies: false,
      attributionControl: { compact: true },
    };

    try {
      const map = new MapLibreMap(options);

      map.on('load', () => {
        this.loadedFlag.set(true);
        this.ctx.setLoadedFlag(true);
        this.mapReady.emit(map);
      });

      map.on('styledata', () => {
        this.clearStyleTimeout();
        this.styleTimeoutRef = setTimeout(() => {
          const proj = this.projection() ?? this.config()?.projection;
          if (proj) map.setProjection(proj);
          this.styleLoadedFlag.set(true);
          this.ctx.setStyleLoadedFlag(true);
        }, 100);
      });

      map.on('move', () => {
        if (this.internalUpdate) return;
        const c = map.getCenter();
        this.viewportChange.emit({
          center: [c.lng, c.lat],
          zoom: map.getZoom(),
          bearing: map.getBearing(),
          pitch: map.getPitch(),
        });
      });

      map.on('click', (e) => this.mapClick.emit(e));
      map.on('error', (e) =>
        this.mapError.emit(
          e.error instanceof Error ? e.error : new Error(String(e.error))
        )
      );

      this.mapInstance.set(map);
      this.ctx.setMap(map);
      // Keep MapService registration for backward compatibility / external escape hatch
      this.mapService.registerMap(this.mapId(), map);
    } catch (e) {
      this.mapError.emit(e instanceof Error ? e : new Error(String(e)));
    }
  }

  private getMapStyle(theme: 'light' | 'dark'): string | StyleSpecification {
    const s = this.styles() ?? this.config()?.styles;
    if (s) {
      const themed = theme === 'dark' ? s.dark : s.light;
      if (themed) return themed;
    }
    return theme === 'dark' ? getDarkMapStyle() : getLightMapStyle();
  }

  private updateMapTheme(theme: 'light' | 'dark'): void {
    const map = this.mapInstance();
    if (!map) return;
    this.styleLoadedFlag.set(false);
    this.ctx.setStyleLoadedFlag(false);
    map.setStyle(this.getMapStyle(theme), { diff: true });
  }

  private clearStyleTimeout(): void {
    if (this.styleTimeoutRef) {
      clearTimeout(this.styleTimeoutRef);
      this.styleTimeoutRef = null;
    }
  }

  private destroyMap(): void {
    this.clearStyleTimeout();
    const map = this.mapInstance();
    if (map) {
      try {
        map.remove();
      } catch {}
    }
    this.mapService.unregisterMap(this.mapId());
    this.mapInstance.set(null);
    this.ctx.reset();
  }

  /** Escape hatch — direct access to the MapLibre instance */
  getMap(): MapLibreMap | null {
    return this.mapInstance();
  }

  // ── Validation helpers ────────────────────────────────────────────────────

  private getValidCenter(): [number, number] {
    const c = this.center();
    const cfg = this.config()?.center;
    let center: [number, number] | undefined;
    if (Array.isArray(c) && c.length === 2) center = c as [number, number];
    else if (Array.isArray(cfg) && cfg.length === 2) center = cfg as [number, number];
    else return [0, 0];
    const [lng, lat] = center;
    if (!isFinite(lng) || !isFinite(lat)) return [0, 0];
    return [Math.max(-180, Math.min(180, lng)), Math.max(-90, Math.min(90, lat))];
  }

  private getValidZoom(): number {
    const z = this.zoom() ?? this.config()?.zoom ?? 2;
    return isFinite(z) ? Math.max(0, Math.min(22, z)) : 2;
  }

  private getValidPitch(): number | undefined {
    const p = this.config()?.pitch;
    if (p == null || !isFinite(p)) return undefined;
    return Math.max(0, Math.min(60, p));
  }

  private getValidBearing(): number | undefined {
    const b = this.config()?.bearing;
    if (b == null || !isFinite(b)) return undefined;
    let n = b % 360;
    if (n > 180) n -= 360;
    if (n < -180) n += 360;
    return n;
  }

  private getValidMinZoom(): number | undefined {
    const z = this.config()?.minZoom;
    if (z == null || !isFinite(z)) return undefined;
    return Math.max(0, Math.min(22, z));
  }

  private getValidMaxZoom(): number | undefined {
    const z = this.config()?.maxZoom;
    if (z == null || !isFinite(z)) return undefined;
    return Math.max(0, Math.min(22, z));
  }
}
