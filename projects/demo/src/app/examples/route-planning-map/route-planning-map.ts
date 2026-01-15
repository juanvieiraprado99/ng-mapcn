import { Component, OnInit, inject } from '@angular/core';
import {
  MapComponent,
  MapService,
  OsrmRouteData,
  OsrmService,
  RoutePlanningComponent,
  MapControlsComponent,
} from 'ng-mapcn';

@Component({
  selector: 'app-route-planning-map',
  standalone: true,
  imports: [MapComponent, MapControlsComponent, RoutePlanningComponent],
  templateUrl: './route-planning-map.html',
  styleUrl: './route-planning-map.scss',
})
export class RoutePlanningMapComponent implements OnInit {
  private mapService = inject(MapService);
  private osrmService = inject(OsrmService);

  mapId = 'route-planning-map';

  start = { name: 'Amsterdam', lng: 4.9041, lat: 52.3676 };
  end = { name: 'Rotterdam', lng: 4.4777, lat: 51.9244 };

  routes: OsrmRouteData[] = [];
  selectedIndex = 0;
  isLoading = false;

  // Calculate center point between start and end
  get mapCenter(): [number, number] {
    const centerLng = (this.start.lng + this.end.lng) / 2;
    const centerLat = (this.start.lat + this.end.lat) / 2;
    return [centerLng, centerLat];
  }

  // Calculate appropriate zoom level to show both points
  get mapZoom(): number {
    // Calculate distance between points
    const latDiff = Math.abs(this.start.lat - this.end.lat);
    const lngDiff = Math.abs(this.start.lng - this.end.lng);
    const maxDiff = Math.max(latDiff, lngDiff);

    // Adjust zoom based on distance
    if (maxDiff > 1) return 8;
    if (maxDiff > 0.5) return 9;
    if (maxDiff > 0.1) return 11;
    if (maxDiff > 0.05) return 12;
    return 13;
  }

  ngOnInit(): void {
    // Component initialization
  }

  onMapReady(map: any): void {
    // Map ready
  }

  onRoutesLoaded(routes: OsrmRouteData[]): void {
    this.routes = routes;
  }

  onLoadingChange(isLoading: boolean): void {
    this.isLoading = isLoading;
  }

  onRouteSelected(event: { index: number; route: OsrmRouteData }): void {
    this.selectedIndex = event.index;
  }

  selectRoute(index: number): void {
    this.selectedIndex = index;
  }

  formatDuration(seconds: number): string {
    return this.osrmService.formatDuration(seconds);
  }

  formatDistance(meters: number): string {
    return this.osrmService.formatDistance(meters);
  }
}
