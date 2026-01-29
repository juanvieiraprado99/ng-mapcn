import { Injectable } from '@angular/core';
import { LngLatLike, Map as MapLibreMap, Marker, Offset, Popup } from 'maplibre-gl';
import { MarkerConfig, PopupConfig, TooltipConfig } from '../models';

@Injectable({
  providedIn: 'root',
})
export class MarkerService {
  private markers = new globalThis.Map<string, globalThis.Map<string, Marker>>();
  private tooltips = new globalThis.Map<string, globalThis.Map<string, HTMLElement>>();

  addMarker(mapId: string, config: MarkerConfig, map: MapLibreMap): Marker | null {
    if (!map) {
      return null;
    }

    if (!config || !config.position) {
      return null;
    }

    const markerId = config.id || `marker-${Date.now()}-${Math.random()}`;

    const el = this.createMarkerElement(config);

    if (!el) {
      return null;
    }

    try {
      const marker = new Marker({
        element: el,
        anchor: 'center',
        draggable: config.draggable ?? false,
        rotation: config.rotation,
        scale: config.scale,
      }).setLngLat(config.position);

      marker.addTo(map);

      if (config.popup) {
        requestAnimationFrame(() => {
          this.attachPopup(marker, config.popup!, map);
        });
      }

      if (config.tooltip && config.tooltip.enabled !== false) {
        this.attachTooltip(mapId, markerId, marker, config.tooltip, map);
      }

      if (!this.markers.has(mapId)) {
        this.markers.set(mapId, new globalThis.Map());
      }
      this.markers.get(mapId)!.set(markerId, marker);

      return marker;
    } catch (error) {
      return null;
    }
  }

  removeMarker(mapId: string, markerId: string): void {
    const mapMarkers = this.markers.get(mapId);
    if (mapMarkers) {
      const marker = mapMarkers.get(markerId);
      if (marker) {
        marker.remove();
        mapMarkers.delete(markerId);
      }
    }

    this.removeTooltip(mapId, markerId);
  }

  removeAllMarkers(mapId: string): void {
    const mapMarkers = this.markers.get(mapId);
    if (mapMarkers) {
      mapMarkers.forEach((marker: Marker) => {
        marker.remove();
      });
      mapMarkers.clear();
    }

    this.removeAllTooltips(mapId);
  }

  getMarker(mapId: string, markerId: string): Marker | undefined {
    return this.markers.get(mapId)?.get(markerId);
  }

  getAllMarkers(mapId: string): Marker[] {
    const mapMarkers = this.markers.get(mapId);
    if (!mapMarkers) {
      return [];
    }
    return Array.from(mapMarkers.values());
  }

  updateMarkerPosition(mapId: string, markerId: string, position: LngLatLike): void {
    const marker = this.getMarker(mapId, markerId);
    if (marker) {
      marker.setLngLat(position);
    }
  }

  private createMarkerElement(config: MarkerConfig): HTMLElement {
    const el = document.createElement('div');
    el.className = 'ng-marker';

    if (config.className) {
      el.classList.add(config.className);
    }

    if (config.icon) {
      const size = config.size || 'medium';
      const sizeMap = {
        small: '1rem',
        medium: '1.25rem',
        large: '1.5rem',
      };

      el.style.display = 'block';
      el.style.width = sizeMap[size];
      el.style.height = sizeMap[size];

      if (typeof config.icon === 'string') {
        el.innerHTML = `<img src="${config.icon}" alt="Marker" style="width: 100%; height: 100%; object-fit: contain;" />`;
      } else {
        el.appendChild(config.icon);
      }
    } else {
      const size = config.size || 'medium';
      const sizeMap = {
        small: '1rem',
        medium: '1.25rem',
        large: '1.5rem',
      };

      const isDark = this.isDarkTheme();
      const markerColor = config.color || (isDark ? '#60a5fa' : '#3b82f6');
      const borderColor = isDark ? '#1e293b' : '#ffffff';

      el.style.display = 'block';
      el.style.width = sizeMap[size];
      el.style.height = sizeMap[size];
      el.style.backgroundColor = markerColor;
      el.style.borderRadius = '50%';
      el.style.border = `2px solid ${borderColor}`;
      el.style.cursor = 'pointer';
      el.style.boxShadow = isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.15)';
    }

