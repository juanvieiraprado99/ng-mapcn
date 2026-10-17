import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  NgZone,
  output,
  untracked,
} from '@angular/core';
import { outputFromObservable } from '@angular/core/rxjs-interop';
import { Marker, type MarkerOptions, Point, type PointLike } from 'maplibre-gl';
import { Subject } from 'rxjs';

import { injectMapLabels, type MapLabels } from '../../providers/map-labels.provider';
import { MapContextService } from '../../services/map-context.service';
import { invalidPositionError, isValidLngLat, positionReady } from '../../utils/position';
import { MarkerContextService } from './marker-context.service';

/** Web Mercator latitude limit. */
const MAX_LAT = 85.05;

function wrapLng(lng: number): number {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

/** Arrow key -> screen-space direction of a keyboard drag step. */
const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

@Component({
  selector: 'ng-map-marker',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MarkerContextService],
})
export class MapMarkerComponent {
  readonly longitude = input.required<number>();
  readonly latitude = input.required<number>();
  readonly draggable = input(false);
  readonly offset = input<PointLike>();
  readonly rotation = input(0);
  /** Applied at creation only — MapLibre's Marker has no anchor setter (mapcn parity). */
  readonly anchor = input<MarkerOptions['anchor']>(undefined);
  readonly rotationAlignment = input<MarkerOptions['rotationAlignment']>('auto');
  readonly pitchAlignment = input<MarkerOptions['pitchAlignment']>('auto');

  /**
   * Accessible name of the marker, applied as `aria-label` on the marker element (a static marker
   * gets `role="img"`; markers whose content has its own button/link are left to that control).
   * Interactive markers whose content has no text (the default dot, an icon) fall back to
   * "Map marker" (`labels.marker`).
   */
  readonly ariaLabel = input<string>();
  /** Label overrides (`marker`), merged over `provideMapLabels` and the English defaults. */
  readonly labels = input<Partial<MapLabels>>();
  /** Keyboard drag step in px for arrow keys on a focused draggable marker (Shift uses `keyboardStepLarge`). */
  readonly keyboardStep = input(10);
  readonly keyboardStepLarge = input(50);

  private readonly click$ = new Subject<MouseEvent>();
  /**
   * Click (or Enter/Space on a focused marker). Backed by a Subject so the marker only becomes
   * a keyboard tab stop (`role="button"`, `tabindex="0"`) when someone listens.
   */
  readonly markerClick = outputFromObservable(this.click$);
  readonly markerMouseEnter = output<MouseEvent>();
  readonly markerMouseLeave = output<MouseEvent>();
  readonly dragStart = output<{ lng: number; lat: number }>();
  private readonly drag$ = new Subject<{ lng: number; lat: number }>();
  /** Emits on every frame of a drag; backed by a Subject so idle drags skip the zone (`observed`). */
  readonly drag = outputFromObservable(this.drag$);
  readonly dragEnd = output<{ lng: number; lat: number }>();

  private readonly mapCtx = inject(MapContextService);
  private readonly markerCtx = inject(MarkerContextService);
  private readonly zone = inject(NgZone);
  private readonly l = injectMapLabels(this.labels);
  /** The marker is created once the inputs first form a valid position (async data). */
  private readonly ready = positionReady(this.longitude, this.latitude);

