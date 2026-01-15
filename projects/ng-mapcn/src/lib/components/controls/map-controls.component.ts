import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Map as MapLibreMap } from 'maplibre-gl';
import {
  CompassControlConfig,
  ControlPosition,
  FullscreenControlConfig,
  LocateControlConfig,
  ZoomControlConfig,
} from '../../models';
import { MapService } from '../../services/map.service';

/**
 * Unified map controls component
 * Consolidates zoom, compass, locate, and fullscreen controls into a single component
 */
@Component({
  selector: 'ng-map-controls',
  standalone: true,
  imports: [],
  templateUrl: './map-controls.component.html',
  styleUrl: './map-controls.component.scss',
})
export class MapControlsComponent {
  fullscreenButton = viewChild<ElementRef<HTMLButtonElement>>('fullscreenButton');

  mapId = input<string>('default-map');
  position = input<ControlPosition>('top-right');

  // Show/hide individual controls
  showZoom = input<boolean>(true);
  showCompass = input<boolean>(false);
  showLocate = input<boolean>(false);
  showFullscreen = input<boolean>(false);

  // Individual control configurations
  zoomConfig = input<ZoomControlConfig>();
  compassConfig = input<CompassControlConfig>();
  locateConfig = input<LocateControlConfig>();
  fullscreenConfig = input<FullscreenControlConfig>();

  // Output events
  zoomIn = output<void>();
  zoomOut = output<void>();
  resetNorth = output<void>();
  locate = output<GeolocationPosition>();
  locateError = output<GeolocationPositionError>();
  fullscreenChange = output<boolean>();

  // Computed position class
  positionClass = computed(() => `ng-controls-${this.position()}`);

  private mapService = inject(MapService);
  private elementRef = inject(ElementRef);
  private destroyRef = inject(DestroyRef);
  private watchId: number | null = null;
  private isFullscreen = false;
  private fullscreenElement: HTMLElement | null = null;
  private map: MapLibreMap | null = null;
  private compassRotateHandler: (() => void) | null = null;
  private compassRotateEndHandler: (() => void) | null = null;

  // Compass rotation in degrees (negative of map bearing to always point north)
  compassRotation: number = 0;

  constructor() {
    // Watch for map availability to setup compass rotation
    effect(() => {
      const mapId = this.mapId();
      const showCompass = this.showCompass();
      const mapSignal = this.mapService.getMapSignal(mapId);
      const mapInstance = mapSignal();
      if (mapInstance && !this.map) {
        this.map = mapInstance;
        if (showCompass) {
          this.setupCompassRotationListeners();
          this.updateCompassRotation();
        }
      }
    });

    // Watch for showFullscreen changes to setup/teardown listeners
    let fullscreenListenersAdded = false;
    effect(() => {
      const showFullscreen = this.showFullscreen();
      if (showFullscreen && !fullscreenListenersAdded) {
        document.addEventListener('fullscreenchange', this.handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', this.handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', this.handleFullscreenChange);
        fullscreenListenersAdded = true;
      } else if (!showFullscreen && fullscreenListenersAdded) {
        document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', this.handleFullscreenChange);
        document.removeEventListener('mozfullscreenchange', this.handleFullscreenChange);
        document.removeEventListener('MSFullscreenChange', this.handleFullscreenChange);
        fullscreenListenersAdded = false;
      }
    });

    // Cleanup on destroy
    this.destroyRef.onDestroy(() => {
      // Stop watching location if active
      this.stopWatching();

      // Remove compass rotation listeners
      this.removeCompassRotationListeners();

      // Remove fullscreen listeners
      document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', this.handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', this.handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', this.handleFullscreenChange);
    });
  }

  /**
   * Get position class for styling
   */
  getPositionClass(): string {
    return this.positionClass();
  }

  // ========== Zoom Control Methods ==========

  /**
   * Handle zoom in
   */
  onZoomIn(): void {
    const mapId = this.mapId();
    this.mapService.zoomIn(mapId);
    this.zoomIn.emit();
  }

