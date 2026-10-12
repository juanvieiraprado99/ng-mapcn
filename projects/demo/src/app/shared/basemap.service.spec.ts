import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BASEMAP_PROVIDERS, BasemapService } from './basemap.service';

const KEY = 'ng-mapcn-demo:basemap';

function create(platform: 'browser' | 'server' = 'browser'): BasemapService {
  TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: platform }] });
  return TestBed.inject(BasemapService);
}

function fireStorage(key: string | null): void {
  window.dispatchEvent(new StorageEvent('storage', { key }));
}

describe('BasemapService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    document.documentElement.className = '';
    TestBed.resetTestingModule();
  });

  describe('restore and persist', () => {
    it('defaults to Carto with no keys when storage is empty', () => {
      const service = create();

      expect(service.providerId()).toBe('carto');
      expect(service.keys()).toEqual({});
      expect(service.provider().id).toBe('carto');
      expect(service.key()).toBe('');
    });

    it('restores the provider and keys from localStorage', () => {
      localStorage.setItem(
        KEY,
        JSON.stringify({ providerId: 'maptiler', keys: { maptiler: 'k1' } }),
      );
      const service = create();

      expect(service.providerId()).toBe('maptiler');
      expect(service.keys()).toEqual({ maptiler: 'k1' });
      expect(service.key()).toBe('k1');
    });

    it('falls back to Carto for an unknown stored provider', () => {
      localStorage.setItem(KEY, JSON.stringify({ providerId: 'bing', keys: {} }));

      expect(create().providerId()).toBe('carto');
    });

    it('persists the provider and keys when they change', () => {
      const service = create();

      service.select('stadia');
      service.setKey('stadia', '  abc  ');
      TestBed.tick();

      expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({
        providerId: 'stadia',
        keys: { stadia: 'abc' },
      });
    });

    it('uses the defaults for invalid JSON without throwing', () => {
      localStorage.setItem(KEY, '{not json');
      const service = create();

      expect(service.providerId()).toBe('carto');
      expect(service.keys()).toEqual({});
    });

    it('survives a localStorage that throws on read and write', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('denied');
      });
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota');
      });

      const service = create();
      service.select('osm');

      expect(() => TestBed.tick()).not.toThrow();
      expect(service.providerId()).toBe('osm');
    });
  });

  describe('storage events', () => {
    it('follows changes made in another window', () => {
      const service = create();
      TestBed.tick();

      localStorage.setItem(KEY, JSON.stringify({ providerId: 'osm', keys: { osm: 'x' } }));
      fireStorage(KEY);

      expect(service.providerId()).toBe('osm');
      expect(service.keys()).toEqual({ osm: 'x' });
    });

    it('ignores events for other keys', () => {
      const service = create();
      TestBed.tick();

      localStorage.setItem(KEY, JSON.stringify({ providerId: 'osm', keys: {} }));
      fireStorage('theme');

      expect(service.providerId()).toBe('carto');
    });

    it('stops listening once destroyed', () => {
      const add = vi.spyOn(window, 'addEventListener');
      const remove = vi.spyOn(window, 'removeEventListener');
      const service = create();
      const handler = add.mock.calls.find(([type]) => type === 'storage')![1];

      TestBed.resetTestingModule();

      expect(remove).toHaveBeenCalledWith('storage', handler);
      localStorage.setItem(KEY, JSON.stringify({ providerId: 'osm', keys: {} }));
      fireStorage(KEY);
      expect(service.providerId()).toBe('carto');
    });
  });

  describe('styles()', () => {
    const provider = (id: string) => BASEMAP_PROVIDERS.find((p) => p.id === id)!;

    it('lists the five providers', () => {
      expect(BASEMAP_PROVIDERS.map((p) => p.id)).toEqual([
        'carto',
        'openfreemap',
        'osm',
        'maptiler',
        'stadia',
      ]);
    });

    it('Carto falls back to the library defaults (undefined)', () => {
      expect(provider('carto').styles('')).toBeUndefined();
      expect(create().styles()).toBeUndefined();
    });

    it('OpenFreeMap points at the positron and dark styles', () => {
      expect(provider('openfreemap').styles('')).toEqual({
        light: 'https://tiles.openfreemap.org/styles/positron',
        dark: 'https://tiles.openfreemap.org/styles/dark',
      });
    });

    it('OSM returns the same style object on every call, for both themes', () => {
      const first = provider('osm').styles('') as { light: object; dark: object };
      const second = provider('osm').styles('') as { light: object; dark: object };

      expect(first.light).toBe(second.light);
      expect(first.dark).toBe(second.dark);
      expect(first.light).toBe(first.dark);
    });

    it('MapTiler embeds the key and is disabled without one', () => {
      expect(provider('maptiler').styles('')).toBeUndefined();
      expect(provider('maptiler').styles('K')).toEqual({
        light: 'https://api.maptiler.com/maps/streets-v4/style.json?key=K',
        dark: 'https://api.maptiler.com/maps/streets-v4-dark/style.json?key=K',
      });
    });

    it('Stadia appends the key when present and works without one', () => {
      expect(provider('stadia').styles('K')).toEqual({
        light: 'https://tiles.stadiamaps.com/styles/alidade_smooth.json?api_key=K',
        dark: 'https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json?api_key=K',
      });
      expect(provider('stadia').styles('')).toEqual({
        light: 'https://tiles.stadiamaps.com/styles/alidade_smooth.json',
        dark: 'https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json',
      });
    });

    it('the service styles follow the selected provider and its key', () => {
      const service = create();

      service.select('maptiler');
      expect(service.styles()).toBeUndefined();
      service.setKey('maptiler', 'K');

      expect(service.styles()).toEqual(provider('maptiler').styles('K'));
    });
  });

  describe('server platform', () => {
    it('never touches storage or window listeners', () => {
      const get = vi.spyOn(Storage.prototype, 'getItem');
      const set = vi.spyOn(Storage.prototype, 'setItem');
      const add = vi.spyOn(window, 'addEventListener');
      localStorage.setItem(KEY, JSON.stringify({ providerId: 'osm', keys: {} }));
      get.mockClear();
      set.mockClear();

      const service = create('server');
      service.select('stadia');
      TestBed.tick();

      expect(service.providerId()).toBe('stadia');
      expect(get).not.toHaveBeenCalled();
      expect(set).not.toHaveBeenCalled();
      expect(add.mock.calls.some(([type]) => type === 'storage')).toBe(false);
    });
  });
});
