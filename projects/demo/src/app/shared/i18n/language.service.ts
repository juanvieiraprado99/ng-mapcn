import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  computed,
  DOCUMENT,
  effect,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';

import { type Lang, LANGS, type Localized, MESSAGES } from './messages';

/** localStorage key for the visitor's pick. */
const STORAGE_KEY = 'lang';

/**
 * Site language (EN / pt-BR), switched at runtime on the same URLs.
 *
 * The prerendered HTML is English. The saved (or browser) language is applied
 * after the first client render, so hydration sees the same text the server
 * rendered; a pt-BR visitor sees the switch right after load.
 *
 * Deliberately demo-local, like ThemeService: nothing here imports `ng-mapcn`.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly current = signal<Lang>('en');

  readonly lang = this.current.asReadonly();
  /** Shorthand for templates: `@if (i18n.isPt()) { pt-BR } @else { English }`. */
  readonly isPt = computed(() => this.current() === 'pt-BR');
  /** Strings of the current language: `i18n.messages().header.homeLabel`. */
  readonly messages = computed(() => MESSAGES[this.current()]);

  constructor() {
    if (!this.isBrowser) return;

    // Not saved here: a first visit keeps following the browser language.
    afterNextRender(() => this.current.set(readStored() ?? fromBrowser()));

    effect(() => {
      this.document.documentElement.lang = this.current();
    });
  }

  setLanguage(lang: Lang): void {
    this.current.set(lang);
    writeStored(lang);
  }

  toggle(): void {
    this.setLanguage(this.current() === 'en' ? 'pt-BR' : 'en');
  }

  /** Picks the current language out of a `Localized` value. */
  text<T>(value: Localized<T>): T {
    return value[this.current()];
  }
}

function readStored(): Lang | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return LANGS.includes(value as Lang) ? (value as Lang) : null;
  } catch {
    return null;
  }
}

function writeStored(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Storage blocked: the pick lasts until the page reloads.
  }
}

function fromBrowser(): Lang {
  return navigator.language.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en';
}
