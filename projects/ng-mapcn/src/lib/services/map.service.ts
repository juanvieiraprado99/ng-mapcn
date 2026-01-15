import { Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { LngLatLike, MapEventType, Map as MapLibreMap } from 'maplibre-gl';
import { Observable, Subject } from 'rxjs';

/**
 * Service for managing map instances and providing utilities
 */
@Injectable({
  providedIn: 'root',
})
export class MapService {
  private maps = new globalThis.Map<string, MapLibreMap>();
  private mapEvents = new globalThis.Map<string, Subject<any>>();
  private mapSignals = new globalThis.Map<string, WritableSignal<MapLibreMap | undefined>>();

  /**
   * Register a map instance
   */
  registerMap(id: string, map: MapLibreMap): void {
    this.maps.set(id, map);

    // Create or update signal for this map
    let mapSignal = this.mapSignals.get(id);
    if (mapSignal) {
      // Update existing signal
      mapSignal.set(map);
    } else {
      // Create new signal
      mapSignal = signal<MapLibreMap | undefined>(map);
      this.mapSignals.set(id, mapSignal);
    }
  }

  /**
   * Get a signal for a map instance by ID
   * This allows reactive components to observe when a map becomes available
   */
  getMapSignal(id: string): Signal<MapLibreMap | undefined> {
    let mapSignal = this.mapSignals.get(id);
    if (!mapSignal) {
      // Create a signal with undefined if map doesn't exist yet
      mapSignal = signal<MapLibreMap | undefined>(undefined);
      this.mapSignals.set(id, mapSignal);
    }
    return mapSignal as Signal<MapLibreMap | undefined>;
  }

  /**
   * Unregister a map instance
   */
  unregisterMap(id: string): void {
    const map = this.maps.get(id);
    if (map) {
      try {
        if (map && typeof map.remove === 'function') {
          map.remove();
        }
      } catch (error) {
        // Map may have already been removed, ignore error
        // Error removing map
      }
      this.maps.delete(id);
      this.mapEvents.delete(id);

      // Update signal to undefined when map is removed
      const mapSignal = this.mapSignals.get(id);
      if (mapSignal) {
        mapSignal.set(undefined);
        this.mapSignals.delete(id);
      }
    }
  }

  /**
   * Get a map instance by ID
   */
  getMap(id: string): MapLibreMap | undefined {
    return this.maps.get(id);
  }

  /**
   * Get all registered maps
   */
  getAllMaps(): globalThis.Map<string, MapLibreMap> {
    return this.maps;
  }

  /**
   * Create map event observable
   */
  createMapEventObservable<T extends keyof MapEventType>(
    mapId: string,
    eventType: T
  ): Observable<MapEventType[T]> {
    const map = this.maps.get(mapId);
    if (!map) {
      throw new Error(`Map with id "${mapId}" not found`);
    }

    const eventKey = `${mapId}-${eventType}`;
    let subject = this.mapEvents.get(eventKey) as Subject<MapEventType[T]> | undefined;

    if (!subject) {
      subject = new Subject<MapEventType[T]>();
      this.mapEvents.set(eventKey, subject);

      map.on(eventType, (event: any) => {
        subject!.next(event);
      });
    }

    return subject.asObservable();
  }

  /**
   * Fly to a location
   */
  flyTo(mapId: string, center: LngLatLike, zoom?: number, duration?: number): void {
    const map = this.maps.get(mapId);
    if (!map) {
      return;
    }

    map.flyTo({
      center,
      zoom,
      duration: duration ?? 1000,
    });
  }

  /**
   * Ease to a location
   */
  easeTo(mapId: string, center: LngLatLike, zoom?: number, duration?: number): void {
    const map = this.maps.get(mapId);
    if (!map) {
      return;
    }

    map.easeTo({
      center,
      zoom,
      duration: duration ?? 1000,
    });
  }

  /**
   * Jump to a location
   */
  jumpTo(mapId: string, center: LngLatLike, zoom?: number): void {
    const map = this.maps.get(mapId);
    if (!map) {
      return;
    }

    map.jumpTo({
      center,
      zoom,
    });
  }

  /**
   * Fit bounds
   */
  fitBounds(
    mapId: string,
    bounds: [[number, number], [number, number]],
    options?: {
      padding?: number | { top: number; bottom: number; left: number; right: number };
      maxZoom?: number;
      duration?: number;
    }
  ): void {
    const map = this.maps.get(mapId);
    if (!map) {
      return;
    }

    map.fitBounds(bounds, options);
  }

  /**
   * Get map center
   */
  getCenter(mapId: string): LngLatLike | undefined {
    const map = this.maps.get(mapId);
    return map?.getCenter();
  }

  /**
   * Get map zoom
   */
  getZoom(mapId: string): number | undefined {
    const map = this.maps.get(mapId);
    return map?.getZoom();
  }

  /**
   * Set map center
   */
  setCenter(mapId: string, center: LngLatLike): void {
    const map = this.maps.get(mapId);
    if (map) {
      map.setCenter(center);
    }
  }

  /**
   * Set map zoom
   */
  setZoom(mapId: string, zoom: number): void {
    const map = this.maps.get(mapId);
    if (map) {
      map.setZoom(zoom);
    }
  }

  /**
   * Zoom in
   */
  zoomIn(mapId: string, options?: { duration?: number }): void {
    const map = this.maps.get(mapId);
    if (map) {
      map.zoomIn(options);
    }
  }

  /**
   * Zoom out
   */
  zoomOut(mapId: string, options?: { duration?: number }): void {
    const map = this.maps.get(mapId);
    if (map) {
      map.zoomOut(options);
    }
  }

  /**
   * Reset north
   */
  resetNorth(mapId: string, options?: { duration?: number }): void {
    const map = this.maps.get(mapId);
    if (map) {
      map.resetNorth(options);
    }
  }

  /**
   * Reset north pitch
   */
  resetNorthPitch(mapId: string, options?: { duration?: number }): void {
    const map = this.maps.get(mapId);
    if (map) {
      map.resetNorthPitch(options);
    }
  }
}
