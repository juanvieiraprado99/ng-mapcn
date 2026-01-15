import { Component, OnInit, inject } from '@angular/core';
import { MapComponent, MapService, MapControlsComponent } from 'ng-mapcn';

@Component({
  selector: 'app-dark-theme-map',
  standalone: true,
  imports: [MapComponent, MapControlsComponent],
  templateUrl: './dark-theme-map.html',
  styleUrl: './dark-theme-map.scss'
})
export class DarkThemeMapComponent implements OnInit {
  private mapService = inject(MapService);

  mapId = 'dark-theme-map';

  ngOnInit(): void {
    // Component initialization
  }

  onMapReady(map: any): void {
    // Map ready
  }
}
