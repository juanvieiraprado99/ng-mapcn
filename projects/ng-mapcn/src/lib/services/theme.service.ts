import { Injectable, signal, effect } from '@angular/core';
import { ThemeConfig, ThemeMode } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly storageKey = 'ng-mapcn-theme';
  private config: ThemeConfig = {};

  public readonly theme = signal<'light' | 'dark'>('light');

  constructor() {
    this.initializeTheme();

    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', () => {
        if (this.config.mode === 'auto') {
          this.applyTheme(this.getSystemTheme());
        }
      });
    }

    effect(() => {
      const currentTheme = this.theme();
      this.applyThemeToDocument(currentTheme);

      if (this.config.onThemeChange) {
        this.config.onThemeChange(currentTheme);
      }
    });
  }

  initialize(config?: ThemeConfig): void {
    this.config = {
      detectSystemPreference: true,
      storageKey: this.storageKey,
      ...config
    };

    this.initializeTheme();
  }

  getTheme(): 'light' | 'dark' {
    return this.theme();
  }

  setTheme(mode: ThemeMode): void {
    let newTheme: 'light' | 'dark';

    if (mode === 'auto') {
      newTheme = this.getSystemTheme();
    } else {
      newTheme = mode;
    }

    this.config.mode = mode;
    this.theme.set(newTheme);

    if (this.config.storageKey && typeof localStorage !== 'undefined') {
      localStorage.setItem(this.config.storageKey, mode);
    }
  }

  toggleTheme(): void {
    const current = this.theme();
    const newTheme = current === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  private getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return 'light';
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private initializeTheme(): void {
    let mode: ThemeMode = 'auto';

    if (this.config.storageKey && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored === 'light' || stored === 'dark' || stored === 'auto') {
        mode = stored as ThemeMode;
      }
    }

    if (this.config.mode) {
      mode = this.config.mode;
    }

    this.setTheme(mode);
  }

  private applyThemeToDocument(theme: 'light' | 'dark'): void {
    if (typeof document === 'undefined') {
      return;
    }

    const html = document.documentElement;

    html.classList.remove('theme-light', 'theme-dark', 'dark');
    html.removeAttribute('data-theme');

    if (theme === 'dark') {
      html.classList.add('theme-dark', 'dark');
      html.setAttribute('data-theme', 'dark');
    } else {
      html.classList.add('theme-light');
      html.setAttribute('data-theme', 'light');
    }
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    this.theme.set(theme);
  }
}
