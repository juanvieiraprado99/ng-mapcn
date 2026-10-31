import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeRegistry } from '../../../testing/maplibre-fake';
import { renderMap, update } from '../../../testing/render';
import { provideMapLabels } from '../../providers/map-labels.provider';
import { MapMarkerComponent } from '../map-marker/map-marker.component';
import { MarkerPopupComponent } from './marker-popup.component';

const TEMPLATE = `
  <ng-map><ng-map-marker [longitude]="1" [latitude]="2">
    @if (show) {
      <ng-marker-popup (popupClose)="popupClose()"><p class="body">Popup body</p></ng-marker-popup>
    }
  </ng-map-marker></ng-map>
`;

async function render() {
  const popupClose = vi.fn();
  const result = await renderMap(TEMPLATE, {
    imports: [MapMarkerComponent, MarkerPopupComponent],
    hostProps: { show: true, popupClose },
  });
  return { ...result, popupClose };
}

describe('MarkerPopupComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.documentElement.className = '';
    TestBed.resetTestingModule();
  });

  it('creates one popup with the expected options and attaches it to the marker', async () => {
    await render();

    expect(fakeRegistry.popups).toHaveLength(1);
    const popup = fakeRegistry.popups[0];
    expect(popup.options).toEqual({
      maxWidth: 'none',
      closeButton: false,
      closeOnClick: false,
      focusAfterOpen: true,
    });
    expect(fakeRegistry.markers[0].getPopup()).toBe(popup);
  });

  it('projects the content into .ng-popup-card', async () => {
    await render();

    const content = fakeRegistry.popups[0].getContent() as HTMLElement;
    expect(content.className).toBe('ng-popup-card');
    expect(content.querySelector('.body')?.textContent).toBe('Popup body');
  });

  it('emits popupClose when the popup closes', async () => {
    const { popupClose } = await render();
    const popup = fakeRegistry.popups[0];

    popup.addTo(fakeRegistry.maps[0]);
    popup.remove();

    expect(popupClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape inside the card and returns focus to the marker', async () => {
    const { popupClose } = await render();
    const popup = fakeRegistry.popups[0];
    popup.addTo(fakeRegistry.maps[0]);
    const markerEl = fakeRegistry.markers[0].getElement();
    markerEl.tabIndex = 0;
    document.body.appendChild(markerEl);
    const body = (popup.getContent() as HTMLElement).querySelector('.body') as HTMLElement;
    document.body.appendChild(popup.getContent() as HTMLElement);
    body.tabIndex = 0;
    body.focus();

    body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(popup.isOpen()).toBe(false);
    expect(popupClose).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(markerEl);
    markerEl.remove();
    (popup.getContent() as HTMLElement).remove();
  });

  it('exposes isOpen and cardId for content that mirrors the popup state', async () => {
    const { fixture } = await renderMap(
      `<ng-map><ng-map-marker [longitude]="1" [latitude]="2">
        <ng-marker-popup #info><p>x</p></ng-marker-popup>
        <span class="state">{{ info.isOpen() }} {{ info.cardId }}</span>
      </ng-map-marker></ng-map>`,
      { imports: [MapMarkerComponent, MarkerPopupComponent] },
    );
    const state = () => (fixture.nativeElement as HTMLElement).querySelector('.state')!.textContent;
    const card = fakeRegistry.popups[0].getContent() as HTMLElement;
    expect(state()).toBe(`false ${card.id}`);

    fakeRegistry.markers[0].togglePopup();
    fixture.detectChanges();
    expect(state()).toBe(`true ${card.id}`);

    fakeRegistry.markers[0].togglePopup();
    fixture.detectChanges();
    expect(state()).toBe(`false ${card.id}`);
  });

  it('marks the marker as a popup button', async () => {
    await render();
    const el = fakeRegistry.markers[0].getElement();

    expect(el.getAttribute('role')).toBe('button');
    expect(el.getAttribute('aria-haspopup')).toBe('dialog');
  });

  it('detaches and removes the popup on destroy and drops the projected content', async () => {
    const { fixture } = await render();
    const popup = fakeRegistry.popups[0];
    const content = popup.getContent() as HTMLElement;
    popup.addTo(fakeRegistry.maps[0]);
    const marker = fakeRegistry.markers[0];

    update(fixture, { show: false });

    expect(marker.getPopup()).toBeNull();
    expect(popup.calls).toContain('remove');
    expect(popup.isOpen()).toBe(false);
    expect(content.querySelector('.body')).toBeNull();
  });

  it('does not throw when the whole fixture is destroyed', async () => {
    const { fixture } = await render();
    expect(() => fixture.destroy()).not.toThrow();
  });

  describe('options', () => {
    const OPTS_TEMPLATE = `
      <ng-map><ng-map-marker [longitude]="1" [latitude]="2">
        <ng-marker-popup
          [closeButton]="closeButton"
          [offset]="offset"
          [anchor]="anchor"
          [maxWidth]="maxWidth"
          [closeOnClick]="closeOnClick"
          [labels]="labels"
          (popupClose)="popupClose()"
        ><p class="body">x</p></ng-marker-popup>
      </ng-map-marker></ng-map>
    `;
    const defaults = () => ({
      closeButton: false,
      offset: undefined,
      anchor: undefined,
      maxWidth: 'none',
      closeOnClick: false,
      labels: undefined,
      popupClose: vi.fn(),
    });
    const renderOpts = async (props: Record<string, unknown> = {}) => {
      const hostProps = { ...defaults(), ...props };
      const result = await renderMap(OPTS_TEMPLATE, {
        imports: [MapMarkerComponent, MarkerPopupComponent],
        hostProps,
      });
      return { ...result, hostProps };
    };
    const card = () => fakeRegistry.popups[0].getContent() as HTMLElement;

    it('keeps the previous behaviour with no inputs set', async () => {
      await renderOpts();
      expect(fakeRegistry.popups[0].options).toEqual({
        maxWidth: 'none',
        closeButton: false,
        closeOnClick: false,
        focusAfterOpen: true,
      });
      expect(card().querySelector('.ng-popup-close')).toBeNull();
    });

    it('passes creation-only options to the Popup constructor', async () => {
      await renderOpts({ anchor: 'bottom', closeOnClick: true, offset: 24, maxWidth: '320px' });
      expect(fakeRegistry.popups[0].options).toEqual({
        maxWidth: '320px',
        closeButton: false,
        closeOnClick: true,
        focusAfterOpen: true,
        offset: 24,
        anchor: 'bottom',
      });
    });

    it('renders a close button that closes the popup and emits popupClose', async () => {
      const { hostProps } = await renderOpts({ closeButton: true });
      fakeRegistry.popups[0].addTo(fakeRegistry.maps[0]);
      const button = card().querySelector<HTMLButtonElement>('.ng-popup-close')!;
      expect(button.getAttribute('aria-label')).toBe('Close popup');

      button.click();

      expect(fakeRegistry.popups[0].isOpen()).toBe(false);
      expect(hostProps.popupClose).toHaveBeenCalledTimes(1);
    });

    it('toggles the close button and translates its label without recreating the popup', async () => {
      const { fixture } = await renderOpts();
      update(fixture, { closeButton: true, labels: { closePopup: 'Fechar' } });
      await fixture.whenStable();
      expect(card().querySelector('.ng-popup-close')?.getAttribute('aria-label')).toBe('Fechar');
      update(fixture, { closeButton: false });
      await fixture.whenStable();
      expect(card().querySelector('.ng-popup-close')).toBeNull();
      expect(fakeRegistry.popups).toHaveLength(1);
    });

    it('reconciles offset and maxWidth through setters without recreation', async () => {
      const { fixture } = await renderOpts();
      const popup = fakeRegistry.popups[0];
      popup.calls.length = 0;

      update(fixture, { offset: [4, 8], maxWidth: '200px' });
      await fixture.whenStable();

      expect(popup.calls).toContain('setOffset');
      expect(popup.calls).toContain('setMaxWidth');
      expect(popup.getOffset()).toEqual([4, 8]);
      expect(popup.getMaxWidth()).toBe('200px');
      expect(fakeRegistry.popups).toHaveLength(1);
      expect(fakeRegistry.markers[0].getPopup()).toBe(popup);
    });
  });

  describe('offset and close handling', () => {
    const T = `<ng-map><ng-map-marker [longitude]="1" [latitude]="2">
      @if (show) { <ng-marker-popup [offset]="offset" (popupClose)="popupClose()"><p>x</p></ng-marker-popup> }
    </ng-map-marker></ng-map>`;
    const go = async (offset?: unknown) => {
      const popupClose = vi.fn();
      const result = await renderMap(T, {
        imports: [MapMarkerComponent, MarkerPopupComponent],
        hostProps: { show: true, offset, popupClose },
      });
      await result.fixture.whenStable();
      return { ...result, popupClose };
    };

    it('never calls setOffset when no offset input is given', async () => {
      await go();
      expect(fakeRegistry.popups[0].calls).not.toContain('setOffset');
    });

    it('does not re-apply the creation offset, only later changes', async () => {
      const { fixture } = await go([1, 2]);
      const popup = fakeRegistry.popups[0];
      expect(popup.calls).not.toContain('setOffset');
      update(fixture, { offset: [3, 4] });
      await fixture.whenStable();
      expect(popup.calls.filter((c: string) => c === 'setOffset')).toHaveLength(1);
      expect(popup.getOffset()).toEqual([3, 4]);
    });

    it('does not emit popupClose when destroyed with an open popup', async () => {
      const { fixture, popupClose } = await go();
      fakeRegistry.popups[0].addTo(fakeRegistry.maps[0]);
      update(fixture, { show: false });
      await fixture.whenStable();
      expect(popupClose).not.toHaveBeenCalled();
    });

    it('still emits popupClose on a user close', async () => {
      const { popupClose } = await go();
      fakeRegistry.popups[0].addTo(fakeRegistry.maps[0]);
      fakeRegistry.popups[0].remove();
      expect(popupClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('dialog card', () => {
    const T = `<ng-map><ng-map-marker [longitude]="1" [latitude]="2" [ariaLabel]="markerLabel">
      <ng-marker-popup [ariaLabel]="popupLabel"><p>x</p></ng-marker-popup>
    </ng-map-marker></ng-map>`;
    const go = (props: Record<string, unknown> = {}) =>
      renderMap(T, {
        imports: [MapMarkerComponent, MarkerPopupComponent],
        hostProps: { markerLabel: undefined, popupLabel: undefined, ...props },
      });
    const card = () => fakeRegistry.popups[0].getContent() as HTMLElement;

    it('is a non-modal dialog named "Map popup" by default', async () => {
      await go();

      expect(card().getAttribute('role')).toBe('dialog');
      expect(card().getAttribute('aria-label')).toBe('Map popup');
      expect(card().hasAttribute('aria-modal')).toBe(false);
    });

    it("falls back to the marker's ariaLabel, and the popup's own ariaLabel wins", async () => {
      const { fixture } = await go({ markerLabel: 'Louvre' });
      expect(card().getAttribute('aria-label')).toBe('Louvre');

      update(fixture, { popupLabel: 'Louvre opening hours' });
      expect(card().getAttribute('aria-label')).toBe('Louvre opening hours');

      update(fixture, { popupLabel: undefined, markerLabel: undefined });
      expect(card().getAttribute('aria-label')).toBe('Map popup');
      expect(fakeRegistry.popups).toHaveLength(1);
    });

    it('translates the fallback through provideMapLabels (labels.popup)', async () => {
      await renderMap(T, {
        imports: [MapMarkerComponent, MarkerPopupComponent],
        hostProps: { markerLabel: undefined, popupLabel: undefined },
        providers: [provideMapLabels({ popup: 'Detalhes' })],
      });

      expect(card().getAttribute('aria-label')).toBe('Detalhes');
    });
  });

  describe('className', () => {
    it('applies the initial classes and keeps the built-in class', async () => {
      const { fixture } = await renderMap(
        `<ng-map><ng-map-marker [longitude]="1" [latitude]="2"><ng-marker-popup [className]="cls"><p>x</p></ng-marker-popup></ng-map-marker></ng-map>`,
        {
          imports: [MapMarkerComponent, MarkerPopupComponent],
          hostProps: { cls: 'w-64 p-0' },
        },
      );
      await fixture.whenStable();
      const el = fakeRegistry.popups[0].getContent() as HTMLElement;
      expect(el.classList).toContain('ng-popup-card');
      expect(el.classList).toContain('w-64');
      expect(el.classList).toContain('p-0');
    });

    it('swaps classes when the input changes, without dropping the built-in class', async () => {
      const { fixture } = await renderMap(
        `<ng-map><ng-map-marker [longitude]="1" [latitude]="2"><ng-marker-popup [className]="cls"><p>x</p></ng-marker-popup></ng-map-marker></ng-map>`,
        {
          imports: [MapMarkerComponent, MarkerPopupComponent],
          hostProps: { cls: 'a b' },
        },
      );
      await fixture.whenStable();
      const before = fakeRegistry.popups[0].getContent() as HTMLElement;
      update(fixture, { cls: 'b c ng-popup-card' });
      await fixture.whenStable();
      const el = fakeRegistry.popups[0].getContent() as HTMLElement;
      expect(el).toBe(before);
      expect(el.classList).not.toContain('a');
      expect(el.classList).toContain('b');
      expect(el.classList).toContain('c');
      expect(el.classList).toContain('ng-popup-card');

      update(fixture, { cls: undefined });
      await fixture.whenStable();
      expect(el.className).toBe('ng-popup-card');
    });
  });
});
