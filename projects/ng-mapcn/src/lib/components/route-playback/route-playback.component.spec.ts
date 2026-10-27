import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadAndSettle, reloadStyle, renderMap, update } from '../../../testing/render';
import { pointAlongLine } from '../../utils/map-utils';
import { MapRouteComponent } from '../map-route/map-route.component';
import { RouteProgressComponent } from '../route-progress/route-progress.component';
import { RoutePlaybackComponent } from './route-playback.component';

const TEMPLATE = `
  <ng-map [theme]="theme">
    <ng-map-route id="r1" [coordinates]="coords" [progress]="0.2">
      <ng-route-progress />
      @if (show) {
        <ng-route-playback [(playing)]="playing" [(progress)]="progress" [duration]="1000" [speed]="speed" [loop]="loop" [follow]="follow" (ended)="endedCount = endedCount + 1" />
      }
    </ng-map-route>
  </ng-map>
`;

const COORDS: [number, number][] = [
  [0, 0],
  [2, 0],
];
const SOURCE = 'r1-layer-progress';

type Host = {
  coords: [number, number][];
  theme: string;
  show: boolean;
  playing: boolean;
  progress: number;
  speed: number;
  loop: boolean;
  follow: boolean;
  endedCount: number;
};

async function renderLoaded(hostProps: Partial<Host> = {}) {
  const host: Host = {
    coords: COORDS,
    theme: 'light',
    show: true,
    progress: 0,
    speed: 1,
    loop: false,
    follow: false,
    endedCount: 0,
    ...hostProps,
    playing: false, // started below, once the load settled (its timers would run frames)
  };
  const result = await renderMap(TEMPLATE, {
    imports: [MapRouteComponent, RouteProgressComponent, RoutePlaybackComponent],
    hostProps: host as unknown as Record<string, unknown>,
  });
  const map = result.map!;
  loadAndSettle(result.fixture, map);
  result.fixture.detectChanges();
  const playback = result.fixture.debugElement.query(
    (d) => d.componentInstance instanceof RoutePlaybackComponent,
  )?.componentInstance as RoutePlaybackComponent;
  if (hostProps.playing) {
    update(result.fixture, { playing: true });
    result.fixture.detectChanges();
  }
  return { ...result, map, playback, host: result.fixture.componentInstance as Host };
}

/** Covered fraction of the (2 degrees long) route, from the latest data written to the progress source. */
function covered(map: { getSource(id: string): any }): number {
  const source = map.getSource(SOURCE);
  if (!source) return NaN;
  const data = source.setData.mock.calls.at(-1)?.[0] ?? source.data;
  if (!data.features.length) return 0;
  const coords = data.features[0].geometry.coordinates;
  return coords[coords.length - 1][0] / 2;
}

function frames(fixture: ComponentFixture<unknown>, count: number) {
  for (let i = 0; i < count; i++) vi.advanceTimersToNextFrame();
  fixture.detectChanges();
}

