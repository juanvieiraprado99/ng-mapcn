import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { Map as FakeMap } from '../../testing/maplibre-fake';
import { MapContextService } from './map-context.service';

describe('MapContextService', () => {
  let ctx: MapContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [MapContextService] });
    ctx = TestBed.inject(MapContextService);
  });

  it('starts empty, not loaded and light', () => {
    expect(ctx.map()).toBeNull();
    expect(ctx.isLoaded()).toBe(false);
    expect(ctx.resolvedTheme()).toBe('light');
  });

  it('isLoaded is true only when both flags are set', () => {
    ctx.setLoadedFlag(true);
    expect(ctx.isLoaded()).toBe(false);
    ctx.setStyleLoadedFlag(true);
    expect(ctx.isLoaded()).toBe(true);
    ctx.setLoadedFlag(false);
    expect(ctx.isLoaded()).toBe(false);
  });

  it('isLoaded is false when only the style flag is set', () => {
    ctx.setStyleLoadedFlag(true);
    expect(ctx.isLoaded()).toBe(false);
  });

  it('setMap exposes the map', () => {
    const map = new FakeMap();
    ctx.setMap(map as any);
    expect(ctx.map()).toBe(map);
  });

  it('reset clears the map and both flags but keeps resolvedTheme', () => {
    ctx.setMap(new FakeMap() as any);
    ctx.setLoadedFlag(true);
    ctx.setStyleLoadedFlag(true);
    ctx.setResolvedTheme('dark');

    ctx.reset();

    expect(ctx.map()).toBeNull();
    expect(ctx.isLoaded()).toBe(false);
    expect(ctx.resolvedTheme()).toBe('dark');

    // Both flags were cleared, not just one.
    ctx.setLoadedFlag(true);
    expect(ctx.isLoaded()).toBe(false);
    ctx.reset();
    ctx.setStyleLoadedFlag(true);
    expect(ctx.isLoaded()).toBe(false);
  });
});
