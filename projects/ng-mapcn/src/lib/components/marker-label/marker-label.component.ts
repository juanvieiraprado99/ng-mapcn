import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Shows a small text label next to a marker. */
@Component({
  selector: 'ng-marker-label',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClass()',
  },
})
export class MarkerLabelComponent {
  readonly position = input<'top' | 'bottom'>('top');

  protected readonly hostClass = computed(() => {
    const base = 'ng-marker-label';
    return this.position() === 'bottom'
      ? `${base} ng-marker-label--bottom`
      : `${base} ng-marker-label--top`;
  });
}
