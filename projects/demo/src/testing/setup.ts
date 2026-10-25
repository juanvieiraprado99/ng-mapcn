import { beforeEach, vi } from 'vitest';

import { configureFakeMapLibre, fakeRegistry } from '../../../ng-mapcn/src/testing/maplibre-fake';

// The demo consumes the packaged library; `vitest.demo.config.mts` inlines `ng-mapcn` so this
// mock reaches the `maplibre-gl` import inside it.
vi.mock('maplibre-gl', () => import('../../../ng-mapcn/src/testing/maplibre-fake'));

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
