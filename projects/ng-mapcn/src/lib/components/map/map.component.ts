import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import {
  MapEventType,
  Map as MapLibreMap,
  MapMouseEvent,
  MapOptions,
  ProjectionSpecification,
  StyleSpecification,
} from 'maplibre-gl';
import { MapConfig, MapStylesConfig } from '../../models';
import { MapService } from '../../services/map.service';
import { ThemeService } from '../../services/theme.service';
import { getDarkMapStyle, getLightMapStyle } from '../../styles/map-styles';

@Component({
  selector: 'ng-map',
  standalone: true,
  imports: [],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss',
})
export class MapComponent implements AfterViewInit {
  mapContainer = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  config = input<MapConfig>();
  center = input<[number, number]>([0, 0]);
  zoom = input<number>(2);
  style = input<string | any>('https://demotiles.maplibre.org/style.json');
  styles = input<MapStylesConfig>();
  projection = input<ProjectionSpecification>();
  theme = input<'light' | 'dark' | 'auto'>('auto');
  mapId = input<string>('default-map');

  mapReady = output<MapLibreMap>();
  mapClick = output<MapMouseEvent>();
  mapMove = output<MapEventType['move']>();
  mapMoveEnd = output<MapEventType['moveend']>();
  mapZoom = output<MapEventType['zoom']>();
  mapZoomEnd = output<MapEventType['zoomend']>();

  private map: MapLibreMap | null = null;
  private mapService = inject(MapService);
  private themeService = inject(ThemeService);
  private destroyRef = inject(DestroyRef);
  private isMapReady = false;
  private styleTimeoutRef: ReturnType<typeof setTimeout> | null = null;
  private currentStyleRef: string | StyleSpecification | null = null;

  private styleDataHandler?: () => void;
  private loadHandler?: () => void;
  private errorHandler?: (e: any) => void;
  private dataHandler?: (e: any) => void;
  private clickHandler?: (e: MapMouseEvent) => void;
  private moveHandler?: (e: MapEventType['move']) => void;
  private moveEndHandler?: (e: MapEventType['moveend']) => void;
  private zoomHandler?: (e: MapEventType['zoom']) => void;
  private zoomEndHandler?: (e: MapEventType['zoomend']) => void;

  private dataThemeObserver: MutationObserver | null = null;

  constructor() {
    effect(
      () => {
        const theme = this.theme();
        if (theme !== 'auto') {
          this.themeService.setTheme(theme);
        }
      },
      { allowSignalWrites: true }
    );

    effect(() => {
      const currentTheme = this.themeService.theme();
      const theme = this.theme();
      if (this.map && theme === 'auto' && this.isMapReady) {
        this.updateMapTheme(currentTheme);
      }
    });

    this.destroyRef.onDestroy(() => {
      this.destroyDataThemeObserver();
      this.destroyMap();
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initializeMap();
    }, 0);
  }

