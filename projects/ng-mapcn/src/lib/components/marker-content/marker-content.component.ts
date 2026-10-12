import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  Injector,
  type TemplateRef,
  viewChild,
} from '@angular/core';

import { renderPortal } from '../../utils/portal';
import { MarkerContextService } from '../map-marker/marker-context.service';

@Component({
  selector: 'ng-marker-content',
  template: '<ng-template #tpl><ng-content /></ng-template>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkerContentComponent {
  private readonly injector = inject(Injector);
  private readonly markerCtx = inject(MarkerContextService);
  private readonly tpl = viewChild.required<TemplateRef<unknown>>('tpl');

  constructor() {
    effect((onCleanup) => {
      const marker = this.markerCtx.marker();
      if (!marker) return;

      const host = marker.getElement();
      // Clear MapLibre's default marker content
      host.replaceChildren();

      const wrapper = document.createElement('div');
      wrapper.className = 'ng-marker-content';
      host.appendChild(wrapper);

      const destroyPortal = renderPortal(this.tpl(), this.injector, wrapper);

      // No projected content -> default marker icon (mapcn's blue dot)
      if (wrapper.textContent?.trim() === '' && !wrapper.querySelector('*')) {
        const icon = document.createElement('div');
        icon.className = 'ng-marker-default-icon';
        wrapper.appendChild(icon);
      }

      onCleanup(destroyPortal);
    });
  }
}
