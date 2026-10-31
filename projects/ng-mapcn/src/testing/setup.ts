import { afterEach, beforeEach, vi } from 'vitest';

import { resetMapTesting } from '../../testing/src/public-api';
import { configureFakeMapLibre, fakeRegistry } from './maplibre-fake';

vi.mock('maplibre-gl', () => import('./maplibre-fake'));

// The specs assert on the fake's methods (`toHaveBeenCalled`, `mockClear`, ...).
configureFakeMapLibre({ spy: vi.fn });

beforeEach(() => fakeRegistry.reset());
// Restores the layout getters `renderMap` patches.
afterEach(() => resetMapTesting());
