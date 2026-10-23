import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadAndSettle, reloadStyle, renderMap, update } from '../../src/testing/render';
import { MapDrawComponent } from './map-draw.component';

// terra-draw is mocked at the module boundary: the spec drives the component through a tiny fake
// that records calls and lets the test fire terra-draw events.
const fakes = vi.hoisted(() => {
  type Feature = {
    id: string;
    type: 'Feature';
    geometry: { type: string; coordinates: unknown };
    properties: Record<string, unknown>;
  };
  type Handler = (...args: any[]) => void;

  class FakeDraw {
    readonly calls: string[] = [];
    readonly store = new Map<string, Feature>();
    readonly listeners: Record<string, Handler[]> = {};
    mode = 'static';
    started = false;
    stopped = false;
    stopThrows = false;
    private nextId = 1;

    constructor(
      readonly options: {
        adapter: { map: unknown };
        modes: any[];
        idStrategy?: { isValidId(id: unknown): boolean; getId(): string };
      },
    ) {
      fakes.instances.push(this);
    }

    start() {
      this.started = true;
      this.calls.push('start');
    }
    stop() {
      this.calls.push('stop');
      this.stopped = true;
      this.store.clear();
      if (this.stopThrows) throw new Error('layers gone');
    }
    on(event: string, handler: Handler) {
      (this.listeners[event] ??= []).push(handler);
    }
    off(event: string, handler: Handler) {
      this.listeners[event] = (this.listeners[event] ?? []).filter((h) => h !== handler);
    }
    listenerCount() {
      return Object.values(this.listeners).reduce((n, l) => n + l.length, 0);
    }
    getMode() {
      return this.mode;
    }
    setMode(mode: string) {
      this.calls.push(`setMode:${mode}`);
      this.mode = mode;
    }
    getSnapshot() {
      return [...this.store.values()].map((f) => structuredClone(f));
    }
    getSnapshotFeature(id: string) {
      const f = this.store.get(id);
      return f ? structuredClone(f) : undefined;
    }
    hasFeature(id: string) {
      return this.store.has(id);
    }
    getFeatureId() {
      return `gen-${this.nextId++}`;
    }
    addFeatures(features: Feature[]) {
      this.calls.push(`addFeatures:${features.map((f) => f.id).join(',')}`);
      return features.map((f) => {
        const isValidId =
          this.options.idStrategy?.isValidId ??
          ((id: unknown) => typeof id === 'string' && (id as string).length === 36);
        if (!isValidId(f.id))
          return { id: f.id, valid: false, reason: 'Feature must match the id strategy' };
        const mode = String(f.properties['mode']);
        if (!this.options.modes.some((m) => m.options?.modeName === mode)) {
          return { id: f.id, valid: false, reason: `mode ${mode} not enabled` };
        }
        this.store.set(f.id, structuredClone(f));
        return { id: f.id, valid: true };
      });
    }
    removeFeatures(ids: string[]) {
      this.calls.push(`removeFeatures:${ids.join(',')}`);
      ids.forEach((id) => {
        if (!this.store.has(id)) throw new Error(`No feature with id ${id}, can not delete`);
      });
      ids.forEach((id) => this.store.delete(id));
      // Real terra-draw fires this synchronously, before removeFeatures returns.
      this.emit('change', ids, 'delete', { origin: 'api' });
    }
    updateFeatureGeometry(id: string, geometry: Feature['geometry']) {
      this.calls.push(`updateFeatureGeometry:${id}`);
      this.store.get(id)!.geometry = geometry;
    }
    updateFeatureProperties(id: string, props: Record<string, unknown>) {
      this.calls.push(`updateFeatureProperties:${id}`);
      const target = this.store.get(id)!.properties;
      for (const [k, v] of Object.entries(props)) {
        if (v === undefined) delete target[k];
        else target[k] = v;
      }
    }
    clear() {
      this.calls.push('clear');
      const ids = [...this.store.keys()];
      this.store.clear();
      this.emit('change', ids, 'delete', { origin: 'api' });
    }

    updateModeOptions(mode: string, options: { styles?: Record<string, unknown> }) {
      this.calls.push(`updateModeOptions:${mode}`);
      this.modeStyles[mode] = options.styles;
    }
    modeStyles: Record<string, Record<string, unknown> | undefined> = {};

    // Test helpers.
    emit(event: string, ...args: unknown[]) {
      for (const h of [...(this.listeners[event] ?? [])]) h(...args);
    }
    /** Simulates the user completing a shape. */
    finishDraw(feature: Feature, action = 'draw') {
      this.store.set(feature.id, structuredClone(feature));
      this.emit('finish', feature.id, { mode: String(feature.properties['mode']), action });
    }
  }

  class FakeMode {
    constructor(readonly options?: { modeName?: string; styles?: Record<string, unknown> }) {}
  }
  const modeClass = (kind: string) =>
    class extends FakeMode {
      readonly kind = kind;
    };

  return {
    instances: [] as FakeDraw[],
    FakeDraw,
    Point: modeClass('point'),
    Line: modeClass('line'),
    Polygon: modeClass('polygon'),
    Select: modeClass('select'),
    adapters: [] as unknown[],
  };
});

