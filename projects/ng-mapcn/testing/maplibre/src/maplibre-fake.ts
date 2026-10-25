/**
 * Test double for `maplibre-gl`, published as `ng-mapcn/testing/maplibre`. It stands in for the
 * whole `maplibre-gl` module, so it has no imports at all (in particular, it never imports
 * `ng-mapcn` or a test runner).
 *
 * It records every call, lets specs fire events, and is deliberately as strict as MapLibre where it
 * matters for the library invariants (duplicate layers, removing a source that is still in use).
 *
 * Popups close like MapLibre's: a map `click` (for example `fireMapEvent(map, 'click')`) closes
 * every open popup created without `closeOnClick: false` (MapLibre's default is `true`;
 * `<ng-map-popup>` keeps it, `<ng-marker-popup>` defaults to `false`), and `Marker.remove()` closes
 * the marker's open popup. Both fire the popup's `close` event. A spec that fires map clicks while
 * a popup must stay open creates it with `closeOnClick: false` (`[closeOnClick]="false"`).
 *
 * Install it by mocking the module:
 * - Vitest: `vi.mock('maplibre-gl', () => import('ng-mapcn/testing/maplibre'))` in a setup file,
 *   plus `configureFakeMapLibre({ spy: vi.fn })` to make the methods spies.
 * - Jest: `moduleNameMapper: { '^maplibre-gl$': 'ng-mapcn/testing/maplibre' }` plus
 *   `configureFakeMapLibre({ spy: jest.fn })`.
 * - Karma/Jasmine: not supported (no module mocking).
 *
 * Stability: `fakeRegistry`, the getters and the test-only helpers (`fire`, `listenerCount`,
 * `finishStyleLoad`, ...) are public API. The `calls` log is for debugging and for
 * `structuralCalls()` in `ng-mapcn/testing`: its exact strings may change in any release.
 */

type Handler = (event: any) => void;

/** Wraps a fake method implementation, for example in a test runner's spy (`vi.fn`, `jest.fn`). */
export type FakeSpyFactory = (impl: (...args: any[]) => any) => (...args: any[]) => any;

export interface FakeMapLibreConfig {
  /**
   * Wraps the implementation of the fake's spied methods (`jumpTo`, `setStyle`, `setData`, ...).
   * Defaults to the identity, so the fake runs without any test runner. It applies to instances
   * created after the call.
   */
  spy?: FakeSpyFactory;
}

const identity: FakeSpyFactory = (impl) => impl;
const config: Required<FakeMapLibreConfig> = { spy: identity };

/**
 * Configures the fake, usually once in a test setup file. Only the keys passed change; passing
 * `spy: undefined` restores the identity. `fakeRegistry.reset()` does not undo it.
 */
export function configureFakeMapLibre(options: FakeMapLibreConfig): void {
  if ('spy' in options) config.spy = options.spy ?? identity;
}

function spy<T extends (...args: any[]) => any>(impl: T): T {
  return config.spy(impl) as T;
}

interface Listener {
  event: string;
  layerId?: string;
  handler: Handler;
}

/** Minimal event emitter supporting `(event, handler)` and `(event, layerId, handler)`. */
class Evented {
  protected listeners: Listener[] = [];
  /** Ordered log of the operations performed on this instance. */
  readonly calls: string[] = [];

  on(event: string, layerOrHandler: string | Handler, maybeHandler?: Handler): this {
    const [layerId, handler] = this.split(layerOrHandler, maybeHandler);
    this.listeners.push({ event, layerId, handler });
    this.calls.push(layerId === undefined ? `on:${event}` : `on:${event}:${layerId}`);
    return this;
  }

  off(event: string, layerOrHandler: string | Handler, maybeHandler?: Handler): this {
    const [layerId, handler] = this.split(layerOrHandler, maybeHandler);
    const index = this.listeners.findIndex(
      (l) => l.event === event && l.layerId === layerId && l.handler === handler,
    );
    if (index !== -1) this.listeners.splice(index, 1);
    this.calls.push(layerId === undefined ? `off:${event}` : `off:${event}:${layerId}`);
    return this;
  }

