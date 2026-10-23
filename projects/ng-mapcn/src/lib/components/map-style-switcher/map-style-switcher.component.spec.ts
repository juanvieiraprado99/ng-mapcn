import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadMap, renderMap, update } from '../../../testing/render';
import { type MapStyleOption, MapStyleSwitcherComponent } from './map-style-switcher.component';

const TEMPLATE = `
  <ng-map [center]="[0, 0]" [zoom]="0" [styles]="{ light: 'own.json' }">
    @if (show) {
      <ng-map-style-switcher
        [options]="options"
        [(value)]="value"
        (valueChange)="changes.push($event)"
        [position]="position"
        [labels]="labels"
        [className]="className"
      />
    }
  </ng-map>
`;

const options: MapStyleOption[] = [
  { id: 'streets', label: 'Streets', styles: { light: 'streets.json' } },
  { id: 'sat', label: 'Satellite', styles: { light: 'sat.json' } },
  { id: 'dark', label: 'Dark', styles: { light: 'dark.json' } },
];

const attached: HTMLElement[] = [];

async function render(hostProps: Record<string, unknown> = {}) {
  const host = {
    show: true,
    options,
    value: undefined,
    changes: [] as unknown[],
    position: 'top-right',
    labels: undefined,
    className: undefined,
    ...hostProps,
  };
  const result = await renderMap(TEMPLATE, {
    imports: [MapStyleSwitcherComponent],
    hostProps: host,
  });
  const map = result.map!;
  // The fake map's container is detached; focus (and the outside-click check) need it in the document.
  document.body.appendChild(map.getContainer());
  attached.push(map.getContainer());
  loadMap(map);
  result.fixture.detectChanges();
  await result.fixture.whenStable();
  return { ...result, map };
}

type Map_ = { getContainer(): HTMLElement };
const q = <T extends HTMLElement = HTMLElement>(map: Map_, selector: string) =>
  map.getContainer().querySelector<T>(selector)!;
const qa = (map: Map_, selector: string) =>
  Array.from(map.getContainer().querySelectorAll<HTMLElement>(selector));

async function settle(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) {
  fixture.detectChanges();
  // Portal views hang off ApplicationRef and the scheduler's timers are faked: tick explicitly.
  TestBed.inject(ApplicationRef).tick();
  await fixture.whenStable();
  TestBed.inject(ApplicationRef).tick();
}

function key(el: HTMLElement, k: string) {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
}

