import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { OsrmRouteData, OsrmRouteOptions } from '../../models/osrm.interface';
import { RouteConfig } from '../../models/route-config.interface';
import { MapService } from '../../services/map.service';
import { MarkerService } from '../../services/marker.service';
import { OsrmService } from '../../services/osrm.service';
import { MarkerComponent } from '../marker/marker.component';
import { RouteComponent } from '../route/route.component';

@Component({
  selector: 'ng-route-planning',
  standalone: true,
  imports: [RouteComponent, MarkerComponent],
  templateUrl: './route-planning.component.html',
  styleUrl: './route-planning.component.scss',
})
export class RoutePlanningComponent {
  start = input.required<{ lng: number; lat: number; name?: string }>();
  end = input.required<{ lng: number; lat: number; name?: string }>();
  mapId = input<string>('default-map');
  selectedRouteIndex = input<number>(0);
  osrmOptions = input<OsrmRouteOptions>();

  routesLoaded = output<OsrmRouteData[]>();
  routeSelected = output<{ index: number; route: OsrmRouteData }>();
  loadingChange = output<boolean>();

  private routes = signal<OsrmRouteData[]>([]);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  private mapService = inject(MapService);
  private osrmService = inject(OsrmService);
  private markerService = inject(MarkerService);
  private destroyRef = inject(DestroyRef);
  private lastStartEnd: string | null = null;
  private isFetching = false;

  // Computed route configs based on routes and selected index
  routeConfigs = computed(() => {
    const routes = this.routes();
    const selectedIndex = this.selectedRouteIndex();

    if (routes.length === 0) {
      return [];
    }

    const newConfigs: RouteConfig[] = routes.map((route, index) => {
      const isSelected = index === selectedIndex;
      const config: RouteConfig = {
        id: `osrm-route-${index}`,
        coordinates: [...route.coordinates],
        color: isSelected ? '#6366f1' : '#94a3b8',
        width: isSelected ? 6 : 5,
        opacity: isSelected ? 1 : 0.6,
        lineCap: 'round' as const,
        lineJoin: 'round' as const,
        osrmData: route,
      };

      return config;
    });

    const sorted = [...newConfigs];
    sorted.sort((a, b) => {
      const aIndex = this.getRouteIndex(a.id!);
      const bIndex = this.getRouteIndex(b.id!);
      if (aIndex === selectedIndex) return 1;
      if (bIndex === selectedIndex) return -1;
      return aIndex - bIndex;
    });

    return sorted;
  });

  constructor() {
    effect(
      () => {
        const mapId = this.mapId();
        const start = this.start();
        const end = this.end();
        const mapSignal = this.mapService.getMapSignal(mapId);
        const map = mapSignal();

        const routes = untracked(() => this.routes());
        const isLoading = untracked(() => this.isLoading());

        if (map && start && end && routes.length === 0 && !isLoading && !this.isFetching) {
          const startEndKey = `${start.lng},${start.lat}-${end.lng},${end.lat}`;

          if (this.lastStartEnd !== startEndKey) {
            this.lastStartEnd = startEndKey;
            setTimeout(() => {
              const currentRoutes = untracked(() => this.routes());
              const currentLoading = untracked(() => this.isLoading());
              if (currentRoutes.length === 0 && !currentLoading && !this.isFetching) {
                this.fetchRoutes();
              }
            }, 0);
          }
        }
      },
      { allowSignalWrites: true }
    );

    effect(
      () => {
        const start = this.start();
        const end = this.end();

        if (!start || !end) {
          return;
        }

        const routes = untracked(() => this.routes());
        const startEndKey = `${start.lng},${start.lat}-${end.lng},${end.lat}`;

        if (routes.length > 0 && this.lastStartEnd !== null && this.lastStartEnd !== startEndKey && !this.isFetching) {
          this.lastStartEnd = startEndKey;
          this.fetchRoutes();
        }
      },
      { allowSignalWrites: true }
    );

    this.destroyRef.onDestroy(() => {
      this.routes.set([]);
      this.lastStartEnd = null;
    });
  }

  async fetchRoutes(): Promise<void> {
    if (this.isFetching) {
      return;
    }

    const start = this.start();
    const end = this.end();
    const osrmOptions = this.osrmOptions();

    if (!start || !end) {
      return;
    }

    this.isFetching = true;
    this.isLoading.set(true);
    this.loadingChange.emit(true);
    this.error.set(null);

    try {
      const routes = await this.osrmService.getRoutes(start, end, osrmOptions);
      this.routes.set(routes);
      this.routesLoaded.emit(routes);

      const selectedIndex = this.selectedRouteIndex();
      if (selectedIndex >= routes.length) {
        // Index out of bounds, will be handled by parent
      }
    } catch (error: any) {
      this.error.set(error.message || 'Failed to fetch routes');
    } finally {
      this.isLoading.set(false);
      this.loadingChange.emit(false);
      this.isFetching = false;
    }
  }

  selectRoute(index: number): void {
    const routes = this.routes();
    if (index < 0 || index >= routes.length) {
      return;
    }

    // Emit to parent - parent should update [selectedRouteIndex] input
    this.routeSelected.emit({
      index,
      route: routes[index],
    });
  }

  getRouteIndex(routeId: string | undefined): number {
    if (!routeId) return 0;
    const match = routeId.match(/osrm-route-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Format duration using OsrmService
   */
  formatDuration(seconds: number): string {
    return this.osrmService.formatDuration(seconds);
  }

  formatDistance(meters: number): string {
    return this.osrmService.formatDistance(meters);
  }
}
