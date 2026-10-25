import {
  type BaseHarnessFilters,
  ComponentHarness,
  HarnessPredicate,
  TestKey,
} from '@angular/cdk/testing';
import { MAP_TEST_SELECTORS } from 'ng-mapcn/testing';

/** A control in the marker content: the element that holds the popup state when there is one. */
const NESTED_CONTROL = 'button, a[href], [role="button"]';

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
  static hostSelector = MAP_TEST_SELECTORS.marker;

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
   * MapLibre popup's open and close events). `false` for a marker without a popup.
   *
   * A marker whose content has its own button or link has no `aria-expanded` (that control is the
   * keyboard target): then it reads the `aria-expanded` of the first such control, which the app
   * mirrors from `<ng-marker-popup #info>` with `[attr.aria-expanded]="info.isOpen()"`. Throws when
   * that control has none either; check `NgMapHarness.getPopups()` instead.
   */
  async isPopupOpen(): Promise<boolean> {
    let expanded = await (await this.host()).getAttribute('aria-expanded');
    if (expanded === null && (await this.hasPopup())) {
      const control = await this.nestedControl();
      expanded = control ? await control.getAttribute('aria-expanded') : null;
      if (expanded === null) {
        throw new Error(
          'This marker has no aria-expanded: its content has its own control, which does not ' +
            'mirror the popup state ([attr.aria-expanded]="popup.isOpen()" on <ng-marker-popup ' +
            '#popup>). Use NgMapHarness.getPopups() to check the popup.',
        );
      }
    }
    return expanded === 'true';
  }

  /** The first button or link in the marker content (the keyboard target when there is one). */
  private readonly nestedControl = this.locatorForOptional(NESTED_CONTROL);
}