  private initializeMap(): void {
    const containerRef = this.mapContainer();
    if (!containerRef?.nativeElement) {
      return;
    }

    const container = containerRef.nativeElement;

    const width =
      container.offsetWidth || container.clientWidth || container.getBoundingClientRect().width;
    const height =
      container.offsetHeight || container.clientHeight || container.getBoundingClientRect().height;

    if (!width || !height || width === 0 || height === 0) {
      setTimeout(() => {
        this.initializeMap();
      }, 100);
      return;
    }

    const config = this.config();
    const validCenter = this.getValidCenter();
    const validZoom = this.getValidZoom();
    const validMinZoom = this.getValidMinZoom();
    const validMaxZoom = this.getValidMaxZoom();
    const validPitch = this.getValidPitch();
    const validBearing = this.getValidBearing();

    const initialStyle = this.getMapStyle();
    this.currentStyleRef = initialStyle;

    const options: MapOptions = {
      container: container,
      style: initialStyle,
      center: validCenter,
      zoom: validZoom,
      ...(validMinZoom !== undefined && { minZoom: validMinZoom }),
      ...(validMaxZoom !== undefined && { maxZoom: validMaxZoom }),
      ...(validPitch !== undefined && { pitch: validPitch }),
      ...(validBearing !== undefined && { bearing: validBearing }),
      doubleClickZoom: config?.doubleClickZoom ?? true,
      dragRotate: config?.dragRotate ?? true,
      dragPan: config?.dragPan ?? true,
      keyboard: config?.keyboard ?? true,
      scrollZoom: config?.scrollZoom ?? true,
      touchZoomRotate: config?.touchZoomRotate ?? true,
      boxZoom: config?.boxZoom ?? true,
      renderWorldCopies: false,
      attributionControl: {
        compact: true,
      },
    };

    try {
      this.map = new MapLibreMap(options);
      this.isMapReady = false;

      const mapId = this.mapId();
      this.mapService.registerMap(mapId, this.map);

      this.setMapInteractions(false);

      this.styleDataHandler = () => {
        this.clearStyleTimeout();
        this.styleTimeoutRef = setTimeout(() => {
          const projection = this.projection() || this.config()?.projection;
          if (projection && this.map) {
            this.map.setProjection(projection);
          }
          this.checkMapFullyReady();
        }, 150);
      };

      this.loadHandler = () => {
        this.checkMapFullyReady();
      };

      this.errorHandler = () => {};

      this.dataHandler = () => {};

      this.map.on('styledata', this.styleDataHandler);
      this.map.on('load', this.loadHandler);
      this.map.on('error', this.errorHandler);
      this.map.on('data', this.dataHandler);
    } catch {
    }
  }

  private clearStyleTimeout(): void {
    if (this.styleTimeoutRef) {
      clearTimeout(this.styleTimeoutRef);
      this.styleTimeoutRef = null;
    }
  }

  private checkMapFullyReady(): void {
    if (!this.map) {
      return;
    }

    if (!this.checkMapReady()) {
      setTimeout(() => {
        this.checkMapFullyReady();
      }, 50);
      return;
    }

    if (this.isMapReady) {
      return;
    }

    this.isMapReady = true;

    this.setMapInteractions(true);

    if (this.map) {
      this.mapReady.emit(this.map);
    }

    const effectiveTheme =
      this.theme() === 'auto'
        ? this.getThemeFromDocument()
        : this.themeService.getTheme();
    this.updateMapTheme(effectiveTheme);

    if (this.theme() === 'auto' && typeof document !== 'undefined') {
      this.observeDataTheme();
    }

    this.setupEventHandlers();
  }

  private getThemeFromDocument(): 'light' | 'dark' {
    if (typeof document === 'undefined') return 'light';
    const value = document.documentElement.getAttribute('data-theme');
    return value === 'dark' ? 'dark' : 'light';
  }

  private observeDataTheme(): void {
    if (typeof document === 'undefined') return;
    this.destroyDataThemeObserver();
    this.dataThemeObserver = new MutationObserver(() => {
      if (this.theme() !== 'auto' || !this.map || !this.isMapReady) return;
      this.updateMapTheme(this.getThemeFromDocument());
    });
    this.dataThemeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
  }

  private destroyDataThemeObserver(): void {
    if (this.dataThemeObserver) {
      this.dataThemeObserver.disconnect();
      this.dataThemeObserver = null;
    }
  }

  private getValidCenter(): [number, number] {
    const centerInput = this.center();
    const config = this.config();
    let center: [number, number] | undefined = undefined;

    if (centerInput && Array.isArray(centerInput) && centerInput.length === 2) {
      center = centerInput as [number, number];
    } else if (
      config?.center &&
      Array.isArray(config.center) &&
      config.center.length === 2
    ) {
      center = config.center as [number, number];
    } else {
      return [0, 0];
    }

    const [lng, lat] = center;

    if (
      typeof lng !== 'number' ||
      typeof lat !== 'number' ||
      isNaN(lng) ||
      isNaN(lat) ||
      !isFinite(lng) ||
      !isFinite(lat)
    ) {
      return [0, 0];
    }

    const validLng = Math.max(-180, Math.min(180, lng));
    const validLat = Math.max(-90, Math.min(90, lat));

    return [validLng, validLat];
  }

