import { vi } from 'vitest';

vi.mock('maplibre-gl', () => import('./maplibre-fake'));