    return el;
  }

  private isDarkTheme(): boolean {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return false;
    }

    const html = document.documentElement;
    return (
      html.classList.contains('dark') ||
      html.classList.contains('theme-dark') ||
      html.getAttribute('data-theme') === 'dark' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  }

  private attachPopup(marker: Marker, config: PopupConfig, map: MapLibreMap): void {
    const defaultOffset = 16;

    const maxWidth = config.maxWidth === undefined ? 'none' : config.maxWidth;

    const markerLngLat = marker.getLngLat();

    const popup = new Popup({
      closeButton: config.closeButton ?? false,
      closeOnClick: config.closeOnClick ?? true,
      maxWidth: maxWidth,
      anchor: config.anchor || 'bottom',
      offset: config.offset ?? defaultOffset,
      className: 'ng-popup-wrapper',
      focusAfterOpen: config.focusAfterOpen ?? true,
    });

    let content = '<div class="ng-popup-container">';

    if (config.title) {
      content += `<div class="ng-popup-header">${config.title}</div>`;
    }

    if (config.content) {
      content += `<div class="ng-popup-content">${config.content}</div>`;
    }

    content += '</div>';

    popup.setHTML(content);

    if (markerLngLat) {
      popup.setLngLat(markerLngLat);
    }

    marker.setPopup(popup);

    const updatePopupPosition = () => {
      const currentLngLat = marker.getLngLat();
      if (currentLngLat) {
        popup.setLngLat(currentLngLat);
      }
    };

    popup.on('open', () => {
      requestAnimationFrame(() => {
        updatePopupPosition();
      });
    });

    map.on('move', () => {
      if (popup.isOpen()) {
        updatePopupPosition();
      }
    });

    marker.on('dragend', () => {
      updatePopupPosition();
    });
  }

  private attachTooltip(
    mapId: string,
    markerId: string,
    marker: Marker,
    config: TooltipConfig,
    map: MapLibreMap
  ): void {
    if (config.enabled === false) {
      return;
    }

    const markerElement = marker.getElement();
    if (!markerElement) {
      return;
    }

    const tooltipElement = document.createElement('div');
    tooltipElement.className = 'ng-tooltip';
    tooltipElement.textContent = config.text;
    tooltipElement.style.position = 'absolute';
    tooltipElement.style.pointerEvents = 'none';
    tooltipElement.style.opacity = '0';
    tooltipElement.style.visibility = 'hidden';
    tooltipElement.setAttribute('role', 'tooltip');

    const mapContainer = map.getContainer();
    if (!mapContainer) {
      return;
    }

    mapContainer.appendChild(tooltipElement);

    const defaultOffset: Offset = 12;
    const offset: Offset = config.offset ?? defaultOffset;
    const anchor = config.anchor || 'bottom';
    const showOnHover = config.showOnHover !== false;

    const showTooltip = () => {
      this.updateTooltipPosition(tooltipElement, markerElement, anchor, offset);
      tooltipElement.style.visibility = 'visible';
      tooltipElement.style.opacity = '1';
      tooltipElement.classList.add('ng-tooltip-visible');
    };

    const hideTooltip = () => {
      tooltipElement.style.opacity = '0';
      tooltipElement.classList.remove('ng-tooltip-visible');
      setTimeout(() => {
        if (tooltipElement.style.opacity === '0') {
          tooltipElement.style.visibility = 'hidden';
        }
      }, 200);
    };

    if (showOnHover) {
      markerElement.addEventListener('mouseenter', showTooltip);
      markerElement.addEventListener('mouseleave', hideTooltip);
      markerElement.addEventListener('mousemove', () => {
        if (tooltipElement.style.visibility === 'visible') {
          this.updateTooltipPosition(tooltipElement, markerElement, anchor, offset);
        }
      });
    }

    if (!this.tooltips.has(mapId)) {
      this.tooltips.set(mapId, new globalThis.Map());
    }
    this.tooltips.get(mapId)!.set(markerId, tooltipElement);
  }

  private updateTooltipPosition(
    tooltipElement: HTMLElement,
    markerElement: HTMLElement,
    anchor: string,
    offset: Offset
  ): void {
    const markerRect = markerElement.getBoundingClientRect();
    const tooltipRect = tooltipElement.getBoundingClientRect();
    const mapContainer = markerElement.closest('.maplibregl-map') as HTMLElement;

    if (!mapContainer) {
      return;
    }

    const containerRect = mapContainer.getBoundingClientRect();

    let offsetX = 0;
    let offsetY = 0;

    if (typeof offset === 'number') {
      offsetX = offset;
      offsetY = offset;
    } else if (Array.isArray(offset) && offset.length >= 2) {
      offsetX = offset[0];
      offsetY = offset[1];
    } else if (offset && typeof offset === 'object' && !Array.isArray(offset)) {
      const offsetObj = offset as Record<string, [number, number] | undefined>;
      const anchorOffset = offsetObj[anchor];
      if (anchorOffset && Array.isArray(anchorOffset) && anchorOffset.length >= 2) {
        offsetX = anchorOffset[0];
        offsetY = anchorOffset[1];
      } else {
        const firstOffset = Object.values(offsetObj).find(
          (val) => Array.isArray(val) && val.length >= 2
        );
        if (firstOffset) {
          offsetX = firstOffset[0];
          offsetY = firstOffset[1];
        }
      }
    }

    const markerCenterX = markerRect.left + markerRect.width / 2 - containerRect.left;
    const markerCenterY = markerRect.top + markerRect.height / 2 - containerRect.top;
    const markerTop = markerRect.top - containerRect.top;
    const markerBottom = markerRect.bottom - containerRect.top;
    const markerLeft = markerRect.left - containerRect.left;
    const markerRight = markerRect.right - containerRect.left;

    let left = 0;
    let top = 0;

    switch (anchor) {
      case 'top':
        left = markerCenterX - tooltipRect.width / 2;
        top = markerTop - tooltipRect.height - offsetY;
        break;
      case 'bottom':
        left = markerCenterX - tooltipRect.width / 2;
        top = markerBottom + offsetY;
        break;
      case 'left':
        left = markerLeft - tooltipRect.width - offsetX;
        top = markerCenterY - tooltipRect.height / 2;
        break;
      case 'right':
        left = markerRight + offsetX;
        top = markerCenterY - tooltipRect.height / 2;
        break;
      case 'top-left':
        left = markerLeft;
        top = markerTop - tooltipRect.height - offsetY;
        break;
      case 'top-right':
        left = markerRight - tooltipRect.width;
        top = markerTop - tooltipRect.height - offsetY;
        break;
      case 'bottom-left':
        left = markerLeft;
        top = markerBottom + offsetY;
        break;
      case 'bottom-right':
        left = markerRight - tooltipRect.width;
        top = markerBottom + offsetY;
        break;
      case 'center':
      default:
        left = markerCenterX - tooltipRect.width / 2;
        top = markerCenterY - tooltipRect.height / 2;
        break;
    }

    tooltipElement.style.left = `${left}px`;
    tooltipElement.style.top = `${top}px`;
  }

  private removeTooltip(mapId: string, markerId: string): void {
    const mapTooltips = this.tooltips.get(mapId);
    if (mapTooltips) {
      const tooltipElement = mapTooltips.get(markerId);
      if (tooltipElement && tooltipElement.parentNode) {
        tooltipElement.parentNode.removeChild(tooltipElement);
      }
      mapTooltips.delete(markerId);
    }
  }

  private removeAllTooltips(mapId: string): void {
    const mapTooltips = this.tooltips.get(mapId);
    if (mapTooltips) {
      mapTooltips.forEach((tooltipElement: HTMLElement) => {
        if (tooltipElement && tooltipElement.parentNode) {
          tooltipElement.parentNode.removeChild(tooltipElement);
        }
      });
      mapTooltips.clear();
    }
  }

  /**
   * Create a numbered stop marker (for route stops)
   * @param mapId Map ID
   * @param stop Stop information with name and coordinates
   * @param number Stop number (1, 2, 3, etc.)
   * @param map MapLibre map instance
   * @param color Optional marker color (default: blue)
   * @returns Marker instance or null
   */
  addStopMarker(
    mapId: string,
    stop: { name: string; lng: number; lat: number },
    number: number,
    map: MapLibreMap,
    color: string = '#3b82f6'
  ): Marker | null {
    if (!map || !stop) {
      return null;
    }

    const markerId = `stop-${mapId}-${number}`;

    const el = document.createElement('div');
    el.className = 'ng-marker ng-stop-marker';

    const isDark = this.isDarkTheme();
    const borderColor = isDark ? '#1e293b' : '#ffffff';

    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.width = '1.5rem';
    el.style.height = '1.5rem';
    el.style.backgroundColor = color;
    el.style.borderRadius = '50%';
    el.style.border = `2px solid ${borderColor}`;
    el.style.cursor = 'pointer';
    el.style.boxShadow = isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.15)';
    el.style.fontSize = '0.75rem';
    el.style.fontWeight = '600';
    el.style.color = '#ffffff';
    el.style.lineHeight = '1';
    el.style.userSelect = 'none';

    el.textContent = number.toString();

    const config: MarkerConfig = {
      id: markerId,
      position: [stop.lng, stop.lat],
      color: color,
      size: 'medium',
      popup: stop.name
        ? {
            title: stop.name,
            content: `Stop ${number}`,
          }
        : undefined,
    };

    try {
      const marker = new Marker({
        element: el,
        anchor: 'center',
        draggable: false,
      }).setLngLat([stop.lng, stop.lat]);

      marker.addTo(map);

      if (config.popup) {
        requestAnimationFrame(() => {
          this.attachPopup(marker, config.popup!, map);
        });
      }

      if (!this.markers.has(mapId)) {
        this.markers.set(mapId, new globalThis.Map());
      }
      this.markers.get(mapId)!.set(markerId, marker);

      return marker;
    } catch (error) {
      return null;
    }
  }
}
