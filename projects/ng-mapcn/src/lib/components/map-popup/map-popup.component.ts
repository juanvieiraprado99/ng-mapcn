import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  Injector,
  input,
  model,
  NgZone,
  output,
  signal,
  type TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';
import { type Map as MapLibreMap, type Offset, Popup } from 'maplibre-gl';

import { injectMapLabels, type MapLabels } from '../../providers/map-labels.provider';
import { MapContextService } from '../../services/map-context.service';
import { renderPortal } from '../../utils/portal';

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
  /** Label overrides (`closePopup`), merged over `provideMapLabels` and the English defaults. */
  readonly labels = input<Partial<MapLabels>>();
  /**
   * Whether the popup is shown. Two-way bindable (`[(open)]`): closing it (map click, close
   * button) writes `false`, and setting `true` opens the same popup again — at the current
   * position. A closed popup stays closed when only its position changes (mapcn parity).
   */
  readonly open = model(true);

  /** Emits whenever the popup closes, whether by the user or by setting `open` to false. */
  readonly popupClose = output<void>();

  private readonly injector = inject(Injector);
  private readonly l = injectMapLabels(this.labels);
  private readonly mapCtx = inject(MapContextService);
  private readonly zone = inject(NgZone);
  private readonly tpl = viewChild.required<TemplateRef<unknown>>('tpl');

  /** The live popup and its content card; null until the map exists. */
  private readonly instance = signal<{
    popup: Popup;
    container: HTMLDivElement;
    map: MapLibreMap;
  } | null>(null);

  constructor() {
    // Create once when the map becomes available.
    effect((onCleanup) => {
      const map = this.mapCtx.map();
      if (!map) return;

      const container = document.createElement('div');
      container.className = 'ng-popup-card';
      const destroyPortal = renderPortal(this.tpl(), this.injector, container);

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
      if (untracked(() => this.open())) popup.addTo(map);
      // 'close' fires from the map's event system (outside the zone) — re-enter
      const onClose = () =>
        this.zone.run(() => {
          this.open.set(false);
          this.popupClose.emit();
        });
      popup.on('close', onClose);

      this.instance.set({ popup, container, map });

      onCleanup(() => {
        this.instance.set(null);
        // Detach first: a teardown is not a user close, and the outputs are being destroyed.
        popup.off('close', onClose);
        try {
          popup.remove();
        } catch {}
        destroyPortal();
      });
    });

    // Reconcile [(open)]: re-add the same popup or remove it.
    effect(() => {
      const open = this.open();
      const instance = this.instance();
      if (!instance) return;
      const { popup, map } = instance;
      if (open && !popup.isOpen()) popup.addTo(map);
      else if (!open && popup.isOpen()) popup.remove();
    });

    // Reconcile position/offset/maxWidth with a field-by-field diff.
    effect(() => {
      const lng = this.longitude();
      const lat = this.latitude();
      const offset = this.offset();
      const maxWidth = this.maxWidth();
      const popup = this.instance()?.popup;
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
      const instance = this.instance();
      if (!instance) return;
      const { popup, container } = instance;

      const label = this.l().closePopup;
      const existing = container.querySelector('.ng-popup-close');
      existing?.setAttribute('aria-label', label);
      if (showClose && !existing) {
        container.appendChild(this.createCloseButton(popup, label));
      } else if (!showClose && existing) {
        existing.remove();
      }
    });
  }

  private createCloseButton(popup: Popup, label: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ng-popup-close';
    btn.setAttribute('aria-label', label);
    btn.appendChild(createCloseIcon());
    btn.addEventListener('click', () => popup.remove());
    return btn;
  }
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** The "X" icon, built with DOM APIs: no HTML parsing, so it works under Trusted Types CSPs. */
function createCloseIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  const attrs: Record<string, string> = {
    width: '14',
    height: '14',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  };
  for (const [name, value] of Object.entries(attrs)) svg.setAttribute(name, value);
  for (const d of ['M18 6 6 18', 'm6 6 12 12']) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
  return svg;
}
