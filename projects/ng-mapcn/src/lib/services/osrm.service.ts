import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { OsrmResponse, OsrmRouteData, OsrmRouteOptions } from '../models/osrm.interface';

/**
 * Service for interacting with OSRM (Open Source Routing Machine) API
 */
@Injectable({
  providedIn: 'root'
})
export class OsrmService {
  private readonly defaultServerUrl = 'https://router.project-osrm.org';
  private readonly defaultProfile = 'driving';

  constructor(private http: HttpClient) {}

  /**
   * Get routes between start and end points using OSRM API
   * @param start Start point coordinates
   * @param end End point coordinates
   * @param options OSRM request options
   * @returns Promise with array of route data
   */
  async getRoutes(
    start: { lng: number; lat: number },
    end: { lng: number; lat: number },
    options: OsrmRouteOptions = {}
  ): Promise<OsrmRouteData[]> {
    const profile = options.profile || this.defaultProfile;
    const alternatives = options.alternatives !== false; // Default to true
    const overview = options.overview || 'full';
    const geometries = options.geometries || 'geojson';
    const serverUrl = options.serverUrl || this.defaultServerUrl;

    // Build OSRM API URL
    const coordinates = `${start.lng},${start.lat};${end.lng},${end.lat}`;
    const url = `${serverUrl}/route/v1/${profile}/${coordinates}`;
    
    const params: Record<string, string> = {
      overview,
      geometries,
      alternatives: alternatives.toString()
    };

    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    const fullUrl = `${url}?${queryString}`;

    try {
      const response = await firstValueFrom(
        this.http.get<OsrmResponse>(fullUrl)
      );

      if (response.code !== 'Ok') {
        throw new Error(`OSRM API error: ${response.message || response.code}`);
      }

      if (!response.routes || response.routes.length === 0) {
        throw new Error('No routes found');
      }

      // Transform OSRM response to OsrmRouteData[]
      const routes: OsrmRouteData[] = response.routes.map((route) => ({
        coordinates: route.geometry.coordinates,
        duration: route.duration,
        distance: route.distance
      }));

      return routes;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Format duration in seconds to human-readable string
   * @param seconds Duration in seconds
   * @returns Formatted string (e.g., "1h 30m" or "45 min")
   */
  formatDuration(seconds: number): string {
    const mins = Math.round(seconds / 60);
    if (mins < 60) {
      return `${mins} min`;
    }
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  }

  /**
   * Format distance in meters to human-readable string
   * @param meters Distance in meters
   * @returns Formatted string (e.g., "45.2 km" or "500 m")
   */
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  }
}
