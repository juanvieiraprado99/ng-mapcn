import { Component, OnInit, inject } from '@angular/core';
import {
  MapComponent,
  MapService,
  MapControlsComponent
} from 'ng-mapcn';

@Component({
  selector: 'app-controls-map',
  standalone: true,
  imports: [
    MapComponent,
    MapControlsComponent
  ],
  templateUrl: './controls-map.html',
  styleUrl: './controls-map.scss'
})
export class ControlsMapComponent implements OnInit {
  private mapService = inject(MapService);

  mapId = 'controls-map';

  ngOnInit(): void {
    // Component initialization
  }

  onMapReady(map: any): void {
    // Map ready
  }
}
