import { LngLatLike, Offset } from 'maplibre-gl';

/**
 * Popup configuration for markers
 * Following MapLibre GL JS PopupOptions pattern
 */
export interface PopupConfig {
  /** Popup content (HTML string or template) */
  content?: string;
  
  /** Popup title */
  title?: string;
  
  /** Whether to show close button (default: false, following React example pattern) */
  closeButton?: boolean;
  
  /** Whether to close on click (default: true) */
  closeOnClick?: boolean;
  
  /** Maximum width of the popup. Use 'none' to allow CSS to control width (default: 'none') */
  maxWidth?: string;
  
  /** Anchor point for the popup (default: 'bottom') */
  anchor?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  
  /** Offset of the popup in pixels (default: 16). Can be number, [x, y] array, or PointLike */
  offset?: Offset;
  
  /** Whether to focus the popup after it opens (default: true) */
  focusAfterOpen?: boolean;
}

/**
 * Tooltip configuration for markers
 */
export interface TooltipConfig {
  /** Tooltip text */
  text: string;
  
  /** Whether tooltip is enabled (default: true) */
  enabled?: boolean;
  
  /** Whether to show tooltip on hover (default: true) */
  showOnHover?: boolean;
  
  /** Anchor point for the tooltip (default: 'bottom') */
  anchor?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  
  /** Offset of the tooltip in pixels (default: 12). Can be number, [x, y] array, or PointLike */
  offset?: Offset;
}

/**
 * Configuration for map markers
 */
export interface MarkerConfig {
  /** Marker position [lng, lat] */
  position: LngLatLike;
  
  /** Marker ID (for tracking and removal) */
  id?: string;
  
  /** Custom marker icon URL or HTML element */
  icon?: string | HTMLElement;
  
  /** Marker color (for default marker) */
  color?: string;
  
  /** Marker size */
  size?: 'small' | 'medium' | 'large';
  
  /** Whether marker is draggable */
  draggable?: boolean;
  
  /** Popup configuration */
  popup?: PopupConfig;
  
  /** Tooltip configuration */
  tooltip?: TooltipConfig;
  
  /** Custom CSS class */
  className?: string;
  
  /** Custom data associated with marker */
  data?: any;
  
  /** Whether marker is visible */
  visible?: boolean;
  
  /** Rotation angle in degrees */
  rotation?: number;
  
  /** Scale factor */
  scale?: number;
}
