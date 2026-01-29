import {
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { GeoJSONSource, Map as MapLibreMap, Marker } from 'maplibre-gl';
import { RouteConfig } from '../../models';
import { MapService } from '../../services/map.service';
import { MarkerService } from '../../services/marker.service';

@Component({
  selector: 'ng-route',
  standalone: true,
  imports: [],
  template: '',
  styles: [],
})
export class RouteComponent {
  config = input.required<RouteConfig>();
  mapId = input<string>('default-map');

  routeClick = output<any>();

  private mapService = inject(MapService);
  private markerService = inject(MarkerService);
  private destroyRef = inject(DestroyRef);
  private sourceId: string = '';
  private layerId: string = '';
  private routeAdded = false;
  private mapReadyHandler: (() => void) | null = null;
  private styleDataHandler: (() => void) | null = null;
  private stopMarkers: Marker[] = [];
  private retryCount = 0;
  private maxRetries = 5;
  private retryTimeout: any = null;
  private periodicCheckTimeout: any = null;
  private integrityCheckTimeout: any = null;
  private isAddingRoute = false; // Lock to prevent concurrent route additions
  private previousConfig: RouteConfig | undefined = undefined;

  constructor() {
    effect(() => {
      const config = this.config();
      const mapId = this.mapId();
      const mapSignal = this.mapService.getMapSignal(mapId);
      const map = mapSignal();

      if (!config) {
        return;
      }

      const newSourceId = `route-source-${config.id || Date.now()}`;
      const newLayerId = `route-layer-${config.id || Date.now()}`;

      if (!this.sourceId || !this.layerId) {
        this.sourceId = newSourceId;
        this.layerId = newLayerId;
      }

      if (this.routeAdded && (newSourceId !== this.sourceId || newLayerId !== this.layerId)) {
        if (map) {
          this.removeRoute();
          this.sourceId = newSourceId;
          this.layerId = newLayerId;
          this.retryCount = 0;
          this.attemptAddRoute(map);
        }
      } else if (this.routeAdded && this.previousConfig && map) {
        // Route is already added and IDs haven't changed - update properties
        const propertiesChanged =
          this.previousConfig.color !== config.color ||
          this.previousConfig.width !== config.width ||
          this.previousConfig.opacity !== config.opacity ||
          this.previousConfig.dashed !== config.dashed ||
          JSON.stringify(this.previousConfig.dashArray) !== JSON.stringify(config.dashArray) ||
          this.previousConfig.lineCap !== config.lineCap ||
          this.previousConfig.lineJoin !== config.lineJoin ||
          JSON.stringify(this.previousConfig.coordinates) !== JSON.stringify(config.coordinates);

        if (this.previousConfig !== config || propertiesChanged) {
          if (this.isMapFullyReady(map)) {
            setTimeout(() => {
              if (map && this.routeAdded && map.getLayer(this.layerId)) {
                this.updateRouteProperties(map);
              }
            }, 0);
          }
        }
      } else if (map && config && !this.routeAdded && !this.mapReadyHandler) {
        setTimeout(() => {
          if (!this.routeAdded && !this.mapReadyHandler) {
            this.attemptAddRoute(map);
          }
        }, 50);
      } else if (!map && config) {
        this.setupPeriodicCheck();
      }

      this.previousConfig = config;
    });

    // Cleanup on destroy
    this.destroyRef.onDestroy(() => {
      this.cleanup();
    });
  }

  private cleanup(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    if (this.periodicCheckTimeout) {
      clearTimeout(this.periodicCheckTimeout);
      this.periodicCheckTimeout = null;
    }
    if (this.integrityCheckTimeout) {
      clearTimeout(this.integrityCheckTimeout);
      this.integrityCheckTimeout = null;
    }

    if (this.mapReadyHandler) {
      const mapId = this.mapId();
      const map = this.mapService.getMap(mapId);
      if (map && this.mapReadyHandler) {
        try {
          map.off('load', this.mapReadyHandler);
          map.off('styledata', this.mapReadyHandler);
        } catch {
        }
      }
      this.mapReadyHandler = null;
    }

    if (this.styleDataHandler) {
      const mapId = this.mapId();
      const map = this.mapService.getMap(mapId);
      if (map && this.styleDataHandler) {
        try {
          map.off('styledata', this.styleDataHandler);
        } catch {
        }
      }
      this.styleDataHandler = null;
    }

    this.removeRoute();
  }

  /**
   * Set up listener for style changes to re-add route if it was removed
   */
  private setupStyleChangeListener(map: MapLibreMap): void {
    if (this.styleDataHandler) {
      return; // Already set up
    }

    let styleChangeDebounceTimeout: any = null;
    this.styleDataHandler = () => {
      if (styleChangeDebounceTimeout) {
        clearTimeout(styleChangeDebounceTimeout);
      }

      styleChangeDebounceTimeout = setTimeout(() => {
        const config = this.config();
        if (this.routeAdded && config && !this.isAddingRoute) {
          const sourceExists = map.getSource(this.sourceId);
          const layerExists = map.getLayer(this.layerId);

          if (!sourceExists || !layerExists) {
            this.routeAdded = false;
            map.once('load', () => {
              const config = this.config();
              if (config && !this.routeAdded && !this.isAddingRoute) {
                this.attemptAddRoute(map);
              }
            });
          }
        }
        styleChangeDebounceTimeout = null;
      }, 100);
    };

    map.on('styledata', this.styleDataHandler);
  }

  /**
   * Check if map is fully ready (loaded + style loaded + small delay for resources)
   */
  private isMapFullyReady(map: MapLibreMap): boolean {
    return Boolean(map.loaded() && map.isStyleLoaded());
  }

  private setupPeriodicCheck(): void {
    if (this.periodicCheckTimeout) {
      clearTimeout(this.periodicCheckTimeout);
      this.periodicCheckTimeout = null;
    }

    if (this.routeAdded) {
      return;
    }

    this.periodicCheckTimeout = setTimeout(() => {
      const config = this.config();
      const mapId = this.mapId();
      if (!this.routeAdded && config) {
        const map = this.mapService.getMap(mapId);
        if (map) {
          if (this.isMapFullyReady(map)) {
            if (this.mapReadyHandler) {
              try {
                map.off('styledata', this.mapReadyHandler);
                map.off('load', this.mapReadyHandler);
              } catch (e) {
                // Ignore errors
              }
              this.mapReadyHandler = null;
            }
            this.attemptAddRoute(map);
          } else {
            this.setupPeriodicCheck();
          }
        } else {
          this.setupPeriodicCheck();
        }
      }
      this.periodicCheckTimeout = null;
    }, 200);
  }

  /**
   * Retry adding route with exponential backoff
   */
  private retryAddRoute(map: MapLibreMap): void {
    if (this.retryCount >= this.maxRetries) {
      return;
    }

    this.retryCount++;
    const delay = Math.min(100 * Math.pow(2, this.retryCount - 1), 2000);


    this.retryTimeout = setTimeout(() => {
      const config = this.config();
      if (!this.routeAdded && config) {
        this.attemptAddRoute(map);
      }
      this.retryTimeout = null;
    }, delay);
  }

  private attemptAddRoute(map: MapLibreMap): void {
    if (this.isAddingRoute) {
      return;
    }

    const config = this.config();
    if (
      !config ||
      !config.coordinates ||
      config.coordinates.length < 2 ||
      this.routeAdded
    ) {
      return;
    }

    if (!this.isMapFullyReady(map)) {

      this.setupPeriodicCheck();

      if (this.mapReadyHandler) {
        try {
          map.off('styledata', this.mapReadyHandler);
          map.off('load', this.mapReadyHandler);
        } catch (e) {
          // Ignore errors
        }
        this.mapReadyHandler = null;
      }

      if (!map.isStyleLoaded()) {
        this.mapReadyHandler = () => {
          // Style loaded, wait a bit then check for full load
          setTimeout(() => {
            const config = this.config();
            if (this.isMapFullyReady(map) && !this.routeAdded && config) {
              this.mapReadyHandler = null;
              this.addRoute(map);
            } else if (!map.loaded()) {
              const loadHandler = () => {
                const config = this.config();
                if (this.isMapFullyReady(map) && !this.routeAdded && config) {
                  this.mapReadyHandler = null;
                  this.addRoute(map);
                }
              };
              map.once('load', loadHandler);
            }
          }, 100);
        };
        map.once('styledata', this.mapReadyHandler);
      } else if (!map.loaded()) {
        this.mapReadyHandler = () => {
          const config = this.config();
          if (this.isMapFullyReady(map) && !this.routeAdded && config) {
            this.mapReadyHandler = null;
            this.addRoute(map);
          }
        };
        map.once('load', this.mapReadyHandler);
      } else {
        setTimeout(() => {
          const config = this.config();
          if (this.isMapFullyReady(map) && !this.routeAdded && config) {
            this.addRoute(map);
          }
        }, 50);
      }
      return;
    }

    this.addRoute(map);
  }

  private async addRoute(map: MapLibreMap): Promise<void> {
    if (this.isAddingRoute) {
      return;
    }

    const config = this.config();
    if (
      !config ||
      !config.coordinates ||
      config.coordinates.length < 2 ||
      this.routeAdded
    ) {
      return;
    }

    this.isAddingRoute = true;

    try {
      if (!this.isMapFullyReady(map)) {
        this.isAddingRoute = false;
        this.retryAddRoute(map);
        return;
      }

      const coordinates: [number, number][] = config.coordinates.map((coord: any) => {
        if (Array.isArray(coord)) {
          return coord as [number, number];
        } else if (typeof coord === 'object' && coord !== null) {
          if ('lng' in coord && 'lat' in coord) {
            return [coord.lng, coord.lat];
          } else if ('lon' in coord && 'lat' in coord) {
            return [coord.lon, coord.lat];
          }
        }
        return [0, 0];
      });

      const geojson = {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: coordinates,
        },
        properties: {
          ...config.data,
        },
      };

      try {
        if (!map.getSource(this.sourceId)) {
          if (!this.isMapFullyReady(map)) {
            this.isAddingRoute = false;
            this.retryAddRoute(map);
            return;
          }

          map.addSource(this.sourceId, {
            type: 'geojson',
            data: geojson,
          });

          if (!map.getSource(this.sourceId)) {
            this.isAddingRoute = false;
            this.retryAddRoute(map);
            return;
          }

          this.retryCount = 0;
        } else {
          const source = map.getSource(this.sourceId) as GeoJSONSource;
          if (source) {
            source.setData(geojson);
          }
        }
      } catch (error: any) {
        if (!map.getSource(this.sourceId)) {
          this.isAddingRoute = false;
          this.retryAddRoute(map);
          return;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 75));

      if (!map.getSource(this.sourceId)) {
        this.isAddingRoute = false;
        this.retryAddRoute(map);
        return;
      }

      try {
        if (!map.getLayer(this.layerId)) {
          map.addLayer({
            id: this.layerId,
            type: 'line',
            source: this.sourceId,
            layout: {
              'line-join': config.lineJoin || 'round',
              'line-cap': config.lineCap || 'round',
            },
            paint: {
              'line-color': config.color || '#3b82f6',
              'line-width': config.width || 3,
              'line-opacity': config.opacity ?? 1,
              ...(config.dashed ? { 'line-dasharray': config.dashArray || [2, 2] } : {}),
            },
          });

          if (!map.getLayer(this.layerId)) {
            this.isAddingRoute = false;
            this.retryAddRoute(map);
            return;
          }

          map.on('click', this.layerId, (e: any) => {
            this.routeClick.emit({
              event: e,
              config: config,
            });
          });

          map.on('mouseenter', this.layerId, () => {
            map.getCanvas().style.cursor = 'pointer';
          });

          map.on('mouseleave', this.layerId, () => {
            map.getCanvas().style.cursor = '';
          });

          const sourceExists = !!map.getSource(this.sourceId);
          const layerExists = !!map.getLayer(this.layerId);

          if (sourceExists && layerExists) {
            this.routeAdded = true;
            this.retryCount = 0;

            if (this.periodicCheckTimeout) {
              clearTimeout(this.periodicCheckTimeout);
              this.periodicCheckTimeout = null;
            }

            if (this.mapReadyHandler) {
              try {
                map.off('styledata', this.mapReadyHandler);
                map.off('load', this.mapReadyHandler);
              } catch (e) {
                // Ignore errors
              }
              this.mapReadyHandler = null;
            }

            this.addStopMarkers(map);

            this.setupStyleChangeListener(map);

            this.scheduleIntegrityCheck(map);
          } else {
            this.isAddingRoute = false;
            this.retryAddRoute(map);
            return;
          }
        } else {
          const sourceExists = !!map.getSource(this.sourceId);
          const layerExists = !!map.getLayer(this.layerId);

          if (sourceExists && layerExists) {
            this.routeAdded = true;
            this.retryCount = 0;

            if (this.periodicCheckTimeout) {
              clearTimeout(this.periodicCheckTimeout);
              this.periodicCheckTimeout = null;
            }

            if (this.mapReadyHandler) {
              try {
                map.off('styledata', this.mapReadyHandler);
                map.off('load', this.mapReadyHandler);
              } catch {
              }
              this.mapReadyHandler = null;
            }

            this.scheduleIntegrityCheck(map);
          } else {
            this.isAddingRoute = false;
            this.retryAddRoute(map);
            return;
          }
        }
      } catch (error: any) {
        if (!map.getLayer(this.layerId)) {
          this.isAddingRoute = false;
          this.retryAddRoute(map);
          return;
        }
      }
    } finally {
      // Always reset lock
      this.isAddingRoute = false;
    }
  }

  /**
   * Add stop markers if stops are configured
   */
  private addStopMarkers(map: MapLibreMap): void {
    // Check if stops should be shown
    const config = this.config();
    const shouldShowStops =
      config.showStopMarkers !== false && config.stops && config.stops.length > 0;

    if (!shouldShowStops) {
      return;
    }

    this.removeStopMarkers();

    const routeColor = config.color || '#3b82f6';
    const mapId = this.mapId();
    config.stops!.forEach((stop, index) => {
      const marker = this.markerService.addStopMarker(
        mapId,
        stop,
        index + 1, // Number starts at 1
        map,
        routeColor
      );

      if (marker) {
        this.stopMarkers.push(marker);
      }
    });

  }

  /**
   * Remove stop markers
   */
  private removeStopMarkers(): void {
    this.stopMarkers.forEach((marker) => {
      try {
        marker.remove();
      } catch {
      }
    });
    this.stopMarkers = [];
  }

  private updateRouteProperties(map: MapLibreMap): void {
    const config = this.config();
    if (!config || !this.routeAdded || !map.getLayer(this.layerId)) {
      if (config && !this.routeAdded && !this.mapReadyHandler) {
        this.attemptAddRoute(map);
      }
      return;
    }

    try {
      const color = config.color || '#3b82f6';
      const width = config.width ?? 3;
      const opacity = config.opacity ?? 1;

      if (!map.getLayer(this.layerId)) {
        return;
      }

      map.setPaintProperty(this.layerId, 'line-color', color);
      map.setPaintProperty(this.layerId, 'line-width', width);
      map.setPaintProperty(this.layerId, 'line-opacity', opacity);

      const actualColor = map.getPaintProperty(this.layerId, 'line-color');
      const actualWidth = map.getPaintProperty(this.layerId, 'line-width');
      const actualOpacity = map.getPaintProperty(this.layerId, 'line-opacity');

      if (actualColor !== color || actualWidth !== width || actualOpacity !== opacity) {
      }

      if (config.dashed) {
        map.setPaintProperty(this.layerId, 'line-dasharray', config.dashArray || [2, 2]);
      } else {
        try {
          map.setPaintProperty(this.layerId, 'line-dasharray', null);
        } catch (e) {
          // Ignore if property doesn't exist
        }
      }

      if (config.lineCap !== undefined) {
        map.setLayoutProperty(this.layerId, 'line-cap', config.lineCap);
      }
      if (config.lineJoin !== undefined) {
        map.setLayoutProperty(this.layerId, 'line-join', config.lineJoin);
      }

      if (config.coordinates && config.coordinates.length >= 2) {
        const coordinates: [number, number][] = config.coordinates.map((coord: any) => {
          if (Array.isArray(coord)) {
            return coord as [number, number];
          } else if (typeof coord === 'object' && coord !== null) {
            if ('lng' in coord && 'lat' in coord) {
              return [coord.lng, coord.lat];
            } else if ('lon' in coord && 'lat' in coord) {
              return [coord.lon, coord.lat];
            }
          }
          return [0, 0];
        });

        const source = map.getSource(this.sourceId) as GeoJSONSource;
        if (source) {
          const geojson = {
            type: 'Feature' as const,
            geometry: {
              type: 'LineString' as const,
              coordinates: coordinates,
            },
            properties: {
              ...config.data,
            },
          };
          source.setData(geojson);
        }
      }

      const isSelected = color === '#6366f1' && opacity === 1 && width >= 6;
      if (isSelected) {
        try {
          map.moveLayer(this.layerId);
        } catch {
        }
      }
    } catch {
    }
  }

  private scheduleIntegrityCheck(map: MapLibreMap): void {
    if (this.integrityCheckTimeout) {
      clearTimeout(this.integrityCheckTimeout);
    }

    this.integrityCheckTimeout = setTimeout(() => {
      const config = this.config();
      if (this.routeAdded && config) {
        const sourceExists = !!map.getSource(this.sourceId);
        const layerExists = !!map.getLayer(this.layerId);

        if (!sourceExists || !layerExists) {
          this.routeAdded = false;
          this.retryCount = 0; // Reset retry count
          if (!this.isAddingRoute) {
            this.attemptAddRoute(map);
          }
        } else {
        }
      }
      this.integrityCheckTimeout = null;
    }, 200);
  }

  private removeRoute(): void {
    const mapId = this.mapId();
    const map = this.mapService.getMap(mapId);
    if (!map) {
      return;
    }

    this.removeStopMarkers();

    if (map.getLayer(this.layerId)) {
      map.removeLayer(this.layerId);
    }

    if (map.getSource(this.sourceId)) {
      map.removeSource(this.sourceId);
    }

    this.routeAdded = false;
  }
}