vi.mock('terra-draw', () => ({
  TerraDraw: fakes.FakeDraw,
  TerraDrawPointMode: fakes.Point,
  TerraDrawLineStringMode: fakes.Line,
  TerraDrawPolygonMode: fakes.Polygon,
  TerraDrawSelectMode: fakes.Select,
}));
vi.mock('terra-draw-maplibre-gl-adapter', () => ({
  TerraDrawMapLibreGLAdapter: class {
    constructor(readonly config: { map: unknown }) {
      fakes.adapters.push(this);
    }
    get map() {
      return this.config.map;
    }
  },
}));

const EMPTY = { type: 'FeatureCollection', features: [] };
const polygon = (id: string, extra: Record<string, unknown> = {}): any => ({
  id,
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
      ],
    ],
  },
  properties: { mode: 'polygon', ...extra },
});
const point = (id: string, lng = 0): any => ({
  id,
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [lng, 0] },
  properties: { mode: 'point' },
});
const collection = (...features: any[]) => ({ type: 'FeatureCollection', features });

const TEMPLATE = `
  <ng-map [theme]="theme" (mapError)="mapError($event)">
    <ng-map-draw
      [modes]="modes"
      [editable]="editable"
      [color]="color"
      [(mode)]="mode"
      [(features)]="features"
      (drawEnd)="drawEnd($event)"
      (featureEdit)="featureEdit($event)"
      (featureSelect)="featureSelect($event)"
      (featureDeselect)="featureDeselect($event)"
    />
  </ng-map>
`;

function hostDefaults(): Record<string, any> {
  return {
    theme: 'light',
    modes: ['point', 'line', 'polygon'],
    editable: true,
    color: undefined,
    mode: 'static',
    features: EMPTY,
    mapError: vi.fn(),
    drawEnd: vi.fn(),
    featureEdit: vi.fn(),
    featureSelect: vi.fn(),
    featureDeselect: vi.fn(),
  };
}

async function render(hostProps: Record<string, unknown> = {}) {
  const host = { ...hostDefaults(), ...hostProps };
  const result = await renderMap(TEMPLATE, { imports: [MapDrawComponent], hostProps: host });
  return {
    ...result,
    map: result.map!,
    host: result.fixture.componentInstance as Record<string, any>,
  };
}

async function renderLoaded(hostProps: Record<string, unknown> = {}) {
  const result = await render(hostProps);
  loadAndSettle(result.fixture, result.map);
  return result;
}

const draw = () => fakes.instances[fakes.instances.length - 1];
const modeNames = (d: InstanceType<typeof fakes.FakeDraw>) =>
  d.options.modes.map((m: any) => m.options?.modeName ?? m.kind);

