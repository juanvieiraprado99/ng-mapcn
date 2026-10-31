import { computed, signal } from '@angular/core';
import { describe, expect, it } from 'vitest';

import { RouteContextService, type RouteSources } from './route-context.service';

function sources(progress = signal<number | undefined>(undefined)): RouteSources {
  return {
    coordinates: signal<[number, number][]>([]),
    progress,
    layerId: signal('route'),
    beforeId: signal<string | undefined>(undefined),
    created: signal(true),
    width: computed(() => 3),
  };
}

describe('RouteContextService progress', () => {
  it('falls back to the route input when there is no override', () => {
    const ctx = new RouteContextService();
    ctx.connect(sources(signal<number | undefined>(0.3)));
    expect(ctx.progress()).toBe(0.3);
  });

  it('lets the override win over the route input', () => {
    const input = signal<number | undefined>(0.3);
    const ctx = new RouteContextService();
    ctx.connect(sources(input));
    ctx.setProgressOverride(0.8);
    expect(ctx.progress()).toBe(0.8);
    input.set(0.1);
    expect(ctx.progress()).toBe(0.8);
  });

  it('falls back again when the override is cleared', () => {
    const input = signal<number | undefined>(0.3);
    const ctx = new RouteContextService();
    ctx.connect(sources(input));
    ctx.setProgressOverride(0.8);
    input.set(0.1);
    ctx.setProgressOverride(undefined);
    expect(ctx.progress()).toBe(0.1);
  });

  it('exposes the same signal before and after connect()', () => {
    const ctx = new RouteContextService();
    const before = ctx.progress;
    ctx.connect(sources(signal<number | undefined>(0.5)));
    expect(before()).toBe(0.5);
    expect(ctx.progress).toBe(before);
  });
});
