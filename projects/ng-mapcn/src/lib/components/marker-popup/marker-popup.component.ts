import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  Injector,
  NgZone,
  output,
  type TemplateRef,
  viewChild,
} from '@angular/core';
import { Popup } from 'maplibre-gl';

import { renderPortal } from '../../utils/portal';
import { MarkerContextService } from '../map-marker/marker-context.service';

@Component({
  selector: 'ng-marker-popup',
  template: '<ng-template #tpl><ng-content /></ng-template>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkerPopupComponent {
  readonly popupClose = output<void>();

  private readonly injector = inject(Injector);
  private readonly markerCtx = inject(MarkerContextService);
  private readonly zone = inject(NgZone);
  private readonly tpl = viewChild.required<TemplateRef<unknown>>('tpl');

  constructor() {
    effect((onCleanup) => {
      const marker = this.markerCtx.marker();
      if (!marker) return;

      const container = document.createElement('div');
      container.className = 'ng-popup-card';
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
        marker.setPopup(null);
        popup.remove();
        destroyPortal();
      });
    });
  }
}
