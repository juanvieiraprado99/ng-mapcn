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

import { applyClassName } from '../../utils/class-name';
import { renderPortal } from '../../utils/portal';
import { MarkerContextService } from '../map-marker/marker-context.service';

@Component({
  selector: 'ng-marker-content',
  template: '<ng-template #tpl><ng-content /></ng-template>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkerContentComponent {
  /** Extra space-separated classes for the rendered `.ng-marker-content` element (reactive; built-in classes are kept). */
  readonly className = input<string>();

  private readonly injector = inject(Injector);
  private readonly markerCtx = inject(MarkerContextService);
  private readonly tpl = viewChild.required<TemplateRef<unknown>>('tpl');

  private readonly wrapperEl = signal<HTMLElement | null>(null);

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
      this.wrapperEl.set(wrapper);

      const destroyPortal = renderPortal(this.tpl(), this.injector, wrapper);

      // No projected content -> default marker icon (mapcn: `children || <DefaultMarkerIcon />`).
      // Re-evaluated whenever the projected DOM changes, so `@if` content, async data and empty
      // interpolations toggle it. The observer only runs on real DOM changes: static markers cost
      // nothing after creation (measured: 0 callbacks for 1000 idle markers).
      const icon = document.createElement('div');
      icon.className = 'ng-marker-default-icon';
      const syncIcon = () => {
        const empty = !hasContent(wrapper, icon);
        if (empty && !icon.parentNode) wrapper.appendChild(icon);
        else if (!empty && icon.parentNode) icon.remove();
        this.markerCtx.contentKind.set(empty ? 'default' : contentKind(wrapper));
      };
      syncIcon();
      const observer = new MutationObserver(syncIcon);
      observer.observe(wrapper, {
        childList: true,
        characterData: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['aria-label', 'aria-labelledby', 'alt', 'tabindex', 'href', 'role'],
      });

      onCleanup(() => {
        this.wrapperEl.set(null);
        observer.disconnect();
        this.markerCtx.contentKind.set('named');
        destroyPortal();
        wrapper.remove();
      });
    });

    // Reconcile className on the live element (no recreation).
    let applied: string[] = [];
    effect(() => {
      const el = this.wrapperEl();
      const value = this.className();
      if (!el) return;
      applied = untracked(() => applyClassName(el, value, applied, ['ng-marker-content']));
    });
  }
}

/** Whether `wrapper` holds projected content: an element (other than `icon`) or non-blank text. */
function hasContent(wrapper: HTMLElement, icon: HTMLElement): boolean {
  for (const node of Array.from(wrapper.childNodes)) {
    if (node === icon) continue;
    if (node.nodeType === Node.ELEMENT_NODE) return true;
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) return true;
  }
  return false;
}

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex], [role="button"]';
const NAMED = '[aria-label], [aria-labelledby], img[alt]:not([alt=""]), svg title';

/** Classifies non-empty projected content for the marker's accessible name / role decision. */
function contentKind(wrapper: HTMLElement): 'interactive' | 'named' | 'unnamed' {
  if (wrapper.querySelector(FOCUSABLE)) return 'interactive';
  if (wrapper.textContent?.trim() || wrapper.querySelector(NAMED)) return 'named';
  return 'unnamed';
}
