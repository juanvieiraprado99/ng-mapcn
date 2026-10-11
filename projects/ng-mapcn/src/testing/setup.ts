import { beforeEach, vi } from 'vitest';

import { fakeRegistry } from './maplibre-fake';

vi.mock('maplibre-gl', () => import('./maplibre-fake'));

beforeEach(() => fakeRegistry.reset());