  /** Calls the handlers registered for exactly `(event, layerId)`. */
  fire(event: string, payload: object = {}, layerId?: string): void {
    const fired = { ...payload, type: event, target: this };
    for (const l of [...this.listeners]) {
      if (l.event === event && l.layerId === layerId) l.handler(fired);
    }
  }

  listenerCount(event: string, layerId?: string): number {
    return this.listeners.filter((l) => l.event === event && l.layerId === layerId).length;
  }

  private split(
    layerOrHandler: string | Handler,
    handler?: Handler,
  ): [string | undefined, Handler] {
    return typeof layerOrHandler === 'string'
      ? [layerOrHandler, handler as Handler]
      : [undefined, layerOrHandler];
  }
}

export class Point {
  constructor(
    public x: number,
    public y: number,
  ) {}

  static convert(value: unknown): Point {
    if (value instanceof Point) return value;
    if (Array.isArray(value)) return new Point(value[0], value[1]);
    if (typeof value === 'number') return new Point(value, value);
    const v = value as { x: number; y: number } | undefined;
    return new Point(v?.x ?? 0, v?.y ?? 0);
  }
}

type LngLatLike = [number, number] | { lng: number; lat: number } | { lon: number; lat: number };

function toLngLat(value: LngLatLike | undefined): { lng: number; lat: number } {
  if (!value) return { lng: 0, lat: 0 };
  const ll = Array.isArray(value)
    ? { lng: value[0], lat: value[1] }
    : { lng: 'lng' in value ? value.lng : value.lon, lat: value.lat };
  // Like MapLibre's LngLat constructor.
  if (isNaN(ll.lng) || isNaN(ll.lat)) {
    throw new Error(`Invalid LngLat object: (${ll.lng}, ${ll.lat})`);
  }
  return ll;
}

function toPoint(value: unknown): Point {
  if (value instanceof Point) return value;
  if (Array.isArray(value)) return new Point(value[0], value[1]);
  return new Point(0, 0);
}

export class Map extends Evented {
  private sources: Record<string, any> = {};
  private layers: any[] = [];
  /** Images of the style (`addImage`); a style change drops them, like MapLibre. */
  private images = new globalThis.Map<string, { data: unknown; options: unknown }>();
  private terrain: { source: string; exaggeration?: number } | null = null;
  private moving = false;
  private camera = { lng: 0, lat: 0, zoom: 0, bearing: 0, pitch: 0 };
  private readonly canvas = document.createElement('canvas');
  private readonly container: HTMLElement & { requestFullscreen: () => Promise<void> };
  /** Like MapLibre's: holds the canvas and the markers. */
  private readonly canvasContainer = document.createElement('div');
  /** Like MapLibre's: holds the control corners. */
  private readonly controlContainer = document.createElement('div');
  removed = false;
  /** MapLibre's global worker URL when this map was constructed. */
  readonly workerUrlAtConstruction = fakeRegistry.workerUrl;

  constructor(readonly options: any = {}) {
    super();
    const failure = fakeRegistry.constructError;
    if (failure) {
      fakeRegistry.constructError = null;
      throw failure;
    }
    this.camera = {
      ...toLngLat(options.center),
      zoom: options.zoom ?? 0,
      bearing: options.bearing ?? 0,
      pitch: options.pitch ?? 0,
    };
    // Like MapLibre: the map renders into `options.container` (a detached element without one), so
    // markers, popups and controls are in the document, under the element the app gave the map.
    const container: HTMLElement =
      options.container instanceof HTMLElement ? options.container : document.createElement('div');
    this.container = Object.assign(container, {
      requestFullscreen: spy(() => Promise.resolve()),
    });
    this.container.classList.add('maplibregl-map');
    this.canvasContainer.className = 'maplibregl-canvas-container';
    this.canvas.className = 'maplibregl-canvas';
    this.canvasContainer.appendChild(this.canvas);
    this.controlContainer.className = 'maplibregl-control-container';
    this.container.append(this.canvasContainer, this.controlContainer);
    fakeRegistry.maps.push(this);
  }

  /** Linear fake projection: 1 degree = 10 px (y grows southwards). */
  project = spy((lngLat: LngLatLike) => {
    const ll = toLngLat(lngLat);
    return { x: ll.lng * 10, y: -ll.lat * 10 };
  });
  unproject = spy((point: [number, number] | { x: number; y: number }) => {
    const [x, y] = Array.isArray(point) ? point : [point.x, point.y];
    return { lng: x / 10, lat: -y / 10 };
  });

