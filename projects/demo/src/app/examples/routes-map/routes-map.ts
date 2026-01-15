import { Component, OnInit, inject } from '@angular/core';
import {
  MapComponent,
  MapService,
  RouteComponent,
  RouteConfig,
  MapControlsComponent,
} from 'ng-mapcn';

@Component({
  selector: 'app-routes-map',
  standalone: true,
  imports: [MapComponent, MapControlsComponent, RouteComponent],
  templateUrl: './routes-map.html',
  styleUrl: './routes-map.scss',
})
export class RoutesMapComponent implements OnInit {
  private mapService = inject(MapService);

  mapId = 'routes-map';

  routes: RouteConfig[] = [
    {
      id: 'route-1',
      coordinates: [
        [-74.5, 40],
        [-73.5, 40.5],
        [-72.5, 41],
      ],
      color: '#3b82f6',
      width: 6,
      opacity: 0.8,
    },
    {
      id: 'route-2',
      coordinates: [
        [2.3522, 48.8566],
        [4.3528, 50.8503],
        [8.5417, 47.3769],
      ],
      color: '#10b981',
      width: 6,
      opacity: 0.8,
    },
    {
      id: 'route-mairinque-sao-roque',
      coordinates: [
        [-47.1855, -23.5393], // Mairinque, SP
        [-47.1357, -23.5226], // São Roque, SP
      ],
      color: '#3b82f6', // Azul
      width: 6,
      opacity: 0.8,
      lineCap: 'round',
      lineJoin: 'round',
    },
    {
      id: 'route-nyc-stops',
      coordinates: [
        [-74.006, 40.7128], // NYC City Hall
        [-73.9857, 40.7484], // Empire State Building
        [-73.9772, 40.7527], // Grand Central
        [-73.9654, 40.7829], // Central Park
      ],
      color: '#3b82f6',
      width: 4,
      opacity: 0.8,
      lineCap: 'round',
      lineJoin: 'round',
      stops: [
        { name: 'City Hall', lng: -74.006, lat: 40.7128 },
        { name: 'Empire State Building', lng: -73.9857, lat: 40.7484 },
        { name: 'Grand Central Terminal', lng: -73.9772, lat: 40.7527 },
        { name: 'Central Park', lng: -73.9654, lat: 40.7829 },
      ],
      showStopMarkers: true,
    },
  ];

  ngOnInit(): void {
    // Component initialization
  }

  onMapReady(map: any): void {
    // Map ready
  }
}
