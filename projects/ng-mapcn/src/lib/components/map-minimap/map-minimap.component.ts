import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  input,
  model,
  NgZone,
  PLATFORM_ID,
  signal,
  type TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';
import { type Feature, type Polygon } from 'geojson';
import {
  type GeoJSONSource,
  Map as MapLibre,
  type Map as MapLibreMap,
  type StyleSpecification,
} from 'maplibre-gl';

import { injectMapLabels, type MapLabels } from '../../providers/map-labels.provider';
import { MapContextService } from '../../services/map-context.service';
import { blankMapStyle, defaultStyles, type MapStylesConfig } from '../../styles/map-styles';
import { classTokens } from '../../utils/class-name';
import { addMapLayers } from '../../utils/layers';
import { type MapControlPosition, mountMapControl } from '../../utils/map-control';
import { nextId } from '../../utils/map-utils';

type MapStyle = string | StyleSpecification;

const FOOTPRINT_SOURCE = 'ng-minimap-footprint';
const FOOTPRINT_FILL = 'ng-minimap-footprint-fill';
const FOOTPRINT_LINE = 'ng-minimap-footprint-line';
const KEY_PAN = 100;
const KEY_OFFSETS: Record<string, [number, number]> = {
  ArrowRight: [KEY_PAN, 0],
  ArrowLeft: [-KEY_PAN, 0],
  ArrowUp: [0, -KEY_PAN],
  ArrowDown: [0, KEY_PAN],
};
const footprintColor = (theme: 'light' | 'dark') => (theme === 'dark' ? '#60a5fa' : '#3b82f6');

/**
 * Overview map: a second MapLibre instance in a corner of `<ng-map>` that follows the main
 * viewport at a lower zoom. Collapsing it destroys the instance.
 */
@Component({
  selector: 'ng-map-minimap',
  templateUrl: './map-minimap.component.html',
  styleUrl: './map-minimap.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ng-map-minimap-host' },
})
export class MapMinimapComponent {
  readonly position = input<MapControlPosition>('bottom-left');
  /** Width of the map area, in pixels. */
  readonly width = input(200);
  /** Height of the map area, in pixels. */
  readonly height = input(150);
  /** The minimap zoom is `max(mainZoom - zoomOffset, 0)`. */
  readonly zoomOffset = input(5);
  /** Own basemap (themed variant by the resolved theme). Wins over `blank`. */
  readonly styles = input<MapStylesConfig>();
  /** Uses the blank style; ignored when `styles` is set. */
  readonly blank = input(false);
  /** Whether the overview map is collapsed. Collapsing destroys the minimap instance. */
  readonly collapsed = model(false);

  /** Per-component label overrides, merged over `provideMapLabels` and the English defaults. */
  readonly labels = input<Partial<MapLabels>>();
  /** Extra space-separated classes for the rendered `.ng-minimap` element (reactive). */
  readonly className = input<string>();

  private readonly control = viewChild.required<TemplateRef<unknown>>('control');
  protected readonly id = nextId('ng-minimap');
  protected readonly rootClass = computed(() =>
    classTokens(this.className(), ['ng-minimap']).join(' '),
  );

