import { Component, OnInit, inject } from '@angular/core';
import { MapComponent, MapService, MapControlsComponent } from 'ng-mapcn';

@Component({
  selector: 'app-basic-map',
  standalone: true,
  imports: [MapComponent, MapControlsComponent],
  templateUrl: './basic-map.html',
  styleUrl: './basic-map.scss',
})
export class BasicMapComponent implements OnInit {
  private mapService = inject(MapService);

  mapId = 'basic-map';

  ngOnInit(): void {
    // Component initialization
  }

  onMapReady(map: any): void {
    // Map ready
  }
}
