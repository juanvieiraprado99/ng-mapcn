import {
  Component,
  type EnvironmentProviders,
  type Provider,
  type ProviderToken,
  type Type,
} from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { MapComponent, MapContextService } from 'ng-mapcn';
import { type FakeMap, fakeRegistry } from 'ng-mapcn/testing/maplibre';

/**
 * Helpers for unit-testing components that render `<ng-map>`, on top of the `maplibre-gl` fake
 * from `ng-mapcn/testing/maplibre` (which must replace `maplibre-gl`, see that entry point).
 *
 * Runners: Vitest is supported first-class and Jest is supported (map `maplibre-gl` to the fake
 * with `moduleNameMapper`). Karma/Jasmine is not supported: it cannot mock an ES module.
 *
 * Stability: these functions, `fakeRegistry`, the fake's getters and `structuralCalls()` are public
 * API. The fake's raw `calls` strings are not: assert through `structuralCalls()` or the getters.
 */

@Component({ selector: 'ng-map-test-host', template: '' })
class MapTestHostComponent {}

/** How long `<ng-map>` debounces `styledata` before it opens the load gate. */
const STYLE_DEBOUNCE_MS = 100;

const elementSize = { width: 0, height: 0 };
type LayoutKey = 'offsetWidth' | 'offsetHeight';
let layoutPatch: Record<LayoutKey, PropertyDescriptor | undefined> | null = null;

/**
 * The map classes the helpers render and read. The npm package's by default; an app that copied the
 * sources with `npx ng-mapcn init` passes its own (`configureMapTesting({ mapComponent, mapContext })`
 * in the test setup file), since its `<ng-map>` is a different class with its own context service.
 */
export interface MapClasses {
  /** The `<ng-map>` component class, e.g. the copied `MapComponent` from `@/shared/components/map`. */
  mapComponent?: Type<unknown> | null;
  /** The `MapContextService` class that `mapComponent` provides. Required with `mapComponent`. */
  mapContext?: ProviderToken<unknown> | null;
}

export interface MapTestingConfig extends MapClasses {
  /**
   * Advances the runner's fake clock by `ms`, used by `loadMap()` / `reloadStyle()` to wait out the
   * style debounce. Vitest: `(ms) => vi.advanceTimersByTime(ms)`; Jest:
   * `(ms) => jest.advanceTimersByTime(ms)`. Set it only while fake timers are installed. When it is
   * not set the helpers wait on a real timer instead, and throw if fake timers are installed.
   */
  advanceTimers?: ((ms: number) => void) | null;
}

const config: MapTestingConfig = { advanceTimers: null, mapComponent: null, mapContext: null };

/**
 * Configures the helpers. Only the keys passed change; `resetMapTesting()` does not undo it.
 * `mapComponent` and `mapContext` go together; `null` for both goes back to the package's classes.
 */
export function configureMapTesting(options: MapTestingConfig): void {
  if ('advanceTimers' in options) config.advanceTimers = options.advanceTimers ?? null;
  if ('mapComponent' in options || 'mapContext' in options) {
    const pair = classPair(options);
    config.mapComponent = pair?.component ?? null;
    config.mapContext = pair?.context ?? null;
  }
}

interface ResolvedClasses {
  component: Type<unknown>;
  context: ProviderToken<unknown>;
}

/** Both classes of `classes`, or null when neither is set. Throws when only one is. */
function classPair(classes: MapClasses): ResolvedClasses | null {
  const component = classes.mapComponent ?? null;
  const context = classes.mapContext ?? null;
  if (!component && !context) return null;
  if (!component || !context) {
    throw new Error(
      'Pass mapComponent and mapContext together: the <ng-map> class and the MapContextService ' +
        'it provides (for copied sources, both from your alias, e.g. @/shared/components/map).',
    );
  }
  return { component, context };
}

/** The classes passed to the call, else the configured ones, else the npm package's. */
function resolveClasses(classes: MapClasses = {}): ResolvedClasses {
  return (
    classPair(classes) ??
    classPair(config) ?? { component: MapComponent, context: MapContextService }
  );
}

/** The classes each `renderMap()` fixture was rendered with, for `getFakeMap()` and `loadMap()`. */
const fixtureClasses = new WeakMap<ComponentFixture<unknown>, ResolvedClasses>();

