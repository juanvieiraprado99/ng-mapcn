import { Component, OnInit, inject } from '@angular/core';
import { MapComponent, MapService, MapControlsComponent } from 'ng-mapcn';

@Component({
  selector: 'app-flyto-globe-map',
  standalone: true,
  imports: [MapComponent, MapControlsComponent],
  templateUrl: './flyto-globe-map.html',
  styleUrl: './flyto-globe-map.scss',
})
export class FlytoGlobeMapComponent implements OnInit {
  private mapService = inject(MapService);

  mapId = 'flyto-globe-map';
  
  // Coordenadas de Mairinque, SP
  mairinqueCoordinates: [number, number] = [-47.1855, -23.5393];
  mairinqueZoom = 14;

  ngOnInit(): void {
    // Component initialization
  }

  onMapReady(map: any): void {
    // Map ready
  }

  /**
   * Fly to Mairinque SP
   */
  flyToMairinque(): void {
    this.mapService.flyTo(
      this.mapId,
      this.mairinqueCoordinates,
      this.mairinqueZoom,
      2000 // 2 seconds duration for smooth animation
    );
  }
}