  /**
   * Handle zoom out
   */
  onZoomOut(): void {
    const mapId = this.mapId();
    this.mapService.zoomOut(mapId);
    this.zoomOut.emit();
  }

  // ========== Compass Control Methods ==========

  /**
   * Setup compass rotation listeners for the map
   */
  private setupCompassRotationListeners(): void {
    const showCompass = this.showCompass();
    if (!this.map || !showCompass) {
      return;
    }

    this.removeCompassRotationListeners();

    // Listen to rotation events
    this.compassRotateHandler = () => {
      this.updateCompassRotation();
    };

    this.compassRotateEndHandler = () => {
      this.updateCompassRotation();
    };

    this.map.on('rotate', this.compassRotateHandler);
    this.map.on('rotateend', this.compassRotateEndHandler);
  }

  /**
   * Remove compass rotation listeners
   */
  private removeCompassRotationListeners(): void {
    if (this.map) {
      if (this.compassRotateHandler) {
        this.map.off('rotate', this.compassRotateHandler);
        this.compassRotateHandler = null;
      }
      if (this.compassRotateEndHandler) {
        this.map.off('rotateend', this.compassRotateEndHandler);
        this.compassRotateEndHandler = null;
      }
    }
  }

  /**
   * Update compass rotation based on map bearing
   */
  private updateCompassRotation(): void {
    if (!this.map) {
      return;
    }

    // Get current bearing (rotation) of the map
    const bearing = this.map.getBearing();

    // Compass rotates in opposite direction to always point north
    // If map rotates 45° clockwise, compass rotates -45° (counter-clockwise)
    this.compassRotation = -bearing;
  }

  /**
   * Get compass rotation style
   */
  getCompassRotationStyle(): string {
    return `transform: rotate(${this.compassRotation}deg);`;
  }

  /**
   * Get compass image path
   */
  getCompassImagePath(): string {
    return this.compassConfig()?.compassImagePath || '/compass.png';
  }

  /**
   * Get locate image path
   */
  getLocateImagePath(): string {
    return this.locateConfig()?.locateImagePath || '/locateme.png';
  }

  /**
   * Handle reset north
   */
  onResetNorth(): void {
    const mapId = this.mapId();
    this.mapService.resetNorth(mapId);
    this.resetNorth.emit();
    // Rotation will update automatically via event listener
  }

  // ========== Locate Control Methods ==========

