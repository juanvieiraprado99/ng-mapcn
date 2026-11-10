import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LanguageService } from './language.service';
import { MESSAGES } from './messages';

const html = document.documentElement;

function create(platform: 'browser' | 'server' = 'browser'): LanguageService {
  TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: platform }] });
  const service = TestBed.inject(LanguageService);
  TestBed.tick();
  return service;
}

/** Every key path of a dictionary, functions included as leaves. */
function keys(value: object, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? keys(child as object, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe('LanguageService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    html.lang = 'en';
    TestBed.resetTestingModule();
  });

  it('stays English when nothing is stored and the browser is English', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US');
    const service = create();

    expect(service.lang()).toBe('en');
    expect(service.messages()).toBe(MESSAGES.en);
    expect(html.lang).toBe('en');
  });

  it('follows a Portuguese browser on the first visit, without saving the guess', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('pt-PT');
    const service = create();

    expect(service.lang()).toBe('pt-BR');
    expect(html.lang).toBe('pt-BR');
    expect(localStorage.getItem('lang')).toBeNull();
  });

  it('prefers the stored language over the browser one', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('pt-BR');
    localStorage.setItem('lang', 'en');

    expect(create().lang()).toBe('en');
  });

  it('ignores an unknown stored value', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US');
    localStorage.setItem('lang', 'fr');

    expect(create().lang()).toBe('en');
  });

  it('toggle switches, persists and updates html[lang]', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US');
    const service = create();

    service.toggle();
    TestBed.tick();
    expect(service.lang()).toBe('pt-BR');
    expect(service.messages()).toBe(MESSAGES['pt-BR']);
    expect(localStorage.getItem('lang')).toBe('pt-BR');
    expect(html.lang).toBe('pt-BR');

    service.toggle();
    TestBed.tick();
    expect(service.lang()).toBe('en');
    expect(localStorage.getItem('lang')).toBe('en');
    expect(html.lang).toBe('en');
  });

  it('text picks the current language', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US');
    const service = create();
    const title = { en: 'Markers', 'pt-BR': 'Marcadores' };

    expect(service.text(title)).toBe('Markers');
    service.setLanguage('pt-BR');
    expect(service.text(title)).toBe('Marcadores');
  });

  it('stays English on the server, whatever is stored', () => {
    localStorage.setItem('lang', 'pt-BR');
    const service = create('server');

    expect(service.lang()).toBe('en');
    expect(html.lang).toBe('en');
  });

  it('pt-BR translates every English key', () => {
    expect(keys(MESSAGES['pt-BR'])).toEqual(keys(MESSAGES.en));
  });
});
