import {
  ChangeDetectionStrategy,
  Component,
  effect,
  type EmbeddedViewRef,
  inject,
  input,
  type TemplateRef,
  untracked,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { type Offset, Popup, type PositionAnchor } from 'maplibre-gl';

import { MapContextService } from '../../services/map-context.service';
import { MarkerContextService } from '../map-marker/marker-context.service';

@Component({
  selector: 'ng-marker-tooltip',
  template: '<ng-template #tpl><ng-content /></ng-template>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkerTooltipComponent {
  readonly offset = input<Offset>(16);
  /** Applied at creation only — MapLibre's Popup has no anchor setter (mapcn parity). */
  readonly anchor = input<PositionAnchor | undefined>(undefined);

  private readonly vcr = inject(ViewContainerRef);
  private readonly mapCtx = inject(MapContextService);
  private readonly markerCtx = inject(MarkerContextService);
  private readonly tpl = viewChild.required<TemplateRef<unknown>>('tpl');

  constructor() {
    effect((onCleanup) => {
      const map = this.mapCtx.map();
      const marker = this.markerCtx.marker();
      if (!map || !marker) return;

      const container = document.createElement('div');
      container.className = 'ng-tooltip-pill';
      container.style.pointerEvents = 'none';

      const view: EmbeddedViewRef<unknown> = this.vcr.createEmbeddedView(this.tpl());
      view.rootNodes.forEach((n: Node) => container.appendChild(n));
      view.detectChanges();

      const popup = new Popup({
        maxWidth: 'none',
        closeButton: false,
        closeOnClick: true,
        focusAfterOpen: false,
        offset: untracked(() => this.offset()),
        anchor: untracked(() => this.anchor()),
      });
      popup.setDOMContent(container);

      const el = marker.getElement();

      const show = () => {
        const ll = marker.getLngLat();
        popup.setLngLat(ll).addTo(map);
      };
      const hide = () => popup.remove();

      el.addEventListener('mouseenter', show);
      el.addEventListener('mouseleave', hide);

      this.popup = popup;

      onCleanup(() => {
        el.removeEventListener('mouseenter', show);
        el.removeEventListener('mouseleave', hide);
        popup.remove();
        view.destroy();
        this.popup = null;
      });
    });

    // Reconcile offset changes on the live popup (mapcn parity)
    effect(() => {
      const offset = this.offset();
      this.popup?.setOffset(offset ?? 16);
    });
  }

  private popup: Popup | null = null;
}
