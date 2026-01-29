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
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', this.handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', this.handleFullscreenChange);

    this.destroyRef.onDestroy(() => {
      document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', this.handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', this.handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', this.handleFullscreenChange);
    });
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

  getPositionClass(): string {
    return `ng-controls-${this.position()}`;
  }

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
