import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThemeService } from './theme.service';

const html = document.documentElement;

function create(platform: 'browser' | 'server' = 'browser'): ThemeService {
  TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: platform }] });
  const service = TestBed.inject(ThemeService);
  TestBed.tick();
  return service;
}

function press(key: string, init: KeyboardEventInit = {}, target: EventTarget = document.body) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }));
  TestBed.tick();
}

describe('ThemeService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    html.className = '';
    html.removeAttribute('data-theme');
    html.style.colorScheme = '';
    document.body.innerHTML = '';
    TestBed.resetTestingModule();
  });

  it('starts light when nothing is stored and the OS is light', () => {
    const service = create();

    expect(service.theme()).toBe('light');
  });

  it('reads the stored theme', () => {
    localStorage.setItem('theme', 'dark');
    const service = create();

    expect(service.theme()).toBe('dark');
    expect(html.classList.contains('dark')).toBe(true);
    expect(html.classList.contains('light')).toBe(false);
    expect(html.style.colorScheme).toBe('dark');
  });

  it('setTheme persists, and keeps the dark and light classes mutually exclusive', () => {
    const service = create();

    service.setTheme('dark');
    TestBed.tick();
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(html.classList.contains('dark')).toBe(true);
    expect(html.classList.contains('light')).toBe(false);

    service.setTheme('light');
    TestBed.tick();
    expect(localStorage.getItem('theme')).toBe('light');
    expect(html.classList.contains('dark')).toBe(false);
    expect(html.classList.contains('light')).toBe(true);
    expect(html.style.colorScheme).toBe('light');
  });

  it('toggleTheme flips between light and dark', () => {
    const service = create();

    service.toggleTheme();
    expect(service.theme()).toBe('dark');
    service.toggleTheme();
    expect(service.theme()).toBe('light');
  });

  it('only warns when localStorage fails', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const service = create();
    expect(() => service.setTheme('dark')).not.toThrow();
    TestBed.tick();

    expect(warn).toHaveBeenCalled();
    expect(service.theme()).toBe('dark');
  });

  describe('"t" hotkey', () => {
    it('toggles the theme', () => {
      const service = create();

      press('t');
      expect(service.theme()).toBe('dark');
      press('T');
      expect(service.theme()).toBe('light');
    });

    it.each([
      ['a modifier is held', { ctrlKey: true }],
      ['the key repeats', { repeat: true }],
    ])('is ignored when %s', (_name, init) => {
      const service = create();

      press('t', init);

      expect(service.theme()).toBe('light');
    });

    it('is ignored while typing in a form field', () => {
      const service = create();
      const input = document.createElement('input');
      document.body.appendChild(input);

      press('t', {}, input);

      expect(service.theme()).toBe('light');
    });

    it('is ignored for other keys and when default was prevented', () => {
      const service = create();

      press('x');
      const event = new KeyboardEvent('keydown', { key: 't', cancelable: true, bubbles: true });
      event.preventDefault();
      document.body.dispatchEvent(event);
      TestBed.tick();

      expect(service.theme()).toBe('light');
    });
  });

  describe('cross-window sync', () => {
    it('follows a valid theme written by another window', () => {
      const service = create();

      window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: 'dark' }));
      TestBed.tick();

      expect(service.theme()).toBe('dark');
    });

    it('ignores other keys and invalid values', () => {
      const service = create();

      window.dispatchEvent(new StorageEvent('storage', { key: 'other', newValue: 'dark' }));
      window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: 'purple' }));
      TestBed.tick();

      expect(service.theme()).toBe('light');
    });

    it('removes its listeners on destroy', () => {
      const remove = vi.spyOn(window, 'removeEventListener');
      create();

      TestBed.resetTestingModule();

      const types = remove.mock.calls.map(([type]) => type);
      expect(types).toContain('keydown');
      expect(types).toContain('storage');
    });
  });

  describe('server platform', () => {
    it('touches neither the document nor window listeners', () => {
      const add = vi.spyOn(window, 'addEventListener');
      const get = vi.spyOn(Storage.prototype, 'getItem');
      const service = create('server');

      service.setTheme('dark');
      TestBed.tick();

      expect(add.mock.calls.some(([type]) => type === 'keydown' || type === 'storage')).toBe(false);
      expect(get).not.toHaveBeenCalled();
      expect(html.classList.contains('light')).toBe(false);
    });
  });
});
