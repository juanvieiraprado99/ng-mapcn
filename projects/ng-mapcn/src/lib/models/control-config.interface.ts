/**
 * Position for map controls
 */
export type ControlPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/**
 * Base configuration for map controls
 */
export interface ControlConfig {
  /** Control position */
  position?: ControlPosition;
  
  /** Whether control is visible */
  visible?: boolean;
  
  /** Custom CSS class */
  className?: string;
}

/**
 * Configuration for zoom control
 */
export interface ZoomControlConfig extends ControlConfig {
  /** Whether to show zoom in button */
  showZoomIn?: boolean;
  
  /** Whether to show zoom out button */
  showZoomOut?: boolean;
  
  /** Custom zoom in button label */
  zoomInLabel?: string;
  
  /** Custom zoom out button label */
  zoomOutLabel?: string;
}

/**
 * Configuration for compass control
 */
export interface CompassControlConfig extends ControlConfig {
  /** Whether to show compass */
  showCompass?: boolean;
  
  /** Custom compass label */
  compassLabel?: string;
  
  /** Custom compass image path */
  compassImagePath?: string;
}

/**
 * Configuration for locate control
 */
export interface LocateControlConfig extends ControlConfig {
  /** Whether to show locate button */
  showLocate?: boolean;
  
  /** Custom locate button label */
  locateLabel?: string;
  
  /** Whether to track user location */
  trackUserLocation?: boolean;
  
  /** Watch position options */
  watchPosition?: boolean;
  
  /** Custom locate image path */
  locateImagePath?: string;
  
  /** Custom user location marker image path */
  userLocationImagePath?: string;
}

/**
 * Configuration for fullscreen control
 */
export interface FullscreenControlConfig extends ControlConfig {
  /** Whether to show fullscreen button */
  showFullscreen?: boolean;
  
  /** Custom fullscreen button label */
  fullscreenLabel?: string;
  
  /** Custom exit fullscreen button label */
  exitFullscreenLabel?: string;
}
