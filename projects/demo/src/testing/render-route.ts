import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, TitleStrategy, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';

import { provideZard } from '@/shared/core/provider/providezard';
import { SiteTitleStrategy } from '@/shared/title-strategy';

import { routes } from '../app/app.routes';

export interface RenderedRoute {
  harness: RouterTestingHarness;
  /** Every `console.error` call made while rendering. */
  errors: string[];
  /** Text of the route's first `<h1>`. */
  h1: string | null;
}

/**
 * Renders `url` through the demo's real route table. The caller must run
 * `vi.restoreAllMocks()` and `TestBed.resetTestingModule()` in `afterEach`
 * (layout getters and `console.error` are spied here).
 */
export async function renderRoute(
  url: string,
  opts: { providers?: unknown[] } = {},
): Promise<RenderedRoute> {
  // jsdom has no layout: without a size `ng-map` would wait forever.
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(400);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(300);
  const errors: string[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    errors.push(args.map(String).join(' '));
  });

  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes, withComponentInputBinding()),
      provideHttpClient(),
      provideZard(),
      { provide: TitleStrategy, useClass: SiteTitleStrategy },
      ...((opts.providers ?? []) as any[]),
    ],
  });

  const harness = await RouterTestingHarness.create(url);
  await harness.fixture.whenStable();
  harness.detectChanges();
  await harness.fixture.whenStable();
  harness.detectChanges();

  const h1 = (harness.fixture.nativeElement as HTMLElement).querySelector('h1');
  return { harness, errors, h1: h1?.textContent?.trim() ?? null };
}