describe('MapStyleSwitcherComponent', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    attached.splice(0).forEach((el) => el.remove());
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('no value keeps the map style', async () => {
    const { map, ctx } = await render();
    expect(ctx.styleOverride()).toBeUndefined();
    expect(map.setStyle).not.toHaveBeenCalled();
    expect(q(map, '.ng-style-switcher-button').textContent!.trim()).toBe('Map style');
    expect(qa(map, '[aria-selected="true"]')).toHaveLength(0);
  });

  it('never sets an override while nothing is selected', async () => {
    const setOverride = vi.spyOn(
      (await import('../../services/map-context.service')).MapContextService.prototype,
      'setStyleOverride',
    );
    await render();
    expect(setOverride).not.toHaveBeenCalledWith(expect.anything());
  });

  it('selects an option from the listbox', async () => {
    const { map, fixture } = await render();
    const button = q<HTMLButtonElement>(map, '.ng-style-switcher-button');
    expect(button.getAttribute('aria-haspopup')).toBe('listbox');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(q(map, '[role="listbox"]')).toBeNull();

    button.click();
    await settle(fixture);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(q(map, '[role="listbox"]')).not.toBeNull();
    const items = qa(map, '[role="option"]');
    expect(items).toHaveLength(3);

    items[1].click();
    await settle(fixture);

    expect(fixture.componentInstance.value).toBe('sat');
    expect(fixture.componentInstance.changes).toEqual(['sat']);
    expect(map.setStyle).toHaveBeenCalledWith('sat.json', expect.anything());
    expect(q(map, '[role="listbox"]')).toBeNull();
    expect(document.activeElement).toBe(button);
    expect(button.textContent!.trim()).toBe('Satellite');
  });

  it('applies a bound value on mount', async () => {
    const { map, ctx } = await render({ value: 'sat' });
    expect(ctx.styleOverride()).toEqual({ light: 'sat.json' });
    expect(map.options.style).toBe('sat.json');
  });

  it('marks the current option as selected', async () => {
    const { map, fixture } = await render({ value: 'dark' });
    q<HTMLButtonElement>(map, '.ng-style-switcher-button').click();
    await settle(fixture);
    const selected = qa(map, '[aria-selected="true"]');
    expect(selected).toHaveLength(1);
    expect(selected[0].textContent!.trim()).toBe('Dark');
  });

  it('re-selecting the current option causes no extra setStyle', async () => {
    const { map, fixture } = await render();
    for (let i = 0; i < 2; i++) {
      q<HTMLButtonElement>(map, '.ng-style-switcher-button').click();
      await settle(fixture);
      qa(map, '[role="option"]')[1].click();
      await settle(fixture);
    }
    expect(map.setStyle).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard navigation with wrap-around, Enter and Escape', async () => {
    const { map, fixture } = await render();
    const button = q<HTMLButtonElement>(map, '.ng-style-switcher-button');
    button.click();
    await settle(fixture);
    const list = q(map, '[role="listbox"]');
    const items = qa(map, '[role="option"]');
    expect(document.activeElement).toBe(list);
    expect(new Set(items.map((i) => i.id)).size).toBe(3);
    expect(list.getAttribute('aria-activedescendant')).toBe(items[0].id);

    key(list, 'ArrowDown');
    await settle(fixture);
    expect(list.getAttribute('aria-activedescendant')).toBe(items[1].id);
    key(list, 'ArrowUp');
    key(list, 'ArrowUp');
    await settle(fixture);
    expect(list.getAttribute('aria-activedescendant')).toBe(items[2].id);
    key(list, 'ArrowDown');
    await settle(fixture);
    expect(list.getAttribute('aria-activedescendant')).toBe(items[0].id);

    key(list, 'Escape');
    await settle(fixture);
    expect(q(map, '[role="listbox"]')).toBeNull();
    expect(document.activeElement).toBe(button);
    expect(fixture.componentInstance.value).toBeUndefined();
    expect(map.setStyle).not.toHaveBeenCalled();

    button.click();
    await settle(fixture);
    const list2 = q(map, '[role="listbox"]');
    key(list2, 'ArrowDown');
    key(list2, 'Enter');
    await settle(fixture);
    expect(fixture.componentInstance.value).toBe('sat');
    expect(document.activeElement).toBe(button);
  });

  it('opens from the button with ArrowDown and closes on an outside pointerdown', async () => {
    const { map, fixture } = await render();
    const button = q<HTMLButtonElement>(map, '.ng-style-switcher-button');
    key(button, 'ArrowDown');
    await settle(fixture);
    expect(q(map, '[role="listbox"]')).not.toBeNull();

    q(map, '[role="listbox"]').dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await settle(fixture);
    expect(q(map, '[role="listbox"]')).not.toBeNull();

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await settle(fixture);
    expect(q(map, '[role="listbox"]')).toBeNull();
  });

  it('opens upward for bottom positions', async () => {
    const { map, fixture } = await render({ position: 'bottom-left' });
    q<HTMLButtonElement>(map, '.ng-style-switcher-button').click();
    await settle(fixture);
    expect(q(map, '.maplibregl-ctrl-bottom-left [role="listbox"]').classList).toContain(
      'ng-style-switcher-list--up',
    );
  });

  it('destroy clears the override', async () => {
    const { map, fixture, ctx } = await render({ value: 'sat' });
    update(fixture, { show: false });
    await settle(fixture);
    expect(ctx.styleOverride()).toBeUndefined();
    expect(map.setStyle).toHaveBeenLastCalledWith('own.json', expect.anything());
  });

  it('an unknown value clears the override', async () => {
    const { map, fixture, ctx } = await render({ value: 'sat' });
    update(fixture, { value: 'nope' });
    await settle(fixture);
    expect(ctx.styleOverride()).toBeUndefined();
    expect(map.setStyle).toHaveBeenLastCalledWith('own.json', expect.anything());
    expect(qa(map, '[aria-selected="true"]')).toHaveLength(0);
  });

  it('adds the className and defaults to top-right', async () => {
    const { map } = await render({ className: 'extra other' });
    const card = q(map, '.maplibregl-ctrl-top-right .ng-style-switcher');
    expect(card.classList).toContain('extra');
    expect(card.classList).toContain('other');
  });

  it('uses label overrides', async () => {
    const { map } = await render({ labels: { mapStyle: 'Estilo' } });
    expect(q(map, '.ng-style-switcher-button').textContent!.trim()).toBe('Estilo');
  });
});
