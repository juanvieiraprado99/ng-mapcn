import {
  type BaseHarnessFilters,
  ComponentHarness,
  HarnessPredicate,
  TestKey,
} from '@angular/cdk/testing';

export interface NgMapMarkerHarnessFilters extends BaseHarnessFilters {
  /** Matches the marker's text content. */
  text?: string | RegExp;
  /** Matches the marker's `aria-label` (`ariaLabel` input, or the default "Map marker"). */
  label?: string | RegExp;
}

/**
 * Harness for a marker of `<ng-map-marker>`: the element MapLibre places on the map
 * (`.maplibregl-marker`), which holds the marker content. It is not the `<ng-map-marker>` tag,
 * whose template is empty.
 */
export class NgMapMarkerHarness extends ComponentHarness {
  static hostSelector = '.maplibregl-marker';

  /** Gets a `HarnessPredicate` to search for a marker that meets the given criteria. */
  static with(options: NgMapMarkerHarnessFilters = {}): HarnessPredicate<NgMapMarkerHarness> {
    return new HarnessPredicate(NgMapMarkerHarness, options)
      .addOption('text', options.text, (harness, text) =>
        HarnessPredicate.stringMatches(harness.getText(), text),
      )
      .addOption('label', options.label, (harness, label) =>
        HarnessPredicate.stringMatches(harness.getAriaLabel(), label),
      );
  }

  /** The marker's text content. */
  async getText(): Promise<string> {
    return (await this.host()).text();
  }

  /** The marker element's `aria-label`, or `null` when it has none. */
  async getAriaLabel(): Promise<string | null> {
    return (await this.host()).getAttribute('aria-label');
  }

  /** Clicks the marker (emits `markerClick`; toggles its `<ng-marker-popup>`). */
  async click(): Promise<void> {
    return (await this.host()).click();
  }

  /** Moves the pointer over the marker (emits `markerMouseEnter`; shows its tooltip). */
  async hover(): Promise<void> {
    return (await this.host()).hover();
  }

  /** Moves the pointer away from the marker (emits `markerMouseLeave`; hides its tooltip). */
  async mouseAway(): Promise<void> {
    return (await this.host()).mouseAway();
  }

  /** Focuses the marker element (shows its tooltip). */
  async focus(): Promise<void> {
    return (await this.host()).focus();
  }

  /** Presses Enter on the focused marker (like a click: emits `markerClick`, toggles the popup). */
  async pressEnter(): Promise<void> {
    return (await this.host()).sendKeys(TestKey.ENTER);
  }

  /**
   * Whether a popup card (`<ng-marker-popup>` or `<ng-map-popup>`, not a tooltip) is open on the
   * same map as this marker. MapLibre does not link a popup's element to its marker, so with
   * several markers this cannot tell whose popup is open: check its content with
   * `NgMapHarness.getPopups()`.
   */
  async hasPopup(): Promise<boolean> {
    return (await this.host()).matchesSelector(
      `.maplibregl-map:has(> .maplibregl-popup .ng-popup-card) ${NgMapMarkerHarness.hostSelector}`,
    );
  }
}
