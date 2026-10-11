import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly themeSignal = signal<'light' | 'dark'>(this.detect());

  readonly theme = this.themeSignal.asReadonly();

  constructor() {
    if (!this.isBrowser) return;

    const observer = new MutationObserver(() => this.themeSignal.set(this.detect()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    let mq: MediaQueryList | null = null;
    const onSchemeChange = () => this.themeSignal.set(this.detect());
    if (window.matchMedia) {
      mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', onSchemeChange);
    }

    inject(DestroyRef).onDestroy(() => {
      observer.disconnect();
      mq?.removeEventListener('change', onSchemeChange);
    });
  }

  setTheme(theme: 'light' | 'dark'): void {
    if (!this.isBrowser) return;
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
    if (!this.isBrowser) return 'light';
    const html = document.documentElement;
    if (html.classList.contains('dark')) return 'dark';
    if (html.classList.contains('light')) return 'light';
    if (window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }
}
