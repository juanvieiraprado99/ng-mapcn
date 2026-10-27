import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadAndSettle, renderMap, update } from '../../../testing/render';
import { provideMapLabels } from '../../providers/map-labels.provider';
import { MapRouteComponent } from '../map-route/map-route.component';
import { RoutePlaybackComponent } from '../route-playback/route-playback.component';
import { RoutePlaybackControlComponent } from './route-playback-control.component';

const TEMPLATE = `
  <ng-map>
    <ng-map-route id="r1" [coordinates]="coords">
      <ng-route-playback #a [duration]="1000" />
      <ng-route-playback #b [duration]="1000" />
    </ng-map-route>
    @if (show) {
      <ng-route-playback-control
        [for]="swap ? b : a"
        [position]="position"
        [speeds]="speeds"
        [labels]="labels"
        [className]="className"
      />
    }
  </ng-map>
`;

const COORDS: [number, number][] = [
  [0, 0],
  [2, 0],
];

async function render(hostProps: Record<string, unknown> = {}, providers: unknown[] = []) {
  const host = {
    coords: COORDS,
    show: true,
    swap: false,
    position: 'bottom-left',
    speeds: [0.5, 1, 2, 4],
    labels: undefined,
    className: undefined,
    ...hostProps,
  };
  const result = await renderMap(TEMPLATE, {
    imports: [MapRouteComponent, RoutePlaybackComponent, RoutePlaybackControlComponent],
    hostProps: host,
    providers: providers as never,
  });
  const map = result.map!;
  loadAndSettle(result.fixture, map);
  result.fixture.detectChanges();
  const [a, b] = result.fixture.debugElement
    .queryAll((d) => d.componentInstance instanceof RoutePlaybackComponent)
    .map((d) => d.componentInstance as RoutePlaybackComponent);
  return { ...result, map, a, b };
}

const q = <T extends HTMLElement = HTMLElement>(map: { getContainer(): HTMLElement }, s: string) =>
  map.getContainer().querySelector<T>(s)!;

const optionTexts = (select: HTMLSelectElement) =>
  [...select.options].map((o) => o.textContent!.trim());

describe('RoutePlaybackControlComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('mounts in the bottom-left corner, remounts on position change and is removed on destroy', async () => {
    const { map, fixture } = await render();
    expect(q(map, '.maplibregl-ctrl-bottom-left .ng-playback')).not.toBeNull();

    update(fixture, { position: 'top-right' });
    fixture.detectChanges();
    expect(q(map, '.maplibregl-ctrl-top-right .ng-playback')).not.toBeNull();
    expect(q(map, '.maplibregl-ctrl-bottom-left .ng-playback')).toBeNull();

    update(fixture, { show: false });
    fixture.detectChanges();
    expect(q(map, '.ng-playback')).toBeNull();
  });

  it('the button toggles playback and reflects it', async () => {
    const { map, fixture, a } = await render();
    const button = q<HTMLButtonElement>(map, '.ng-playback-toggle');
    expect(button.getAttribute('aria-label')).toBe('Play');
    expect(button.getAttribute('aria-pressed')).toBe('false');

    button.click();
    fixture.detectChanges();
    expect(a.playing()).toBe(true);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Pause');

    button.click();
    fixture.detectChanges();
    expect(a.playing()).toBe(false);
    expect(button.getAttribute('aria-label')).toBe('Play');
  });

  it('the scrubber seeks', async () => {
    const { map, fixture, a } = await render();
    const range = q<HTMLInputElement>(map, '.ng-playback-range');
    range.value = '0.4';
    range.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(a.progress()).toBeCloseTo(0.4);
    expect(range.getAttribute('aria-valuetext')).toBe('40%');
    expect(range.getAttribute('aria-label')).toBe('Playback progress');
  });

  it('the select sets the speed', async () => {
    const { map, fixture, a } = await render();
    const select = q<HTMLSelectElement>(map, '.ng-playback-speed');
    expect(optionTexts(select)).toEqual(['0.5×', '1×', '2×', '4×']);
    expect(select.getAttribute('aria-label')).toBe('Playback speed');
    select.value = '2';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(a.speed()).toBe(2);
  });

  it('an off-list speed shows as an extra option', async () => {
    const { map, fixture, a } = await render();
    a.speed.set(3);
    fixture.detectChanges();
    const select = q<HTMLSelectElement>(map, '.ng-playback-speed');
    expect(optionTexts(select)).toEqual(['0.5×', '1×', '2×', '3×', '4×']);
    expect(select.selectedOptions[0].textContent!.trim()).toBe('3×');
  });

  it('labels input overrides the defaults and className is added', async () => {
    const { map } = await render({ labels: { play: 'Reproducir' }, className: 'extra' });
    expect(q(map, '.ng-playback-toggle').getAttribute('aria-label')).toBe('Reproducir');
    expect(q(map, '.ng-playback').classList.contains('extra')).toBe(true);
  });

  it('provideMapLabels keys apply', async () => {
    const { map } = await render({}, [provideMapLabels({ playbackSpeed: 'Velocidad' })]);
    expect(q(map, '.ng-playback-speed').getAttribute('aria-label')).toBe('Velocidad');
  });

  it('follows a swapped for instance', async () => {
    const { map, fixture, a, b } = await render();
    update(fixture, { swap: true });
    fixture.detectChanges();
    q<HTMLButtonElement>(map, '.ng-playback-toggle').click();
    fixture.detectChanges();
    expect(b.playing()).toBe(true);
    expect(a.playing()).toBe(false);
  });
});
