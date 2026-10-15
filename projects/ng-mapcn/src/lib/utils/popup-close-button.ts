import type { Popup } from 'maplibre-gl';

/** Builds the library's popup close button (an X); clicking it removes the popup. */
export function createPopupCloseButton(popup: Popup, label: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ng-popup-close';
  btn.setAttribute('aria-label', label);
  btn.appendChild(createCloseIcon());
  btn.addEventListener('click', () => popup.remove());
  return btn;
}

/**
 * Escape inside the popup card closes the popup (MapLibre only closes it on map clicks, which
 * leaves keyboard users without a way out). The event is stopped so a host dialog does not also
 * close. `onClosed` runs after the close and receives whether focus was inside the card, e.g. to
 * hand focus back to the element that opened it. The listener lives on `container`, so it goes
 * away with it.
 */
export function closePopupOnEscape(
  popup: Popup,
  container: HTMLElement,
  onClosed?: (hadFocus: boolean) => void,
): void {
  container.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    const hadFocus = container.contains(document.activeElement);
    popup.remove();
    onClosed?.(hadFocus);
  });
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
