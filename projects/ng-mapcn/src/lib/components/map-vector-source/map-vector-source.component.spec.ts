import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  loadAndSettle,
  reloadStyle,
  renderMap,
  structuralCalls,
  update,
} from '../../../testing/render';
import { MapVectorSourceComponent } from './map-vector-source.component';

const TEMPLATE = `
  <ng-map [theme]="theme" (mapError)="mapError($event)">
    @if (show) {
      <ng-map-vector-source
        [id]="id"
        [tiles]="tiles"
        [url]="url"
        [minzoom]="minzoom"
        [maxzoom]="maxzoom"
        [attribution]="attribution"
        [bounds]="bounds"
        [scheme]="scheme"
        [promoteId]="promoteId"
      />
    }
  </ng-map>
`;

const URL_ = 'pmtiles://https://example.com/parcels.pmtiles';

type Host = Record<string, any> & { mapError: ReturnType<typeof vi.fn> };

async function render(hostProps: Record<string, unknown> = {}) {
  const host: Host = {
    theme: 'light',
    show: true,
    id: 'parcels',
    tiles: undefined,
    url: URL_,
    minzoom: undefined,
    maxzoom: undefined,
    attribution: undefined,
    bounds: undefined,
    scheme: undefined,
    promoteId: undefined,
    mapError: vi.fn(),
    ...hostProps,
  };
  const result = await renderMap(TEMPLATE, {
    imports: [MapVectorSourceComponent],
    hostProps: host,
  });
  return { ...result, map: result.map!, host };
}

async function renderLoaded(hostProps: Record<string, unknown> = {}) {
  const result = await render(hostProps);
  loadAndSettle(result.fixture, result.map);
  return result;
}

