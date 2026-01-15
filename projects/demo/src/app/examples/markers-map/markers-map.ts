import { Component, OnInit, inject } from '@angular/core';
import {
  MapComponent,
  MapService,
  MarkerComponent,
  MarkerConfig,
  MapControlsComponent,
  RouteComponent,
  RouteConfig,
} from 'ng-mapcn';

@Component({
  selector: 'app-markers-map',
  standalone: true,
  imports: [MapComponent, MapControlsComponent, MarkerComponent, RouteComponent],
  templateUrl: './markers-map.html',
  styleUrl: './markers-map.scss',
})
export class MarkersMapComponent implements OnInit {
  private mapService = inject(MapService);

  mapId = 'markers-map';

  markers: MarkerConfig[] = [
    // Small markers
    {
      id: 'marker-ny-small',
      position: [-74.5, 40],
      color: '#3b82f6',
      size: 'small',
      popup: {
        content: '<strong>New York</strong><br>Estados Unidos<br><small>Small marker</small>',
        closeButton: true,
      },
    },
    {
      id: 'marker-paris-small',
      position: [2.3522, 48.8566],
      color: '#10b981',
      size: 'small',
      popup: {
        content: '<strong>Paris</strong><br>França<br><small>Small marker</small>',
        closeButton: true,
      },
    },
    // Medium markers (default)
    {
      id: 'marker-tokyo-medium',
      position: [139.6503, 35.6762],
      color: '#f59e0b',
      size: 'medium',
      popup: {
        content: '<strong>Tokyo</strong><br>Japão<br><small>Medium marker</small>',
        closeButton: true,
      },
    },
    {
      id: 'marker-london-medium',
      position: [-0.1276, 51.5074],
      color: '#8b5cf6',
      size: 'medium',
      popup: {
        content: '<strong>London</strong><br>Reino Unido<br><small>Medium marker</small>',
        closeButton: true,
      },
    },
    // Large markers
    {
      id: 'marker-sydney-large',
      position: [151.2093, -33.8688],
      color: '#ef4444',
      size: 'large',
      popup: {
        content: '<strong>Sydney</strong><br>Austrália<br><small>Large marker</small>',
        closeButton: true,
      },
    },
    {
      id: 'marker-rio-large',
      position: [-43.1729, -22.9068],
      color: '#06b6d4',
      size: 'large',
      popup: {
        content: '<strong>Rio de Janeiro</strong><br>Brasil<br><small>Large marker</small>',
        closeButton: true,
      },
    },
    // Different colors
    {
      id: 'marker-dubai',
      position: [55.2708, 25.2048],
      color: '#f97316',
      popup: {
        content: '<strong>Dubai</strong><br>Emirados Árabes Unidos',
        closeButton: true,
      },
    },
    {
      id: 'marker-moscow',
      position: [37.6173, 55.7558],
      color: '#ec4899',
      popup: {
        content: '<strong>Moscow</strong><br>Rússia',
        closeButton: true,
      },
    },
    {
      id: 'marker-cairo',
      position: [31.2357, 30.0444],
      color: '#14b8a6',
      popup: {
        content: '<strong>Cairo</strong><br>Egito',
        closeButton: true,
      },
    },
    {
      id: 'marker-mumbai',
      position: [72.8777, 19.076],
      color: '#a855f7',
      popup: {
        content: '<strong>Mumbai</strong><br>Índia',
        closeButton: true,
      },
    },
  ];

  routes: RouteConfig[] = [
    {
      id: 'route-mairinque-sao-roque',
      coordinates: [
        [-47.1855, -23.5393], // Mairinque, SP
        [-47.1357, -23.5226]  // São Roque, SP
      ],
      color: '#3b82f6', // Azul
      width: 4,
      opacity: 0.8,
      lineCap: 'round',
      lineJoin: 'round'
    }
  ];

  ngOnInit(): void {
    // Component initialization
  }

  onMapReady(map: any): void {
    // Map ready
  }
}
