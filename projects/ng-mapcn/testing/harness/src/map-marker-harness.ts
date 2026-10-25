import {
  type BaseHarnessFilters,
  ComponentHarness,
  HarnessPredicate,
  TestKey,
} from '@angular/cdk/testing';

import { HARNESS_SELECTORS } from './selectors';

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
  static hostSelector = HARNESS_SELECTORS.marker;

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
   * Whether the marker declares a popup (`<ng-marker-popup>`), read from its `aria-haspopup`. A
   * tooltip (`<ng-marker-tooltip>`) is not a popup.
   */
  async hasPopup(): Promise<boolean> {
    const value = await (await this.host()).getAttribute('aria-haspopup');
    return value !== null && value !== 'false';
  }

  /**
   * Whether this marker's own popup is open, read from its `aria-expanded` (kept in sync with the
   * MapLibre popup's open and close events). `false` for a marker without a popup. Throws for a
   * marker whose content has its own button or link: that control is the keyboard target, so the
   * marker element has no `aria-expanded`; check `NgMapHarness.getPopups()` instead.
   */
  async isPopupOpen(): Promise<boolean> {
    const expanded = await (await this.host()).getAttribute('aria-expanded');
    if (expanded === null && (await this.hasPopup())) {
      throw new Error(
        'This marker has no aria-expanded: its content has its own control. ' +
          'Use NgMapHarness.getPopups() to check the popup.',
      );
    }
    return expanded === 'true';
  }
}