  /** Simulates a user-driven gesture in progress (`isMoving()` result). */
  setMoving(value: boolean): void {
    this.moving = value;
  }

  isMoving(): boolean {
    return this.moving;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getContainer(): HTMLElement & { requestFullscreen: () => Promise<void> } {
    return this.container;
  }

  /** The element holding the canvas and the markers (`.maplibregl-canvas-container`). */
  getCanvasContainer(): HTMLElement {
    return this.canvasContainer;
  }

  getCenter(): { lng: number; lat: number } {
    return { lng: this.camera.lng, lat: this.camera.lat };
  }
  getZoom(): number {
    return this.camera.zoom;
  }
  getBearing(): number {
    return this.camera.bearing;
  }
  getPitch(): number {
    return this.camera.pitch;
  }

  private applyCamera(opts: any = {}): void {
    if (opts.center) Object.assign(this.camera, toLngLat(opts.center));
    if (opts.zoom !== undefined) this.camera.zoom = opts.zoom;
    if (opts.bearing !== undefined) this.camera.bearing = opts.bearing;
    if (opts.pitch !== undefined) this.camera.pitch = opts.pitch;
  }

  jumpTo = spy((opts: any = {}) => {
    this.calls.push('jumpTo');
    this.applyCamera(opts);
    this.fire('move');
    return this;
  });
  flyTo = spy((opts: any = {}) => {
    this.calls.push('flyTo');
    this.applyCamera(opts);
    return this;
  });
  easeTo = spy((opts: any = {}) => {
    this.calls.push('easeTo');
    this.applyCamera(opts);
    return this;
  });
  fitBounds = spy((bounds: any, opts: any = {}) => {
    this.calls.push('fitBounds');
    const [w, s, e, n] = Array.isArray(bounds[0])
      ? [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]]
      : bounds;
    this.applyCamera({ center: [(w + e) / 2, (s + n) / 2], zoom: opts.maxZoom ?? 10 });
    this.fire('move');
    return this;
  });
  zoomTo = spy((zoom: number) => {
    this.calls.push('zoomTo');
    this.camera.zoom = zoom;
    return this;
  });
  resetNorthPitch = spy(() => {
    this.calls.push('resetNorthPitch');
    this.camera.bearing = 0;
    this.camera.pitch = 0;
    return this;
  });

  /** True while a style requested with `setStyle` has not been applied yet. */
  private styleLoading = false;

  /**
   * Test-only: whether a `setStyle` is still in flight. (MapLibre's own `isStyleLoaded()` stays
   * true during a diffed `setStyle`, so it cannot tell — measured in a real browser.)
   */
  hasPendingStyle(): boolean {
    return this.styleLoading;
  }

  /**
   * Like MapLibre: the new style is fetched asynchronously, so the current style (and every source
   * and layer in it) stays until `finishStyleLoad()` applies the new one.
   */
  private styleOptions: { transformStyle?: (previous: unknown, next: unknown) => unknown } = {};

  setStyle = spy((style: unknown, options?: unknown) => {
    this.calls.push('setStyle');
    this.options.style = style;
    this.styleLoading = true;
    this.styleOptions = (options ?? {}) as typeof this.styleOptions;
    return this;
  });

  /** Like MapLibre's diff: `transformStyle` runs on the fetched style before it is applied. */
  private transformPendingStyle(): void {
    this.styleOptions.transformStyle?.(this.getStyle(), this.options.style);
  }

  /** The requested style arrives but the diff finds no changes: MapLibre fires no event at all. */
  finishStyleLoadWithoutChanges(): void {
    this.transformPendingStyle();
    this.styleLoading = false;
  }

  /** The requested style fails to load (network, 404): MapLibre only fires `error`. */
  failStyleLoad(error = new Error('style failed')): void {
    this.styleLoading = false;
    this.fire('error', { error });
  }

