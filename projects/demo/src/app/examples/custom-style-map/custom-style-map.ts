import { Component, OnInit, inject } from '@angular/core';
import { MapComponent, MapService, MapControlsComponent } from 'ng-mapcn';

@Component({
  selector: 'app-custom-style-map',
  standalone: true,
  imports: [MapComponent, MapControlsComponent],
  templateUrl: './custom-style-map.html',
  styleUrl: './custom-style-map.scss'
})
export class CustomStyleMapComponent implements OnInit {
  private mapService = inject(MapService);

  mapId = 'custom-style-map';

  // Using default MapLibre demo style as custom style
  customStyle = 'https://demotiles.maplibre.org/style.json';

  ngOnInit(): void {
    // Component initialization
  }

  onMapReady(map: any): void {
    // Map ready
  }
}
