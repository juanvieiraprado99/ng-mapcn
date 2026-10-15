import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  Injector,
  input,
  signal,
  type TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';
import { type Offset, Popup, type PositionAnchor } from 'maplibre-gl';

import { MapContextService } from '../../services/map-context.service';
import { applyClassName } from '../../utils/class-name';
import { renderPortal } from '../../utils/portal';
import { MarkerContextService } from '../map-marker/marker-context.service';

@Component({
  selector: 'ng-marker-tooltip',
  template: '<ng-template #tpl><ng-content /></ng-template>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkerTooltipComponent {
  readonly offset = input<Offset>(16);
  /** Applied at creation only — MapLibre's Popup has no anchor setter (mapcn parity). */
  readonly anchor = input<PositionAnchor>();
  /** Extra space-separated classes for the rendered `.ng-tooltip-pill` element (reactive; built-in classes are kept). */
  readonly className = input<string>();

  private readonly injector = inject(Injector);
  private readonly mapCtx = inject(MapContextService);
  private readonly markerCtx = inject(MarkerContextService);
  private readonly tpl = viewChild.required<TemplateRef<unknown>>('tpl');
  private readonly popup = signal<Popup | null>(null);
  private readonly pillEl = signal<HTMLElement | null>(null);

  constructor() {
    effect((onCleanup) => {
      const map = this.mapCtx.map();
      const marker = this.markerCtx.marker();
      if (!map || !marker) return;

      const container = document.createElement('div');
      container.className = 'ng-tooltip-pill';
      container.style.pointerEvents = 'none';
      this.pillEl.set(container);
      const destroyPortal = renderPortal(this.tpl(), this.injector, container);

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

      // Keyboard parity: the marker element (or any focusable content inside it) shows the
      // tooltip on focus; Escape dismisses it while focus stays on the marker.
      const onKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') hide();
      };

      // A tooltip opened by keyboard focus stays while the pointer leaves.
      let focused = false;
      const onFocusIn = () => {
        focused = true;
        show();
      };
      const onFocusOut = () => {
        focused = false;
        hide();
      };
      const onLeave = () => {
        if (!focused) hide();
      };

      el.addEventListener('mouseenter', show);
      el.addEventListener('mouseleave', onLeave);
      el.addEventListener('focusin', onFocusIn);
      el.addEventListener('focusout', onFocusOut);
      el.addEventListener('keydown', onKeydown);
      this.markerCtx.hasTooltip.set(true);

      this.popup.set(popup);

      onCleanup(() => {
        el.removeEventListener('mouseenter', show);
        el.removeEventListener('mouseleave', onLeave);
        el.removeEventListener('focusin', onFocusIn);
        el.removeEventListener('focusout', onFocusOut);
        el.removeEventListener('keydown', onKeydown);
        this.markerCtx.hasTooltip.set(false);
        popup.remove();
        destroyPortal();
        this.popup.set(null);
        this.pillEl.set(null);
      });
    });

    // Reconcile offset changes on the live popup (mapcn parity)
    effect(() => {
      const offset = this.offset();
      this.popup()?.setOffset(offset ?? 16);
    });

    // Reconcile className on the live element (no recreation).
    let applied: string[] = [];
    effect(() => {
      const el = this.pillEl();
      const value = this.className();
      if (!el) return;
      applied = untracked(() => applyClassName(el, value, applied, ['ng-tooltip-pill']));
    });
  }
}
