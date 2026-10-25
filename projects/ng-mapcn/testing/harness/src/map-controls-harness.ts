import { type BaseHarnessFilters, ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import { HARNESS_SELECTORS } from './selectors';

export type NgMapControlsHarnessFilters = BaseHarnessFilters;

/** Excludes the compass, locate and fullscreen buttons, so only a zoom button matches. */
const ZOOM = ':not([aria-busy]):not([aria-pressed]):not(:has(.ng-control-compass))';
const GROUP = HARNESS_SELECTORS.controlGroup;

/**
 * Harness for the button group of `<ng-map-controls>`. The buttons are rendered as a MapLibre
 * control inside the map container, not inside the `<ng-map-controls>` tag, so the host is the
 * rendered `.ng-controls` element.
 *
 * The button labels are localizable, so the buttons are found by structure instead: zoom in and
 * zoom out are the first and second buttons of `.ng-control-group` (when `showZoom` is on), reset
 * north holds the compass icon, locate is the one with `aria-busy` and fullscreen the one with
 * `aria-pressed`. Each action throws when its button is not shown (`showZoom`, `showCompass`,
 * `showLocate`, `showFullscreen`).
 */
export class NgMapControlsHarness extends ComponentHarness {
  static hostSelector = HARNESS_SELECTORS.controls;

  private readonly zoomInButton = this.locatorFor(`${GROUP} > button:first-child${ZOOM}`);
  private readonly zoomOutButton = this.locatorFor(`${GROUP} > button:nth-child(2)${ZOOM}`);
  private readonly compassButton = this.locatorFor(`${GROUP} > button:has(.ng-control-compass)`);
  private readonly locateButton = this.locatorFor(`${GROUP} > button[aria-busy]`);
  private readonly fullscreenButton = this.locatorFor(`${GROUP} > button[aria-pressed]`);

  /** Gets a `HarnessPredicate` to search for a controls group that meets the given criteria. */
  static with(options: NgMapControlsHarnessFilters = {}): HarnessPredicate<NgMapControlsHarness> {
    return new HarnessPredicate(NgMapControlsHarness, options);
  }

  /** Clicks zoom in (`map.zoomTo(zoom + 1)`). */
  async zoomIn(): Promise<void> {
    return (await this.zoomInButton()).click();
  }

  /** Clicks zoom out (`map.zoomTo(zoom - 1)`). */
  async zoomOut(): Promise<void> {
    return (await this.zoomOutButton()).click();
  }

  /** Clicks the compass (`map.resetNorthPitch()`). Needs `showCompass`. */
  async resetNorth(): Promise<void> {
    return (await this.compassButton()).click();
  }

  /** Clicks locate (browser geolocation, then `map.flyTo`). Needs `showLocate`. */
  async locate(): Promise<void> {
    return (await this.locateButton()).click();
  }

  /** Whether a locate request is in flight (the locate button is busy). Needs `showLocate`. */
  async isLocating(): Promise<boolean> {
    return (await (await this.locateButton()).getAttribute('aria-busy')) === 'true';
  }

  /** Clicks fullscreen (requests or exits fullscreen on the map container). Needs `showFullscreen`. */
  async toggleFullscreen(): Promise<void> {
    return (await this.fullscreenButton()).click();
  }

  /** Whether the map container is in fullscreen. Needs `showFullscreen`. */
  async isFullscreen(): Promise<boolean> {
    return (await (await this.fullscreenButton()).getAttribute('aria-pressed')) === 'true';
  }
}
