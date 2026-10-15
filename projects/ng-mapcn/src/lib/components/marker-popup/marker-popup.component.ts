import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  Injector,
  input,
  NgZone,
  output,
  signal,
  type TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';
import { type Offset, Popup, type PositionAnchor } from 'maplibre-gl';

import { injectMapLabels, type MapLabels } from '../../providers/map-labels.provider';
import { applyClassName } from '../../utils/class-name';
import { closePopupOnEscape, createPopupCloseButton } from '../../utils/popup-close-button';
import { renderPortal } from '../../utils/portal';
import { MarkerContextService } from '../map-marker/marker-context.service';

/**
 * Popup attached to the parent marker (opens on marker click). Created once and reconciled
 * via setters when inputs change — never recreated.
 */
@Component({
  selector: 'ng-marker-popup',
  template: '<ng-template #tpl><ng-content /></ng-template>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkerPopupComponent {
  /** Shows the library's own close button (an X inside the card). */
  readonly closeButton = input(false);
  /** Pixel offset from the marker. Reconciled live via `setOffset`; MapLibre's default when unset. */
  readonly offset = input<Offset>();
  /** Which side of the marker the popup anchors to. Applied at creation only — MapLibre's Popup has no anchor setter. */
  readonly anchor = input<PositionAnchor>();
  /** CSS max-width of the popup. Reconciled live via `setMaxWidth`. */
  readonly maxWidth = input('none');
  /**
   * Close when the map is clicked. Applied at creation only — MapLibre's Popup has no setter
   * for it (mapcn parity: `closeOnClick` prop).
   */
  readonly closeOnClick = input(false);
  /** Label overrides (`closePopup`), merged over `provideMapLabels` and the English defaults. */
  readonly labels = input<Partial<MapLabels>>();
  readonly popupClose = output<void>();
  /** Extra space-separated classes for the rendered `.ng-popup-card` element (reactive; built-in classes are kept). */
  readonly className = input<string>();

  private readonly injector = inject(Injector);
  private readonly l = injectMapLabels(this.labels);
  private readonly markerCtx = inject(MarkerContextService);
  private readonly zone = inject(NgZone);
  private readonly tpl = viewChild.required<TemplateRef<unknown>>('tpl');

  /** Serialized offset last applied to the live popup (creation value or last `setOffset`). */
  private appliedOffset: string | undefined;
  private readonly instance = signal<{ popup: Popup; container: HTMLDivElement } | null>(null);

  constructor() {
    effect((onCleanup) => {
      const marker = this.markerCtx.marker();
      if (!marker) return;

      const container = document.createElement('div');
      container.className = 'ng-popup-card';
      const destroyPortal = renderPortal(this.tpl(), this.injector, container);

      const offset = untracked(() => this.offset());
      const anchor = untracked(() => this.anchor());
      const popup = new Popup({
        maxWidth: untracked(() => this.maxWidth()),
        // MapLibre's own chrome stays off; the close button is ours.
        closeButton: false,
        closeOnClick: untracked(() => this.closeOnClick()),
        focusAfterOpen: true,
        ...(offset !== undefined && { offset }),
        ...(anchor !== undefined && { anchor }),
      });
      popup.setDOMContent(container);
      // Escape closes and hands focus back to the marker (only when focus was inside the card).
      closePopupOnEscape(popup, container, (hadFocus) => {
        if (hadFocus) marker.getElement().focus();
      });
      // 'close' fires from the map's event system (outside the zone) — re-enter
      const onClose = () => this.zone.run(() => this.popupClose.emit());
      popup.on('close', onClose);
      marker.setPopup(popup);
      // MapLibre makes the marker element focusable (tabindex) once it has a popup; the marker
      // component gives it `role="button"` (it reads `hasPopup`), announce the popup here unless
      // the app chose aria-haspopup itself.
      const el = marker.getElement();
      this.markerCtx.hasPopup.set(true);
      const setHaspopup = !el.hasAttribute('aria-haspopup');
      if (setHaspopup) el.setAttribute('aria-haspopup', 'dialog');
      this.appliedOffset = offset === undefined ? undefined : JSON.stringify(offset);
      this.instance.set({ popup, container });

      onCleanup(() => {
        this.instance.set(null);
        // Detach first: a teardown is not a user close, and the outputs are being destroyed.
        popup.off('close', onClose);
        marker.setPopup(null);
        this.markerCtx.hasPopup.set(false);
        if (setHaspopup) el.removeAttribute('aria-haspopup');
        popup.remove();
        destroyPortal();
      });
    });

    // Reconcile offset/maxWidth on the live popup (no recreation).
    effect(() => {
      const offset = this.offset();
      const maxWidth = this.maxWidth();
      const popup = this.instance()?.popup;
      if (!popup) return;
      // Never touch the offset unless the input is set: MapLibre's Marker.setPopup derives one
      // (marker height/radius) when none was given. Unsetting the input later keeps the last
      // applied offset (there is no public way to re-derive MapLibre's default).
      if (offset !== undefined) {
        const key = JSON.stringify(offset);
        if (key !== this.appliedOffset) {
          this.appliedOffset = key;
          popup.setOffset(offset);
        }
      }
      if (popup.getMaxWidth() !== maxWidth) popup.setMaxWidth(maxWidth);
    });

    // Reconcile closeButton (and its translatable label) on the live card.
    effect(() => {
      const showClose = this.closeButton();
      const instance = this.instance();
      if (!instance) return;
      const { popup, container } = instance;

      const label = this.l().closePopup;
      const existing = container.querySelector('.ng-popup-close');
      existing?.setAttribute('aria-label', label);
      if (showClose && !existing) {
        container.appendChild(createPopupCloseButton(popup, label));
      } else if (!showClose && existing) {
        existing.remove();
      }
    });

    // Reconcile className on the live element (no recreation).
    let applied: string[] = [];
    effect(() => {
      const el = this.instance()?.container;
      const value = this.className();
      if (!el) return;
      applied = untracked(() => applyClassName(el, value, applied, ['ng-popup-card']));
    });
  }
}