/**
 * Sets the container size the map sees. jsdom has no layout, so `<ng-map>` would wait forever for
 * a non-zero size: `renderMap()` patches `HTMLElement.prototype.offsetWidth/offsetHeight` to read
 * this live value, so it can also change after rendering. `null` means zero size.
 */
export function setMapSize(size: { width: number; height: number } | null): void {
  elementSize.width = size?.width ?? 0;
  elementSize.height = size?.height ?? 0;
}

function patchLayout(): void {
  if (layoutPatch) return;
  const proto = HTMLElement.prototype;
  layoutPatch = {
    offsetWidth: Object.getOwnPropertyDescriptor(proto, 'offsetWidth'),
    offsetHeight: Object.getOwnPropertyDescriptor(proto, 'offsetHeight'),
  };
  Object.defineProperty(proto, 'offsetWidth', {
    configurable: true,
    get: () => elementSize.width,
  });
  Object.defineProperty(proto, 'offsetHeight', {
    configurable: true,
    get: () => elementSize.height,
  });
}

function restoreLayout(): void {
  if (!layoutPatch) return;
  const proto = HTMLElement.prototype;
  for (const key of ['offsetWidth', 'offsetHeight'] as const) {
    const original = layoutPatch[key];
    if (original) Object.defineProperty(proto, key, original);
    else delete (proto as unknown as Record<string, unknown>)[key];
  }
  layoutPatch = null;
}

/**
 * Undoes what the helpers changed globally: restores `HTMLElement.prototype` offset getters and
 * clears `fakeRegistry`. Call it in `afterEach`.
 */
export function resetMapTesting(): void {
  restoreLayout();
  setMapSize(null);
  fakeRegistry.reset();
}

export interface RenderMapOptions extends MapClasses {
  /** Standalone components/directives the template uses besides `MapComponent`. */
  imports?: unknown[];
  /** Test providers, including environment ones such as `provideZonelessChangeDetection()`. */
  providers?: (Provider | EnvironmentProviders)[];
  /** Assigned onto the host component instance before the first change detection. */
  hostProps?: Record<string, unknown>;
  /** Container size; `null` means zero size. Defaults to 400x300. */
  size?: { width: number; height: number } | null;
}

export interface RenderMapResult {
  fixture: ComponentFixture<any>;
  /** The fake map of the first `<ng-map>`, or `undefined` if none was created (zero size, error). */
  map: FakeMap | undefined;
  /**
   * The `MapContextService` of the first `<ng-map>` (typed as the package's; with copied sources it
   * is your copy, which has the same shape).
   */
  ctx: MapContextService;
}

/**
 * Renders `template` inside a standalone host that imports `MapComponent` (the package's, or the
 * `mapComponent` passed or configured for copied sources) and runs change detection
 * until the map exists and projected children are attached. The map is not loaded yet: call
 * `loadMap()`. Patches the layout getters (see `setMapSize`): call `resetMapTesting()` in
 * `afterEach`.
 */
export async function renderMap(
  template: string,
  opts: RenderMapOptions = {},
): Promise<RenderMapResult> {
  const classes = resolveClasses(opts);
  setMapSize(opts.size === undefined ? { width: 400, height: 300 } : opts.size);
  patchLayout();

  TestBed.configureTestingModule({
    imports: [MapTestHostComponent],
    providers: opts.providers ?? [],
  });
  TestBed.overrideComponent(MapTestHostComponent, {
    set: { template, imports: [classes.component, ...((opts.imports ?? []) as any[])] },
  });

  let fixture: ComponentFixture<MapTestHostComponent>;
  try {
    fixture = TestBed.createComponent(MapTestHostComponent);
    fixtureClasses.set(fixture, classes);
    Object.assign(fixture.componentInstance as object, opts.hostProps ?? {});
    fixture.detectChanges();
    await fixture.whenStable();
    // The map is created after the first pass; projected children are attached on the next one.
    fixture.detectChanges();
    await fixture.whenStable();
  } catch (error) {
    throw explainCopiedSources(error, classes);
  }

  const ctx = mapContext(fixture);
  return { fixture, map: (ctx.map() as unknown as FakeMap | null) ?? undefined, ctx };
}

/**
 * Children copied by `npx ng-mapcn init` inject their own `MapContextService`, which the package's
 * `<ng-map>` does not provide (NG0201). Points at the fix instead of the bare DI error.
 */
