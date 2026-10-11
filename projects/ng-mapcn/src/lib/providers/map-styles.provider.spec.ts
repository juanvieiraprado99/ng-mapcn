import { inject, Injectable, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { type MapStylesConfig } from '../styles/map-styles';
import { MAP_DEFAULT_STYLES, provideMapStyles } from './map-styles.provider';

describe('provideMapStyles', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('exposes a static config through the token signal', () => {
    TestBed.configureTestingModule({
      providers: [provideMapStyles({ light: 'light.json', dark: 'dark.json' })],
    });
    expect(TestBed.inject(MAP_DEFAULT_STYLES)()).toEqual({
      light: 'light.json',
      dark: 'dark.json',
    });
  });

  it('reflects later updates of a signal source', () => {
    const source = signal<MapStylesConfig | undefined>({ light: 'a.json' });
    TestBed.configureTestingModule({ providers: [provideMapStyles(source)] });
    const token = TestBed.inject(MAP_DEFAULT_STYLES);

    expect(token()).toEqual({ light: 'a.json' });
    source.set({ light: 'b.json' });
    expect(token()).toEqual({ light: 'b.json' });
    source.set(undefined);
    expect(token()).toBeUndefined();
  });

  it('runs a factory in an injection context', () => {
    @Injectable({ providedIn: 'root' })
    class BasemapService {
      readonly styles = signal<MapStylesConfig | undefined>({ dark: 'svc-dark.json' });
    }

    TestBed.configureTestingModule({
      providers: [provideMapStyles(() => inject(BasemapService).styles)],
    });
    const service = TestBed.inject(BasemapService);
    const token = TestBed.inject(MAP_DEFAULT_STYLES);

    expect(token()).toEqual({ dark: 'svc-dark.json' });
    service.styles.set({ dark: 'other.json' });
    expect(token()).toEqual({ dark: 'other.json' });
  });
});
