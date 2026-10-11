import {
  ChangeDetectionStrategy,
  Component,
  effect,
  type EmbeddedViewRef,
  inject,
  NgZone,
  output,
  type TemplateRef,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { Popup } from 'maplibre-gl';

import { MarkerContextService } from '../map-marker/marker-context.service';

@Component({
  selector: 'ng-marker-popup',
  template: '<ng-template #tpl><ng-content /></ng-template>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkerPopupComponent {
  readonly popupClose = output<void>();

  private readonly vcr = inject(ViewContainerRef);
  private readonly markerCtx = inject(MarkerContextService);
  private readonly zone = inject(NgZone);
  private readonly tpl = viewChild.required<TemplateRef<unknown>>('tpl');

  constructor() {
    effect((onCleanup) => {
      const marker = this.markerCtx.marker();
      if (!marker) return;

      const container = document.createElement('div');
      container.className = 'ng-popup-card';

      const view: EmbeddedViewRef<unknown> = this.vcr.createEmbeddedView(this.tpl());
      view.rootNodes.forEach((n: Node) => container.appendChild(n));
      view.detectChanges();

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        marker.setPopup(null as any);
        popup.remove();
        view.destroy();
      });
    });
  }
}
