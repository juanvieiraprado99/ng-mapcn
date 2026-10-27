import { computed, Injectable, type Signal, signal } from '@angular/core';

import { cumulativeLengths } from '../../utils/map-utils';

/** Signals `<ng-map-route>` hands to its children (the route's own inputs / computeds). */
export interface RouteSources {
  coordinates: Signal<[number, number][]>;
  progress: Signal<number | undefined>;
  layerId: Signal<string>;
  beforeId: Signal<string | undefined>;
  created: Signal<boolean>;
  width: Signal<number>;
}

const EMPTY: RouteSources = {
  coordinates: computed(() => []),
  progress: computed(() => undefined),
  layerId: computed(() => ''),
  beforeId: computed(() => undefined),
  created: computed(() => false),
  width: computed(() => 3),
};

/** State `<ng-map-route>` shares with its `<ng-route-progress>` / `<ng-route-marker>` children. */
@Injectable()
export class RouteContextService {
  private readonly sourcesSignal = signal<RouteSources>(EMPTY);
  private readonly override = signal<number | undefined>(undefined);
  private readonly progressSignal = computed(
    () => this.override() ?? this.sourcesSignal().progress(),
  );

  private get sources(): RouteSources {
    return this.sourcesSignal();
  }

  /** Called once by `<ng-map-route>`: children then read the route's own signals directly. */
  connect(sources: RouteSources): void {
    this.sourcesSignal.set(sources);
  }

  /** Lets a child (`<ng-route-playback>`) drive the progress instead of the route's input; `undefined` clears it. */
  setProgressOverride(value: number | undefined): void {
    this.override.set(value);
  }

  get coordinates(): Signal<[number, number][]> {
    return this.sources.coordinates;
  }
  /** Covered fraction (0-1): the child override when set, else the route's `progress` input; `undefined` when neither. */
  get progress(): Signal<number | undefined> {
    return this.progressSignal;
  }
  get layerId(): Signal<string> {
    return this.sources.layerId;
  }
  get beforeId(): Signal<string | undefined> {
    return this.sources.beforeId;
  }
  /** The route's own source and layer exist on the current style (false mid theme switch). */
  get created(): Signal<boolean> {
    return this.sources.created;
  }
  /** Effective width of the base line (progress falls back to it). */
  get width(): Signal<number> {
    return this.sources.width;
  }

  /** Cumulative vertex distances of `coordinates`, measured once per coordinates array. */
  readonly cumulative = computed(() => cumulativeLengths(this.coordinates()));
}
