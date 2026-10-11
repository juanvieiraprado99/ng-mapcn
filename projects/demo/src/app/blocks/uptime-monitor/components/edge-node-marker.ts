import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MapMarkerComponent, MarkerContentComponent, MarkerTooltipComponent } from 'ng-mapcn';

import { type EdgeNode, statusMeta } from '../data';

@Component({
  selector: 'app-edge-node-marker',
  standalone: true,
  imports: [DecimalPipe, MapMarkerComponent, MarkerContentComponent, MarkerTooltipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-map-marker [longitude]="node().lng" [latitude]="node().lat">
      <ng-marker-content>
        <div class="group flex size-4 items-center justify-center">
          <span
            class="inline-flex size-2 rounded-full transition-transform group-hover:scale-125"
            [class]="meta().dot"
          ></span>
        </div>
      </ng-marker-content>
      <ng-marker-tooltip [offset]="10">
        <!-- map-tooltip-surface: draws its own surface (see styles.scss). -->
        <div
          class="map-tooltip-surface bg-popover text-popover-foreground min-w-28 rounded-md border p-2 text-xs shadow-md"
        >
          <div class="flex items-center gap-1.5">
            <span class="size-1.5 rounded-full" [class]="meta().dot"></span>
            <span class="text-[11px] font-medium">{{ node().city }}</span>
            <span class="text-muted-foreground ml-auto font-mono text-[11px] uppercase">{{
              node().id
            }}</span>
          </div>
          <div
            class="text-muted-foreground mt-1.5 flex items-center justify-between gap-3 text-[11px]"
          >
            <span>{{ node().status === 'down' ? '—' : node().latency + ' ms' }}</span>
            <span class="tabular-nums">{{ node().uptime | number: '1.2-2' }}%</span>
          </div>
        </div>
      </ng-marker-tooltip>
    </ng-map-marker>
  `,
})
export class EdgeNodeMarkerComponent {
  readonly node = input.required<EdgeNode>();

  protected readonly meta = computed(() => statusMeta[this.node().status]);
}
