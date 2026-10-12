import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EDarkModes, ZardDarkMode } from './dark-mode';

const html = document.documentElement;

function stubMedia(matches: boolean) {
  const query = {
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => query),
  );
  return query;
}

function create(platform: 'browser' | 'server' = 'browser'): ZardDarkMode {
  TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: platform }] });
  const service = TestBed.inject(ZardDarkMode);
  service.init();
  TestBed.tick();
  return service;
}

describe('ZardDarkMode', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    html.className = '';
    html.removeAttribute('data-theme');
    TestBed.resetTestingModule();
  });

  it('defaults to the system theme (light here) without a stored value', () => {
    const service = create();

    expect(service.currentTheme()).toBe('system');
    expect(service.themeMode()).toBe('light');
    expect(html.classList.contains('dark')).toBe(false);
    expect(html.getAttribute('data-theme')).toBe('system');
  });

  it('follows a dark OS scheme in system mode', () => {
    stubMedia(true);
    const service = create();

    expect(service.themeMode()).toBe('dark');
    expect(html.classList.contains('dark')).toBe(true);
  });

  it.each(['light', 'dark', 'system'])('restores a stored "%s" theme', (stored) => {
    localStorage.setItem('theme', stored);
    const service = create();

    expect(service.currentTheme()).toBe(stored);
  });

  it('ignores an invalid stored value', () => {
    localStorage.setItem('theme', 'purple');
    const service = create();

    expect(service.currentTheme()).toBe('system');
  });

  it('toggleTheme(mode) stores the theme and toggles the dark class', () => {
    const service = create();

    service.toggleTheme(EDarkModes.DARK);
    TestBed.tick();
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(html.classList.contains('dark')).toBe(true);
    expect(html.getAttribute('data-theme')).toBe('dark');

    service.toggleTheme(EDarkModes.LIGHT);
    TestBed.tick();
    expect(localStorage.getItem('theme')).toBe('light');
    expect(html.classList.contains('dark')).toBe(false);
  });

  it('toggleTheme() without an argument flips the resolved mode', () => {
    const service = create();

    service.toggleTheme();
    expect(service.themeMode()).toBe('dark');
    service.toggleTheme();
    expect(service.themeMode()).toBe('light');
  });

  it('listens to OS changes only in system mode', () => {
    const query = stubMedia(false);
    const service = create();
    expect(query.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    service.toggleTheme(EDarkModes.DARK);
    expect(query.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    query.addEventListener.mockClear();
    service.toggleTheme(EDarkModes.SYSTEM);
    expect(query.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('reacts to an OS scheme change while in system mode', () => {
    const query = stubMedia(false);
    const service = create();
    const onChange = query.addEventListener.mock.calls.find(([t]) => t === 'change')![1];

    onChange({ matches: true });
    TestBed.tick();

    expect(service.themeMode()).toBe('dark');
    expect(html.classList.contains('dark')).toBe(true);
  });

  describe('storage failures', () => {
    it('warns, and keeps working, when reading throws', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('denied');
      });
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const service = create();

      expect(warn).toHaveBeenCalledWith(
        'Failed to read theme from localStorage:',
        expect.any(Error),
      );
      expect(service.currentTheme()).toBe('system');
    });

    it('warns, and still applies the theme, when writing throws', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota');
      });
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const service = create();

      service.toggleTheme(EDarkModes.DARK);
      TestBed.tick();

      expect(warn).toHaveBeenCalledWith('Failed to save theme to localStorage:', expect.any(Error));
      expect(service.themeMode()).toBe('dark');
      expect(html.classList.contains('dark')).toBe(true);
    });
  });

  describe('server platform', () => {
    it('does not read or write storage and leaves the document alone', () => {
      const get = vi.spyOn(Storage.prototype, 'getItem');
      const set = vi.spyOn(Storage.prototype, 'setItem');
      const service = create('server');

      service.toggleTheme(EDarkModes.DARK);
      TestBed.tick();

      expect(get).not.toHaveBeenCalled();
      expect(set).not.toHaveBeenCalled();
      expect(html.classList.contains('dark')).toBe(false);
      expect(service.currentTheme()).toBe('system');
    });
  });
});
