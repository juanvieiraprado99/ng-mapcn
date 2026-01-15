import { LngLatLike, ProjectionSpecification, StyleSpecification } from 'maplibre-gl';

/**
 * Custom map styles for light and dark themes
 */
export interface MapStylesConfig {
  /** Custom map style for light theme */
  light?: string | StyleSpecification;
  /** Custom map style for dark theme */
  dark?: string | StyleSpecification;
}

/**
 * Configuration for the map component
 */
export interface MapConfig {
  /** Initial center coordinates [lng, lat] */
  center?: LngLatLike;
  
  /** Initial zoom level */
  zoom?: number;
  
  /** Minimum zoom level */
  minZoom?: number;
  
  /** Maximum zoom level */
  maxZoom?: number;
  
  /** Map style URL or style specification */
  style?: string | StyleSpecification;
  
  /** Custom map styles for light and dark themes */
  styles?: MapStylesConfig;
  
  /** Map projection type (e.g., globe) */
  projection?: ProjectionSpecification;
  
  /** Pitch (tilt) of the map in degrees */
  pitch?: number;
  
  /** Bearing (rotation) of the map in degrees */
  bearing?: number;
  
  /** Whether to show navigation controls */
  showNavigationControl?: boolean;
  
  /** Whether to show scale control */
  showScaleControl?: boolean;
  
  /** Whether to show fullscreen control */
  showFullscreenControl?: boolean;
  
  /** Container element ID or reference */
  container?: string | HTMLElement;
  
  /** Whether to enable double-click zoom */
  doubleClickZoom?: boolean;
  
  /** Whether to enable drag rotation */
  dragRotate?: boolean;
  
  /** Whether to enable drag panning */
  dragPan?: boolean;
  
  /** Whether to enable keyboard navigation */
  keyboard?: boolean;
  
  /** Whether to enable scroll wheel zoom */
  scrollZoom?: boolean;
  
  /** Whether to enable touch zoom and rotation */
  touchZoomRotate?: boolean;
  
  /** Whether to enable box zoom */
  boxZoom?: boolean;
  
  /** Theme mode: 'light' | 'dark' | 'auto' */
  theme?: 'light' | 'dark' | 'auto';
}