function explainCopiedSources(error: unknown, classes: ResolvedClasses): unknown {
  const message = error instanceof Error ? error.message : String(error);
  if (classes.component !== MapComponent || !/NG0201/.test(message)) return error;
  if (!/MapContext/.test(message)) return error;
  return new Error(
    'A child of <ng-map> could not find its MapContextService: it looks copied by ' +
      'npx ng-mapcn init, but renderMap() used the npm package MapComponent. Call ' +
      'configureMapTesting({ mapComponent: MapComponent, mapContext: MapContextService }) in the ' +
      'test setup file, with both classes imported from your alias (e.g. @/shared/components/map).',
    { cause: error },
  );
}

function mapContext(fixture: ComponentFixture<unknown>): MapContextService {
  const { component, context } = fixtureClasses.get(fixture) ?? resolveClasses();
  const host = fixture.debugElement.query((el) => el.componentInstance instanceof component);
  if (!host) {
    const other = fixture.debugElement.query((el) => el.name === 'ng-map');
    throw new Error(
      other
        ? 'The <ng-map> in the fixture is not the configured map class. With sources copied by ' +
            'npx ng-mapcn init, call configureMapTesting({ mapComponent, mapContext }) with the ' +
            'classes from your alias (or pass them to renderMap()).'
        : 'No <ng-map> found in the fixture.',
    );
  }
  return host.injector.get(context) as MapContextService;
}

/** The fake map created by the first `<ng-map>` of `fixture`. Throws if there is none yet. */
export function getFakeMap(fixture: ComponentFixture<unknown>): FakeMap {
  const map = mapContext(fixture).map() as unknown as FakeMap | null;
  if (!map) throw new Error('<ng-map> has not created its map (zero container size or an error).');
  return map;
}

type TimerFn = typeof setTimeout & {
  clock?: unknown;
  _isMockFunction?: true;
  __zone_symbol__OriginalDelegate?: typeof setTimeout;
};

/** zone.js tags the functions it patches with the function they wrap. */
const unwrapZone = (fn: TimerFn): TimerFn =>
  (fn.__zone_symbol__OriginalDelegate as TimerFn | undefined) ?? fn;

/**
 * The `setTimeout` / `clearTimeout` in place when this entry point was imported, before any test
 * could install fake timers (a test setup file imports it, or a spec does, at module load).
 */
const loadedSetTimeout = unwrapZone(globalThis.setTimeout as TimerFn);
const loadedClearTimeout = globalThis.clearTimeout;

/**
 * A `setTimeout` that is known to run on real time: zone.js keeps the browser's/Node's original as
 * `__zone_symbol__setTimeout` (it patches before any spec code runs, so this holds even when fake
 * timers were installed before this module loaded), else the one captured at import.
 */
function realTimers(): { set: typeof setTimeout; clear: typeof clearTimeout } {
  const g = globalThis as unknown as Record<string, unknown>;
  const set = g['__zone_symbol__setTimeout'];
  const clear = g['__zone_symbol__clearTimeout'];
  return typeof set === 'function' && typeof clear === 'function'
    ? { set: set as typeof setTimeout, clear: clear as typeof clearTimeout }
    : { set: loadedSetTimeout, clear: loadedClearTimeout };
}

/**
 * Whether `setTimeout` is not the real-time reference: replaced since this module loaded or, with
 * zone.js, not the original zone.js saved. zone.js patching it is not a replacement: a patched
 * function is compared by the function it wraps.
 */
function timersReplaced(): boolean {
  return unwrapZone(globalThis.setTimeout as TimerFn) !== realTimers().set;
}

/**
 * Behavioural check, for a replaced `setTimeout` without a known tag: a fake clock never fires a
 * 0 ms timer on its own, a real (or merely wrapped) one fires it long before a real 50 ms timer.
 */
function zeroTimerFires(): Promise<boolean> {
  const real = realTimers();
  return new Promise((resolve) => {
    // Runs after `probe` is assigned: a real timer never fires synchronously.
    const watchdog = real.set(() => {
      try {
        globalThis.clearTimeout(probe);
      } catch {}
      resolve(false);
    }, 50);
    const probe = globalThis.setTimeout(() => {
      real.clear(watchdog);
      resolve(true);
    }, 0);
  });
}

