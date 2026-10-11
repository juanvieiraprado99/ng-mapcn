import {
  ChangeDetectionStrategy,
  Component,
  EmbeddedViewRef,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
  input,
  NgZone,
  output,
  untracked,
  viewChild,
} from '@angular/core';
import { Offset, Popup } from 'maplibre-gl';
import { MapContextService } from '../../services/map-context.service';

/**
 * Standalone popup anchored at a lng/lat (no marker). Created once and
 * reconciled via setters when inputs change — never recreated.
 */
@Component({
  selector: 'ng-map-popup',
  template: '<ng-template #tpl><ng-content /></ng-template>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapPopupComponent {
  readonly longitude = input.required<number>();
  readonly latitude = input.required<number>();
  /** Shows the library's own close button (an X inside the card). */
  readonly closeButton = input(false);
  readonly offset = input<Offset>(16);
  readonly maxWidth = input('none');
  /**
   * Close when the map is clicked (MapLibre default). Applied at creation only —
   * MapLibre's Popup has no setter for it (mapcn parity: `closeOnClick` prop).
   */
  readonly closeOnClick = input(true);

  readonly popupClose = output<void>();

  private readonly vcr = inject(ViewContainerRef);
  private readonly mapCtx = inject(MapContextService);
  private readonly zone = inject(NgZone);
  private readonly tpl = viewChild.required<TemplateRef<unknown>>('tpl');

  private popup: Popup | null = null;
  private container: HTMLDivElement | null = null;

  constructor() {
    // Create once when the map becomes available.
    effect((onCleanup) => {
      const map = this.mapCtx.map();
      if (!map) return;

      const container = document.createElement('div');
      container.className = 'ng-popup-card';

      const view: EmbeddedViewRef<unknown> = this.vcr.createEmbeddedView(this.tpl());
      view.rootNodes.forEach((n: Node) => container.appendChild(n));
      view.detectChanges();

      const popup = new Popup({
        offset: untracked(() => this.offset()),
        closeOnClick: untracked(() => this.closeOnClick()),
        // MapLibre's own chrome stays off; the close button is ours.
        closeButton: false,
        focusAfterOpen: true,
      });
      popup.setMaxWidth(untracked(() => this.maxWidth()));
      popup.setDOMContent(container);
      popup.setLngLat([untracked(() => this.longitude()), untracked(() => this.latitude())]);
      popup.addTo(map);
      // 'close' fires from the map's event system (outside the zone) — re-enter
      popup.on('close', () => this.zone.run(() => this.popupClose.emit()));

      if (untracked(() => this.closeButton())) {
        container.appendChild(this.createCloseButton(popup));
      }

      this.popup = popup;
      this.container = container;

      onCleanup(() => {
        this.popup = null;
        this.container = null;
        try {
          popup.remove();
        } catch {}
        view.destroy();
      });
    });

    // Reconcile position/offset/maxWidth with a field-by-field diff.
    effect(() => {
      const lng = this.longitude();
      const lat = this.latitude();
      const offset = this.offset();
      const maxWidth = this.maxWidth();
      const popup = this.popup;
      if (!popup) return;

      const current = popup.getLngLat();
      if (!current || current.lng !== lng || current.lat !== lat) {
        popup.setLngLat([lng, lat]);
      }
      popup.setOffset(offset);
      if (popup.getMaxWidth() !== maxWidth) popup.setMaxWidth(maxWidth);
    });

    // Reconcile closeButton — mapcn renders it reactively.
    effect(() => {
      const showClose = this.closeButton();
      const popup = this.popup;
      const container = this.container;
      if (!popup || !container) return;

      const existing = container.querySelector('.ng-popup-close');
      if (showClose && !existing) {
        container.appendChild(this.createCloseButton(popup));
      } else if (!showClose && existing) {
        existing.remove();
      }
    });
  }

  private createCloseButton(popup: Popup): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ng-popup-close';
    btn.setAttribute('aria-label', 'Close popup');
    btn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
    btn.addEventListener('click', () => popup.remove());
    return btn;
  }
}
