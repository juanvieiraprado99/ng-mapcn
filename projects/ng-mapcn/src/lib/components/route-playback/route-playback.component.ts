import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  model,
  NgZone,
  output,
  PLATFORM_ID,
  untracked,
} from '@angular/core';

import { MapContextService } from '../../services/map-context.service';
import { pointAlongLine } from '../../utils/map-utils';
import { RouteContextService } from '../map-route/route-context.service';

/** A long frame (background tab, breakpoint) advances at most this much, so the marker never jumps. */
const MAX_FRAME_MS = 100;

function clamp01(value: number): number {
  return Number.isNaN(value) ? 0 : Math.min(1, Math.max(0, value));
}

/**
 * Animates the parent `<ng-map-route>` progress over time: it drives the route's progress
 * (overriding its `[progress]` input) so `<ng-route-progress>` and `<ng-route-marker>` follow along.
 */
@Component({
  selector: 'ng-route-playback',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoutePlaybackComponent {
  /** Whether the animation is running (two-way). */
  readonly playing = model(false);
  /** Covered fraction (0-1) of the route (two-way). */
  readonly progress = model(0);
  /** Playback rate multiplier (two-way); 1 covers the route in `duration`. */
  readonly speed = model(1);
  /** Milliseconds a full pass takes at speed 1. */
  readonly duration = input(10000);
  /** Wrap to the start instead of stopping at the end. */
  readonly loop = input(false);
  /** Keep the marker in view while playing. */
  readonly follow = input(false);
  /** Emits once when playback reaches the end (never when `loop` is on). */
  // eslint-disable-next-line @angular-eslint/no-output-native -- public name fixed by the API design
  readonly ended = output<void>();

  private readonly routeCtx = inject(RouteContextService);
  private readonly mapCtx = inject(MapContextService);
  private followSuspended = false;
  private readonly zone = inject(NgZone);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    effect(() => this.routeCtx.setProgressOverride(clamp01(this.progress())));
    inject(DestroyRef).onDestroy(() => this.routeCtx.setProgressOverride(undefined));

    effect((onCleanup) => {
      const map = this.mapCtx.map();
      if (!this.follow() || !map) return;
      const onDrag = (event: { originalEvent?: unknown }) => {
        if (event.originalEvent) this.followSuspended = true;
      };
      this.zone.runOutsideAngular(() => map.on('dragstart', onDrag));
      onCleanup(() => map.off('dragstart', onDrag));
    });

    effect((onCleanup) => {
      if (!this.isBrowser || !this.playing()) return;
      let handle = 0;
      let last: number | undefined;
      const frame = (now: number) => {
        const dt = last === undefined ? 0 : Math.min(now - last, MAX_FRAME_MS);
        last = now;
        if (this.step(dt)) handle = requestAnimationFrame(frame);
      };
      this.zone.runOutsideAngular(() => {
        handle = requestAnimationFrame(frame);
      });
      onCleanup(() => cancelAnimationFrame(handle));
    });
  }

  play(): void {
    this.followSuspended = false;
    if (clamp01(this.progress()) >= 1) this.progress.set(0);
    this.playing.set(true);
  }

  pause(): void {
    this.playing.set(false);
  }

  toggle(): void {
    if (this.playing()) this.pause();
    else this.play();
  }

  restart(): void {
    this.followSuspended = false;
    this.progress.set(0);
    this.playing.set(true);
  }

  seek(progress: number): void {
    this.progress.set(clamp01(progress));
    this.recenter();
  }

  /** Moves the camera to the head (center only) unless following is off, suspended by a drag, or impossible. */
  private recenter(): void {
    untracked(() => {
      const map = this.mapCtx.map();
      if (!this.follow() || this.followSuspended || !map) return;
      if (this.routeCtx.coordinates().length < 2) return;
      const center = pointAlongLine(
        this.routeCtx.coordinates(),
        clamp01(this.progress()),
        this.routeCtx.cumulative(),
      );
      if (center) map.jumpTo({ center });
    });
  }

  /** Advances by `dt` ms; returns whether the animation keeps running. */
  private step(dt: number): boolean {
    return untracked(() => {
      const speed = this.speed();
      const duration = this.duration();
      if (!(speed > 0) || !(duration > 0)) return true;
      const next = clamp01(this.progress()) + (dt * speed) / duration;
      if (next < 1) {
        this.progress.set(next);
        this.recenter();
        return true;
      }
      if (this.loop()) {
        this.progress.set(next % 1);
        this.recenter();
        return true;
      }
      this.progress.set(1);
      this.recenter();
      this.playing.set(false);
      this.zone.run(() => this.ended.emit());
      return false;
    });
  }
}
