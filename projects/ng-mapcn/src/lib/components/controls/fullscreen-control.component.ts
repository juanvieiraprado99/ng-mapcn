import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { ControlPosition, FullscreenControlConfig } from '../../models';
import { MapService } from '../../services/map.service';

/**
 * Fullscreen control component
 */
@Component({
  selector: 'ng-fullscreen-control',
  standalone: true,
  imports: [],
  templateUrl: './fullscreen-control.component.html',
  styleUrl: './fullscreen-control.component.scss',
})
export class FullscreenControlComponent {
  fullscreenButton = viewChild<ElementRef<HTMLButtonElement>>('fullscreenButton');

  config = input<FullscreenControlConfig>();
  mapId = input<string>('default-map');
  position = input<ControlPosition>('top-right');

  fullscreenChange = output<boolean>();

  private mapService = inject(MapService);
  private elementRef = inject(ElementRef);
  private destroyRef = inject(DestroyRef);
  private isFullscreen = false;
  private fullscreenElement: HTMLElement | null = null;

  constructor() {
    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', this.handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', this.handleFullscreenChange);

    // Cleanup on destroy
    this.destroyRef.onDestroy(() => {
      document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', this.handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', this.handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', this.handleFullscreenChange);
    });
  }

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

    // Find common ancestor element that contains both map and controls
    const commonAncestor = this.findCommonAncestor(mapContainer, controlsElement);

    // Use common ancestor if found, otherwise fallback to map container
    const elementToFullscreen = commonAncestor || mapContainer;
    this.fullscreenElement = elementToFullscreen;

    // Request fullscreen on the common ancestor or map container
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
   * Get position class
   */
  getPositionClass(): string {
    return `ng-controls-${this.position()}`;
  }

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
