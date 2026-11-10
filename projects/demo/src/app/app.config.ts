import { provideHttpClient, withXhr } from '@angular/common/http';
import {
  type ApplicationConfig,
  inject,
  provideAppInitializer,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  provideClientHydration,
  withEventReplay,
  withNoIncrementalHydration,
} from '@angular/platform-browser';
import {
  provideRouter,
  TitleStrategy,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';
import { provideMapLabels } from 'ng-mapcn';

import { provideZard } from '@/shared/core/provider/providezard';
import { LanguageService } from '@/shared/i18n/language.service';
import { siteMapLabels } from '@/shared/i18n/map-labels';
import { ThemeService } from '@/shared/theme.service';
import { SiteTitleStrategy } from '@/shared/title-strategy';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'top',
      }),
      withComponentInputBinding(),
    ),
    provideHttpClient(withXhr()),
    provideClientHydration(withEventReplay(), withNoIncrementalHydration()),

    provideZard(),
    // Eager: block views (no header, no theme toggle) still need its `t` hotkey
    // and the cross-window sync that keeps preview iframes on the page's theme.
    provideAppInitializer(() => void inject(ThemeService)),
    // Eager too: applies the saved language right after hydration, on every page.
    provideAppInitializer(() => void inject(LanguageService)),
    // Map buttons and aria names follow the language toggle.
    provideMapLabels(siteMapLabels),
    { provide: TitleStrategy, useClass: SiteTitleStrategy },
  ],
};