  /**
   * Handle locate
   */
  onLocate(): void {
    if (!navigator.geolocation) {
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    const locateConfig = this.locateConfig();
    if (locateConfig?.watchPosition) {
      this.startWatching(options);
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.handleLocationSuccess(position);
        },
        (error) => {
          this.handleLocationError(error);
        },
        options
      );
    }
  }

  /**
   * Start watching position
   */
  private startWatching(options: PositionOptions): void {
    this.stopWatching();

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.handleLocationSuccess(position);
      },
      (error) => {
        this.handleLocationError(error);
      },
      options
    );
  }

  /**
   * Stop watching position
   */
  private stopWatching(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Handle location success
   */
  private handleLocationSuccess(position: GeolocationPosition): void {
    const { longitude, latitude } = position.coords;
    const mapId = this.mapId();
    this.mapService.flyTo(mapId, [longitude, latitude], 15);

    this.locate.emit(position);
  }

  /**
   * Handle location error
   */
  private handleLocationError(error: GeolocationPositionError): void {
    this.locateError.emit(error);
  }

  // ========== Fullscreen Control Methods ==========

  /**
   * Handle fullscreen toggle
   */
  onToggleFullscreen(): void {
    if (!this.isFullscreenSupported()) {
      return;
    }

    if (this.isFullscreen) {
      this.exitFullscreen();
    } else {
      this.enterFullscreen();
    }
  }

  /**
   * Enter fullscreen
   */
  private enterFullscreen(): void {
    const mapId = this.mapId();
    const map = this.mapService.getMap(mapId);
    if (!map) {
      return;
    }

    const mapContainer = map.getContainer();
    if (!mapContainer) {
      return;
    }

    const controlsElement = this.elementRef.nativeElement as HTMLElement;
    if (!controlsElement) {
      return;
    }

    const commonAncestor = this.findCommonAncestor(mapContainer, controlsElement);

    const elementToFullscreen = commonAncestor || mapContainer;
    this.fullscreenElement = elementToFullscreen;

    if (elementToFullscreen.requestFullscreen) {
      elementToFullscreen.requestFullscreen().catch((error) => {
        // Error entering fullscreen
      });
    } else if ((elementToFullscreen as any).webkitRequestFullscreen) {
      (elementToFullscreen as any).webkitRequestFullscreen();
    } else if ((elementToFullscreen as any).mozRequestFullScreen) {
      (elementToFullscreen as any).mozRequestFullScreen();
    } else if ((elementToFullscreen as any).msRequestFullscreen) {
      (elementToFullscreen as any).msRequestFullscreen();
    }
  }

  /**
   * Exit fullscreen
   */
  private exitFullscreen(): void {
    // Only exit if the fullscreen element is in fullscreen
    const currentFullscreenElement = this.getFullscreenElement();
    if (currentFullscreenElement !== this.fullscreenElement) {
      return;
    }

    if (document.exitFullscreen) {
      document.exitFullscreen().catch((error) => {
        // Error exiting fullscreen
      });
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    } else if ((document as any).mozCancelFullScreen) {
      (document as any).mozCancelFullScreen();
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen();
    }
  }

  /**
   * Check if fullscreen is supported
   */
  private isFullscreenSupported(): boolean {
    return !!(
      document.fullscreenEnabled ||
      (document as any).webkitFullscreenEnabled ||
      (document as any).mozFullScreenEnabled ||
      (document as any).msFullscreenEnabled
    );
  }

  /**
   * Get the current fullscreen element
   */
  private getFullscreenElement(): HTMLElement | null {
    return (document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement) as HTMLElement | null;
  }

  /**
   * Handle fullscreen change
   */
  private handleFullscreenChange = (): void => {
    if (!this.fullscreenElement) {
      const mapId = this.mapId();
      const map = this.mapService.getMap(mapId);
      if (map) {
        const mapContainer = map.getContainer();
        const controlsElement = this.elementRef.nativeElement as HTMLElement;
        if (mapContainer && controlsElement) {
          const commonAncestor = this.findCommonAncestor(mapContainer, controlsElement);
          this.fullscreenElement = commonAncestor || mapContainer;
        }
      }
    }

    // Check if the fullscreen element is in fullscreen
    const currentFullscreenElement = this.getFullscreenElement();
    this.isFullscreen = currentFullscreenElement === this.fullscreenElement;

    // If fullscreen was exited, clear the element reference
    if (!this.isFullscreen) {
      this.fullscreenElement = null;
    }

    this.fullscreenChange.emit(this.isFullscreen);
  };

  /**
   * Check if currently in fullscreen
   */
  getIsFullscreen(): boolean {
    if (!this.fullscreenElement) {
      const mapId = this.mapId();
      const map = this.mapService.getMap(mapId);
      if (map) {
        const mapContainer = map.getContainer();
        const controlsElement = this.elementRef.nativeElement as HTMLElement;
        if (mapContainer && controlsElement) {
          const commonAncestor = this.findCommonAncestor(mapContainer, controlsElement);
          this.fullscreenElement = commonAncestor || mapContainer;
        }
      }
    }

    // Check if the fullscreen element is in fullscreen
    const currentFullscreenElement = this.getFullscreenElement();
    this.isFullscreen = currentFullscreenElement === this.fullscreenElement;

    return this.isFullscreen;
  }

  /**
   * Find common ancestor element between two elements
   */
  private findCommonAncestor(element1: HTMLElement, element2: HTMLElement): HTMLElement | null {
    // Collect all ancestors of element1
    const ancestors1: HTMLElement[] = [];
    let current: HTMLElement | null = element1;
    while (current) {
      ancestors1.push(current);
      current = current.parentElement;
    }

    // Check if element2 or any of its ancestors is in ancestors1
    current = element2;
    while (current) {
      if (ancestors1.includes(current)) {
        return current;
      }
      current = current.parentElement;
    }

    return null;
  }
}