  // Hierarchical DI: throws when placed outside <ng-map>, like mapcn's useMap()
  protected readonly l = injectMapLabels(this.labels);
  private readonly ctx = inject(MapContextService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly injector = inject(Injector);
  private readonly zone = inject(NgZone);

  /** The map element inside the mounted card; `null` until the portal view has rendered. */
  private readonly mapElement = signal<HTMLElement | null>(null);
  /** The live minimap instance; `null` while collapsed, unmounted or destroyed. */
  private readonly minimap = signal<MapLibreMap | null>(null);
  /** Set while the minimap drives the main map, so the main `move` does not echo back. */
  private syncing = false;
  /** True from a minimap `dragend` until the next macrotask: filters the click ending the drag. */
  private dragged = false;
  private draggedTimer: ReturnType<typeof setTimeout> | undefined;
  private appliedStyle: MapStyle | null = null;

  /** `styles` (themed) > `blank` > the main map's effective style. */
  private readonly style = computed<MapStyle>(() => {
    const theme = this.ctx.resolvedTheme();
    const styles = this.styles();
    if (styles) return styles[theme] ?? defaultStyles[theme];
    if (this.blank()) return blankMapStyle;
    return this.ctx.currentStyle() ?? defaultStyles[theme];
  });

  constructor() {
    // Mounted as a MapLibre control, so the corner containers stack it with the other controls.
    effect((onCleanup) => {
      const map = this.ctx.map();
      if (!map || !this.isBrowser) return;
      const unmount = mountMapControl(map, this.control(), this.injector, this.position());
      onCleanup(() => {
        this.mapElement.set(null);
        unmount();
      });
      // The portal renders synchronously, but wait for this render to finish before using it.
      afterNextRender(
        () =>
          this.mapElement.set(
            map
              .getContainer()
              .querySelector<HTMLElement>(`[data-minimap-id="${this.id}"] .ng-minimap-map`),
          ),
        { injector: this.injector },
      );
    });

    // The instance exists while the main map, the mounted element and an expanded state do.
    effect((onCleanup) => {
      const main = this.ctx.map();
      const container = this.mapElement();
      if (!main || !container || this.collapsed()) return;

      const { center, zoom, style } = untracked(() => ({
        center: main.getCenter(),
        zoom: this.minimapZoom(main),
        style: this.style(),
      }));
      let mini: MapLibreMap;
      try {
        mini = this.zone.runOutsideAngular(
          () =>
            new MapLibre({
              container,
              style,
              center: [center.lng, center.lat],
              zoom,
              interactive: true,
              attributionControl: false,
              renderWorldCopies: false,
              scrollZoom: false,
              boxZoom: false,
              dragRotate: false,
              doubleClickZoom: false,
              touchZoomRotate: false,
              keyboard: false,
              pitchWithRotate: false,
            }),
        );
      } catch (error) {
        this.ctx.reportError(error);
        return;
      }
      // A style may declare a globe projection: keep the overview flat on every style load (the
      // initial one and each mirrored setStyle). remove() drops the minimap's own listeners.
      mini.on('style.load', () => {
        try {
          mini.setProjection({ type: 'mercator' });
        } catch {
          // the minimap may be mid-removal
        }
      });
      // The style swap drops custom layers: draw the footprint on load and after every style load.
      const addFootprint = () => this.addFootprint(main, mini);
      mini.on('load', addFootprint);
      mini.on('style.load', addFootprint);
      // Minimap -> main. remove() drops these listeners with the instance.
      mini.on('drag', (event) => {
        if (!event.originalEvent) return;
        this.syncing = true;
        try {
          main.jumpTo({ center: mini.getCenter() });
        } finally {
          this.syncing = false;
        }
      });
      mini.on('dragend', () => {
        this.dragged = true;
        clearTimeout(this.draggedTimer);
        this.draggedTimer = setTimeout(() => (this.dragged = false), 0);
      });
      mini.on('click', (event) => {
        if (this.dragged) return;
        main.easeTo({ center: [event.lngLat.lng, event.lngLat.lat] });
      });
      this.appliedStyle = style;
      this.minimap.set(mini);

      onCleanup(() => {
        clearTimeout(this.draggedTimer);
        this.dragged = false;
        this.minimap.set(null);
        try {
          mini.remove();
        } catch {
          // already removed
        }
      });
    });

    // Follow changes of the resolved style (theme, style switcher, own `styles`).
    effect(() => {
      const mini = this.minimap();
      const style = this.style();
      if (!mini || style === this.appliedStyle) return;
      this.appliedStyle = style;
      try {
        mini.setStyle(style, { diff: true });
      } catch (error) {
        this.ctx.reportError(error);
      }
    });

    // Main -> minimap: bound while the minimap exists, outside the zone.
    effect((onCleanup) => {
      const main = this.ctx.map();
      const mini = this.minimap();
      if (!main || !mini) return;
      const onMove = () => {
        if (!this.syncing) this.follow(main, mini);
        this.updateFootprint(main, mini);
      };
      this.zone.runOutsideAngular(() => main.on('move', onMove));
      onCleanup(() => {
        try {
          main.off('move', onMove);
        } catch {
          // the main map may already be removed
        }
      });
    });

    // Footprint color follows the resolved theme.
    effect(() => {
      const mini = this.minimap();
      const color = footprintColor(this.ctx.resolvedTheme());
      if (!mini) return;
      try {
        if (mini.getLayer(FOOTPRINT_FILL))
          mini.setPaintProperty(FOOTPRINT_FILL, 'fill-color', color);
        if (mini.getLayer(FOOTPRINT_LINE))
          mini.setPaintProperty(FOOTPRINT_LINE, 'line-color', color);
      } catch {
        // the minimap may be mid-removal
      }
    });

    // Initial sync once the minimap exists, and again when the offset changes.
    effect(() => {
      const main = this.ctx.map();
      const mini = this.minimap();
      this.zoomOffset();
      if (!main || !mini) return;
      untracked(() => this.follow(main, mini));
    });
  }

  protected toggle(): void {
    this.collapsed.update((value) => !value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const offset = KEY_OFFSETS[event.key];
    const main = this.ctx.map();
    if (!offset || !main) return;
    event.preventDefault();
    main.panBy(offset);
  }

  private minimapZoom(main: MapLibreMap): number {
    return Math.max(main.getZoom() - this.zoomOffset(), 0);
  }

  private follow(main: MapLibreMap, mini: MapLibreMap): void {
    const center = main.getCenter();
    mini.jumpTo({ center: [center.lng, center.lat], zoom: this.minimapZoom(main) });
  }

  /** Ring of the main viewport (canvas corners, so bearing and pitch are right). */
  private footprint(main: MapLibreMap): Feature<Polygon> {
    const canvas = main.getCanvas();
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const corner = (x: number, y: number): [number, number] => {
      const p = main.unproject([x, y]);
      return [p.lng, p.lat];
    };
    const tl = corner(0, 0);
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[tl, corner(w, 0), corner(w, h), corner(0, h), tl]],
      },
    };
  }

  private addFootprint(main: MapLibreMap, mini: MapLibreMap): void {
    try {
      if (mini.getSource(FOOTPRINT_SOURCE)) return;
      const color = untracked(() => footprintColor(this.ctx.resolvedTheme()));
      addMapLayers(
        mini,
        (b) => {
          b.addSource(FOOTPRINT_SOURCE, { type: 'geojson', data: this.footprint(main) });
          b.addLayer({
            id: FOOTPRINT_FILL,
            type: 'fill',
            source: FOOTPRINT_SOURCE,
            paint: { 'fill-color': color, 'fill-opacity': 0.15 },
          });
          b.addLayer({
            id: FOOTPRINT_LINE,
            type: 'line',
            source: FOOTPRINT_SOURCE,
            paint: { 'line-color': color, 'line-width': 1.5 },
          });
        },
        (error) => this.ctx.reportError(error),
      );
    } catch {
      // the minimap may be mid-removal
    }
  }

  private updateFootprint(main: MapLibreMap, mini: MapLibreMap): void {
    try {
      (mini.getSource(FOOTPRINT_SOURCE) as GeoJSONSource | undefined)?.setData(
        this.footprint(main),
      );
    } catch {
      // the minimap may be mid-removal
    }
  }
}
