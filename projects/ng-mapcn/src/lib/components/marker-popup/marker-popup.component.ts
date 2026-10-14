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
import { Popup } from 'maplibre-gl';

import { applyClassName } from '../../utils/class-name';
import { renderPortal } from '../../utils/portal';
import { MarkerContextService } from '../map-marker/marker-context.service';

@Component({
  selector: 'ng-marker-popup',
  template: '<ng-template #tpl><ng-content /></ng-template>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkerPopupComponent {
  readonly popupClose = output<void>();
  /** Extra space-separated classes for the rendered `.ng-popup-card` element (reactive; built-in classes are kept). */
  readonly className = input<string>();

  private readonly injector = inject(Injector);
  private readonly markerCtx = inject(MarkerContextService);
  private readonly zone = inject(NgZone);
  private readonly tpl = viewChild.required<TemplateRef<unknown>>('tpl');

  private readonly cardEl = signal<HTMLElement | null>(null);

  constructor() {
    effect((onCleanup) => {
      const marker = this.markerCtx.marker();
      if (!marker) return;

      const container = document.createElement('div');
      container.className = 'ng-popup-card';
      this.cardEl.set(container);
      const destroyPortal = renderPortal(this.tpl(), this.injector, container);

      const popup = new Popup({
        maxWidth: 'none',
        closeButton: false,
        closeOnClick: false,
        focusAfterOpen: true,
      });
      popup.setDOMContent(container);
      // 'close' fires from the map's event system (outside the zone) — re-enter
      popup.on('close', () => this.zone.run(() => this.popupClose.emit()));
      marker.setPopup(popup);

      onCleanup(() => {
        this.cardEl.set(null);
        marker.setPopup(null);
        popup.remove();
        destroyPortal();
      });
    });

    // Reconcile className on the live element (no recreation).
    let applied: string[] = [];
    effect(() => {
      const el = this.cardEl();
      const value = this.className();
      if (!el) return;
      applied = untracked(() => applyClassName(el, value, applied, ['ng-popup-card']));
    });
  }
}
