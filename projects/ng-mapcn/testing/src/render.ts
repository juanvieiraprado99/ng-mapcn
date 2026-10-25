import { Component, type EnvironmentProviders, type Provider } from '@angular/core';
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

export interface MapTestingConfig {
  /**
   * Advances the runner's fake clock by `ms`, used by `loadMap()` / `reloadStyle()` to wait out the
   * style debounce. Vitest: `(ms) => vi.advanceTimersByTime(ms)`; Jest:
   * `(ms) => jest.advanceTimersByTime(ms)`. Set it only while fake timers are installed. When it is
   * not set the helpers wait on a real timer instead, and throw if fake timers are installed.
   */
  advanceTimers?: ((ms: number) => void) | null;
}

const config: MapTestingConfig = { advanceTimers: null };

/** Configures the helpers. Only the keys passed change; `resetMapTesting()` does not undo it. */
export function configureMapTesting(options: MapTestingConfig): void {
  if ('advanceTimers' in options) config.advanceTimers = options.advanceTimers ?? null;
}

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

export interface RenderMapOptions {
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
  /** The `MapContextService` of the first `<ng-map>`. */
  ctx: MapContextService;
}

/**
 * Renders `template` inside a standalone host that imports `MapComponent` and runs change detection
 * until the map exists and projected children are attached. The map is not loaded yet: call
 * `loadMap()`. Patches the layout getters (see `setMapSize`): call `resetMapTesting()` in
 * `afterEach`.
 */
export async function renderMap(
  template: string,
  opts: RenderMapOptions = {},
): Promise<RenderMapResult> {
  setMapSize(opts.size === undefined ? { width: 400, height: 300 } : opts.size);
  patchLayout();

  TestBed.configureTestingModule({
    imports: [MapTestHostComponent],
    providers: opts.providers ?? [],
  });
  TestBed.overrideComponent(MapTestHostComponent, {
    set: { template, imports: [MapComponent, ...((opts.imports ?? []) as any[])] },
  });

  const fixture = TestBed.createComponent(MapTestHostComponent);
  Object.assign(fixture.componentInstance as object, opts.hostProps ?? {});
  fixture.detectChanges();
  await fixture.whenStable();
  // The map is created after the first pass; projected children are attached on the next one.
  fixture.detectChanges();
  await fixture.whenStable();

  const ctx = mapContext(fixture);
  return { fixture, map: (ctx.map() as unknown as FakeMap | null) ?? undefined, ctx };
}

function mapContext(fixture: ComponentFixture<unknown>): MapContextService {
  const host = fixture.debugElement.query((el) => el.componentInstance instanceof MapComponent);
  if (!host) throw new Error('No <ng-map> found in the fixture.');
  return host.injector.get(MapContextService);
}

/** The fake map created by the first `<ng-map>` of `fixture`. Throws if there is none yet. */
export function getFakeMap(fixture: ComponentFixture<unknown>): FakeMap {
  const map = mapContext(fixture).map() as unknown as FakeMap | null;
  if (!map) throw new Error('<ng-map> has not created its map (zero container size or an error).');
  return map;
}

/**
 * Whether the runner's fake timers replaced `setTimeout`: `@sinonjs/fake-timers` (Vitest, Jest's
 * modern timers) tags the functions it installs with `clock`, Jest's legacy timers are mocks.
 */
function fakeTimersInstalled(): boolean {
  const timeout = globalThis.setTimeout as unknown as { clock?: unknown; _isMockFunction?: true };
  return timeout.clock !== undefined || timeout._isMockFunction === true;
}

/** Fails fast where waiting on a faked `setTimeout` would hang until the test times out. */
function assertTimersUsable(helper: string): void {
  if (config.advanceTimers || !fakeTimersInstalled()) return;
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
  assertTimersUsable('loadMap');
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
  assertTimersUsable('reloadStyle');
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
