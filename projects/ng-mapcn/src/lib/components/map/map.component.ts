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

/**
 * Map component using MapLibre GL
 * Following Angular 18 best practices and MapLibre GL JS documentation
 */
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

  constructor() {
    // Set initial theme
    effect(
      () => {
        const theme = this.theme();
        this.themeService.setTheme(theme);
      },
      { allowSignalWrites: true }
    );

    // Watch for theme changes when in auto mode
    effect(() => {
      const currentTheme = this.themeService.theme();
      const theme = this.theme();
      if (this.map && theme === 'auto' && this.isMapReady) {
        this.updateMapTheme(currentTheme);
      }
    });

    // Cleanup on destroy
    this.destroyRef.onDestroy(() => {
      this.destroyMap();
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initializeMap();
    }, 0);
  }

  /**
   * Initialize the map
   * Following MapLibre GL JS best practices: wait for style.load, then load, then resize
   */
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

      this.errorHandler = (e: any) => {
        // Error handler for map errors
      };

      this.dataHandler = (e: any) => {
        // Data handler for source loading
      };

      this.map.on('styledata', this.styleDataHandler);
      this.map.on('load', this.loadHandler);
      this.map.on('error', this.errorHandler);
      this.map.on('data', this.dataHandler);
    } catch (error) {
      // Error initializing map
    }
  }

  /**
   * Clear style timeout
   */
  private clearStyleTimeout(): void {
    if (this.styleTimeoutRef) {
      clearTimeout(this.styleTimeoutRef);
      this.styleTimeoutRef = null;
    }
  }

  /**
   * Check if map is fully ready and finalize initialization
   */
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
    this.updateMapTheme(this.themeService.getTheme());

    this.setupEventHandlers();
  }

  /**
   * Get valid center coordinates
   */
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

  /**
   * Get valid zoom level
   */
  private getValidZoom(): number {
    const zoom = this.zoom() ?? this.config()?.zoom ?? 2;

    if (typeof zoom !== 'number' || isNaN(zoom) || !isFinite(zoom)) {
      return 2;
    }

    return Math.max(0, Math.min(22, zoom));
  }

  /**
   * Get valid pitch value
   */
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

  /**
   * Get valid bearing value
   */
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

  /**
   * Get valid minZoom value
   */
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

  /**
   * Get valid maxZoom value
   */
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

  /**
   * Check if map is ready for interactions
   */
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

  /**
   * Enable or disable map interactions
   */
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
    } catch (error) {
      // Error setting map interactions
    }
  }

  /**
   * Set up event handlers
   * Only set up handlers after map is fully loaded and ready
   */
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
      } catch (error) {
        // Error handling click event
      }
    };

    this.moveHandler = (e: MapEventType['move']) => {
      try {
        if (this.checkMapReady()) {
          this.mapMove.emit(e);
        }
      } catch (error) {
        // Error handling move event
      }
    };

    this.moveEndHandler = (e: MapEventType['moveend']) => {
      try {
        if (this.checkMapReady()) {
          this.mapMoveEnd.emit(e);
        }
      } catch (error) {
        // Error handling moveend event
      }
    };

    this.zoomHandler = (e: MapEventType['zoom']) => {
      try {
        if (this.checkMapReady()) {
          this.mapZoom.emit(e);
        }
      } catch (error) {
        // Error handling zoom event
      }
    };

    this.zoomEndHandler = (e: MapEventType['zoomend']) => {
      try {
        if (this.checkMapReady()) {
          this.mapZoomEnd.emit(e);
        }
      } catch (error) {
        // Error handling zoomend event
      }
    };

    this.map.on('click', this.clickHandler);
    this.map.on('move', this.moveHandler);
    this.map.on('moveend', this.moveEndHandler);
    this.map.on('zoom', this.zoomHandler);
    this.map.on('zoomend', this.zoomEndHandler);
  }

  /**
   * Get map style based on current theme
   * Returns custom style if provided, otherwise returns theme-based style
   * Priority: styles.light/dark > style input > config.style > theme-based style
   */
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

  /**
   * Update map theme
   */
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

  /**
   * Destroy the map
   */
  private destroyMap(): void {
    this.clearStyleTimeout();

    if (this.map) {
      try {
        if (this.styleDataHandler && this.map) {
          try {
            this.map.off('styledata', this.styleDataHandler);
          } catch (e) {
            // Ignore errors if map is already being destroyed
          }
          this.styleDataHandler = undefined;
        }
        if (this.loadHandler && this.map) {
          try {
            this.map.off('load', this.loadHandler);
          } catch (e) {
            // Ignore errors if map is already being destroyed
          }
          this.loadHandler = undefined;
        }
        if (this.errorHandler && this.map) {
          try {
            this.map.off('error', this.errorHandler);
          } catch (e) {
            // Ignore errors if map is already being destroyed
          }
          this.errorHandler = undefined;
        }
        if (this.dataHandler && this.map) {
          try {
            this.map.off('data', this.dataHandler);
          } catch (e) {
            // Ignore errors if map is already being destroyed
          }
          this.dataHandler = undefined;
        }
        if (this.clickHandler && this.map) {
          try {
            this.map.off('click', this.clickHandler);
          } catch (e) {
            // Ignore errors if map is already being destroyed
          }
          this.clickHandler = undefined;
        }
        if (this.moveHandler && this.map) {
          try {
            this.map.off('move', this.moveHandler);
          } catch (e) {
            // Ignore errors if map is already being destroyed
          }
          this.moveHandler = undefined;
        }
        if (this.moveEndHandler && this.map) {
          try {
            this.map.off('moveend', this.moveEndHandler);
          } catch (e) {
            // Ignore errors if map is already being destroyed
          }
          this.moveEndHandler = undefined;
        }
        if (this.zoomHandler && this.map) {
          try {
            this.map.off('zoom', this.zoomHandler);
          } catch (e) {
            // Ignore errors if map is already being destroyed
          }
          this.zoomHandler = undefined;
        }
        if (this.zoomEndHandler && this.map) {
          try {
            this.map.off('zoomend', this.zoomEndHandler);
          } catch (e) {
            // Ignore errors if map is already being destroyed
          }
          this.zoomEndHandler = undefined;
        }
      } catch (error) {
        // Error removing event listeners
      }

      this.isMapReady = false;

      const mapToRemove = this.map;
      this.map = null;

      const mapId = this.mapId();
      this.mapService.unregisterMap(mapId);
    }

    this.currentStyleRef = null;
  }

  /**
   * Get the map instance
   */
  getMap(): MapLibreMap | null {
    return this.map;
  }
}