describe('RoutePlaybackComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('overrides the route progress with its own', async () => {
    const { map } = await renderLoaded();
    expect(covered(map)).toBe(0);
  });

  it('advances by dt * speed / duration while playing', async () => {
    const { fixture, host } = await renderLoaded({ playing: true });
    vi.advanceTimersToNextFrame(); // first frame only stores the timestamp
    expect(host.progress).toBe(0);
    frames(fixture, 15); // ~16 ms each
    expect(host.progress).toBeGreaterThan(0.22);
    expect(host.progress).toBeLessThan(0.27);
  });

  it('scales with speed', async () => {
    const { fixture, host } = await renderLoaded({ playing: true, speed: 2 });
    vi.advanceTimersToNextFrame();
    frames(fixture, 15);
    expect(host.progress).toBeGreaterThan(0.44);
    expect(host.progress).toBeLessThan(0.54);
  });

  it('clamps a long frame to 100 ms', async () => {
    const { fixture, host } = await renderLoaded();
    const callbacks: FrameRequestCallback[] = [];
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      callbacks.push(cb);
      return callbacks.length;
    });
    update(fixture, { playing: true });
    fixture.detectChanges();
    callbacks.pop()!(1000); // first frame only stores the timestamp
    callbacks.pop()!(6000); // 5 s later: advances like 100 ms
    fixture.detectChanges();
    expect(host.progress).toBeCloseTo(0.1, 6);
  });

  it('stops at the end and emits ended once', async () => {
    const { fixture, host } = await renderLoaded({ playing: true });
    fixture.detectChanges();
    frames(fixture, 100);
    expect(host.progress).toBe(1);
    expect(host.playing).toBe(false);
    expect(host.endedCount).toBe(1);
    frames(fixture, 10);
    expect(host.progress).toBe(1);
    expect(host.endedCount).toBe(1);
  });

  it('wraps when loop is true', async () => {
    const { fixture, host } = await renderLoaded({ playing: true, loop: true });
    fixture.detectChanges();
    frames(fixture, 66);
    expect(host.progress).toBeGreaterThan(0);
    expect(host.progress).toBeLessThan(0.2);
    expect(host.playing).toBe(true);
    expect(host.endedCount).toBe(0);
  });

  it('play() at the end restarts from 0', async () => {
    const { playback } = await renderLoaded({ progress: 1 });
    playback.play();
    expect(playback.progress()).toBe(0);
    expect(playback.playing()).toBe(true);
  });

  it('play() keeps the current progress otherwise', async () => {
    const { playback } = await renderLoaded({ progress: 0.4 });
    playback.play();
    expect(playback.progress()).toBe(0.4);
  });

  it('restart() sets 0 and plays', async () => {
    const { playback } = await renderLoaded({ progress: 0.7 });
    playback.restart();
    expect(playback.progress()).toBe(0);
    expect(playback.playing()).toBe(true);
  });

  it('toggle() flips and pause() stops', async () => {
    const { playback } = await renderLoaded();
    playback.toggle();
    expect(playback.playing()).toBe(true);
    playback.toggle();
    expect(playback.playing()).toBe(false);
    playback.play();
    playback.pause();
    expect(playback.playing()).toBe(false);
  });

  it('seek() clamps and leaves the play state alone', async () => {
    const { playback } = await renderLoaded({ playing: true });
    playback.seek(1.5);
    expect(playback.progress()).toBe(1);
    playback.seek(-1);
    expect(playback.progress()).toBe(0);
    playback.seek(0.5);
    playback.seek(NaN);
    expect(playback.progress()).toBe(0);
    expect(playback.playing()).toBe(true);
  });

  it('continues from an externally written progress', async () => {
    const { fixture, host } = await renderLoaded({ playing: true });
    fixture.detectChanges();
    frames(fixture, 5);
    update(fixture, { progress: 0.6 });
    fixture.detectChanges();
    frames(fixture, 5);
    expect(host.progress).toBeGreaterThan(0.6);
    expect(host.progress).toBeLessThan(0.7);
  });

  it('holds still when speed <= 0', async () => {
    const { fixture, host } = await renderLoaded({ playing: true, speed: 0, progress: 0.3 });
    fixture.detectChanges();
    frames(fixture, 10);
    expect(host.progress).toBe(0.3);
    expect(host.playing).toBe(true);
  });

  it('clamps the progress model before the override', async () => {
    const { map } = await renderLoaded({ progress: 1.5 });
    expect(covered(map)).toBeCloseTo(1, 6);
  });

  it('cancels the frame and clears the override when destroyed', async () => {
    const { fixture, map } = await renderLoaded({ playing: true, progress: 0.5 });
    fixture.detectChanges();
    const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame');
    update(fixture, { show: false });
    fixture.detectChanges();
    expect(cancel).toHaveBeenCalled();
    expect(covered(map)).toBeCloseTo(0.2, 6);
  });

  it('cancels the frame when paused', async () => {
    const { fixture } = await renderLoaded({ playing: true });
    fixture.detectChanges();
    const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame');
    update(fixture, { playing: false });
    fixture.detectChanges();
    expect(cancel).toHaveBeenCalled();
  });

  it('keeps running across a theme switch', async () => {
    const { fixture, map, host } = await renderLoaded({ playing: true });
    fixture.detectChanges();
    frames(fixture, 5);
    const before = host.progress;
    update(fixture, { theme: 'dark' });
    expect(map.getLayer('r1-layer-progress-layer')).toBeUndefined();
    reloadStyle(fixture, map);
    fixture.detectChanges();
    frames(fixture, 5);
    expect(host.progress).toBeGreaterThan(before);
    expect(covered(map)).toBeCloseTo(host.progress, 2);
  });

  describe('follow', () => {
    const jumps = (map: any) => map.jumpTo.mock.calls as [Record<string, unknown>][];

    it('centers the map on the head each frame', async () => {
      const { fixture, map, host } = await renderLoaded({ playing: true, follow: true });
      fixture.detectChanges();
      frames(fixture, 5);
      const last = jumps(map).at(-1)![0];
      expect(Object.keys(last)).toEqual(['center']);
      expect(last['center']).toEqual(pointAlongLine(COORDS, host.progress));
    });

    it('never moves the camera when off', async () => {
      const { fixture, map } = await renderLoaded({ playing: true });
      fixture.detectChanges();
      frames(fixture, 5);
      expect(map.jumpTo).not.toHaveBeenCalled();
    });

    it('recenters on seek() while paused', async () => {
      const { map, playback } = await renderLoaded({ follow: true });
      playback.seek(0.5);
      expect(jumps(map).at(-1)![0]['center']).toEqual(pointAlongLine(COORDS, 0.5));
    });

    it('a user drag suspends following until play()', async () => {
      const { fixture, map, playback } = await renderLoaded({ playing: true, follow: true });
      fixture.detectChanges();
      frames(fixture, 3);
      map.fire('dragstart', { originalEvent: new MouseEvent('mousedown') });
      (map.jumpTo as any).mockClear();
      frames(fixture, 3);
      expect(map.jumpTo).not.toHaveBeenCalled();
      playback.pause();
      playback.play();
      fixture.detectChanges();
      frames(fixture, 3);
      expect(map.jumpTo).toHaveBeenCalled();
    });

    it('a programmatic dragstart (no originalEvent) does not suspend', async () => {
      const { fixture, map } = await renderLoaded({ playing: true, follow: true });
      fixture.detectChanges();
      map.fire('dragstart', {});
      (map.jumpTo as any).mockClear();
      frames(fixture, 3);
      expect(map.jumpTo).toHaveBeenCalled();
    });

    it('skips follow on a route with fewer than 2 coordinates', async () => {
      const { fixture, map } = await renderLoaded({
        playing: true,
        follow: true,
        coords: [[1, 1]],
      });
      fixture.detectChanges();
      frames(fixture, 3);
      expect(map.jumpTo).not.toHaveBeenCalled();
    });

    it('binds dragstart only while follow is true and unbinds on destroy', async () => {
      const { fixture, map } = await renderLoaded();
      expect(map.listenerCount('dragstart')).toBe(0);
      update(fixture, { follow: true });
      fixture.detectChanges();
      expect(map.listenerCount('dragstart')).toBe(1);
      update(fixture, { follow: false });
      fixture.detectChanges();
      expect(map.listenerCount('dragstart')).toBe(0);
      update(fixture, { follow: true });
      fixture.detectChanges();
      update(fixture, { show: false });
      fixture.detectChanges();
      expect(map.listenerCount('dragstart')).toBe(0);
    });
  });
});
