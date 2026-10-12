/**
 * Test double for `maplibre-gl`, installed globally by `setup.ts`
 * (`vi.mock('maplibre-gl', ...)`). It records every call, lets specs fire
 * events, and is deliberately as strict as MapLibre where it matters for the
 * library invariants (duplicate layers, removing a source that is still in use).
 */
import { vi } from 'vitest';

type Handler = (event: any) => void;

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
  if (Array.isArray(value)) return { lng: value[0], lat: value[1] };
  if ('lng' in value) return { lng: value.lng, lat: value.lat };
  return { lng: value.lon, lat: value.lat };
}

function toPoint(value: unknown): Point {
  if (value instanceof Point) return value;
  if (Array.isArray(value)) return new Point(value[0], value[1]);
  return new Point(0, 0);
}

export class Map extends Evented {
  private sources: Record<string, any> = {};
  private layers: any[] = [];
  private moving = false;
  private camera = { lng: 0, lat: 0, zoom: 0, bearing: 0, pitch: 0 };
  private readonly canvas = document.createElement('canvas');
  private readonly container = Object.assign(document.createElement('div'), {
    requestFullscreen: vi.fn(() => Promise.resolve()),
  });
  removed = false;

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
    fakeRegistry.maps.push(this);
  }

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

  getContainer(): HTMLElement & { requestFullscreen: ReturnType<typeof vi.fn> } {
    return this.container;
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

  jumpTo = vi.fn((opts: any = {}) => {
    this.calls.push('jumpTo');
    this.applyCamera(opts);
    this.fire('move');
    return this;
  });
  flyTo = vi.fn((opts: any = {}) => {
    this.calls.push('flyTo');
    this.applyCamera(opts);
    return this;
  });
  easeTo = vi.fn((opts: any = {}) => {
    this.calls.push('easeTo');
    this.applyCamera(opts);
    return this;
  });
  zoomTo = vi.fn((zoom: number) => {
    this.calls.push('zoomTo');
    this.camera.zoom = zoom;
    return this;
  });
  resetNorthPitch = vi.fn(() => {
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
  setStyle = vi.fn((style: unknown, _options?: unknown) => {
    this.calls.push('setStyle');
    this.options.style = style;
    this.styleLoading = true;
    return this;
  });

  /** The requested style arrives: every source and layer is dropped, then `style.load` + `styledata`. */
  finishStyleLoad(): void {
    this.calls.push('styleLoaded');
    this.sources = {};
    this.layers = [];
    this.styleLoading = false;
    this.fire('style.load');
    this.fire('styledata');
  }
  setProjection = vi.fn((_projection: unknown) => {
    this.calls.push('setProjection');
    return this;
  });
  remove = vi.fn(() => {
    this.calls.push('remove');
    this.removed = true;
  });

  addSource(id: string, source: any): this {
    if (this.sources[id]) throw new Error(`Source "${id}" already exists.`);
    this.calls.push(`addSource:${id}`);
    this.sources[id] = {
      ...source,
      id,
      setData: vi.fn(),
      getClusterExpansionZoom: vi.fn((_clusterId: number) => Promise.resolve(0)),
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

  setPaintProperty = vi.fn((layerId: string, name: string, value: unknown) => {
    this.calls.push(`setPaintProperty:${layerId}:${name}`);
    const layer = this.getLayer(layerId);
    if (layer) layer.paint[name] = value;
    return this;
  });
  setLayoutProperty = vi.fn((layerId: string, name: string, value: unknown) => {
    this.calls.push(`setLayoutProperty:${layerId}:${name}`);
    const layer = this.getLayer(layerId);
    if (layer) layer.layout[name] = value;
    return this;
  });
  setFeatureState = vi.fn((_feature: unknown, _state: unknown) => {
    this.calls.push('setFeatureState');
    return this;
  });
  queryRenderedFeatures = vi.fn((..._args: unknown[]): unknown[] => []);
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
  addTo(map: Map): this {
    this.map = map;
    this.calls.push('addTo');
    return this;
  }
  remove(): this {
    this.map = null;
    this.calls.push('remove');
    return this;
  }
  setPopup(popup: Popup | null | undefined): this {
    this.popup = popup ?? null;
    this.calls.push('setPopup');
    return this;
  }
  getPopup(): Popup | null {
    return this.popup;
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
  addTo(map: Map): this {
    this.map = map;
    this.calls.push('addTo');
    if (!this.open) {
      this.open = true;
      this.fire('open');
    }
    return this;
  }
  remove(): this {
    this.calls.push('remove');
    this.map = null;
    if (this.open) {
      this.open = false;
      this.fire('close');
    }
    return this;
  }
}

export type FakeMap = Map;
export type FakeMarker = Marker;
export type FakePopup = Popup;

export const fakeRegistry: {
  maps: FakeMap[];
  markers: FakeMarker[];
  popups: FakePopup[];
  /** When set, the next `new Map()` throws it (then the field is cleared). */
  constructError: Error | null;
  reset(): void;
} = {
  maps: [],
  markers: [],
  popups: [],
  constructError: null,
  reset() {
    this.constructError = null;
    this.maps.length = 0;
    this.markers.length = 0;
    this.popups.length = 0;
  },
};