  /** The style as MapLibre serializes it; specs stub `basemapLayers` to emulate the basemap's own layers. */
  basemapLayers: any[] = [];
  /** The style's `glyphs` URL; specs clear it to emulate a style without fonts (`blank`). */
  glyphs: string | undefined = 'https://example.com/fonts/{fontstack}/{range}.pbf';
  getStyle = spy(() => ({
    version: 8,
    glyphs: this.glyphs,
    sources: this.sources,
    layers: [...this.basemapLayers, ...this.layers],
  }));

  /** The requested style arrives: every source and layer is dropped, then `style.load` + `styledata`. */
  finishStyleLoad(): void {
    this.calls.push('styleLoaded');
    this.transformPendingStyle();
    this.sources = {};
    this.layers = [];
    this.images.clear();
    this.terrain = null;
    this.styleLoading = false;
    this.fire('style.load');
    this.fire('styledata');
  }
  setProjection = spy((_projection: unknown) => {
    this.calls.push('setProjection');
    return this;
  });
  remove = spy(() => {
    this.calls.push('remove');
    this.removed = true;
    // Like MapLibre: open popups listen to the map's `remove` and close (firing `close`).
    this.fire('remove');
    // Like MapLibre: what the map added to its container goes away with it.
    this.canvasContainer.remove();
    this.controlContainer.remove();
    this.container.classList.remove('maplibregl-map');
  });

  addSource(id: string, source: any): this {
    if (this.sources[id]) throw new Error(`Source "${id}" already exists.`);
    this.calls.push(`addSource:${id}`);
    this.sources[id] = {
      ...source,
      id,
      setData: spy((_data: unknown): void => undefined),
      setClusterOptions: spy((_options: unknown) => Promise.resolve()),
      getClusterExpansionZoom: spy((_clusterId: number) => Promise.resolve(0)),
      // Raster / vector tile sources
      setTiles: spy((_tiles: string[]) => this.sources[id]),
      setUrl: spy((_url: string) => this.sources[id]),
      // Image source
      updateImage: spy((_options: unknown) => this.sources[id]),
      setCoordinates: spy((_coordinates: unknown) => this.sources[id]),
    };
    return this;
  }

  getSource(id: string): any {
    return this.sources[id];
  }

  /** Throws while any layer still references the source (mirrors MapLibre). */
  removeSource(id: string): this {
    const user = this.layers.find((l) => l.source === id);
    if (user) {
      throw new Error(`Source "${id}" cannot be removed while layer "${user.id}" is using it.`);
    }
    this.calls.push(`removeSource:${id}`);
    delete this.sources[id];
    return this;
  }

  addLayer(layer: any, beforeId?: string): this {
    if (this.layers.some((l) => l.id === layer.id)) {
      throw new Error(`Layer "${layer.id}" already exists on this map.`);
    }
    if (typeof layer.source === 'string' && !this.sources[layer.source]) {
      throw new Error(`Source "${layer.source}" not found for layer "${layer.id}".`);
    }
    const stored = { ...layer, paint: { ...layer.paint }, layout: { ...layer.layout } };
    if (beforeId === undefined) {
      this.layers.push(stored);
    } else {
      const index = this.layers.findIndex((l) => l.id === beforeId);
      if (index === -1) {
        throw new Error(`Cannot add layer "${layer.id}" before non-existing layer "${beforeId}".`);
      }
      this.layers.splice(index, 0, stored);
    }
    this.calls.push(`addLayer:${layer.id}`);
    return this;
  }

  getLayer(id: string): any {
    return this.layers.find((l) => l.id === id);
  }

  /** Layer ids in draw order (bottom first). */
  getLayerOrder(): string[] {
    return this.layers.map((l) => l.id);
  }

  removeLayer(id: string): this {
    this.calls.push(`removeLayer:${id}`);
    this.layers = this.layers.filter((l) => l.id !== id);
    return this;
  }

