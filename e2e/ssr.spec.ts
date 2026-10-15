import { expect, test } from './fixtures';
import { ROUTES } from './routes';

/**
 * SSR + hydration checks, run against the development build (hydration mismatches are only
 * reported in dev mode). For every route: the server-rendered HTML is a real page (not an error
 * shell), and booting it in the browser logs no hydration problem and throws nothing.
 */
const HYDRATION_PATTERN = /NG05\d\d|hydrat/i;
const SERVER_ERROR_PATTERN =
  /ReferenceError|window is not defined|document is not defined|NG0\d{3,4}:/;

test.describe('server-side rendering', () => {
  for (const route of ROUTES) {
    test(`${route} is rendered on the server`, async ({ request }) => {
      const response = await request.get(route);
      expect(response.status()).toBe(200);
      const html = await response.text();

      expect(html).toContain('<app-root');
      expect(html, 'server context marker').toContain('ng-server-context');
      expect(html, 'rendered page content, not an empty shell').toMatch(/<h1|<main|<ng-map/);
      expect(html).not.toMatch(SERVER_ERROR_PATTERN);
    });

    test(`${route} hydrates without warnings`, async ({ page, request }) => {
      const serverHtml = await (await request.get(route)).text();
      const optedOut = (serverHtml.match(/ngskiphydration/gi) ?? []).length;

      const problems: string[] = [];
      let hydrated = '';
      page.on('console', (message) => {
        const text = message.text();
        // Dev mode logs "Angular hydrated N component(s) ..., M component(s) were skipped".
        if (/^Angular hydrated /.test(text)) {
          hydrated = text;
        } else if (HYDRATION_PATTERN.test(text)) {
          problems.push(`console.${message.type()}: ${text}`);
        }
      });
      page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));

      await page.goto(route);
      // Bootstrap (and with it hydration) is done once Angular stamps its version.
      await expect(page.locator('app-root[ng-version]')).toHaveCount(1);
      await page.waitForLoadState('load');
      // Lazy examples and block previews hydrate on viewport / interaction: scroll through them.
      await page.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight) {
          window.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 80));
        }
        window.scrollTo(0, 0);
      });
      await expect(page.locator('ng-map .ng-map-loader')).toHaveCount(0, { timeout: 30_000 });

      expect(problems, 'hydration warnings / uncaught errors').toEqual([]);
      // Logged once the application is stable after hydrating.
      await expect
        .poll(() => hydrated, { message: 'the app hydrated the server HTML' })
        .toMatch(/hydrated \d+ component/);
      // Only components that opt out with `ngSkipHydration` (the ECharts wrapper) may be skipped.
      const skipped = Number(/, (\d+) component\(s\) were skipped/.exec(hydrated)?.[1]);
      expect(skipped, 'components skipped by hydration').toBeLessThanOrEqual(optedOut);
    });
  }
});
