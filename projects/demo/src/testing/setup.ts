import { beforeEach, vi } from 'vitest';

import { fakeRegistry } from '../../../ng-mapcn/src/testing/maplibre-fake';

// The demo consumes the packaged library; `vitest.demo.config.mts` inlines `ng-mapcn` so this
// mock reaches the `maplibre-gl` import inside it.
vi.mock('maplibre-gl', () => import('../../../ng-mapcn/src/testing/maplibre-fake'));

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
  // jsdom lacks both browser APIs.
  vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
});
