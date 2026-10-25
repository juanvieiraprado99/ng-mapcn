import { type BaseHarnessFilters, ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import { NgMapControlsHarness, type NgMapControlsHarnessFilters } from './map-controls-harness';
import { NgMapMarkerHarness, type NgMapMarkerHarnessFilters } from './map-marker-harness';
import { NgMapPopupHarness, type NgMapPopupHarnessFilters } from './map-popup-harness';
import { HARNESS_SELECTORS } from './selectors';

export type NgMapHarnessFilters = BaseHarnessFilters;

/**
 * Harness for `<ng-map>`. MapLibre renders markers, popups and controls into the map container,
 * inside the `<ng-map>` element, so they are found from here rather than from their own tags.
 */
export class NgMapHarness extends ComponentHarness {
  static hostSelector = HARNESS_SELECTORS.map;

  private readonly loader = this.locatorForOptional(HARNESS_SELECTORS.loader);

  /** Gets a `HarnessPredicate` to search for a map that meets the given criteria. */
  static with(options: NgMapHarnessFilters = {}): HarnessPredicate<NgMapHarness> {
    return new HarnessPredicate(NgMapHarness, options);
  }

  /**
   * Whether the loader overlay is shown: until the style is loaded (`loadMap()` with the fake),
   * while a new style loads, and while the `loading` input is true.
   */
  async isLoading(): Promise<boolean> {
    return (await this.loader()) !== null;
  }

  /** The markers on this map, optionally filtered. */
  async getMarkers(filter: NgMapMarkerHarnessFilters = {}): Promise<NgMapMarkerHarness[]> {
    return this.locatorForAll(NgMapMarkerHarness.with(filter))();
  }

  /** The open popups and tooltips on this map, optionally filtered. */
  async getPopups(filter: NgMapPopupHarnessFilters = {}): Promise<NgMapPopupHarness[]> {
    return this.locatorForAll(NgMapPopupHarness.with(filter))();
  }

  /** The `<ng-map-controls>` button groups on this map, optionally filtered. */
  async getControls(filter: NgMapControlsHarnessFilters = {}): Promise<NgMapControlsHarness[]> {
    return this.locatorForAll(NgMapControlsHarness.with(filter))();
  }
}
