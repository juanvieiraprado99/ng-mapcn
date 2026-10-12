import { Component } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';

import { MapComponent } from '../lib/components/map/map.component';
import { MapContextService } from '../lib/services/map-context.service';
import { type FakeMap, fakeRegistry } from './maplibre-fake';

@Component({ selector: 'ng-test-host', template: '' })
class TestHostComponent {}

const elementSize = { width: 0, height: 0 };

/**
 * jsdom has no layout, so `MapComponent` would poll forever for a non-zero
 * container size. The stubbed getters read this live value, so it can also be
 * changed after rendering (e.g. to resolve the zero-size retry).
 */
export function setMapSize(size: { width: number; height: number } | null): void {
  elementSize.width = size?.width ?? 0;
  elementSize.height = size?.height ?? 0;
}

export interface RenderMapOptions {
  imports?: unknown[];
  providers?: unknown[];
  /** Assigned onto the host component instance before the first change detection. */
  hostProps?: Record<string, unknown>;
  /** Container size; `null` means zero size. Defaults to 400x300. */
  size?: { width: number; height: number } | null;
}

/**
 * Renders `template` inside a standalone host that imports `MapComponent`.
 * Spies on `HTMLElement.prototype` are installed here: call `vi.restoreAllMocks()`
 * in `afterEach`.
 */
export async function renderMap(
  template: string,
  opts: RenderMapOptions = {},
): Promise<{ fixture: ComponentFixture<any>; map: FakeMap | undefined; ctx: MapContextService }> {
  setMapSize(opts.size === undefined ? { width: 400, height: 300 } : opts.size);
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(() => elementSize.width);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(
    () => elementSize.height,
  );

  TestBed.configureTestingModule({
    imports: [TestHostComponent],
    providers: (opts.providers ?? []) as any[],
  });
  TestBed.overrideComponent(TestHostComponent, {
    set: { template, imports: [MapComponent, ...((opts.imports ?? []) as any[])] },
  });

  const fixture = TestBed.createComponent(TestHostComponent);
  Object.assign(fixture.componentInstance as object, opts.hostProps ?? {});
  fixture.detectChanges();
  await fixture.whenStable();
  // The map is created after the first pass; projected children are attached on the next one.
  fixture.detectChanges();
  await fixture.whenStable();

  const ctx = fixture.debugElement
    .query(By.directive(MapComponent))
    .injector.get(MapContextService);
  return { fixture, map: fakeRegistry.maps[0], ctx };
}

/** Simulates MapLibre finishing the style load: `load`, `styledata`, then the 100 ms debounce. */
export function loadMap(map: FakeMap): void {
  if (!vi.isFakeTimers()) {
    throw new Error('loadMap() requires fake timers: call vi.useFakeTimers() first.');
  }
  map.fire('load');
  map.fire('styledata');
  vi.advanceTimersByTime(100);
}

/** Assigns host inputs and runs change detection (effects run during it). */
export function update(fixture: { componentInstance: any; detectChanges(): void }, props: object) {
  Object.assign(fixture.componentInstance, props);
  fixture.detectChanges();
}

/** `loadMap()` followed by change detection so the layer components' effects run. */
export function loadAndSettle(fixture: { detectChanges(): void }, map: FakeMap): void {
  loadMap(map);
  fixture.detectChanges();
}

/**
 * Simulates the style requested by `setStyle` arriving: `style.load` + `styledata` (see
 * `finishStyleLoad`), the 100 ms debounce, then effects.
 */
export function reloadStyle(fixture: { detectChanges(): void }, map: FakeMap): void {
  if (map.hasPendingStyle()) map.finishStyleLoad();
  else map.fire('styledata');
  vi.advanceTimersByTime(100);
  fixture.detectChanges();
}

/** The source/layer add/remove operations recorded on the map, in order. */
export function structuralCalls(map: FakeMap): string[] {
  return map.calls.filter((c) => /^(addSource|addLayer|removeLayer|removeSource):/.test(c));
}
