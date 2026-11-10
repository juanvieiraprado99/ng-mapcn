import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { ZardTableImports } from '@/shared/components/table';
import { LanguageService } from '@/shared/i18n/language.service';

export interface PropRow {
  name: string;
  type: string;
  default: string;
  description: string;
  /** pt-BR description; the English one is used when omitted. */
  descriptionPt?: string;
}

/** mapcn `DocsPropTable`: borderless API table with code-chip cells. */
@Component({
  selector: 'app-prop-table',
  standalone: true,
  imports: [ZardTableImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'prop-table block space-y-3 [.prop-table+&]:mt-8', '[attr.title]': 'null' },
  template: `
    @if (i18n.isPt() ? (titlePt() ?? title()) : title(); as heading) {
      <h3 class="text-foreground font-semibold">{{ heading }}</h3>
    }
    <div class="relative w-full overflow-x-auto">
      <table
        z-table
        class="[&_tbody_tr:last-child]:border-b [&_td:first-child]:pl-0 [&_td:last-child]:pr-0 [&_th:first-child]:pl-0 [&_th:last-child]:pr-0"
      >
        <thead z-table-header>
          <tr z-table-row>
            <th z-table-head class="h-10 text-xs font-medium">{{ nameLabel() }}</th>
            <th z-table-head class="h-10 text-xs font-medium">{{ t().type }}</th>
            @if (showDefault()) {
              <th z-table-head class="h-10 text-xs font-medium">{{ t().default }}</th>
            }
            <th z-table-head class="h-10 text-xs font-medium">{{ t().description }}</th>
          </tr>
        </thead>
        <tbody z-table-body>
          @for (row of rows(); track row.name) {
            <tr z-table-row>
              <td z-table-cell class="py-3 align-top">
                <code [class]="code + ' text-[13px]'">{{ row.name }}</code>
              </td>
              <td z-table-cell class="py-3 align-top whitespace-normal">
                <code [class]="code + ' text-foreground/70 text-xs'">{{ row.type }}</code>
              </td>
              @if (showDefault()) {
                <td z-table-cell class="py-3 align-top">
                  <code [class]="code + ' text-foreground/70 text-xs whitespace-normal'">{{
                    row.default || '—'
                  }}</code>
                </td>
              }
              <td
                z-table-cell
                class="text-foreground/70 min-w-[180px] py-3 text-sm leading-relaxed whitespace-normal"
              >
                {{ i18n.isPt() ? (row.descriptionPt ?? row.description) : row.description }}
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class PropTableComponent {
  readonly rows = input.required<PropRow[]>();
  readonly title = input<string>();
  readonly titlePt = input<string>();
  /** Header of the first column ("Prop", "Input", "Output", ...). */
  readonly nameLabel = input('Prop');
  /** Shows the Default column; turn it off for rows that have no defaults (functions, exports). */
  readonly showDefault = input(true);

  protected readonly i18n = inject(LanguageService);
  protected readonly t = computed(() => this.i18n.messages().docs);

  /** mapcn `DocsCode` chip. */
  protected readonly code = 'bg-muted relative rounded-md px-1.5 py-0.5 font-mono';
}
