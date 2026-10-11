import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ZardSidebarImports } from '@/shared/components/sidebar';
import { FilterSidebarComponent } from './components/filter-sidebar';
import { NetworkMapComponent } from './components/network-map';
import { hubs, routes } from './data';

@Component({
  selector: 'app-logistics-network-block',
  standalone: true,
  imports: [ZardSidebarImports, FilterSidebarComponent, NetworkMapComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <z-sidebar-provider [zDefaultOpen]="true">
      <app-filter-sidebar [hubs]="hubs" [routes]="routes" />
      <z-sidebar-inset>
        <app-network-map [hubs]="hubs" [routes]="routes" />
      </z-sidebar-inset>
    </z-sidebar-provider>
  `,
})
export class LogisticsNetworkBlockComponent {
  protected readonly hubs = hubs;
  protected readonly routes = routes;
}
