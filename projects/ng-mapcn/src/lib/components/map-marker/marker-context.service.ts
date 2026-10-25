import { Injectable, signal } from '@angular/core';
import { type Marker } from 'maplibre-gl';

@Injectable()
export class MarkerContextService {
  private readonly markerSignal = signal<Marker | null>(null);

  readonly marker = this.markerSignal.asReadonly();

  /** Set by `ng-marker-popup`: the marker opens a popup (MapLibre handles Enter/Space itself). */
  readonly hasPopup = signal(false);
  /** Set by `ng-marker-popup` from the MapLibre popup's `open` / `close` events. */
  readonly popupOpen = signal(false);
  /** Set by `ng-marker-popup`: the id of its `.ng-popup-card`, for `aria-controls`. */
  readonly popupCardId = signal<string | null>(null);
  /** Set by `ng-marker-tooltip`: the marker must be reachable by keyboard to show it. */
  readonly hasTooltip = signal(false);
  /**
   * Set by `ng-marker-content`: `default` (the built-in dot), `interactive` (projected content
   * has its own focusable control), `named` (text / label) or `unnamed` (e.g. an icon only).
   */
  readonly contentKind = signal<'default' | 'interactive' | 'named' | 'unnamed'>('named');

  setMarker(marker: Marker): void {
    this.markerSignal.set(marker);
  }

  reset(): void {
    this.markerSignal.set(null);
  }
}