  private getValidZoom(): number {
    const zoom = this.zoom() ?? this.config()?.zoom ?? 2;

    if (typeof zoom !== 'number' || isNaN(zoom) || !isFinite(zoom)) {
      return 2;
    }

    return Math.max(0, Math.min(22, zoom));
  }

  private getValidPitch(): number | undefined {
    const pitch = this.config()?.pitch;
    if (pitch === undefined || pitch === null) {
      return undefined;
    }
    if (typeof pitch !== 'number' || isNaN(pitch) || !isFinite(pitch)) {
      return undefined;
    }
    return Math.max(0, Math.min(60, pitch));
  }

  private getValidBearing(): number | undefined {
    const bearing = this.config()?.bearing;
    if (bearing === undefined || bearing === null) {
      return undefined;
    }
    if (typeof bearing !== 'number' || isNaN(bearing) || !isFinite(bearing)) {
      return undefined;
    }
    let normalized = bearing % 360;
    if (normalized > 180) normalized -= 360;
    if (normalized < -180) normalized += 360;
    return normalized;
  }

  private getValidMinZoom(): number | undefined {
    const minZoom = this.config()?.minZoom;
    if (minZoom === undefined || minZoom === null) {
      return undefined;
    }
    if (typeof minZoom !== 'number' || isNaN(minZoom) || !isFinite(minZoom)) {
      return undefined;
    }
    return Math.max(0, Math.min(22, minZoom));
  }

  private getValidMaxZoom(): number | undefined {
    const maxZoom = this.config()?.maxZoom;
    if (maxZoom === undefined || maxZoom === null) {
      return undefined;
    }
    if (typeof maxZoom !== 'number' || isNaN(maxZoom) || !isFinite(maxZoom)) {
      return undefined;
    }
    return Math.max(0, Math.min(22, maxZoom));
  }

  private checkMapReady(): boolean {
    if (!this.map) {
      return false;
    }
    try {
      const isStyleLoaded = this.map.isStyleLoaded();
      const isLoaded = this.map.loaded();
      return Boolean(isStyleLoaded) && Boolean(isLoaded);
    } catch {
      return false;
    }
  }

  private setMapInteractions(enabled: boolean): void {
    if (!this.map) {
      return;
    }

    const config = this.config();

    try {
      if (enabled) {
        if (config?.boxZoom ?? true) {
          this.map.boxZoom.enable();
        }
        if (config?.scrollZoom ?? true) {
          this.map.scrollZoom.enable();
        }
        if (config?.dragPan ?? true) {
          this.map.dragPan.enable();
        }
        if (config?.dragRotate ?? true) {
          this.map.dragRotate.enable();
        }
        if (config?.keyboard ?? true) {
          this.map.keyboard.enable();
        }
        if (config?.doubleClickZoom ?? true) {
          this.map.doubleClickZoom.enable();
        }
        if (config?.touchZoomRotate ?? true) {
          this.map.touchZoomRotate.enable();
        }
      } else {
        this.map.boxZoom.disable();
        this.map.scrollZoom.disable();
        this.map.dragPan.disable();
        this.map.dragRotate.disable();
        this.map.keyboard.disable();
        this.map.doubleClickZoom.disable();
        this.map.touchZoomRotate.disable();
      }
    } catch {
    }
  }

  private setupEventHandlers(): void {
    if (!this.map || !this.isMapReady) {
      return;
    }

    if (!this.checkMapReady()) {
      return;
    }

    this.clickHandler = (e: MapMouseEvent) => {
      try {
        if (this.checkMapReady()) {
          this.mapClick.emit(e);
        }
      } catch {}
    };

    this.moveHandler = (e: MapEventType['move']) => {
      try {
        if (this.checkMapReady()) {
          this.mapMove.emit(e);
        }
      } catch {
      }
    };

    this.moveEndHandler = (e: MapEventType['moveend']) => {
      try {
        if (this.checkMapReady()) {
          this.mapMoveEnd.emit(e);
        }
      } catch {
      }
    };

    this.zoomHandler = (e: MapEventType['zoom']) => {
      try {
        if (this.checkMapReady()) {
          this.mapZoom.emit(e);
        }
      } catch {
      }
    };

    this.zoomEndHandler = (e: MapEventType['zoomend']) => {
      try {
        if (this.checkMapReady()) {
          this.mapZoomEnd.emit(e);
        }
      } catch {
      }
    };

    this.map.on('click', this.clickHandler);
    this.map.on('move', this.moveHandler);
    this.map.on('moveend', this.moveEndHandler);
    this.map.on('zoom', this.zoomHandler);
    this.map.on('zoomend', this.zoomEndHandler);
  }

