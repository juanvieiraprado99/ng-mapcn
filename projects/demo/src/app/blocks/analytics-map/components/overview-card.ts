import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideTrendingUp } from '@ng-icons/lucide';

import { ZardCardComponent } from '@/shared/components/card';
import { ZardChartImports, type ZardChartSeries } from '@/shared/components/chart';

import {
  deviceCategoryChartConfig,
  deviceCategoryData,
  usersPerDay,
  usersPerDayChartConfig,
} from '../data';

@Component({
  selector: 'app-overview-card',
  standalone: true,
  imports: [NgIcon, ZardCardComponent, ZardChartImports],
  viewProviders: [provideIcons({ lucideTrendingUp })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <z-card class="bg-card/80 absolute top-4 left-4 z-10 w-60 gap-1 backdrop-blur-sm">
      <div class="pb-3">
        <p class="text-muted-foreground pb-2 text-[10px] tracking-wider uppercase">
          Users in last 30 days
        </p>
        <p class="text-3xl leading-none font-semibold">17,234</p>
      </div>

      <z-chart
        zType="area"
        class="aspect-auto h-14 w-full"
        [zConfig]="usersConfig"
        [zData]="usersPerDay"
        [zSeries]="usersSeries"
        zXAxisKey="day"
        [zXAxis]="false"
        [zGrid]="false"
        [zGradient]="true"
        [zSsrHeight]="56"
      />
      <div class="mt-2 flex items-center gap-1.5 text-xs">
        <ng-icon name="lucideTrendingUp" class="text-foreground" size="12" />
        <span class="text-foreground font-medium">+12.5%</span>
        <span class="text-muted-foreground">vs previous 30 days</span>
      </div>

      <div class="border-border/60 mt-4 border-t pt-4">
        <p class="text-muted-foreground text-[10px] tracking-wider uppercase">
          Device category in last 30 days
        </p>

        <z-chart
          zType="pie"
          class="mx-auto mt-3 aspect-square h-32 w-32"
          [zConfig]="deviceConfig"
          [zData]="devices"
          [zSeries]="deviceSeries"
          zNameKey="name"
          [zInnerRadius]="32"
          [zOuterRadius]="52"
          [zSsrWidth]="128"
          [zSsrHeight]="128"
        />

        <div class="mt-3 grid grid-cols-3 gap-2">
          @for (device of devices; track device.name) {
            <div class="text-center">
              <p
                class="text-muted-foreground flex items-center justify-center gap-1.5 text-[10px] tracking-wide uppercase"
              >
                <span class="size-2 rounded-full" [style.background-color]="device.fill"></span>
                {{ device.name }}
              </p>
              <p class="text-foreground mt-1 leading-none font-medium tabular-nums">
                {{ device.value }}%
              </p>
            </div>
          }
        </div>
      </div>
    </z-card>
  `,
})
export class OverviewCardComponent {
  protected readonly usersPerDay = usersPerDay;
  protected readonly usersConfig = usersPerDayChartConfig;
  protected readonly usersSeries: ZardChartSeries[] = [
    { dataKey: 'users', smooth: true, strokeWidth: 1.5, showSymbol: false },
  ];

  protected readonly devices = deviceCategoryData;
  protected readonly deviceConfig = deviceCategoryChartConfig;
  protected readonly deviceSeries: ZardChartSeries[] = [{ dataKey: 'value', strokeWidth: 2 }];
}
