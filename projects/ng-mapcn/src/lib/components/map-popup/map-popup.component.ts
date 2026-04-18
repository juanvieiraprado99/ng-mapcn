import {
  ChangeDetectionStrategy,
  Component,
  EmbeddedViewRef,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Popup } from 'maplibre-gl';
import { MapContextService } from '../../services/map-context.service';

@Component({
  selector: 'ng-map-popup',
  template: '<ng-template #tpl><ng-content /></ng-template>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapPopupComponent {
  readonly longitude = input.required<number>();
  readonly latitude = input.required<number>();
  readonly closeButton = input(true);

  readonly popupClose = output<void>();

  private readonly vcr = inject(ViewContainerRef);
  private readonly mapCtx = inject(MapContextService);
  private readonly tpl = viewChild.required<TemplateRef<unknown>>('tpl');

  constructor() {
    effect((onCleanup) => {
      const map = this.mapCtx.map();
      if (!map) return;

      const container = document.createElement('div');
      container.className = 'ng-popup-card';

      const view: EmbeddedViewRef<unknown> = this.vcr.createEmbeddedView(this.tpl());
      view.rootNodes.forEach((n: Node) => container.appendChild(n));
      view.detectChanges();

      const popup = new Popup({
        maxWidth: 'none',
        closeButton: this.closeButton(),
        focusAfterOpen: true,
      });
      popup.setDOMContent(container);
      popup.setLngLat([this.longitude(), this.latitude()]);
      popup.addTo(map);
      popup.on('close', () => this.popupClose.emit());

      onCleanup(() => {
        popup.remove();
        view.destroy();
      });
    });

    // Update position when coordinates change
    effect(() => {
      const lng = this.longitude();
      const lat = this.latitude();
      const map = this.mapCtx.map();
      if (!map) return;
      // Position update handled by tracking both signals
      void [lng, lat];
    });
  }
}
