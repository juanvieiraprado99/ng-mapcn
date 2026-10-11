import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThemeService } from './theme.service';

/** Installs a `window.matchMedia` stub (jsdom has none) and returns its controls. */
function stubMatchMedia(initialDark: boolean) {
  const listeners = new Set<() => void>();
  const mq = {
    matches: initialDark,
    addEventListener: vi.fn((_type: string, cb: () => void) => listeners.add(cb)),
    removeEventListener: vi.fn((_type: string, cb: () => void) => listeners.delete(cb)),
  };
  const matchMedia = vi.fn(() => mq);
  vi.stubGlobal('matchMedia', matchMedia);
  return {
    mq,
    matchMedia,
    setDark(value: boolean) {
      mq.matches = value;
      listeners.forEach((cb) => cb());
    },
  };
}

/** MutationObserver callbacks are delivered asynchronously. */
const flushObserver = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('ThemeService', () => {
  afterEach(() => {
    document.documentElement.className = '';
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it('resolves dark when the dark class is on <html>', () => {
    stubMatchMedia(false);
    document.documentElement.classList.add('dark');
    expect(TestBed.inject(ThemeService).theme()).toBe('dark');
  });

  it('lets the light class win over a dark prefers-color-scheme', () => {
    stubMatchMedia(true);
    document.documentElement.classList.add('light');
    expect(TestBed.inject(ThemeService).theme()).toBe('light');
  });

  it('falls back to prefers-color-scheme when there is no class', () => {
    const { matchMedia } = stubMatchMedia(true);
    expect(TestBed.inject(ThemeService).theme()).toBe('dark');
    expect(matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
  });

  it('falls back to light when matchMedia says light', () => {
    stubMatchMedia(false);
    expect(TestBed.inject(ThemeService).theme()).toBe('light');
  });

  it('updates when the dark class is added after creation', async () => {
    stubMatchMedia(false);
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('light');

    document.documentElement.classList.add('dark');
    await flushObserver();

    expect(service.theme()).toBe('dark');
    expect(service.getTheme()).toBe('dark');
  });

  it('updates on a prefers-color-scheme change when no class is set', () => {
    const media = stubMatchMedia(false);
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('light');

    media.setDark(true);

    expect(service.theme()).toBe('dark');
  });

  it('setTheme(dark) adds dark and removes light', async () => {
    stubMatchMedia(false);
    const service = TestBed.inject(ThemeService);
    document.documentElement.classList.add('light');

    service.setTheme('dark');
    await flushObserver();

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
    expect(service.theme()).toBe('dark');
  });

  it('setTheme(light) adds light and removes dark', async () => {
    stubMatchMedia(true);
    const service = TestBed.inject(ThemeService);
    document.documentElement.classList.add('dark');

    service.setTheme('light');
    await flushObserver();

    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(service.theme()).toBe('light');
  });

  it('toggleTheme flips the theme', async () => {
    stubMatchMedia(false);
    const service = TestBed.inject(ThemeService);

    service.toggleTheme();
    await flushObserver();
    expect(service.theme()).toBe('dark');

    service.toggleTheme();
    await flushObserver();
    expect(service.theme()).toBe('light');
  });

  it('disconnects the observer and removes the media listener on destroy', () => {
    const { mq } = stubMatchMedia(false);
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
    TestBed.inject(ThemeService);
    expect(mq.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    TestBed.resetTestingModule();

    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(mq.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    const added = mq.addEventListener.mock.calls[0][1];
    expect(mq.removeEventListener.mock.calls[0][1]).toBe(added);
  });

  describe('on the server', () => {
    it('reports light, never touches <html> and never calls matchMedia', () => {
      const { matchMedia } = stubMatchMedia(true);
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      const service = TestBed.inject(ThemeService);

      expect(service.theme()).toBe('light');
      service.setTheme('dark');
      expect(document.documentElement.className).toBe('');
      service.toggleTheme();
      expect(document.documentElement.className).toBe('');
      expect(matchMedia).not.toHaveBeenCalled();
    });
  });
});
