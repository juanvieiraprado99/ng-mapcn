import { configureFakeMapLibre, fakeRegistry } from 'ng-mapcn/testing/maplibre';
import { beforeEach, vi } from 'vitest';

// The demo consumes the packaged library, fake included (`ng-mapcn/testing/maplibre`), like any
// app would. `vitest.demo.config.mts` inlines `ng-mapcn` so this mock reaches the `maplibre-gl`
// import inside it.
vi.mock('maplibre-gl', () => import('ng-mapcn/testing/maplibre'));

configureFakeMapLibre({ spy: vi.fn });

class IntersectionObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

beforeEach(() => {
  fakeRegistry.reset();
  // jsdom lacks these browser APIs.
  vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      // Legacy listener API, still used by the CDK breakpoint observer.
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
  // jsdom has no layout, so no scrolling (used by the store-locator block).
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
});
