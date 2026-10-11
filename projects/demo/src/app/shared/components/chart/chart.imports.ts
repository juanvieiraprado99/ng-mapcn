import { ZardChartComponent } from '@/shared/components/chart/chart.component';
import { ZardChartLegendComponent } from '@/shared/components/chart/chart-legend.component';
import { ZardChartTooltipComponent } from '@/shared/components/chart/chart-tooltip.component';

export const ZardChartImports = [
  ZardChartComponent,
  ZardChartTooltipComponent,
  ZardChartLegendComponent,
] as const;
