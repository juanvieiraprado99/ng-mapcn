/**
 * Interface for route stops (points along a route)
 */
export interface RouteStop {
  /** Stop name/label */
  name: string;
  /** Longitude coordinate */
  lng: number;
  /** Latitude coordinate */
  lat: number;
}

/**
 * Data for a single OSRM route
 */
export interface OsrmRouteData {
  /** Route coordinates as [lng, lat][] */
  coordinates: [number, number][];
  /** Route duration in seconds */
  duration: number;
  /** Route distance in meters */
  distance: number;
}

/**
 * OSRM API response structure
 */
export interface OsrmResponse {
  /** Response code */
  code: string;
  /** Response message */
  message?: string;
  /** Array of route options */
  routes: Array<{
    /** Route geometry */
    geometry: {
      /** Coordinates array */
      coordinates: [number, number][];
    };
    /** Route duration in seconds */
    duration: number;
    /** Route distance in meters */
    distance: number;
    /** Route legs (for multi-waypoint routes) */
    legs?: Array<{
      duration: number;
      distance: number;
      steps: any[];
    }>;
  }>;
  /** Waypoints information */
  waypoints?: Array<{
    location: [number, number];
    name?: string;
  }>;
}

/**
 * Options for OSRM route requests
 */
export interface OsrmRouteOptions {
  /** Transportation profile (default: 'driving') */
  profile?: 'driving' | 'walking' | 'cycling';
  /** Include alternative routes (default: true) */
  alternatives?: boolean;
  /** Overview level (default: 'full') */
  overview?: 'simplified' | 'full' | 'false';
  /** Geometry format (default: 'geojson') */
  geometries?: 'geojson' | 'polyline' | 'polyline6';
  /** OSRM server URL (default: public OSRM server) */
  serverUrl?: string;
}