  private getMapStyle(): string | StyleSpecification {
    const currentTheme = this.themeService.getTheme();
    const styles = this.styles();
    const style = this.style();
    const config = this.config();

    if (styles) {
      const themeStyle = currentTheme === 'dark' ? styles.dark : styles.light;
      if (themeStyle) {
        return themeStyle;
      }
    }

    if (config?.styles) {
      const themeStyle =
        currentTheme === 'dark' ? config.styles.dark : config.styles.light;
      if (themeStyle) {
        return themeStyle;
      }
    }

    if (style && style !== 'https://demotiles.maplibre.org/style.json') {
      return style;
    }

    if (config?.style) {
      return config.style;
    }

    return currentTheme === 'dark' ? getDarkMapStyle() : getLightMapStyle();
  }

  private updateMapTheme(theme: 'light' | 'dark'): void {
    if (!this.map) {
      return;
    }

    const containerRef = this.mapContainer();
    if (!containerRef) {
      return;
    }

    const container = containerRef.nativeElement;
    container.classList.remove('theme-light', 'theme-dark', 'dark');

    if (theme === 'dark') {
      container.classList.add('theme-dark', 'dark');
    } else {
      container.classList.add('theme-light');
    }

    const newStyle = this.getMapStyle();

    if (this.currentStyleRef !== newStyle) {
      this.currentStyleRef = newStyle;

      this.map.setStyle(newStyle, { diff: true });

      this.map.once('styledata', () => {
        this.clearStyleTimeout();
        this.styleTimeoutRef = setTimeout(() => {
          const projection = this.projection() || this.config()?.projection;
          if (projection) {
            this.map?.setProjection(projection);
          }
          this.checkMapFullyReady();
        }, 150);
      });
    }
  }

  private destroyMap(): void {
    this.clearStyleTimeout();

    if (this.map) {
      try {
        if (this.styleDataHandler && this.map) {
          try {
            this.map.off('styledata', this.styleDataHandler);
          } catch {
          }
          this.styleDataHandler = undefined;
        }
        if (this.loadHandler && this.map) {
          try {
            this.map.off('load', this.loadHandler);
          } catch {
          }
          this.loadHandler = undefined;
        }
        if (this.errorHandler && this.map) {
          try {
            this.map.off('error', this.errorHandler);
          } catch {
          }
          this.errorHandler = undefined;
        }
        if (this.dataHandler && this.map) {
          try {
            this.map.off('data', this.dataHandler);
          } catch {
          }
          this.dataHandler = undefined;
        }
        if (this.clickHandler && this.map) {
          try {
            this.map.off('click', this.clickHandler);
          } catch {
          }
          this.clickHandler = undefined;
        }
        if (this.moveHandler && this.map) {
          try {
            this.map.off('move', this.moveHandler);
          } catch {
          }
          this.moveHandler = undefined;
        }
        if (this.moveEndHandler && this.map) {
          try {
            this.map.off('moveend', this.moveEndHandler);
          } catch {
          }
          this.moveEndHandler = undefined;
        }
        if (this.zoomHandler && this.map) {
          try {
            this.map.off('zoom', this.zoomHandler);
          } catch {
          }
          this.zoomHandler = undefined;
        }
        if (this.zoomEndHandler && this.map) {
          try {
            this.map.off('zoomend', this.zoomEndHandler);
          } catch {
          }
          this.zoomEndHandler = undefined;
        }
      } catch {
      }

      this.isMapReady = false;

      const mapToRemove = this.map;
      this.map = null;

      const mapId = this.mapId();
      this.mapService.unregisterMap(mapId);
    }

    this.currentStyleRef = null;
  }

  getMap(): MapLibreMap | null {
    return this.map;
  }
}