  constructor() {
    // Contributes to the map's declarative fit-to-bounds (`<ng-map [fitBounds]>`).
    inject(DestroyRef).onDestroy(
      this.mapCtx.registerBounds(() => {
        const lng = this.longitude();
        const lat = this.latitude();
        // An invalid position would turn the union of every child's bounds into NaN.
        return isValidLngLat(lng, lat) ? [lng, lat, lng, lat] : null;
      }),
    );

    // Create marker when the map becomes available
    effect((onCleanup) => {
      const map = this.mapCtx.map();
      if (!map || !this.ready()) return;

      // Read initial values without registering them as dependencies
      // so that position/rotation changes go through the update effect below
      const lng = untracked(() => this.longitude());
      const lat = untracked(() => this.latitude());
      const draggable = untracked(() => this.draggable());
      const offset = untracked(() => this.offset());
      const rotation = untracked(() => this.rotation());
      const anchor = untracked(() => this.anchor());
      const rotationAlignment = untracked(() => this.rotationAlignment());
      const pitchAlignment = untracked(() => this.pitchAlignment());

      const el = document.createElement('div');
      let keydownCleanup: () => void = () => undefined;
      // Creation and listener registration outside the zone; events re-enter via zone.run —
      // `drag` (per-frame) only when someone listens.
      const marker = this.zone.runOutsideAngular(() => {
        const m = new Marker({
          element: el,
          draggable,
          offset,
          rotation,
          ...(anchor ? { anchor } : {}),
          rotationAlignment,
          pitchAlignment,
        })
          .setLngLat([lng, lat])
          .addTo(map);

        el.addEventListener('click', (e) => this.zone.run(() => this.click$.next(e as MouseEvent)));
        el.addEventListener('mouseenter', (e) =>
          this.zone.run(() => this.markerMouseEnter.emit(e as MouseEvent)),
        );
        el.addEventListener('mouseleave', (e) =>
          this.zone.run(() => this.markerMouseLeave.emit(e as MouseEvent)),
        );

        const emitDragStart = () => {
          const ll = m.getLngLat();
          this.zone.run(() => this.dragStart.emit({ lng: ll.lng, lat: ll.lat }));
        };
        const emitDrag = () => {
          if (!this.drag$.observed) return;
          const ll = m.getLngLat();
          this.zone.run(() => this.drag$.next({ lng: ll.lng, lat: ll.lat }));
        };
        const emitDragEnd = () => {
          const ll = m.getLngLat();
          this.zone.run(() => this.dragEnd.emit({ lng: ll.lng, lat: ll.lat }));
        };
        m.on('dragstart', emitDragStart);
        m.on('drag', emitDrag);
        m.on('dragend', emitDragEnd);

        // Keyboard alternative (only when the marker element itself has focus, so inner
        // controls keep their own keys): Enter/Space click, arrow keys drag.
        const activate = () => {
          if (!this.click$.observed) return;
          if (this.markerCtx.hasPopup()) {
            // MapLibre toggles the popup on these keys itself; a DOM click would reach the map
            // and toggle it a second time, so emit the output directly.
            this.zone.run(() => this.click$.next(new MouseEvent('click')));
          } else {
            el.click();
          }
        };
        let spaceDown = false;
        const onKeydown = (e: KeyboardEvent) => {
          if (e.target !== el || e.altKey || e.ctrlKey || e.metaKey) return;
          const key = e.key;
          if (key === 'Enter') {
            if (e.repeat || !this.click$.observed) return;
            if (!this.markerCtx.hasPopup()) e.preventDefault();
            activate();
            return;
          }
          if (key === ' ' || key === 'Spacebar') {
            if (!this.click$.observed) return;
            // Like a native button: activates on keyup. Stop the page scroll (not with a popup:
            // cancelling keydown would also cancel MapLibre's keypress toggle).
            if (!this.markerCtx.hasPopup()) e.preventDefault();
            spaceDown = true;
            return;
          }
          const dir = ARROWS[key];
          if (!dir || !m.isDraggable()) return;
          e.preventDefault();
          // The map container would pan on arrow keys.
          e.stopPropagation();
          const step = e.shiftKey ? this.keyboardStepLarge() : this.keyboardStep();
          const p = map.project(m.getLngLat());
          emitDragStart();
          const next = map.unproject([p.x + dir[0] * step, p.y + dir[1] * step]);
          m.setLngLat([wrapLng(next.lng), Math.max(-MAX_LAT, Math.min(MAX_LAT, next.lat))]);
          emitDrag();
          emitDragEnd();
        };
        const onKeyup = (e: KeyboardEvent) => {
          if (e.target !== el || (e.key !== ' ' && e.key !== 'Spacebar') || !spaceDown) return;
          spaceDown = false;
          activate();
        };
        const onBlur = () => (spaceDown = false);
        el.addEventListener('keydown', onKeydown);
        el.addEventListener('keyup', onKeyup);
        el.addEventListener('blur', onBlur);
        keydownCleanup = () => {
          el.removeEventListener('keydown', onKeydown);
          el.removeEventListener('keyup', onKeyup);
          el.removeEventListener('blur', onBlur);
        };

        return m;
      });

      this.markerCtx.setMarker(marker);

      onCleanup(() => {
        keydownCleanup();
        marker.remove();
        this.markerCtx.reset();
      });
    });

    // Accessibility: role / tabindex / aria-label follow what the marker does. Attributes the app
    // set itself are never overwritten (nor removed on teardown).
    effect((onCleanup) => {
      const marker = this.markerCtx.marker();
      if (!marker) return;
      const el = marker.getElement();
      const clickable = this.click$.observed;
      const kind = this.markerCtx.contentKind();
      const nested = kind === 'interactive'; // its own control is the keyboard target
      const interactive = clickable || this.markerCtx.hasPopup() || this.draggable();
      const focusable = interactive || this.markerCtx.hasTooltip();
      const explicit = this.ariaLabel();
      const label =
        explicit ??
        (focusable && (kind === 'default' || kind === 'unnamed') ? this.l().marker : undefined);

      const applied: string[] = [];
      const setIfAbsent = (name: string, value: string) => {
        if (el.hasAttribute(name)) return;
        el.setAttribute(name, value);
        applied.push(name);
      };
      // Nested interactive content keeps the role to itself (no nested-interactive); the marker
      // element stays a plain focus target for drag / tooltip only.
      if (interactive && !nested) setIfAbsent('role', 'button');
      // `img` requires a name; a focusable marker with custom content keeps no role.
      else if (label && !nested) setIfAbsent('role', 'img');
      // MapLibre already sets tabindex for popup markers; never add a stop for static markers.
      if (focusable && !(nested && !this.draggable() && !this.markerCtx.hasTooltip())) {
        setIfAbsent('tabindex', '0');
      }
      if (label && el.hasAttribute('role')) setIfAbsent('aria-label', label);

      onCleanup(() => applied.forEach((name) => el.removeAttribute(name)));
    });

    // Reconcile prop changes without recreating the marker (field-by-field diff)
    effect(() => {
      const lng = this.longitude();
      const lat = this.latitude();
      const draggable = this.draggable();
      const rotation = this.rotation() ?? 0;
      const rotationAlignment = this.rotationAlignment() ?? 'auto';
      const pitchAlignment = this.pitchAlignment() ?? 'auto';
      const off = this.offset();
      const marker = this.markerCtx.marker();
      if (!marker) return;

      const current = marker.getLngLat();
      if (current.lng !== lng || current.lat !== lat) {
        // setLngLat throws on NaN/undefined; an exception escaping an effect aborts change detection.
        if (isValidLngLat(lng, lat)) marker.setLngLat([lng, lat]);
        else this.mapCtx.reportError(invalidPositionError('ng-map-marker', lng, lat));
      }
      if (marker.isDraggable() !== draggable) marker.setDraggable(draggable);
      if (marker.getRotation() !== rotation) marker.setRotation(rotation);
      if (marker.getRotationAlignment() !== rotationAlignment) {
        marker.setRotationAlignment(rotationAlignment);
      }
      if (marker.getPitchAlignment() !== pitchAlignment) {
        marker.setPitchAlignment(pitchAlignment);
      }
      // mapcn parity: undefined resets to [0, 0]; diff x/y to avoid no-op sets
      const targetOffset = Point.convert(off ?? [0, 0]);
      const currentOffset = marker.getOffset();
      if (currentOffset.x !== targetOffset.x || currentOffset.y !== targetOffset.y) {
        marker.setOffset(targetOffset);
      }
    });
  }

  /** Escape hatch — direct access to the underlying MapLibre Marker */
  getMarker(): Marker | null {
    return this.markerCtx.marker();
  }
}
