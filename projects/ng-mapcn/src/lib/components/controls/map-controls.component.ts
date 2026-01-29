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

  showZoom = input<boolean>(true);
  showCompass = input<boolean>(false);
  showLocate = input<boolean>(false);
  showFullscreen = input<boolean>(false);

  zoomConfig = input<ZoomControlConfig>();
  compassConfig = input<CompassControlConfig>();
  locateConfig = input<LocateControlConfig>();
  fullscreenConfig = input<FullscreenControlConfig>();

  zoomIn = output<void>();
  zoomOut = output<void>();
  resetNorth = output<void>();
  locate = output<GeolocationPosition>();
  locateError = output<GeolocationPositionError>();
  fullscreenChange = output<boolean>();

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

  compassRotation: number = 0;

  constructor() {
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

    this.destroyRef.onDestroy(() => {
      this.stopWatching();
      this.removeCompassRotationListeners();
      document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', this.handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', this.handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', this.handleFullscreenChange);
    });
  }

  getPositionClass(): string {
    return this.positionClass();
  }

  onZoomIn(): void {
    const mapId = this.mapId();
    this.mapService.zoomIn(mapId);
    this.zoomIn.emit();
  }

  onZoomOut(): void {
    const mapId = this.mapId();
    this.mapService.zoomOut(mapId);
    this.zoomOut.emit();
  }

  private setupCompassRotationListeners(): void {
    const showCompass = this.showCompass();
    if (!this.map || !showCompass) {
      return;
    }

    this.removeCompassRotationListeners();

    this.compassRotateHandler = () => {
      this.updateCompassRotation();
    };

    this.compassRotateEndHandler = () => {
      this.updateCompassRotation();
    };

    this.map.on('rotate', this.compassRotateHandler);
    this.map.on('rotateend', this.compassRotateEndHandler);
  }

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

  private updateCompassRotation(): void {
    if (!this.map) {
      return;
    }

    const bearing = this.map.getBearing();
    this.compassRotation = -bearing;
  }

  getCompassRotationStyle(): string {
    return `transform: rotate(${this.compassRotation}deg);`;
  }

  getCompassImagePath(): string {
    return this.compassConfig()?.compassImagePath || '/compass.png';
  }

  getLocateImagePath(): string {
    return this.locateConfig()?.locateImagePath || '/locateme.png';
  }

  onResetNorth(): void {
    const mapId = this.mapId();
    this.mapService.resetNorth(mapId);
    this.resetNorth.emit();
  }

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

  private stopWatching(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  private handleLocationSuccess(position: GeolocationPosition): void {
    const { longitude, latitude } = position.coords;
    const mapId = this.mapId();
    this.mapService.flyTo(mapId, [longitude, latitude], 15);

    this.locate.emit(position);
  }

  private handleLocationError(error: GeolocationPositionError): void {
    this.locateError.emit(error);
  }

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
      elementToFullscreen.requestFullscreen().catch(() => {});
    } else if ((elementToFullscreen as any).webkitRequestFullscreen) {
      (elementToFullscreen as any).webkitRequestFullscreen();
    } else if ((elementToFullscreen as any).mozRequestFullScreen) {
      (elementToFullscreen as any).mozRequestFullScreen();
    } else if ((elementToFullscreen as any).msRequestFullscreen) {
      (elementToFullscreen as any).msRequestFullscreen();
    }
  }

  private exitFullscreen(): void {
    const currentFullscreenElement = this.getFullscreenElement();
    if (currentFullscreenElement !== this.fullscreenElement) {
      return;
    }

    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    } else if ((document as any).mozCancelFullScreen) {
      (document as any).mozCancelFullScreen();
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen();
    }
  }

  private isFullscreenSupported(): boolean {
    return !!(
      document.fullscreenEnabled ||
      (document as any).webkitFullscreenEnabled ||
      (document as any).mozFullScreenEnabled ||
      (document as any).msFullscreenEnabled
    );
  }

  private getFullscreenElement(): HTMLElement | null {
    return (document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement) as HTMLElement | null;
  }

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

    const currentFullscreenElement = this.getFullscreenElement();
    this.isFullscreen = currentFullscreenElement === this.fullscreenElement;

    if (!this.isFullscreen) {
      this.fullscreenElement = null;
    }

    this.fullscreenChange.emit(this.isFullscreen);
  };

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

    const currentFullscreenElement = this.getFullscreenElement();
    this.isFullscreen = currentFullscreenElement === this.fullscreenElement;

    return this.isFullscreen;
  }

  private findCommonAncestor(element1: HTMLElement, element2: HTMLElement): HTMLElement | null {
    const ancestors1: HTMLElement[] = [];
    let current: HTMLElement | null = element1;
    while (current) {
      ancestors1.push(current);
      current = current.parentElement;
    }

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
