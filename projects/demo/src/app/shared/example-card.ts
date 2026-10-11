import { ChangeDetectionStrategy, Component } from '@angular/core';

/** mapcn `ExampleCard`: the frame around each live map on the home grid. */
@Component({
  selector: 'app-example-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'bg-card border-border/50 relative block overflow-hidden rounded-xl border shadow-sm',
  },
  template: `<ng-content />`,
})
export class ExampleCardComponent {}
