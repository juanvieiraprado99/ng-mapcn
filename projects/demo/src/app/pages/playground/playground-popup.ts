import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MapPopupComponent } from 'ng-mapcn';

/**
 * The playground's popup: `ng-map-popup` needs projected content (the card the snippet shows),
 * which `NgComponentOutlet` cannot give, and closing it (close button or map click) flips `open`,
 * relayed as `openChange` so the Open control and the snippet follow.
 */
@Component({
  selector: 'app-playground-popup',
  standalone: true,
  imports: [MapPopupComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-map-popup
      [longitude]="longitude()"
      [latitude]="latitude()"
      [open]="open()"
      [closeButton]="closeButton()"
      [closeOnClick]="closeOnClick()"
      (openChange)="openChange.emit($event)"
    >
      <div class="bg-background rounded-md border px-3 py-2 text-sm shadow-md">
        Hello from ng-mapcn
      </div>
    </ng-map-popup>
  `,
})
export class PlaygroundPopupComponent {
  readonly longitude = input.required<number>();
  readonly latitude = input.required<number>();
  readonly open = input(true);
  readonly closeButton = input(false);
  readonly closeOnClick = input(true);

  readonly openChange = output<boolean>();
}
