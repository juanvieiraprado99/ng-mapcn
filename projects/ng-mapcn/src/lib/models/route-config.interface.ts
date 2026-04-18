import { LngLatLike, MapMouseEvent } from 'maplibre-gl';
import { RouteStop, OsrmRouteData } from './osrm.interface';

export interface RouteClickEvent {
  event: MapMouseEvent;
  config: RouteConfig;
}

/**
 * Configuration for map routes/paths
 */
export interface RouteConfig {
  /** Route ID (for tracking and removal) */
  id?: string;
  
  /** Array of coordinates [lng, lat] */
  coordinates: LngLatLike[];
  
  /** Route color */
  color?: string;
  
  /** Route width in pixels */
  width?: number;
  
  /** Whether route is dashed */
  dashed?: boolean;
  
  /** Dash pattern (array of numbers) */
  dashArray?: number[];
  
  /** Route opacity (0-1) */
  opacity?: number;
  
  /** Line cap style */
  lineCap?: 'butt' | 'round' | 'square';
  
  /** Line join style */
  lineJoin?: 'miter' | 'round' | 'bevel';
  
  /** Whether route is visible */
  visible?: boolean;
  
  /** Custom data associated with route */
  data?: Record<string, unknown>;
  
  /** Whether to show direction arrows */
  showArrows?: boolean;
  
  /** Arrow spacing in pixels */
  arrowSpacing?: number;
  
  /** Array of stops along the route (for numbered markers) */
  stops?: RouteStop[];
  
  /** Whether to show numbered stop markers (default: true if stops provided) */
  showStopMarkers?: boolean;
  
  /** OSRM route data (duration, distance) */
  osrmData?: OsrmRouteData;

  /** Whether this route is in selected state (controls z-order elevation) */
  selected?: boolean;
}
