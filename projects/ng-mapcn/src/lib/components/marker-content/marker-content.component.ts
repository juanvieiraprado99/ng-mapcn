import {
  ChangeDetectionStrategy,
  Component,
  EmbeddedViewRef,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { MarkerContextService } from '../map-marker/marker-context.service';

@Component({
  selector: 'ng-marker-content',
  template: '<ng-template #tpl><ng-content /></ng-template>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkerContentComponent {
  private readonly vcr = inject(ViewContainerRef);
  private readonly markerCtx = inject(MarkerContextService);
  private readonly tpl = viewChild.required<TemplateRef<unknown>>('tpl');

  private view: EmbeddedViewRef<unknown> | null = null;

  constructor() {
    effect((onCleanup) => {
      const marker = this.markerCtx.marker();
      if (!marker) return;

      // Clean up any previous view
      if (this.view) {
        this.view.destroy();
        this.view = null;
      }

      const host = marker.getElement();
      // Clear MapLibre's default marker content
      host.innerHTML = '';

      const view = this.vcr.createEmbeddedView(this.tpl());
      this.view = view;

      view.rootNodes.forEach((node: Node) => {
        if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
          host.appendChild(node);
        }
      });
      view.detectChanges();

      onCleanup(() => {
        view.destroy();
        this.view = null;
      });
    });
  }
}
