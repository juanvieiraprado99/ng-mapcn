import { effect } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

  it('stores the style override and reset clears it', () => {
    expect(ctx.styleOverride()).toBeUndefined();
    ctx.setStyleOverride({ light: 'a.json' });
    expect(ctx.styleOverride()).toEqual({ light: 'a.json' });
    ctx.reset();
    expect(ctx.styleOverride()).toBeUndefined();
  });

  describe('source registry', () => {
    it('hasSource tracks registered ids reactively', () => {
      const seen: boolean[] = [];
      const ref = TestBed.runInInjectionContext(() =>
        effect(() => {
          seen.push(ctx.hasSource('parcels'));
        }),
      );
      TestBed.tick();
      const release = ctx.registerSource('parcels');
      TestBed.tick();
      expect(ctx.hasSource('parcels')).toBe(true);
      expect(ctx.hasSource('other')).toBe(false);
      release();
      TestBed.tick();
      expect(ctx.hasSource('parcels')).toBe(false);
      expect(seen).toEqual([false, true, false]);
      ref.destroy();
    });

    it('lists registered ids; releasing twice is harmless', () => {
      const first = ctx.registerSource('a');
      ctx.registerSource('b');
      expect([...ctx.sourceIds()].sort()).toEqual(['a', 'b']);
      first();
      first();
      expect([...ctx.sourceIds()]).toEqual(['b']);
    });

    it('a stale release does not drop a newer registration of the same id', () => {
      const first = ctx.registerSource('a');
      const second = ctx.registerSource('a');
      first();
      expect(ctx.hasSource('a')).toBe(true);
      second();
      expect(ctx.hasSource('a')).toBe(false);
    });

    it('reset clears the registry', () => {
      ctx.registerSource('a');
      ctx.reset();
      expect(ctx.hasSource('a')).toBe(false);
    });
  });

  describe('image references', () => {
    const pixels = { width: 1, height: 1, data: new Uint8Array(4) };
    const options = { sdf: false, pixelRatio: 1 };
    let map: FakeMap;

    beforeEach(() => {
      map = new FakeMap();
      ctx.setMap(map as any);
    });

    afterEach(() => vi.restoreAllMocks());

    it('adds the image on the first acquire and removes it on the last release', () => {
      const first = ctx.acquireImage('pin', pixels, options);
      const second = ctx.acquireImage('pin', { ...pixels }, { sdf: true, pixelRatio: 2 });
      expect(map.calls).toEqual(['addImage:pin']);
      // The first one to add the id provides the pixels.
      expect((map.getImage('pin') as { data: unknown }).data).toBe(pixels);

      first();
      first();
      expect(map.hasImage('pin')).toBe(true);
      second();
      expect(map.hasImage('pin')).toBe(false);
    });

    it('never removes an image the style already had', () => {
      map.addImage('pin', pixels);
      const release = ctx.acquireImage('pin', { ...pixels }, options);
      release();

      expect(map.calls).toEqual(['addImage:pin']);
      expect(map.hasImage('pin')).toBe(true);
    });

    it('does not remove an image that replaced the added one', () => {
      const release = ctx.acquireImage('pin', pixels, options);
      map.removeImage('pin');
      map.addImage('pin', { ...pixels });
      release();

      expect(map.hasImage('pin')).toBe(true);
    });

    it('re-adds an image the style dropped while it was held', () => {
      const first = ctx.acquireImage('pin', pixels, options);
      map.setStyle({});
      map.finishStyleLoad();
      const second = ctx.acquireImage('pin', pixels, options);
      expect(map.hasImage('pin')).toBe(true);

      first();
      expect(map.hasImage('pin')).toBe(true);
      second();
      expect(map.hasImage('pin')).toBe(false);
    });

    it('reports a failed add and releases harmlessly', () => {
      const errors: Error[] = [];
      ctx.setErrorHandler((e) => errors.push(e));
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.spyOn(map, 'addImage').mockImplementation(() => {
        throw new Error('bad image');
      });

      const release = ctx.acquireImage('pin', pixels, options);
      expect(errors.map((e) => e.message)).toEqual(['bad image']);
      expect(() => release()).not.toThrow();
    });

    it('reset forgets the references without touching the map', () => {
      const release = ctx.acquireImage('pin', pixels, options);
      ctx.reset();
      release();

      expect(map.calls).toEqual(['addImage:pin']);
    });
  });
});
