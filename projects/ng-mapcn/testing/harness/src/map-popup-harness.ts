import {
  type BaseHarnessFilters,
  ComponentHarness,
  HarnessPredicate,
  TestKey,
} from '@angular/cdk/testing';

export interface NgMapPopupHarnessFilters extends BaseHarnessFilters {
  /** Matches the popup's text content. */
  text?: string | RegExp;
}

/**
 * Harness for an open popup on the map (`.maplibregl-popup`): an `<ng-map-popup>`, an
 * `<ng-marker-popup>` or an `<ng-marker-tooltip>`. A closed popup is not in the DOM, so it is not
 * found.
 */
export class NgMapPopupHarness extends ComponentHarness {
  static hostSelector = '.maplibregl-popup';

  private readonly card = this.locatorFor('.ng-popup-card');
  private readonly tooltip = this.locatorForOptional('.ng-tooltip-pill');
  private readonly closeButton = this.locatorForOptional('.ng-popup-close');

  /** Gets a `HarnessPredicate` to search for a popup that meets the given criteria. */
  static with(options: NgMapPopupHarnessFilters = {}): HarnessPredicate<NgMapPopupHarness> {
    return new HarnessPredicate(NgMapPopupHarness, options).addOption(
      'text',
      options.text,
      (harness, text) => HarnessPredicate.stringMatches(harness.getText(), text),
    );
  }

  /** The popup's text content. */
  async getText(): Promise<string> {
    return (await this.host()).text();
  }

  /** Whether this is a marker tooltip (`<ng-marker-tooltip>`) rather than a popup card. */
  async isTooltip(): Promise<boolean> {
    return (await this.tooltip()) !== null;
  }

  /** Whether the card shows the library's close button (`closeButton` input). */
  async hasCloseButton(): Promise<boolean> {
    return (await this.closeButton()) !== null;
  }

  /** Clicks the close button. Throws when the popup has none (see `hasCloseButton()`). */
  async close(): Promise<void> {
    const button = await this.closeButton();
    if (!button) throw new Error('This popup has no close button (`closeButton` input).');
    return button.click();
  }

  /** Presses Escape inside the card, which closes it. Throws for a tooltip, which has no card. */
  async pressEscape(): Promise<void> {
    return (await this.card()).sendKeys(TestKey.ESCAPE);
  }
}
