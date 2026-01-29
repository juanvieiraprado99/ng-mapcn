import { Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { LngLatLike, MapEventType, Map as MapLibreMap } from 'maplibre-gl';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MapService {
  private maps = new globalThis.Map<string, MapLibreMap>();
  private mapEvents = new globalThis.Map<string, Subject<any>>();
  private mapSignals = new globalThis.Map<string, WritableSignal<MapLibreMap | undefined>>();

  registerMap(id: string, map: MapLibreMap): void {
    this.maps.set(id, map);

    let mapSignal = this.mapSignals.get(id);
    if (mapSignal) {
      mapSignal.set(map);
    } else {
      mapSignal = signal<MapLibreMap | undefined>(map);
      this.mapSignals.set(id, mapSignal);
    }
  }

  getMapSignal(id: string): Signal<MapLibreMap | undefined> {
    let mapSignal = this.mapSignals.get(id);
    if (!mapSignal) {
      mapSignal = signal<MapLibreMap | undefined>(undefined);
      this.mapSignals.set(id, mapSignal);
    }
    return mapSignal as Signal<MapLibreMap | undefined>;
  }

  unregisterMap(id: string): void {
    const map = this.maps.get(id);
    if (map) {
      try {
        if (map && typeof map.remove === 'function') {
          map.remove();
        }
      } catch {
        // Map may have already been removed
      }
      this.maps.delete(id);
      this.mapEvents.delete(id);

      const mapSignal = this.mapSignals.get(id);
      if (mapSignal) {
        mapSignal.set(undefined);
        this.mapSignals.delete(id);
      }
    }
  }

  getMap(id: string): MapLibreMap | undefined {
    return this.maps.get(id);
  }

  getAllMaps(): globalThis.Map<string, MapLibreMap> {
    return this.maps;
  }

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

  getCenter(mapId: string): LngLatLike | undefined {
    const map = this.maps.get(mapId);
    return map?.getCenter();
  }

  getZoom(mapId: string): number | undefined {
    const map = this.maps.get(mapId);
    return map?.getZoom();
  }

  setCenter(mapId: string, center: LngLatLike): void {
    const map = this.maps.get(mapId);
    if (map) {
      map.setCenter(center);
    }
  }

  setZoom(mapId: string, zoom: number): void {
    const map = this.maps.get(mapId);
    if (map) {
      map.setZoom(zoom);
    }
  }

  zoomIn(mapId: string, options?: { duration?: number }): void {
    const map = this.maps.get(mapId);
    if (map) {
      map.zoomIn(options);
    }
  }

  zoomOut(mapId: string, options?: { duration?: number }): void {
    const map = this.maps.get(mapId);
    if (map) {
      map.zoomOut(options);
    }
  }

  resetNorth(mapId: string, options?: { duration?: number }): void {
    const map = this.maps.get(mapId);
    if (map) {
      map.resetNorth(options);
    }
  }

  resetNorthPitch(mapId: string, options?: { duration?: number }): void {
    const map = this.maps.get(mapId);
    if (map) {
      map.resetNorthPitch(options);
    }
  }
}
