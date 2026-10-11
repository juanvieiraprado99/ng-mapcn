import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  type ElementRef,
  inject,
  input,
  NgZone,
  output,
  PLATFORM_ID,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  Map as MapLibreMap,
  type MapMouseEvent,
  type MapOptions,
  type ProjectionSpecification,
  type StyleSpecification,
} from 'maplibre-gl';

import { MAP_DEFAULT_STYLES } from '../../providers/map-styles.provider';
import { MapContextService } from '../../services/map-context.service';
import { ThemeService } from '../../services/theme.service';
import {
  blankMapStyle,
  getDarkMapStyle,
  getLightMapStyle,
  type MapStylesConfig,
} from '../../styles/map-styles';
import { getViewport, type MapViewport } from '../../utils/map-utils';

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
  readonly center = input<[number, number]>([0, 0]);
  readonly zoom = input<number>(2);
  readonly styles = input<MapStylesConfig>();
  /** Renders a tile-less transparent style for dataviz. Ignored when `styles` is set. */
  readonly blank = input(false);
  readonly projection = input<ProjectionSpecification>();
  readonly theme = input<'light' | 'dark' | 'auto'>('auto');
  readonly loading = input(false);
  readonly viewport = input<Partial<MapViewport> | undefined>(undefined);
  /** Extra MapLibre options passed through to the constructor (mapcn spreads these in React). */
  readonly options = input<Omit<MapOptions, 'container' | 'style'>>();

  // Outputs
  readonly viewportChange = output<MapViewport>();
  readonly mapReady = output<MapLibreMap>();
  readonly mapClick = output<MapMouseEvent>();
  readonly mapError = output<Error>();

  // Internal state exposed to template
  protected readonly mapInstance = signal<MapLibreMap | null>(null);
  private readonly loadedFlag = signal(false);
  private readonly styleLoadedFlag = signal(false);
  protected readonly isLoaded = computed(() => this.loadedFlag() && this.styleLoadedFlag());

  private readonly ctx = inject(MapContextService);
  private readonly themeService = inject(ThemeService);
  /** App-wide basemap default (`provideMapStyles`), when the app provides one. */
  private readonly appStyles = inject(MAP_DEFAULT_STYLES, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private styleTimeoutRef: ReturnType<typeof setTimeout> | null = null;
  private initTimeoutRef: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private internalUpdate = false;
  private currentStyle: string | StyleSpecification | null = null;

  constructor() {
    afterNextRender(() => this.initializeMap());

    // Theme sync — reacts to ThemeService.theme() or explicit theme input
    effect(() => {
      const resolved = this.resolvedTheme();
      // Track the style-affecting inputs so runtime changes re-apply the
      // basemap (mapcn parity — React re-renders on prop change).
      this.styles();
      this.blank();
      this.appStyles?.();
      this.ctx.setResolvedTheme(resolved);
      const map = this.mapInstance();
      if (!map) return;
      untracked(() => this.updateMapTheme(resolved));
    });

    // Controlled viewport sync (prop -> map) with anti-feedback-loop guard
    effect(() => {
      const map = this.mapInstance();
      const vp = this.viewport();
      if (!map || !vp) return;
      if (map.isMoving()) return;

      const current = getViewport(map);
      const next: Partial<MapViewport> = {};
      if (
        vp.center !== undefined &&
        (vp.center[0] !== current.center[0] || vp.center[1] !== current.center[1])
      ) {
        next.center = vp.center;
      }
      if (vp.zoom !== undefined && vp.zoom !== current.zoom) next.zoom = vp.zoom;
      if (vp.bearing !== undefined && vp.bearing !== current.bearing) next.bearing = vp.bearing;
      if (vp.pitch !== undefined && vp.pitch !== current.pitch) next.pitch = vp.pitch;
      if (Object.keys(next).length === 0) return;

      this.internalUpdate = true;
      map.jumpTo(next);
      this.internalUpdate = false;
    });

    this.destroyRef.onDestroy(() => this.destroyMap());
  }

  private resolvedTheme(): 'light' | 'dark' {
    return this.theme() === 'auto' ? this.themeService.theme() : (this.theme() as 'light' | 'dark');
  }

  private initializeMap(): void {
    // Never touch the DOM / MapLibre on the server. afterNextRender already
    // guarantees browser-only execution; this also blocks the retry timer.
    if (!this.isBrowser || this.destroyed) return;
    const container = this.container()?.nativeElement;
    if (!container) return;

    const w = container.offsetWidth || container.getBoundingClientRect().width;
    const h = container.offsetHeight || container.getBoundingClientRect().height;
    if (!w || !h) {
      // Retry outside the zone so the poll doesn't trigger change detection
      this.zone.runOutsideAngular(() => {
        this.initTimeoutRef = setTimeout(() => this.initializeMap(), 100);
      });
      return;
    }

    const initialStyle = this.getMapStyle(untracked(() => this.resolvedTheme()));
    const vp = untracked(() => this.viewport());

    const options: MapOptions = {
      renderWorldCopies: false,
      attributionControl: { compact: true },
      ...this.options(),
      container,
      style: initialStyle,
      center: vp?.center ?? this.center(),
      zoom: vp?.zoom ?? this.zoom(),
      ...(vp?.bearing !== undefined && { bearing: vp.bearing }),
      ...(vp?.pitch !== undefined && { pitch: vp.pitch }),
    };

    try {
      // Map creation and event registration run outside the zone: MapLibre
      // attaches high-frequency listeners (pointer/render) that would
      // otherwise trigger change detection on every frame.
      const map = this.zone.runOutsideAngular(() => {
        const m = new MapLibreMap(options);

        m.on('load', () => {
          this.loadedFlag.set(true);
          this.ctx.setLoadedFlag(true);
          this.zone.run(() => this.mapReady.emit(m));
        });

        m.on('styledata', () => {
          this.clearStyleTimeout();
          // 100ms debounce: ensures the style is fully processed before layer
          // operations are allowed (avoids race conditions around setStyle)
          this.styleTimeoutRef = setTimeout(() => {
            const proj = this.projection();
            if (proj) m.setProjection(proj);
            this.styleLoadedFlag.set(true);
            this.ctx.setStyleLoadedFlag(true);
          }, 100);
        });

        // Fires every frame during pan/zoom — stays outside the zone; signal
        // consumers still update, and zone apps avoid a CD storm.
        m.on('move', () => {
          if (this.internalUpdate) return;
          this.viewportChange.emit(getViewport(m));
        });

        m.on('click', (e) => this.zone.run(() => this.mapClick.emit(e)));
        m.on('error', (e) =>
          this.zone.run(() =>
            this.mapError.emit(e.error instanceof Error ? e.error : new Error(String(e.error))),
          ),
        );

        return m;
      });
      this.currentStyle = initialStyle;

      this.mapInstance.set(map);
      this.ctx.setMap(map);
    } catch (e) {
      this.mapError.emit(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /** Precedence: `styles` input > `blank` > app-wide default > Carto default. */
  private getMapStyle(theme: 'light' | 'dark'): string | StyleSpecification {
    const s = this.styles();
    if (s) {
      const themed = theme === 'dark' ? s.dark : s.light;
      if (themed) return themed;
    } else if (this.blank()) {
      return blankMapStyle;
    } else {
      const app = this.appStyles?.();
      const themed = theme === 'dark' ? app?.dark : app?.light;
      if (themed) return themed;
    }
    return theme === 'dark' ? getDarkMapStyle() : getLightMapStyle();
  }

  private updateMapTheme(theme: 'light' | 'dark'): void {
    const map = this.mapInstance();
    if (!map) return;
    const style = this.getMapStyle(theme);
    if (style === this.currentStyle) return;
    this.currentStyle = style;
    this.styleLoadedFlag.set(false);
    this.ctx.setStyleLoadedFlag(false);
    map.setStyle(style, { diff: true });
  }

  private clearStyleTimeout(): void {
    if (this.styleTimeoutRef) {
      clearTimeout(this.styleTimeoutRef);
      this.styleTimeoutRef = null;
    }
  }

  private destroyMap(): void {
    this.destroyed = true;
    if (this.initTimeoutRef) {
      clearTimeout(this.initTimeoutRef);
      this.initTimeoutRef = null;
    }
    this.clearStyleTimeout();
    const map = this.mapInstance();
    if (map) {
      try {
        map.remove();
      } catch {}
    }
    this.mapInstance.set(null);
    this.ctx.reset();
  }

  /** Escape hatch — direct access to the MapLibre instance (mapcn `MapRef`) */
  getMap(): MapLibreMap | null {
    return this.mapInstance();
  }
}
