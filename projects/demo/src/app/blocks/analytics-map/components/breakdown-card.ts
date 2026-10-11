import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ZardCardComponent } from '@/shared/components/card';
import type { BreakdownRow } from '../data';

@Component({
  selector: 'app-breakdown-card',
  standalone: true,
  imports: [DecimalPipe, ZardCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <z-card class="gap-2">
      <div class="pb-4 text-sm font-medium">{{ title() }}</div>
      <div
        class="text-muted-foreground mb-2 flex items-center justify-between text-[11px] tracking-wider uppercase"
      >
        <span>{{ title() }}</span>
        <span>Visitors</span>
      </div>
      <div class="space-y-1.5">
        @for (row of rows(); track row.label) {
          <div
            class="relative flex items-center justify-between overflow-hidden rounded-md px-2 py-1.5 text-xs"
          >
            <div
              class="bg-chart-2/20 absolute inset-y-0 left-0 rounded-md"
              [style.width.%]="percent(row.value)"
              aria-hidden="true"
            ></div>
            <span class="text-foreground/90 relative truncate pr-2">{{ row.label }}</span>
            <span class="text-foreground relative font-medium tabular-nums">{{
              row.value | number
            }}</span>
          </div>
        }
      </div>
    </z-card>
  `,
})
export class BreakdownCardComponent {
  readonly title = input.required<string>();
  readonly rows = input.required<BreakdownRow[]>();

  private readonly maxRowValue = computed(() => {
    const rows = this.rows();
    return rows.length > 0 ? Math.max(...rows.map((row) => row.value)) : 0;
  });

  protected percent(value: number): number {
    const max = this.maxRowValue();
    return max ? (value / max) * 100 : 0;
  }
}