  setPaintProperty = spy((layerId: string, name: string, value: unknown) => {
    this.calls.push(`setPaintProperty:${layerId}:${name}`);
    const layer = this.getLayer(layerId);
    if (layer) layer.paint[name] = value;
    return this;
  });
  setLayoutProperty = spy((layerId: string, name: string, value: unknown) => {
    this.calls.push(`setLayoutProperty:${layerId}:${name}`);
    const layer = this.getLayer(layerId);
    if (layer) layer.layout[name] = value;
    return this;
  });
  setLayerZoomRange = spy((layerId: string, minzoom: number, maxzoom: number) => {
    this.calls.push(`setLayerZoomRange:${layerId}`);
    const layer = this.getLayer(layerId);
    if (layer) {
      layer.minzoom = minzoom;
      layer.maxzoom = maxzoom;
    }
    return this;
  });
  setFilter = spy((layerId: string, filter: unknown) => {
    this.calls.push(`setFilter:${layerId}`);
    const layer = this.getLayer(layerId);
    if (layer) layer.filter = filter;
    return this;
  });
  /** Like MapLibre: the terrain is style-level and needs an existing source. `null` removes it. */
  setTerrain = spy((options: { source: string; exaggeration?: number } | null) => {
    if (options && !this.sources[options.source]) {
      throw new Error(
        `cannot load terrain, because there exists no source with ID: ${options.source}`,
      );
    }
    this.calls.push(`setTerrain:${options ? options.source : 'null'}`);
    this.terrain = options ? { ...options } : null;
    return this;
  });
  getTerrain(): { source: string; exaggeration?: number } | null {
    return this.terrain;
  }
  /** Like MapLibre: adding an image under an existing id throws. */
  addImage(id: string, data: unknown, options: unknown = {}): this {
    if (this.images.has(id)) throw new Error(`An image named "${id}" already exists.`);
    this.calls.push(`addImage:${id}`);
    this.images.set(id, { data, options });
    return this;
  }
  hasImage(id: string): boolean {
    return this.images.has(id);
  }
  /** Like MapLibre: the stored image object, the same one on every call until it is replaced. */
  getImage(id: string): unknown {
    return this.images.get(id);
  }
  removeImage(id: string): this {
    this.calls.push(`removeImage:${id}`);
    this.images.delete(id);
    return this;
  }
  updateImage(id: string, data: unknown): this {
    if (!this.images.has(id)) throw new Error(`The map has no image with that id: ${id}`);
    this.calls.push(`updateImage:${id}`);
    this.images.set(id, { ...this.images.get(id)!, data });
    return this;
  }
  /**
   * Resolves a decoded 1x1 image, like `map.loadImage` (override per spec to reject). With
   * `fakeRegistry.deferImageLoads` set, the decode waits in `fakeRegistry.imageLoads` instead.
   */
  loadImage = spy((url: string) => {
    const decoded = { data: { width: 1, height: 1, data: new Uint8Array(4) } };
    if (!fakeRegistry.deferImageLoads) return Promise.resolve(decoded);
    return new Promise<typeof decoded>((resolve, reject) => {
      fakeRegistry.imageLoads.push({ url, resolve: () => resolve(decoded), reject });
    });
  });
  private controls: any[] = [];

  /** Like MapLibre: the control's element goes into a lazily created corner container. */
  addControl(control: any, position = 'top-right'): this {
    const element: HTMLElement = control.onAdd(this);
    const className = `maplibregl-ctrl-${position}`;
    let corner = this.controlContainer.querySelector(`.${className}`);
    if (!corner) {
      corner = document.createElement('div');
      corner.className = className;
      this.controlContainer.appendChild(corner);
    }
    corner.appendChild(element);
    this.controls.push(control);
    this.calls.push(`addControl:${position}`);
    return this;
  }

  removeControl(control: any): this {
    control.onRemove(this);
    this.controls = this.controls.filter((c) => c !== control);
    this.calls.push('removeControl');
    return this;
  }

  hasControl(control: unknown): boolean {
    return this.controls.includes(control);
  }

  setFeatureState = spy((_feature: unknown, _state: unknown) => {
    this.calls.push('setFeatureState');
    return this;
  });
  queryRenderedFeatures = spy((..._args: unknown[]): unknown[] => []);
}

export class Marker extends Evented {
  private element: HTMLElement;
  private lngLat = { lng: 0, lat: 0 };
  private popup: Popup | null = null;
  private offset: Point;
  private draggable: boolean;
  private rotation: number;
  private rotationAlignment: string;
  private pitchAlignment: string;
  map: Map | null = null;

