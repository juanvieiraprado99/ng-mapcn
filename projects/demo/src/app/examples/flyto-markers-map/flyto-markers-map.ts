import { Component, inject } from '@angular/core';
import {
  MapComponent,
  MapService,
  MarkerComponent,
  MarkerConfig,
  MapControlsComponent,
} from 'ng-mapcn';

@Component({
  selector: 'app-flyto-markers-map',
  standalone: true,
  imports: [MapComponent, MapControlsComponent, MarkerComponent],
  templateUrl: './flyto-markers-map.html',
  styleUrl: './flyto-markers-map.scss',
})
export class FlytoMarkersMapComponent {
  private mapService = inject(MapService);

  mapId = 'flyto-markers-map';

  markers: MarkerConfig[] = [
    {
      id: 'marker-sao-paulo',
      position: [-46.6333, -23.5505],
      color: '#3b82f6',
      size: 'medium',
      popup: {
        title: 'São Paulo',
        content: 'Cidade de São Paulo, SP - Brasil',
      },
    },
    {
      id: 'marker-rio-de-janeiro',
      position: [-43.1729, -22.9068],
      color: '#10b981',
      size: 'medium',
      popup: {
        title: 'Rio de Janeiro',
        content: 'Cidade do Rio de Janeiro, RJ - Brasil',
      },
    },
    {
      id: 'marker-belo-horizonte',
      position: [-43.9378, -19.9167],
      color: '#f59e0b',
      size: 'medium',
      popup: {
        title: 'Belo Horizonte',
        content: 'Cidade de Belo Horizonte, MG - Brasil',
      },
    },
    {
      id: 'marker-curitiba',
      position: [-49.2733, -25.4284],
      color: '#8b5cf6',
      size: 'medium',
      popup: {
        title: 'Curitiba',
        content: 'Cidade de Curitiba, PR - Brasil',
      },
    },
    {
      id: 'marker-porto-alegre',
      position: [-51.2300, -30.0346],
      color: '#ef4444',
      size: 'medium',
      popup: {
        title: 'Porto Alegre',
        content: 'Cidade de Porto Alegre, RS - Brasil',
      },
    },
    {
      id: 'marker-brasilia',
      position: [-47.8825, -15.7942],
      color: '#06b6d4',
      size: 'medium',
      popup: {
        title: 'Brasília',
        content: 'Cidade de Brasília, DF - Brasil',
      },
    },
    {
      id: 'marker-salvador',
      position: [-38.4813, -12.9714],
      color: '#f97316',
      size: 'medium',
      popup: {
        title: 'Salvador',
        content: 'Cidade de Salvador, BA - Brasil',
      },
    },
    {
      id: 'marker-recife',
      position: [-34.8813, -8.0476],
      color: '#ec4899',
      size: 'medium',
      popup: {
        title: 'Recife',
        content: 'Cidade de Recife, PE - Brasil',
      },
    },
  ];

  /**
   * Handle marker click - fly to marker position
   */
  onMarkerClick(event: any, markerConfig: MarkerConfig): void {
    if (!markerConfig.position) {
      return;
    }

    // Fly to marker position with zoom level 14 and 1.5s duration
    this.mapService.flyTo(this.mapId, markerConfig.position, 14, 1500);
  }

  onMapReady(map: any): void {
    // Map ready
  }
}
