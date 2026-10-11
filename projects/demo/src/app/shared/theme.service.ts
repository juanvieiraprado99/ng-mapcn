import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, DOCUMENT, effect, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { EDarkModes, ZardDarkMode } from '@/shared/services/dark-mode';

/** localStorage key shared with ZardDarkMode and the pre-paint script in `index.html`. */
const STORAGE_KEY = 'theme';

/**
 * Site theme, on top of zard/ui's `ZardDarkMode` (the source of truth — zard
 * charts read it). This facade adds what the site needs on top:
 *
 * - the `light` class next to `dark`: the ng-mapcn library resolves the map
 *   theme from those classes, and without `light` it would fall back to the
 *   OS scheme;
 * - the `t` hotkey (mapcn parity);
 * - cross-window sync, so block previews (iframes) follow the parent page.
 *
 * Deliberately demo-local: importing anything from `ng-mapcn` in the app shell
 * drags maplibre-gl into the initial bundle.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly darkMode = inject(ZardDarkMode);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Resolved theme: `light` or `dark`. */
  readonly theme = this.darkMode.themeMode;

  constructor() {
    if (!this.isBrowser) return;

    effect(() => {
      const theme = this.theme();
      const html = this.document.documentElement;
      html.classList.toggle('light', theme === EDarkModes.LIGHT);
      html.style.colorScheme = theme;
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() !== 't' || isTypingTarget(event.target)) return;
      this.toggleTheme();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const value = event.newValue;
      if (value === EDarkModes.LIGHT || value === EDarkModes.DARK || value === EDarkModes.SYSTEM) {
        this.darkMode.toggleTheme(value);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('storage', onStorage);

    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('storage', onStorage);
    });
  }

  setTheme(theme: 'light' | 'dark'): void {
    this.darkMode.toggleTheme(theme === 'dark' ? EDarkModes.DARK : EDarkModes.LIGHT);
  }

  toggleTheme(): void {
    this.setTheme(this.theme() === 'dark' ? 'light' : 'dark');
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  );
}