  constructor(readonly options: any = {}) {
    super();
    this.element = options.element ?? document.createElement('div');
    // Like MapLibre, which tags the element when it creates the marker.
    this.element.classList.add('maplibregl-marker');
    this.offset = toPoint(options.offset);
    this.draggable = options.draggable ?? false;
    this.rotation = options.rotation ?? 0;
    this.rotationAlignment = options.rotationAlignment ?? 'auto';
    this.pitchAlignment = options.pitchAlignment ?? 'auto';
    fakeRegistry.markers.push(this);
  }

  getElement(): HTMLElement {
    return this.element;
  }
  setLngLat(lngLat: LngLatLike): this {
    this.lngLat = toLngLat(lngLat);
    this.calls.push('setLngLat');
    return this;
  }
  getLngLat(): { lng: number; lat: number } {
    return this.lngLat;
  }
  /** Like MapLibre: the element goes into the map's canvas container. */
  addTo(map: Map): this {
    this.map = map;
    map.getCanvasContainer().appendChild(this.element);
    this.calls.push('addTo');
    return this;
  }
  /**
   * Like MapLibre: the element leaves the map and an open popup closes (firing its `close` event).
   */
  remove(): this {
    this.element.remove();
    this.map = null;
    this.calls.push('remove');
    this.popup?.remove();
    return this;
  }
  /** Like MapLibre: clicking the element (or Enter/Space on it) toggles the popup. */
  private readonly onElementClick = () => this.togglePopup();
  private readonly onElementKeypress = (e: KeyboardEvent) => {
    const legacy = e.charCode || e.keyCode;
    const enterOrSpace =
      e.key === 'Enter' || e.key === ' ' || e.code === 'Enter' || e.code === 'Space';
    if (enterOrSpace || legacy === 13 || legacy === 32) this.togglePopup();
  };
  setPopup(popup: Popup | null | undefined): this {
    if (this.popup) {
      this.element.removeEventListener('click', this.onElementClick);
      this.element.removeEventListener('keypress', this.onElementKeypress);
    }
    this.popup = popup ?? null;
    if (this.popup) {
      this.element.addEventListener('click', this.onElementClick);
      this.element.addEventListener('keypress', this.onElementKeypress);
    }
    this.calls.push('setPopup');
    return this;
  }
  getPopup(): Popup | null {
    return this.popup;
  }
  /** Like MapLibre: closes the open popup, or opens it at the marker on its map. */
  togglePopup(): this {
    const popup = this.popup;
    this.calls.push('togglePopup');
    if (!popup) return this;
    if (popup.isOpen()) popup.remove();
    else if (this.map) popup.setLngLat(this.lngLat).addTo(this.map);
    return this;
  }
  setOffset(offset: unknown): this {
    this.offset = toPoint(offset);
    this.calls.push('setOffset');
    return this;
  }
  getOffset(): Point {
    return this.offset;
  }
  setDraggable(value: boolean): this {
    this.draggable = value;
    this.calls.push('setDraggable');
    return this;
  }
  isDraggable(): boolean {
    return this.draggable;
  }
  setRotation(value: number): this {
    this.rotation = value;
    this.calls.push('setRotation');
    return this;
  }
  getRotation(): number {
    return this.rotation;
  }
  setRotationAlignment(value: string): this {
    this.rotationAlignment = value;
    this.calls.push('setRotationAlignment');
    return this;
  }
  getRotationAlignment(): string {
    return this.rotationAlignment;
  }
  setPitchAlignment(value: string): this {
    this.pitchAlignment = value;
    this.calls.push('setPitchAlignment');
    return this;
  }
  getPitchAlignment(): string {
    return this.pitchAlignment;
  }
}

export class Popup extends Evented {
  private lngLat = { lng: 0, lat: 0 };
  private maxWidth: string;
  private content: Node | null = null;
  private open = false;
  private offset: unknown;
  map: Map | null = null;

  constructor(readonly options: any = {}) {
    super();
    this.offset = options.offset;
    this.maxWidth = options.maxWidth ?? '240px';
    fakeRegistry.popups.push(this);
  }