describe('MapVectorSourceComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.documentElement.className = '';
    TestBed.resetTestingModule();
  });

  it('adds only the source (no layer) once loaded, and registers its id', async () => {
    const { fixture, map, ctx } = await render();
    expect(structuralCalls(map)).toEqual([]);
    expect(ctx.hasSource('parcels')).toBe(false);

    loadAndSettle(fixture, map);

    expect(structuralCalls(map)).toEqual(['addSource:parcels']);
    expect(map.getSource('parcels')).toMatchObject({ type: 'vector', url: URL_ });
    expect(ctx.hasSource('parcels')).toBe(true);
    expect(ctx.sourceIds().has('parcels')).toBe(true);
  });

  it('supports tiles, and forwards promoteId and the other options', async () => {
    const promoteId = { parcels: 'parcel_id' };
    const { map } = await renderLoaded({
      url: undefined,
      tiles: ['https://t.example.com/{z}/{x}/{y}.mvt'],
      minzoom: 4,
      maxzoom: 14,
      attribution: '(c) parcels',
      bounds: [-1, -2, 3, 4],
      scheme: 'tms',
      promoteId,
    });
    const source = map.getSource('parcels');

    expect(source).toMatchObject({
      type: 'vector',
      tiles: ['https://t.example.com/{z}/{x}/{y}.mvt'],
      minzoom: 4,
      maxzoom: 14,
      attribution: '(c) parcels',
      bounds: [-1, -2, 3, 4],
      scheme: 'tms',
      promoteId,
    });
    expect(source).not.toHaveProperty('url');
  });

  it('re-adds the source after a theme switch and re-announces it', async () => {
    const { fixture, map, ctx } = await renderLoaded();
    const seen: boolean[] = [];

    update(fixture, { theme: 'dark' });
    seen.push(ctx.hasSource('parcels'));
    expect(map.getSource('parcels')).toBeUndefined();
    reloadStyle(fixture, map);
    seen.push(ctx.hasSource('parcels'));

    expect(seen).toEqual([false, true]);
    expect(map.getSource('parcels')).toBeDefined();
    expect(structuralCalls(map).filter((c) => c === 'addSource:parcels')).toHaveLength(2);
  });

  it('updates the url and the tiles in place', async () => {
    const { fixture, map } = await renderLoaded();
    const source = map.getSource('parcels');

    update(fixture, { url: URL_ });
    expect(source.setUrl).not.toHaveBeenCalled();
    update(fixture, { url: 'pmtiles://https://example.com/other.pmtiles' });
    expect(source.setUrl).toHaveBeenCalledWith('pmtiles://https://example.com/other.pmtiles');
    expect(structuralCalls(map)).toEqual(['addSource:parcels']);
  });

  it('ignores switching from url to tiles after creation (mode is fixed)', async () => {
    const { fixture, map } = await renderLoaded();
    const source = map.getSource('parcels');

    update(fixture, { url: undefined, tiles: ['https://b.example.com/{z}/{x}/{y}.mvt'] });

    expect(source.setTiles).not.toHaveBeenCalled();
    expect(source.setUrl).not.toHaveBeenCalled();
  });

  it('calls setTiles only when the tile URLs change', async () => {
    const tiles = ['https://a.example.com/{z}/{x}/{y}.mvt'];
    const { fixture, map } = await renderLoaded({ url: undefined, tiles });
    const source = map.getSource('parcels');

    update(fixture, { tiles: [...tiles] });
    expect(source.setTiles).not.toHaveBeenCalled();
    update(fixture, { tiles: ['https://b.example.com/{z}/{x}/{y}.mvt'] });
    expect(source.setTiles).toHaveBeenCalledWith(['https://b.example.com/{z}/{x}/{y}.mvt']);
  });

  it('removes the source and releases the registry on destroy', async () => {
    const { fixture, map, ctx } = await renderLoaded();
    map.calls.length = 0;

    update(fixture, { show: false });

    expect(structuralCalls(map)).toEqual(['removeSource:parcels']);
    expect(ctx.hasSource('parcels')).toBe(false);
  });

  it('removes layers of other components that still use the source, then the source', async () => {
    const { fixture, map, ctx } = await renderLoaded();
    map.addLayer({ id: 'user-layer', type: 'fill', source: 'parcels' } as never);
    map.calls.length = 0;

    expect(() => update(fixture, { show: false })).not.toThrow();

    expect(structuralCalls(map)).toEqual(['removeLayer:user-layer', 'removeSource:parcels']);
    expect(map.getSource('parcels')).toBeUndefined();
    expect(ctx.hasSource('parcels')).toBe(false);
  });

  it('a theme switch with a consumer layer in place re-adds the source (no stale source)', async () => {
    const { fixture, map, host } = await renderLoaded();
    map.addLayer({ id: 'user-layer', type: 'fill', source: 'parcels' } as never);

    update(fixture, { theme: 'dark' });
    expect(map.getSource('parcels')).toBeUndefined();
    reloadStyle(fixture, map);

    expect(map.getSource('parcels')).toBeDefined();
    expect(host.mapError).not.toHaveBeenCalled();
  });

  it('reports a missing tiles/url through mapError', async () => {
    const { fixture, map, host } = await render({ url: undefined });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => loadAndSettle(fixture, map)).not.toThrow();

    expect(host.mapError.mock.calls[0][0].message).toContain('"tiles" or "url"');
    expect(structuralCalls(map)).toEqual([]);
  });

  it('reports a duplicate source id without removing the owner', async () => {
    const { fixture, map, ctx, host } = await render();
    map.addSource('parcels', { type: 'vector', url: 'owner' } as never);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    loadAndSettle(fixture, map);
    update(fixture, { show: false });

    expect(host.mapError.mock.calls[0][0].message).toContain('already exists');
    expect(map.getSource('parcels').url).toBe('owner');
    expect(ctx.hasSource('parcels')).toBe(false);
  });

  it('re-creates the source when the id changes', async () => {
    const { fixture, map, ctx } = await renderLoaded({ id: 'a' });

    update(fixture, { id: 'b' });

    expect(map.getSource('a')).toBeUndefined();
    expect(map.getSource('b')).toBeDefined();
    expect(ctx.hasSource('a')).toBe(false);
    expect(ctx.hasSource('b')).toBe(true);
  });
});
