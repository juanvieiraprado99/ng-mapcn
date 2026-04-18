import { DestroyRef, inject, Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly themeSignal = signal<'light' | 'dark'>(this.detect());

  readonly theme = this.themeSignal.asReadonly();

  constructor() {
    if (typeof document === 'undefined') return;

    const observer = new MutationObserver(() =>
      this.themeSignal.set(this.detect())
    );
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', () => this.themeSignal.set(this.detect()));
    }

    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }

  setTheme(theme: 'light' | 'dark'): void {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
      html.classList.remove('light');
    } else {
      html.classList.remove('dark');
      html.classList.add('light');
    }
    // MutationObserver picks up the class change automatically
  }

  toggleTheme(): void {
    this.setTheme(this.theme() === 'dark' ? 'light' : 'dark');
  }

  getTheme(): 'light' | 'dark' {
    return this.themeSignal();
  }

  private detect(): 'light' | 'dark' {
    if (typeof document === 'undefined') return 'light';
    const html = document.documentElement;
    if (html.classList.contains('dark')) return 'dark';
    if (html.classList.contains('light')) return 'light';
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return 'light';
  }
}
