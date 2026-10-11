import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ZardSidebarImports } from '@/shared/components/sidebar';
import { LocatorMapComponent } from './components/locator-map';
import { StoreListComponent } from './components/store-list';
import { MAP_CENTER, stores } from './data';

@Component({
  selector: 'app-store-locator-block',
  standalone: true,
  imports: [ZardSidebarImports, LocatorMapComponent, StoreListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <z-sidebar-provider [zDefaultOpen]="true" style="--sidebar-width: 20rem">
      <app-store-list
        [stores]="filtered()"
        [query]="query()"
        [selectedId]="selectedId()"
        (queryChange)="query.set($event)"
        (selectStore)="selectedId.set($event)"
      />

      <z-sidebar-inset>
        <app-locator-map
          [stores]="filtered()"
          [selectedId]="selectedId()"
          [center]="center"
          (selectStore)="selectedId.set($event)"
          (clearSelection)="selectedId.set(null)"
        />
      </z-sidebar-inset>
    </z-sidebar-provider>
  `,
})
export class StoreLocatorBlockComponent {
  protected readonly center = MAP_CENTER;
  protected readonly query = signal('');
  protected readonly selectedId = signal<string | null>(stores[0].id);

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return stores;
    return stores.filter(
      (store) =>
        store.name.toLowerCase().includes(q) ||
        store.address.toLowerCase().includes(q) ||
        store.neighborhood.toLowerCase().includes(q),
    );
  });
}
