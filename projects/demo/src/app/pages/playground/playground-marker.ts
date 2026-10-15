import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { MarkerOptions } from 'maplibre-gl';
import { MapMarkerComponent, MarkerContentComponent } from 'ng-mapcn';

/**
 * The playground's marker: `ng-map-marker` alone is an empty element, so this wraps it with the
 * default `<ng-marker-content />` dot (what the snippet shows). Two things need more than
 * `NgComponentOutlet` can give: `anchor` is creation-only in MapLibre, so the marker is
 * re-created when it changes, and `dragEnd` (outputs are not bindable through the outlet) is
 * relayed as `moved` so the controls and the snippet follow a drag.
 */
@Component({
  selector: 'app-playground-marker',
  standalone: true,
  imports: [MapMarkerComponent, MarkerContentComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (key of [anchor()]; track key) {
      <ng-map-marker
        [longitude]="longitude()"
        [latitude]="latitude()"
        [draggable]="draggable()"
        [rotation]="rotation()"
        [anchor]="anchor()"
        (dragEnd)="moved.emit($event)"
      >
        <ng-marker-content />
      </ng-map-marker>
    }
  `,
})
export class PlaygroundMarkerComponent {
  readonly longitude = input.required<number>();
  readonly latitude = input.required<number>();
  readonly draggable = input(false);
  readonly rotation = input(0);
  readonly anchor = input<MarkerOptions['anchor']>();

  readonly moved = output<{ lng: number; lat: number }>();
}