  setLngLat(lngLat: LngLatLike): this {
    this.lngLat = toLngLat(lngLat);
    this.calls.push('setLngLat');
    return this;
  }
  getLngLat(): { lng: number; lat: number } {
    return this.lngLat;
  }
  setDOMContent(node: Node): this {
    this.content = node;
    this.contentElement.replaceChildren(node);
    this.calls.push('setDOMContent');
    return this;
  }
  getContent(): Node | null {
    return this.content;
  }
  setOffset(offset: unknown): this {
    this.offset = offset;
    this.calls.push('setOffset');
    return this;
  }
  getOffset(): unknown {
    return this.offset;
  }
  setMaxWidth(value: string): this {
    this.maxWidth = value;
    this.calls.push('setMaxWidth');
    return this;
  }
  getMaxWidth(): string {
    return this.maxWidth;
  }
  isOpen(): boolean {
    return this.open;
  }
  /** Like MapLibre's `.maplibregl-popup`, added to the map's container while open. */
  private readonly element = document.createElement('div');
  /** Like MapLibre's `.maplibregl-popup-content`, which holds the `setDOMContent` node. */
  private readonly contentElement = document.createElement('div');
  /** The popup's root element while it is open, like MapLibre's `getElement()`. */
  getElement(): HTMLElement | undefined {
    return this.open ? this.element : undefined;
  }
  private readonly onMapRemove = () => this.remove();
  /**
   * Like MapLibre: a map click closes the popup unless it was created with `closeOnClick: false`
   * (an absent option means `true`, MapLibre's default).
   */
  private readonly closeOnClick = (): boolean => this.options.closeOnClick !== false;
  private readonly onMapClick = () => this.remove();
  addTo(map: Map): this {
    // Like MapLibre: an open popup closes first (leaving its map), then opens on `map`.
    if (this.map) this.remove();
    this.map = map;
    this.calls.push('addTo');
    map.on('remove', this.onMapRemove);
    if (this.closeOnClick()) map.on('click', this.onMapClick);
    this.element.className = 'maplibregl-popup';
    this.contentElement.className = 'maplibregl-popup-content';
    this.element.appendChild(this.contentElement);
    map.getContainer().appendChild(this.element);
    if (!this.open) {
      this.open = true;
      this.fire('open');
    }
    return this;
  }
  remove(): this {
    this.calls.push('remove');
    this.element.remove();
    this.map?.off('remove', this.onMapRemove);
    if (this.closeOnClick()) this.map?.off('click', this.onMapClick);
    this.map = null;
    if (this.open) {
      this.open = false;
      this.fire('close');
    }
    return this;
  }
}

export function getWorkerUrl(): string {
  return fakeRegistry.workerUrl;
}

export function setWorkerUrl(value: string): void {
  fakeRegistry.workerUrl = value;
}

/** Custom protocols registered with `addProtocol` (for example `pmtiles`). */
export function addProtocol(name: string, loadFn: (...args: unknown[]) => unknown): void {
  fakeRegistry.protocols[name] = loadFn;
}

export function removeProtocol(name: string): void {
  delete fakeRegistry.protocols[name];
}

export type FakeMap = Map;
export type FakeMarker = Marker;
export type FakePopup = Popup;

export const fakeRegistry: {
  maps: FakeMap[];
  markers: FakeMarker[];
  popups: FakePopup[];
  /** Protocols registered with `addProtocol`, by name. */
  protocols: Record<string, (...args: unknown[]) => unknown>;
  /** When set, the next `new Map()` throws it (then the field is cleared). */
  constructError: Error | null;
  /** MapLibre's global worker URL (`''` until `setWorkerUrl` is called, like the real one). */
  workerUrl: string;
  /** When set, `map.loadImage` calls wait in `imageLoads` until a spec settles them. */
  deferImageLoads: boolean;
  /** The `loadImage` calls held by `deferImageLoads`, in call order. */
  imageLoads: { url: string; resolve(): void; reject(error: Error): void }[];
  reset(): void;
} = {
  maps: [],
  markers: [],
  popups: [],
  protocols: {},
  constructError: null,
  workerUrl: '',
  deferImageLoads: false,
  imageLoads: [],
  reset() {
    this.constructError = null;
    this.workerUrl = '';
    this.deferImageLoads = false;
    this.imageLoads = [];
    this.maps.length = 0;
    this.markers.length = 0;
    this.popups.length = 0;
    this.protocols = {};
  },
};