describe('MapDrawComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fakes.instances.length = 0;
    fakes.adapters.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.documentElement.className = '';
    TestBed.resetTestingModule();
  });

  describe('gating (invariant 1)', () => {
    it('creates nothing before the map is loaded, then starts terra-draw once', async () => {
      const { fixture, map, ctx } = await render();

      expect(ctx.isLoaded()).toBe(false);
      expect(fakes.instances).toHaveLength(0);

      loadAndSettle(fixture, map);

      expect(fakes.instances).toHaveLength(1);
      expect(draw().started).toBe(true);
      expect((fakes.adapters[0] as { map: unknown }).map).toBe(map);
    });

    it('registers the point, line and polygon modes plus select', async () => {
      await renderLoaded();

      expect(modeNames(draw())).toEqual(['point', 'line', 'polygon', 'select']);
    });

    it('only registers the requested shapes and skips select when not editable', async () => {
      await renderLoaded({ modes: ['polygon'], editable: false });

      expect(modeNames(draw())).toEqual(['polygon']);
    });

    it('configures the select mode flags per shape', async () => {
      await renderLoaded();
      const select = draw().options.modes.find((m: any) => m.kind === 'select');
      const flags = select.options.flags;

      expect(Object.keys(flags)).toEqual(['point', 'line', 'polygon']);
      expect(flags.polygon.feature.draggable).toBe(true);
      expect(flags.polygon.feature.coordinates).toEqual({
        midpoints: true,
        draggable: true,
        deletable: true,
      });
    });
  });

  describe('theme-aware styling', () => {
    it('uses the light palette by default', async () => {
      await renderLoaded();
      const polygonMode = draw().options.modes.find((m: any) => m.kind === 'polygon');

      expect(polygonMode.options.styles.fillColor).toBe('#2563eb');
    });

    it('uses the color input over the palette', async () => {
      await renderLoaded({ color: '#ff0000' });
      const polygonMode = draw().options.modes.find((m: any) => m.kind === 'polygon');

      expect(polygonMode.options.styles.fillColor).toBe('#ff0000');
    });
  });

  describe('theme switch (setStyle)', () => {
    it('stops terra-draw when the gate closes and restarts it with the same features', async () => {
      const { fixture, map, host } = await renderLoaded({ mode: 'polygon' });
      const first = draw();
      first.finishDraw(polygon('a-1'));
      fixture.detectChanges();
      expect(host['features'].features).toHaveLength(1);

      update(fixture, { theme: 'dark' });

      expect(first.stopped).toBe(true);
      expect(first.listenerCount()).toBe(0);
      expect(fakes.instances).toHaveLength(1);

      reloadStyle(fixture, map);

      expect(fakes.instances).toHaveLength(2);
      const second = draw();
      expect(second).not.toBe(first);
      expect(second.started).toBe(true);
      expect(second.calls).toContain('addFeatures:a-1');
      expect(second.store.get('a-1')?.geometry).toEqual(polygon('a-1').geometry);
      // The active mode survives the restart and the palette follows the theme.
      expect(second.getMode()).toBe('polygon');
      const polygonMode = second.options.modes.find((m: any) => m.kind === 'polygon');
      expect(polygonMode.options.styles.fillColor).toBe('#60a5fa');
    });

    it('snapshots features that were not yet synced before stopping', async () => {
      const { fixture, map, host } = await renderLoaded();
      const first = draw();
      // Changed in terra-draw without a finish event reaching the component.
      first.store.set('b-1', point('b-1'));

      update(fixture, { theme: 'dark' });
      reloadStyle(fixture, map);

      expect(host['features'].features.map((f: any) => f.id)).toEqual(['b-1']);
      expect(draw().store.has('b-1')).toBe(true);
    });

    it('survives stop() throwing because the style is already gone', async () => {
      const { fixture, map, host } = await renderLoaded();
      draw().stopThrows = true;

      update(fixture, { theme: 'dark' });
      reloadStyle(fixture, map);

      expect(fakes.instances).toHaveLength(2);
      expect(host['mapError']).not.toHaveBeenCalled();
    });
  });

  describe('features model', () => {
    it('applies the initial features', async () => {
      await renderLoaded({ features: collection(polygon('a-1'), point('p-1')) });

      expect([...draw().store.keys()]).toEqual(['a-1', 'p-1']);
    });

    it('updates the model when a draw finishes, without echoing it back', async () => {
      const { fixture, host } = await renderLoaded({ mode: 'polygon' });
      const d = draw();
      d.calls.length = 0;

      d.finishDraw(polygon('a-1'));
      fixture.detectChanges();

      expect(host['features'].type).toBe('FeatureCollection');
      expect(host['features'].features.map((f: any) => f.id)).toEqual(['a-1']);
      // No add/remove/update back into terra-draw: the guard prevented the feedback loop.
      expect(d.calls.filter((c) => /^(add|remove|update)/.test(c))).toEqual([]);
    });

    it('does not expose guidance points, drawing-in-progress shapes or selection state', async () => {
      const { fixture, host } = await renderLoaded({ mode: 'polygon' });
      const d = draw();
      d.store.set('g-1', { ...point('g-1'), properties: { mode: 'polygon', closingPoint: true } });
      d.store.set('g-2', {
        ...polygon('g-2'),
        properties: { mode: 'polygon', currentlyDrawing: true },
      });
      d.store.set('g-3', { ...point('g-3'), properties: { mode: 'select', selectionPoint: true } });

      d.finishDraw(polygon('a-1', { selected: true, name: 'Zone' }));
      fixture.detectChanges();

      expect(host['features'].features).toEqual([polygon('a-1', { name: 'Zone' })]);
    });

    it('diffs a model change by id: add, update geometry and properties, remove', async () => {
      const { fixture, host } = await renderLoaded({
        features: collection(polygon('a-1'), point('p-1')),
      });
      const d = draw();
      d.calls.length = 0;

      const moved = point('p-1', 5);
      update(fixture, {
        features: collection(polygon('a-1', { name: 'Zone' }), moved, polygon('a-2')),
      });

      expect([...d.calls].sort()).toEqual([
        'addFeatures:a-2',
        'updateFeatureGeometry:p-1',
        'updateFeatureProperties:a-1',
      ]);

      d.calls.length = 0;
      update(fixture, { features: collection(moved) });
      expect(d.calls).toEqual(['removeFeatures:a-1,a-2']);
      expect(host['features'].features.map((f: any) => f.id)).toEqual(['p-1']);
    });

    it('removes the user property that disappeared from a feature', async () => {
      const { fixture } = await renderLoaded({
        features: collection(polygon('a-1', { name: 'Zone' })),
      });

      update(fixture, { features: collection(polygon('a-1')) });

      expect(draw().store.get('a-1')?.properties).toEqual({ mode: 'polygon' });
    });

    it('does nothing when an equal collection is assigned', async () => {
      const { fixture } = await renderLoaded({ features: collection(polygon('a-1')) });
      const d = draw();
      d.calls.length = 0;

      update(fixture, { features: collection(polygon('a-1')) });

      expect(d.calls).toEqual([]);
    });

    it('assigns ids to features without one and mirrors them in the model', async () => {
      const unnamed = polygon('x');
      delete unnamed.id;
      delete unnamed.properties.mode;
      const { host } = await renderLoaded({ features: collection(unnamed) });

      expect(draw().store.has('gen-1')).toBe(true);
      expect(host['features'].features[0].id).toBe('gen-1');
      expect(host['features'].features[0].properties.mode).toBe('polygon');
    });

    it('rounds coordinates to 9 decimals so float noise is not rejected', async () => {
      const noisy = point('p-1');
      noisy.geometry.coordinates = [-46.66 + 0.03, 0.1 + 0.2];

      await renderLoaded({ features: collection(noisy) });

      expect(draw().store.get('p-1')?.geometry.coordinates).toEqual([-46.63, 0.3]);
    });

    it('reports and drops unsupported geometries and rejected features', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const multi = { ...polygon('m-1'), geometry: { type: 'MultiPolygon', coordinates: [] } };
      const { host } = await renderLoaded({
        modes: ['point'],
        features: collection(multi, polygon('a-1'), point('p-1')),
      });

      const messages = host['mapError'].mock.calls.map((c: any[]) => c[0].message);
      expect(messages.some((m: string) => m.includes('MultiPolygon'))).toBe(true);
      expect(messages.some((m: string) => m.includes('a-1') && m.includes('rejected'))).toBe(true);
      expect(host['features'].features.map((f: any) => f.id)).toEqual(['p-1']);
    });

    it('mirrors a delete done in terra-draw (select mode Delete key)', async () => {
      const { fixture, host } = await renderLoaded({
        features: collection(polygon('a-1'), point('p-1')),
      });
      const d = draw();
      d.store.delete('a-1');
      d.emit('change', ['a-1'], 'delete');
      fixture.detectChanges();

      expect(host['features'].features.map((f: any) => f.id)).toEqual(['p-1']);
    });

    it('mirrors lines and points drawn in terra-draw, with their mode', async () => {
      const { fixture, host } = await renderLoaded({ mode: 'line' });
      const line = {
        id: 'l-1',
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
        properties: { mode: 'line' },
      };

      draw().finishDraw(line as any);
      draw().finishDraw(point('p-1'));
      fixture.detectChanges();

      expect(host['features'].features).toEqual([line, point('p-1')]);
    });

    it('empties terra-draw when the model is set to null', async () => {
      const { fixture } = await renderLoaded({ features: collection(polygon('a-1')) });

      update(fixture, { features: null });

      expect(draw().store.size).toBe(0);
    });

    it('rejects features whose shape is not offered and keeps the others', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { host } = await renderLoaded({
        modes: ['polygon'],
        features: collection(point('p-1'), polygon('a-1')),
      });

      expect([...draw().store.keys()]).toEqual(['a-1']);
      expect(host['features'].features.map((f: any) => f.id)).toEqual(['a-1']);
      expect(host['mapError'].mock.calls[0][0].message).toContain('p-1');
    });

    it('clear() empties terra-draw and the model', async () => {
      const { fixture, host } = await renderLoaded({ features: collection(polygon('a-1')) });
      const component = fixture.debugElement.query(By.directive(MapDrawComponent))
        .componentInstance as MapDrawComponent;

      component.clear();
      fixture.detectChanges();

      expect(draw().calls).toContain('clear');
      expect(host['features'].features).toEqual([]);
    });
  });

  describe('replacing the model (terra-draw echoes deletes synchronously)', () => {
    const ids = (host: Record<string, any>) => host['features'].features.map((f: any) => f.id);

    it('[A] -> [B] ends as [B], not half-applied', async () => {
      const { fixture, host } = await renderLoaded({ features: collection(polygon('a-1')) });

      update(fixture, { features: collection(polygon('b-1')) });

      expect(ids(host)).toEqual(['b-1']);
      expect([...draw().store.keys()]).toEqual(['b-1']);
    });

    it('[A,B] -> [B,C] keeps B and swaps A for C', async () => {
      const { fixture, host } = await renderLoaded({
        features: collection(polygon('a-1'), polygon('b-1')),
      });

      update(fixture, { features: collection(polygon('b-1'), polygon('c-1')) });

      expect(ids(host).sort()).toEqual(['b-1', 'c-1']);
      expect([...draw().store.keys()].sort()).toEqual(['b-1', 'c-1']);
    });

    it('[A] -> [] empties the model', async () => {
      const { fixture, host } = await renderLoaded({ features: collection(polygon('a-1')) });

      update(fixture, { features: collection() });

      expect(ids(host)).toEqual([]);
      expect(draw().store.size).toBe(0);
    });
  });

  describe('feature ids', () => {
    it('installs an id strategy that accepts any non-empty string and finite number', async () => {
      await renderLoaded();
      const strategy = draw().options.idStrategy!;

      expect(strategy.isValidId('zone-1')).toBe(true);
      expect(strategy.isValidId(42)).toBe(true);
      expect(strategy.isValidId('')).toBe(false);
      expect(strategy.isValidId(Number.NaN)).toBe(false);
      expect(strategy.isValidId(null)).toBe(false);
      expect(strategy.getId()).not.toBe(strategy.getId());
    });

    it('keeps application ids such as "zone-1" and 42', async () => {
      const { host } = await renderLoaded({
        features: collection(polygon('zone-1'), { ...point('x'), id: 42 }),
      });

      expect([...draw().store.keys()]).toEqual(['zone-1', 42]);
      expect(host['mapError']).not.toHaveBeenCalled();
      expect(host['features'].features.map((f: any) => f.id)).toEqual(['zone-1', 42]);
    });
  });

  describe('color', () => {
    it('updates the mode styles in place without restarting or dropping shapes', async () => {
      const { fixture } = await renderLoaded({ features: collection(polygon('a-1')) });
      const first = draw();

      update(fixture, { color: '#00ff00' });

      expect(fakes.instances).toHaveLength(1);
      expect(first.stopped).toBe(false);
      expect(first.calls).toEqual(
        expect.arrayContaining([
          'updateModeOptions:point',
          'updateModeOptions:line',
          'updateModeOptions:polygon',
          'updateModeOptions:select',
        ]),
      );
      expect(first.modeStyles['polygon']?.['fillColor']).toBe('#00ff00');
      expect(first.store.has('a-1')).toBe(true);
    });

    it('goes back to the theme palette when the color is cleared', async () => {
      const { fixture } = await renderLoaded({ color: '#ff0000' });
      const first = draw();

      update(fixture, { color: undefined });

      expect(fakes.instances).toHaveLength(1);
      expect(first.modeStyles['polygon']?.['fillColor']).toBe('#2563eb');
    });

    it('only restyles the registered modes', async () => {
      const { fixture } = await renderLoaded({ modes: ['polygon'], editable: false });
      const d = draw();
      d.calls.length = 0;

      update(fixture, { color: '#00ff00' });

      expect(d.calls).toEqual(['updateModeOptions:polygon']);
    });

    it('does nothing when the same color is assigned again', async () => {
      const { fixture } = await renderLoaded({ color: '#ff0000' });
      const d = draw();
      d.calls.length = 0;

      update(fixture, { color: '#ff0000' });

      expect(d.calls).toEqual([]);
    });

    it('reports a failing restyle instead of throwing', async () => {
      const { fixture, host } = await renderLoaded();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      draw().updateModeOptions = () => {
        throw new Error('restyle failed');
      };

      expect(() => update(fixture, { color: '#00ff00' })).not.toThrow();
      expect(host['mapError']).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'restyle failed' }),
      );
    });

    it('keeps the color input over the new palette after a theme switch', async () => {
      const { fixture, map } = await renderLoaded({ color: '#ff0000' });

      update(fixture, { theme: 'dark' });
      reloadStyle(fixture, map);

      const polygonMode = draw().options.modes.find((m: any) => m.kind === 'polygon');
      expect(polygonMode.options.styles.fillColor).toBe('#ff0000');
    });
  });

  describe('outputs', () => {
    it('emits drawEnd for a completed draw and featureEdit for other actions', async () => {
      const { host } = await renderLoaded({ mode: 'polygon' });

      draw().finishDraw(polygon('a-1'));
      expect(host['drawEnd']).toHaveBeenCalledTimes(1);
      expect(host['drawEnd']).toHaveBeenCalledWith({
        feature: polygon('a-1'),
        mode: 'polygon',
        action: 'draw',
      });
      expect(host['featureEdit']).not.toHaveBeenCalled();

      draw().finishDraw(polygon('a-1', { name: 'moved' }), 'dragFeature');
      expect(host['featureEdit']).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'dragFeature', mode: 'polygon' }),
      );
      expect(host['drawEnd']).toHaveBeenCalledTimes(1);
    });

    it('emits featureSelect with the feature and featureDeselect with its id', async () => {
      const { host } = await renderLoaded({ features: collection(polygon('a-1')) });

      draw().emit('select', 'a-1');
      expect(host['featureSelect']).toHaveBeenCalledWith(polygon('a-1'));

      draw().emit('deselect', 'a-1');
      expect(host['featureDeselect']).toHaveBeenCalledWith('a-1');
    });

    it('does not emit featureSelect for guidance features', async () => {
      const { host } = await renderLoaded();
      draw().store.set('g-1', { ...point('g-1'), properties: { mode: 'select', midPoint: true } });

      draw().emit('select', 'g-1');

      expect(host['featureSelect']).not.toHaveBeenCalled();
    });
  });

  describe('mode', () => {
    it('applies the initial mode and follows changes', async () => {
      const { fixture } = await renderLoaded({ mode: 'point' });
      expect(draw().getMode()).toBe('point');

      update(fixture, { mode: 'select' });
      expect(draw().getMode()).toBe('select');

      update(fixture, { mode: 'static' });
      expect(draw().getMode()).toBe('static');
    });

    it('falls back to static for a mode that is not available', async () => {
      const { fixture } = await renderLoaded({ modes: ['point'], editable: false, mode: 'line' });
      expect(draw().getMode()).toBe('static');

      update(fixture, { mode: 'select' });
      expect(draw().getMode()).toBe('static');
      expect(draw().calls.filter((c) => c.startsWith('setMode'))).toEqual([]);
    });

    it('does not call setMode when the mode is unchanged', async () => {
      const { fixture } = await renderLoaded({ mode: 'point' });
      const d = draw();
      d.calls.length = 0;

      update(fixture, { mode: 'point' });

      expect(d.calls).toEqual([]);
    });
  });

  describe('restart on structural inputs', () => {
    it('restarts with the new modes and keeps the features', async () => {
      const { fixture } = await renderLoaded({ features: collection(point('p-1')) });
      const first = draw();

      update(fixture, { modes: ['point', 'polygon'] });

      expect(first.stopped).toBe(true);
      expect(fakes.instances).toHaveLength(2);
      expect(modeNames(draw())).toEqual(['point', 'polygon', 'select']);
      expect(draw().store.has('p-1')).toBe(true);
    });

    it('restarts without the select mode when editing is turned off, keeping the features', async () => {
      const { fixture, host } = await renderLoaded({ features: collection(polygon('a-1')) });
      const first = draw();

      update(fixture, { editable: false });

      expect(first.stopped).toBe(true);
      expect(modeNames(draw())).toEqual(['point', 'line', 'polygon']);
      expect(draw().store.has('a-1')).toBe(true);
      expect(host['features'].features.map((f: any) => f.id)).toEqual(['a-1']);

      update(fixture, { editable: true });
      expect(modeNames(draw())).toEqual(['point', 'line', 'polygon', 'select']);
    });

    it('falls back to static when editing is turned off during select', async () => {
      const { fixture } = await renderLoaded({ mode: 'select' });
      expect(draw().getMode()).toBe('select');

      update(fixture, { editable: false });

      expect(draw().getMode()).toBe('static');
    });

    it('falls back to static when the active shape is no longer offered', async () => {
      const { fixture } = await renderLoaded({ mode: 'polygon' });

      update(fixture, { modes: ['point'] });

      expect(draw().getMode()).toBe('static');
      // Offered again: the mode the model still asks for comes back.
      update(fixture, { modes: ['point', 'polygon'] });
      expect(draw().getMode()).toBe('polygon');
    });

    it('ignores unknown shapes in modes', async () => {
      await renderLoaded({ modes: ['polygon', 'circle'] });

      expect(modeNames(draw())).toEqual(['polygon', 'select']);
    });

    it('applies a mode set before the map loaded once terra-draw starts', async () => {
      const { fixture, map } = await render({ mode: 'line' });
      update(fixture, { mode: 'polygon' });
      expect(fakes.instances).toHaveLength(0);

      loadAndSettle(fixture, map);

      expect(draw().getMode()).toBe('polygon');
    });
  });

  describe('teardown (invariant 4)', () => {
    it('stops terra-draw and removes its listeners on destroy', async () => {
      const { fixture } = await renderLoaded();
      const d = draw();
      expect(d.listenerCount()).toBe(4);

      fixture.destroy();

      expect(d.stopped).toBe(true);
      expect(d.listenerCount()).toBe(0);
    });

    it('ignores terra-draw events fired after destroy', async () => {
      const { fixture, host } = await renderLoaded({ mode: 'polygon' });
      const d = draw();
      const before = host['features'];
      const finish = [...(d.listeners['finish'] ?? [])];

      fixture.destroy();
      // A late event from a handler terra-draw captured before it was removed.
      for (const handler of finish) handler('a-1', { mode: 'polygon', action: 'draw' });

      expect(host['features']).toBe(before);
      expect(host['drawEnd']).not.toHaveBeenCalled();
    });

    it('does not write the model during destroy', async () => {
      const { fixture, host } = await renderLoaded();
      const before = host['features'];
      draw().store.set('late-1', point('late-1'));

      fixture.destroy();

      expect(host['features']).toBe(before);
    });

    it('reports a failing start instead of throwing', async () => {
      const original = fakes.FakeDraw.prototype.start;
      fakes.FakeDraw.prototype.start = () => {
        throw new Error('adapter failed');
      };
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      try {
        const { host } = await renderLoaded();
        expect(host['mapError']).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'adapter failed' }),
        );
      } finally {
        fakes.FakeDraw.prototype.start = original;
      }
    });
  });
});
