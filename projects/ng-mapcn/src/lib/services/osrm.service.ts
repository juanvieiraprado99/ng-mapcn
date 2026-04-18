import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { OsrmResponse, OsrmRouteData, OsrmRouteOptions } from '../models/osrm.interface';

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
    if (start.lng < -180 || start.lng > 180 || start.lat < -90 || start.lat > 90) {
      throw new Error(`Invalid start coordinates: lng=${start.lng}, lat=${start.lat}`);
    }
    if (end.lng < -180 || end.lng > 180 || end.lat < -90 || end.lat > 90) {
      throw new Error(`Invalid end coordinates: lng=${end.lng}, lat=${end.lat}`);
    }

    const profile = options.profile || this.defaultProfile;
    const alternatives = options.alternatives !== false; // Default to true
    const overview = options.overview || 'full';
    const geometries = options.geometries || 'geojson';
    const serverUrl = options.serverUrl || this.defaultServerUrl;

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

    const response = await firstValueFrom(this.http.get<OsrmResponse>(fullUrl));

    if (response.code !== 'Ok') {
      throw new Error(`OSRM API error: ${response.message || response.code}`);
    }

    if (!response.routes || response.routes.length === 0) {
      throw new Error('No routes found');
    }

    return response.routes.map((route) => ({
      coordinates: route.geometry.coordinates,
      duration: route.duration,
      distance: route.distance,
    }));
  }

  formatDuration(seconds: number): string {
    const mins = Math.round(seconds / 60);
    if (mins < 60) {
      return `${mins} min`;
    }
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  }

  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  }
}
