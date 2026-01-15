import { Component, OnInit, inject } from '@angular/core';
import {
  MapComponent,
  MapService,
  MarkerComponent,
  MarkerConfig,
  MapControlsComponent,
} from 'ng-mapcn';

@Component({
  selector: 'app-tooltips-map',
  standalone: true,
  imports: [MapComponent, MapControlsComponent, MarkerComponent],
  templateUrl: './tooltips-map.html',
  styleUrl: './tooltips-map.scss',
})
export class TooltipsMapComponent implements OnInit {
  private mapService = inject(MapService);

  mapId = 'tooltips-map';

  markers: MarkerConfig[] = [
    // Tooltip habilitado (padrão)
    {
      id: 'marker-ny',
      position: [-74.006, 40.7128],
      color: '#3b82f6',
      size: 'medium',
      tooltip: {
        text: 'New York, USA',
        enabled: true,
        anchor: 'bottom',
        offset: 12,
      },
    },
    // Tooltip com anchor top
    {
      id: 'marker-paris',
      position: [2.3522, 48.8566],
      color: '#10b981',
      size: 'medium',
      tooltip: {
        text: 'Paris, França',
        enabled: true,
        anchor: 'top',
        offset: 12,
      },
    },
    // Tooltip com anchor left
    {
      id: 'marker-tokyo',
      position: [139.6503, 35.6762],
      color: '#f59e0b',
      size: 'medium',
      tooltip: {
        text: 'Tokyo, Japão',
        enabled: true,
        anchor: 'left',
        offset: 12,
      },
    },
    // Tooltip com anchor right
    {
      id: 'marker-london',
      position: [-0.1276, 51.5074],
      color: '#8b5cf6',
      size: 'medium',
      tooltip: {
        text: 'London, Reino Unido',
        enabled: true,
        anchor: 'right',
        offset: 12,
      },
    },
    // Tooltip desabilitado
    {
      id: 'marker-sydney',
      position: [151.2093, -33.8688],
      color: '#ef4444',
      size: 'medium',
      tooltip: {
        text: 'Sydney, Austrália (tooltip desabilitado)',
        enabled: false,
      },
    },
    // Tooltip com offset customizado
    {
      id: 'marker-rio',
      position: [-43.1729, -22.9068],
      color: '#06b6d4',
      size: 'medium',
      tooltip: {
        text: 'Rio de Janeiro, Brasil',
        enabled: true,
        anchor: 'bottom',
        offset: [0, 20], // [x, y]
      },
    },
    // Tooltip com anchor top-left
    {
      id: 'marker-dubai',
      position: [55.2708, 25.2048],
      color: '#f97316',
      size: 'medium',
      tooltip: {
        text: 'Dubai, Emirados Árabes Unidos',
        enabled: true,
        anchor: 'top-left',
        offset: 12,
      },
    },
    // Tooltip com anchor bottom-right
    {
      id: 'marker-moscow',
      position: [37.6173, 55.7558],
      color: '#ec4899',
      size: 'medium',
      tooltip: {
        text: 'Moscow, Rússia',
        enabled: true,
        anchor: 'bottom-right',
        offset: 12,
      },
    },
    // Marker sem tooltip
    {
      id: 'marker-cairo',
      position: [31.2357, 30.0444],
      color: '#14b8a6',
      size: 'medium',
      // Sem tooltip configurado
    },
    // Tooltip com showOnHover false (não aparece no hover, mas pode ser mostrado programaticamente)
    {
      id: 'marker-mumbai',
      position: [72.8777, 19.076],
      color: '#a855f7',
      size: 'medium',
      tooltip: {
        text: 'Mumbai, Índia (showOnHover: false)',
        enabled: true,
        showOnHover: false,
        anchor: 'bottom',
        offset: 12,
      },
    },
  ];

  ngOnInit(): void {
    // Component initialization
  }

  onMapReady(map: any): void {
    // Map ready
  }
}