/**
 * Whether fake timers replaced `setTimeout`, with any library:
 * - `@sinonjs/fake-timers` (Vitest, Jest's modern timers) tags the functions it installs with
 *   `clock`: fake, without further checks;
 * - a mock (`_isMockFunction`: Jest's legacy timers, but also a `vi.spyOn` / `jest.spyOn` on
 *   `setTimeout` that calls through) or a `setTimeout` that is not the real-time reference (see
 *   `timersReplaced`) is confirmed behaviourally, so a spy or wrapper that still runs on real time
 *   is not reported.
 *
 * Limitation: without zone.js, an untagged library installed before this module was imported
 * cannot be detected (the captured reference is already the fake, so nothing looks replaced).
 * With zone.js, the original it saved is the reference, so the order does not matter.
 */
async function fakeTimersInstalled(): Promise<boolean> {
  const timeout = globalThis.setTimeout as TimerFn;
  if (timeout.clock !== undefined) return true;
  if (timeout._isMockFunction !== true && !timersReplaced()) return false;
  return !(await zeroTimerFires());
}

/** Fails fast where waiting on a faked `setTimeout` would hang until the test times out. */
async function assertTimersUsable(helper: string): Promise<void> {
  if (config.advanceTimers || !(await fakeTimersInstalled())) return;
  throw new Error(
    `${helper}() cannot wait out the style debounce: fake timers are installed but ` +
      'configureMapTesting({ advanceTimers }) is not set. Call, for example, ' +
      'configureMapTesting({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) }), or use real timers.',
  );
}

async function waitStyleDebounce(): Promise<void> {
  if (config.advanceTimers) config.advanceTimers(STYLE_DEBOUNCE_MS);
  else await new Promise((resolve) => setTimeout(resolve, STYLE_DEBOUNCE_MS + 10));
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
}

/**
 * Simulates MapLibre finishing the first style load: fires `load` and `styledata`, waits out the
 * 100 ms style debounce (with `configureMapTesting({ advanceTimers })` or a real timer), then runs
 * change detection so the layer components add their sources and layers. Throws when fake timers
 * are installed without `advanceTimers` (waiting on the faked timer would never end).
 */
export async function loadMap(fixture: ComponentFixture<unknown>, map?: FakeMap): Promise<void> {
  await assertTimersUsable('loadMap');
  const target = map ?? getFakeMap(fixture);
  target.fire('load');
  target.fire('styledata');
  await waitStyleDebounce();
  await settle(fixture);
}

/**
 * Simulates the style requested by `setStyle` (a theme or `styles` change) arriving: every source
 * and layer is dropped, `style.load` + `styledata` fire, then the debounce and change detection
 * let the components re-add everything. Without a pending `setStyle` it only fires `styledata`.
 */
export async function reloadStyle(
  fixture: ComponentFixture<unknown>,
  map?: FakeMap,
): Promise<void> {
  await assertTimersUsable('reloadStyle');
  const target = map ?? getFakeMap(fixture);
  if (target.hasPendingStyle()) target.finishStyleLoad();
  else target.fire('styledata');
  await waitStyleDebounce();
  await settle(fixture);
}

/**
 * Assigns host properties and runs change detection (effects run during it). The host is marked
 * for check first: without zone.js, a plain assignment marks nothing dirty, so `detectChanges()`
 * would skip the host and its no-changes check would throw NG0100.
 */
export function update(
  fixture: {
    componentInstance: any;
    changeDetectorRef: { markForCheck(): void };
    detectChanges(): void;
  },
  props: object,
): void {
  Object.assign(fixture.componentInstance, props);
  fixture.changeDetectorRef.markForCheck();
  fixture.detectChanges();
}

/**
 * Fires a map event, like MapLibre would: `fireMapEvent(map, 'click', { lngLat })`, or with a
 * layer id for layer events (`'mouseenter'`, `'click'` on a layer). Run change detection after it
 * if the handlers update the view.
 */
export function fireMapEvent(
  map: FakeMap,
  event: string,
  payload: object = {},
  layerId?: string,
): void {
  map.fire(event, payload, layerId);
}

/**
 * The source/layer add/remove operations recorded on the map, in order, as
 * `'addSource:<id>' | 'addLayer:<id>' | 'removeLayer:<id>' | 'removeSource:<id>'`. This format is
 * stable (unlike the fake's raw `calls`).
 */
export function structuralCalls(map: FakeMap): string[] {
  return map.calls.filter((c) => /^(addSource|addLayer|removeLayer|removeSource):/.test(c));
}
