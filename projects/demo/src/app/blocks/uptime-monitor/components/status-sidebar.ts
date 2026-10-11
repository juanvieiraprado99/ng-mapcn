import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { type EdgeNode, getNetworkSummary, statusMeta } from '../data';

@Component({
  selector: 'app-status-sidebar',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bg-card flex w-56 shrink-0 flex-col overflow-hidden border-r' },
  template: `
    <div class="border-b p-3">
      <p class="text-foreground text-sm font-semibold">Edge Network</p>

      <div class="mt-2 flex items-center gap-1.5">
        <span class="size-2 rounded-full" [class]="summaryMeta().dot"></span>
        <span class="text-xs font-medium" [class]="summaryMeta().text">{{ summary().label }}</span>
      </div>

      <div class="mt-3 grid grid-cols-2 gap-2">
        <div class="bg-background/60 rounded-md border p-2">
          <p class="text-muted-foreground text-[10px] tracking-wide uppercase">Uptime</p>
          <p class="text-foreground text-sm font-semibold tabular-nums">
            {{ summary().avgUptime | number: '1.2-2' }}%
          </p>
        </div>
        <div class="bg-background/60 rounded-md border p-2">
          <p class="text-muted-foreground text-[10px] tracking-wide uppercase">Edges up</p>
          <p class="text-foreground text-sm font-semibold tabular-nums">
            {{ summary().operational
            }}<span class="text-muted-foreground font-normal">/{{ summary().total }}</span>
          </p>
        </div>
      </div>
    </div>

    <ul class="flex-1 divide-y overflow-y-auto">
      @for (node of nodes(); track node.id) {
        <li class="flex items-center gap-2.5 px-3 py-2">
          <span class="size-2 shrink-0 rounded-full" [class]="meta[node.status].dot"></span>

          <div class="min-w-0 flex-1">
            <p class="text-foreground truncate text-xs font-medium">{{ node.city }}</p>
            <p class="text-muted-foreground truncate text-[10px]">{{ node.region }}</p>
          </div>

          <div class="flex shrink-0 flex-col items-end">
            <span class="text-muted-foreground font-mono text-[10px] uppercase">{{ node.id }}</span>
            <span class="text-foreground font-mono text-[10px] tabular-nums">
              {{ node.status === 'down' ? '—' : node.latency + 'ms' }}
            </span>
          </div>
        </li>
      }
    </ul>
  `,
})
export class StatusSidebarComponent {
  readonly nodes = input.required<EdgeNode[]>();

  protected readonly meta = statusMeta;
  protected readonly summary = computed(() => getNetworkSummary(this.nodes()));
  protected readonly summaryMeta = computed(() => statusMeta[this.summary().status]);
}
