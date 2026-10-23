import { DOCUMENT, Location, NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCheck,
  lucideChevronDown,
  lucideChevronUp,
  lucideCopy,
  lucideEraser,
  lucideFocus,
  lucideLink,
  lucideRotateCcw,
} from '@ng-icons/lucide';
import type { MarkerOptions } from 'maplibre-gl';
import { MapComponent, type MapViewport } from 'ng-mapcn';

import { FooterComponent } from '@/layout/footer';
import { BasemapService } from '@/shared/basemap.service';
import { CodeBlockComponent } from '@/shared/code-block';
import { ZardButtonComponent } from '@/shared/components/button';
import { PageHeaderImports } from '@/shared/page-header';

import apiData from '../docs/api-reference.data.json';
import {
  BLOCK_ICON_SET,
  blockIcon,
  PlaygroundLayersComponent,
  PlaygroundPaletteComponent,
} from './playground-blocks';
import { PLAYGROUND_COMPONENTS } from './playground-components';
import { type ControlChange, PlaygroundControlsComponent } from './playground-controls';
import { PLAYGROUND_EXAMPLES, type PlaygroundExample } from './playground-examples';
import { PlaygroundMarkerComponent } from './playground-marker';
import { PlaygroundPopupComponent } from './playground-popup';
import {
  addLayer,
  decodeScene,
  defaultScene,
  duplicateLayer,
  encodeScene,
  frameSpec,
  LAYER_SPECS,
  layerSpec,
  moveLayer,
  removeLayer,
  type SceneLayer,
  updateLayer,
} from './playground-scene';
import {
  buildSceneSnippet,
  type PlaygroundSpec,
  resolveInputs,
  type Values,
} from './playground-schema';
import { findSpec, PLAYGROUND_SPECS } from './playground-specs';
import {
  applyPreset,
  BUILDING_PRESETS,
  findPreset,
  MAP_CONTROLS,
  mapInputs,
  mapSnippetInput,
  type MapState,
  presetSnippet,
  resolveStyles,
  STYLE_PRESETS,
  type StylePreset,
  updateMapState,
} from './style-presets';

type SnippetTab = 'template' | 'component';

interface ApiInput {
  name: string;
  description: string;
}
interface ApiSection {
  selector: string;
  inputs: ApiInput[];
}

/** Reuses the API reference's input descriptions as the controls' hints. */
function describeControls(spec: PlaygroundSpec): PlaygroundSpec {
  const section = (apiData.sections as ApiSection[]).find((s) => s.selector === spec.selector);
  if (!section) return spec;
  return {
    ...spec,
    controls: spec.controls.map((control) => {
      const name = control.into?.input ?? control.key;
      const description = section.inputs.find((input) => input.name === name)?.description;
      // Grouped controls share one object input, whose description would not fit each of them.
      if (control.description || control.into || !description) return control;
      return { ...control, description };
    }),
  };
}

/** The marker is rendered by its wrapper (anchor re-create and `dragEnd`), not the outlet. */
function markerInputs(values: Values) {
  return {
    longitude: Number(values['longitude']),
    latitude: Number(values['latitude']),
    draggable: values['draggable'] === true,
    rotation: Number(values['rotation']),
    anchor: values['anchor'] as MarkerOptions['anchor'],
  };
}

function popupInputs(values: Values) {
  return {
    longitude: Number(values['longitude']),
    latitude: Number(values['latitude']),
    open: values['open'] !== false,
    closeButton: values['closeButton'] === true,
    closeOnClick: values['closeOnClick'] !== false,
  };
}

/** Tilted presets frame a city; the rest show the whole world. */
const GALLERY_VIEW = { center: [2.35, 30] as [number, number], zoom: 1.2 };
const GALLERY_TILT_VIEW = { center: [-74.0134, 40.7061] as [number, number], zoom: 14 };

@Component({
  selector: 'app-playground',
  standalone: true,
  imports: [
    NgComponentOutlet,
    NgIcon,
    MapComponent,
    CodeBlockComponent,
    FooterComponent,
    PageHeaderImports,
    PlaygroundControlsComponent,
    PlaygroundLayersComponent,
    PlaygroundMarkerComponent,
    PlaygroundPaletteComponent,
    PlaygroundPopupComponent,
    ZardButtonComponent,
  ],
  viewProviders: [
    provideIcons({
      ...BLOCK_ICON_SET,
      lucideCheck,
      lucideChevronDown,
      lucideChevronUp,
      lucideCopy,
      lucideEraser,
      lucideFocus,
      lucideLink,
      lucideRotateCcw,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header align="left" size="sm">
      <app-page-header-heading>Playground</app-page-header-heading>
      <app-page-header-description>
        Build a map from blocks: drag components onto the layer stack, tune each one and watch the
        real map update. The code below always matches the whole scene, ready to paste into your
        app.
      </app-page-header-description>
    </app-page-header>

    <section class="container space-y-20" aria-label="Playground">
      <div
        id="builder"
        class="grid scroll-mt-20 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_18rem]"
      >
        <aside class="space-y-6" aria-label="Scene">
          <div>
            <h2 class="mb-3 text-sm font-semibold tracking-tight">Blocks</h2>
            <app-playground-palette
              [specs]="blocks"
              [disabled]="usedSingles()"
              (addBlock)="add($event)"
            />
          </div>
          <div>
            <h2 class="mb-3 text-sm font-semibold tracking-tight">
              Layers <span class="text-muted-foreground font-normal">(top first)</span>
            </h2>
            <app-playground-layers
              [layers]="layers()"
              [selected]="selectedUid()"
              [labels]="labels"
              (selectLayer)="selectedUid.set($event)"
              (toggleLayer)="toggle($event)"
              (moveLayer)="move($event)"
              (removeLayer)="remove($event)"
              (dropBlock)="add($event.specId, $event.index)"
            />
          </div>
        </aside>

        <div class="min-w-0 space-y-4">
          <div class="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Scene actions">
            <button z-button zType="outline" zSize="sm" type="button" (click)="copyLink()">
              <ng-icon [name]="linkCopied() ? 'lucideCheck' : 'lucideLink'" size="14" />
              {{ linkCopied() ? 'Link copied' : 'Copy link' }}
            </button>
            <button z-button zType="ghost" zSize="sm" type="button" (click)="clear()">
              <ng-icon name="lucideEraser" size="14" />
              Clear
            </button>
            <button z-button zType="ghost" zSize="sm" type="button" (click)="reset()">
              <ng-icon name="lucideRotateCcw" size="14" />
              Reset
            </button>
            <span class="sr-only" aria-live="polite">{{ linkCopied() ? 'Link copied' : '' }}</span>
          </div>

          @if (needsCarto(); as label) {
            <p
              role="status"
              class="bg-muted text-muted-foreground rounded-md border px-3 py-2 text-sm"
            >
              {{ label }} need building vector tiles: pick {{ buildingPresets }} in the Basemap
              control.
            </p>
          }
          <div class="bg-card relative h-[520px] overflow-hidden rounded-xl border shadow-sm">
            <ng-map
              class="block h-full w-full"
              [center]="initialView.center"
              [zoom]="initialView.zoom"
              [styles]="mapProps().styles"
              [blank]="mapProps().blank"
              [theme]="mapProps().theme"
              [projection]="mapProps().projection"
              [viewport]="viewport()"
              (viewportChange)="onViewport($event)"
            >
              <!-- Re-created when the drawing order changes, so the map stacks them as listed. -->
              @for (key of [renderKey()]; track key) {
                @for (item of rendered(); track item.layer.uid) {
                  @if (item.marker; as marker) {
                    <app-playground-marker
                      [longitude]="marker.longitude"
                      [latitude]="marker.latitude"
                      [draggable]="marker.draggable"
                      [rotation]="marker.rotation"
                      [anchor]="marker.anchor"
                      (moved)="onMarkerMoved(item.layer.uid, $event)"
                    />
                  } @else if (item.popup; as popup) {
                    <app-playground-popup
                      [longitude]="popup.longitude"
                      [latitude]="popup.latitude"
                      [open]="popup.open"
                      [closeButton]="popup.closeButton"
                      [closeOnClick]="popup.closeOnClick"
                      (openChange)="onLayerChange(item.layer.uid, { key: 'open', value: $event })"
                    />
                  } @else if (item.component; as component) {
                    <ng-container *ngComponentOutlet="component; inputs: item.inputs" />
                  }
                }
              }
            </ng-map>
          </div>

          <div class="space-y-2" id="snippet">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold tracking-tight">Code</h2>
              <div role="group" aria-label="Snippet" class="flex gap-1">
                @for (tab of tabs; track tab.id) {
                  <button
                    type="button"
                    class="hover:bg-accent aria-pressed:bg-muted rounded-md px-2.5 py-1 text-xs font-medium"
                    [attr.aria-pressed]="snippetTab() === tab.id"
                    (click)="snippetTab.set(tab.id)"
                  >
                    {{ tab.label }}
                  </button>
                }
              </div>
            </div>
            <app-code-block
              [code]="snippetCode()"
              [lang]="snippetTab() === 'template' ? 'angular-html' : 'angular-ts'"
            />
          </div>
        </div>

        <aside class="space-y-8 lg:col-span-2 xl:col-span-1" aria-label="Controls">
          @if (selected(); as current) {
            @for (key of [current.layer.uid]; track key) {
              <div>
                <div class="mb-1 flex items-center justify-between gap-2">
                  <h2 class="text-sm font-semibold tracking-tight">
                    {{ current.spec.label }} inputs
                    <span class="text-muted-foreground font-mono text-xs font-normal">{{
                      current.layer.name
                    }}</span>
                  </h2>
                  <div class="flex shrink-0">
                    <button
                      z-button
                      zType="ghost"
                      zSize="icon-sm"
                      type="button"
                      [attr.aria-label]="'Move ' + current.layer.name + ' up'"
                      [disabled]="current.index === 0"
                      (click)="move({ from: current.index, to: current.index - 1 })"
                    >
                      <ng-icon name="lucideChevronUp" size="14" />
                    </button>
                    <button
                      z-button
                      zType="ghost"
                      zSize="icon-sm"
                      type="button"
                      [attr.aria-label]="'Move ' + current.layer.name + ' down'"
                      [disabled]="current.index === layers().length - 1"
                      (click)="move({ from: current.index, to: current.index + 1 })"
                    >
                      <ng-icon name="lucideChevronDown" size="14" />
                    </button>
                    <button
                      z-button
                      zType="ghost"
                      zSize="icon-sm"
                      type="button"
                      [attr.aria-label]="'Duplicate ' + current.layer.name"
                      (click)="duplicate(current.layer.uid)"
                    >
                      <ng-icon name="lucideCopy" size="14" />
                    </button>
                    <button
                      z-button
                      zType="ghost"
                      zSize="icon-sm"
                      type="button"
                      [attr.aria-label]="'Frame ' + current.layer.name"
                      title="Move the camera to this layer's data"
                      (click)="frame(current.spec)"
                    >
                      <ng-icon name="lucideFocus" size="14" />
                    </button>
                  </div>
                </div>
                <p class="text-muted-foreground mb-3 text-xs">{{ current.spec.description }}</p>
                <app-playground-controls
                  [controls]="current.spec.controls"
                  [values]="current.layer.values"
                  [idPrefix]="'pg-' + current.layer.name"
                  (valueChange)="onLayerChange(current.layer.uid, $event)"
                />
              </div>
            }
          } @else {
            <p class="text-muted-foreground text-sm">Select a layer to edit its inputs.</p>
          }
          <div>
            <h2 class="mb-3 text-sm font-semibold tracking-tight">Map</h2>
            <app-playground-controls
              [controls]="mapControls"
              [values]="mapValues()"
              idPrefix="pg-map"
              (valueChange)="onMapChange($event)"
            />
          </div>
        </aside>
      </div>

      <section id="examples" class="scroll-mt-20 space-y-6" aria-labelledby="examples-title">
        <div>
          <h2 id="examples-title" class="text-2xl font-semibold tracking-tight">Examples</h2>
          <p class="text-muted-foreground mt-1 max-w-2xl text-sm">
            Ready-made scenes to start from: open one in the builder above, then tweak it, share it
            or copy its code.
          </p>
        </div>
        <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Examples">
          @for (example of examples; track example.id) {
            <li class="bg-card hover:bg-accent/50 relative rounded-xl border p-4 shadow-sm">
              <div class="mb-3 flex gap-1.5" aria-hidden="true">
                @for (block of example.blocks; track $index) {
                  <span class="bg-muted text-muted-foreground rounded-md p-1.5">
                    <ng-icon [name]="icon(block)" size="16" />
                  </span>
                }
              </div>
              <p class="text-sm font-medium">{{ example.title }}</p>
              <p class="text-muted-foreground mt-1 text-xs">{{ example.description }}</p>
              <button
                type="button"
                class="focus-visible:ring-ring absolute inset-0 rounded-xl outline-none focus-visible:ring-[3px]"
                [attr.aria-label]="'Open the ' + example.title + ' example'"
                (click)="loadExample(example)"
              ></button>
            </li>
          }
        </ul>
      </section>

      <section id="gallery" class="scroll-mt-20 space-y-6" aria-labelledby="gallery-title">
        <div>
          <h2 id="gallery-title" class="text-2xl font-semibold tracking-tight">Style gallery</h2>
          <p class="text-muted-foreground mt-1 max-w-2xl text-sm">
            Basemaps, projection and tilt, each previewed live. Pick one to apply it to the
            playground map above and copy the matching snippet.
          </p>
        </div>

        <ul class="grid grid-cols-2 gap-4 md:grid-cols-3" aria-label="Styles">
          @for (preset of presets; track preset.id) {
            <li
              class="bg-card relative overflow-hidden rounded-xl border shadow-sm"
              [class.ring-primary]="preset.id === mapState().presetId"
              [class.ring-2]="preset.id === mapState().presetId"
            >
              <div class="pointer-events-none h-36" aria-hidden="true" inert>
                <ng-map
                  class="block h-full w-full"
                  [center]="galleryView(preset).center"
                  [zoom]="galleryView(preset).zoom"
                  [styles]="presetStyles(preset)"
                  [blank]="!!preset.blank"
                  [projection]="preset.projection === 'globe' ? globe : undefined"
                  [options]="previewOptions(preset)"
                />
              </div>
              <div class="border-t p-3">
                <p class="text-sm font-medium">{{ preset.label }}</p>
                <p class="text-muted-foreground mt-0.5 text-xs">{{ preset.description }}</p>
                @if (preset.note) {
                  <p class="text-muted-foreground mt-0.5 text-xs italic">{{ preset.note }}</p>
                }
              </div>
              <button
                type="button"
                class="focus-visible:ring-ring absolute inset-0 rounded-xl outline-none focus-visible:ring-[3px]"
                [attr.aria-pressed]="preset.id === mapState().presetId"
                [attr.aria-label]="'Apply ' + preset.label + ' to the playground map'"
                (click)="applyStyle(preset)"
              ></button>
            </li>
          }
        </ul>

        <div class="space-y-2">
          <h3 class="text-sm font-medium">{{ activePreset().label }} snippet</h3>
          <app-code-block [code]="gallerySnippet().template" lang="angular-html" />
          @if (gallerySnippet().provider; as provider) {
            <app-code-block [code]="provider" lang="angular-ts" />
          }
        </div>
      </section>
    </section>

    <app-footer />
  `,
})
export class PlaygroundComponent {
  private viewportTimer: ReturnType<typeof setTimeout> | undefined;
  private copiedTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.viewportTimer);
      clearTimeout(this.copiedTimer);
    });
  }

  private readonly basemap = inject(BasemapService);
  private readonly location = inject(Location);
  private readonly document = inject(DOCUMENT);

  /** A shared link (`?scene=`) opens its scene; otherwise the default one. */
  private readonly initial =
    decodeScene(inject(ActivatedRoute).snapshot.queryParamMap.get('scene')) ?? defaultScene();

  protected readonly blocks = LAYER_SPECS;
  protected readonly labels = Object.fromEntries(PLAYGROUND_SPECS.map((s) => [s.id, s.label]));
  protected readonly presets = STYLE_PRESETS;
  protected readonly examples = PLAYGROUND_EXAMPLES;
  protected readonly icon = blockIcon;
  protected readonly buildingPresets = BUILDING_PRESETS.map((preset) => preset.label).join(', ');
  protected readonly mapControls = MAP_CONTROLS;
  protected readonly globe = { type: 'globe' } as const;
  protected readonly tabs: { id: SnippetTab; label: string }[] = [
    { id: 'template', label: 'Template' },
    { id: 'component', label: 'Component' },
  ];

  /** Top of the stack first. */
  protected readonly layers = signal<SceneLayer[]>(this.initial.layers);
  protected readonly mapState = signal<MapState>(this.initial.map);
  protected readonly selectedUid = signal<number | undefined>(this.initial.layers[0]?.uid);
  protected readonly snippetTab = signal<SnippetTab>('template');
  protected readonly linkCopied = signal(false);

  /** The map's first camera; every later change goes through the controlled `viewport`. */
  protected readonly initialView = {
    center: this.initial.map.center ?? ([0, 20] as [number, number]),
    zoom: this.initial.map.zoom,
  };

  private readonly presetId = computed(() => this.mapState().presetId);

  protected readonly selected = computed(() => {
    const index = this.layers().findIndex((l) => l.uid === this.selectedUid());
    if (index < 0) return null;
    const layer = this.layers()[index];
    return { layer, index, spec: describeControls(findSpec(layer.specId)) };
  });

  /** Visible layers in drawing order: the bottom of the stack is added to the map first. */
  private readonly drawn = computed(() =>
    this.layers()
      .filter((layer) => layer.visible)
      .reverse(),
  );
  protected readonly renderKey = computed(() =>
    this.drawn()
      .map((layer) => layer.uid)
      .join(','),
  );
  protected readonly rendered = computed(() => {
    const presetId = this.presetId();
    return this.drawn().map((layer) => {
      const spec = layerSpec(layer, presetId);
      return {
        layer,
        marker: spec.id === 'marker' ? markerInputs(layer.values) : null,
        popup: spec.id === 'popup' ? popupInputs(layer.values) : null,
        component: spec.className ? (PLAYGROUND_COMPONENTS[spec.className] ?? null) : null,
        inputs: resolveInputs(spec, layer.values),
      };
    });
  });

  /** Blocks allowed once per map that are already in the scene. */
  protected readonly usedSingles = computed(
    () =>
      new Set(
        this.layers()
          .filter((layer) => findSpec(layer.specId).single)
          .map((layer) => layer.specId),
      ),
  );

  /** Labels of the visible blocks that draw from the `carto` source the basemap lacks. */
  protected readonly needsCarto = computed(() => {
    const preset = findPreset(this.presetId());
    if (preset.hasCartoSource || preset.buildingSource) return null;
    const labels = new Set(
      this.drawn()
        .map((layer) => findSpec(layer.specId))
        .filter((spec) => spec.requiresCarto)
        .map((spec) => spec.label),
    );
    return labels.size ? [...labels].join(', ') : null;
  });

  /** The sliders show a readable camera; the state itself keeps the exact values. */
  protected readonly mapValues = computed<Values>(() => {
    const { zoom, pitch, bearing, ...rest } = this.mapState();
    return {
      ...rest,
      zoom: +zoom.toFixed(2),
      pitch: Math.round(pitch),
      bearing: Math.round(bearing),
    };
  });
  protected readonly mapProps = computed(() =>
    mapInputs(this.mapState(), this.initialView, this.presetKey(this.mapState().presetId)),
  );
  /** Only changes when the camera fields do, so unrelated edits never re-jump the map. */
  protected readonly viewport = computed(() => this.mapProps().viewport, {
    equal: (a, b) =>
      a.zoom === b.zoom &&
      a.pitch === b.pitch &&
      a.bearing === b.bearing &&
      a.center?.[0] === b.center?.[0] &&
      a.center?.[1] === b.center?.[1],
  });

  private readonly snippet = computed(() => {
    const presetId = this.presetId();
    return buildSceneSnippet(
      this.drawn().map((layer) => ({ spec: layerSpec(layer, presetId), values: layer.values })),
      mapSnippetInput(this.mapState(), this.initialView),
    );
  });
  protected readonly snippetCode = computed(() =>
    this.snippetTab() === 'template' ? this.snippet().template : this.snippet().component,
  );

  protected readonly activePreset = computed(() => findPreset(this.mapState().presetId));
  protected readonly gallerySnippet = computed(() => presetSnippet(this.activePreset()));

  /** Adds a block at `index` (0 = top) and selects it; the first block also frames its data. */
  protected add(specId: string, index = 0): void {
    const wasEmpty = !this.layers().length;
    const { layers, layer } = addLayer(this.layers(), specId, index);
    if (!layer) return;
    this.layers.set(layers);
    this.selectedUid.set(layer.uid);
    if (wasEmpty) this.frame(findSpec(specId));
  }

  protected move({ from, to }: { from: number; to: number }): void {
    this.layers.update((layers) => moveLayer(layers, from, to));
  }

  protected toggle(uid: number): void {
    this.layers.update((layers) => {
      const layer = layers.find((l) => l.uid === uid);
      return layer ? updateLayer(layers, uid, { visible: !layer.visible }) : layers;
    });
  }

  protected duplicate(uid: number): void {
    const { layers, layer } = duplicateLayer(this.layers(), uid);
    this.layers.set(layers);
    if (layer) this.selectedUid.set(layer.uid);
  }

  protected remove(uid: number): void {
    const layers = removeLayer(this.layers(), uid);
    this.layers.set(layers);
    if (this.selectedUid() === uid) this.selectedUid.set(layers[0]?.uid);
  }

  protected clear(): void {
    this.layers.set([]);
    this.selectedUid.set(undefined);
  }

  protected reset(): void {
    const scene = defaultScene();
    this.layers.set(scene.layers);
    this.mapState.set(scene.map);
    this.selectedUid.set(scene.layers[0]?.uid);
  }

  protected loadExample(example: PlaygroundExample): void {
    const scene = example.scene();
    this.layers.set(scene.layers);
    this.mapState.set(scene.map);
    this.selectedUid.set(scene.layers[0]?.uid);
    this.document.getElementById('builder')?.scrollIntoView?.({ behavior: 'smooth' });
  }

  protected frame(spec: PlaygroundSpec): void {
    this.mapState.update((state) => frameSpec(state, spec));
  }

  protected onLayerChange(uid: number, { key, value }: ControlChange): void {
    this.layers.update((layers) => {
      const layer = layers.find((l) => l.uid === uid);
      if (!layer) return layers;
      return updateLayer(layers, uid, { values: { ...layer.values, [key]: value } });
    });
  }

  protected onMarkerMoved(uid: number, { lng, lat }: { lng: number; lat: number }): void {
    this.onLayerChange(uid, { key: 'longitude', value: +lng.toFixed(4) });
    this.onLayerChange(uid, { key: 'latitude', value: +lat.toFixed(4) });
  }

  /**
   * The user panned, zoomed or rotated: mirror the camera into the sliders and the snippet.
   * Debounced, since the map reports every frame. The controlled viewport then matches the live
   * camera, so the next slider change moves only the field it edits.
   */
  protected onViewport(viewport: MapViewport): void {
    clearTimeout(this.viewportTimer);
    this.viewportTimer = setTimeout(() => {
      this.mapState.update((state) => ({
        ...state,
        center: viewport.center,
        zoom: viewport.zoom,
        pitch: viewport.pitch,
        bearing: viewport.bearing,
      }));
    }, 100);
  }

  protected onMapChange({ key, value }: ControlChange): void {
    this.mapState.update((state) => updateMapState(state, key, value));
  }

  /** Puts the scene in the address bar and copies that link. */
  protected async copyLink(): Promise<void> {
    const code = encodeScene({ layers: this.layers(), map: this.mapState() });
    const path = this.location.path().split('?')[0];
    this.location.replaceState(path, `scene=${code}`);
    const external = this.location.prepareExternalUrl(path);
    const url = `${this.document.location.origin}${external}?scene=${code}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // No clipboard access: the link is still in the address bar.
    }
    this.linkCopied.set(true);
    clearTimeout(this.copiedTimer);
    this.copiedTimer = setTimeout(() => this.linkCopied.set(false), 2000);
  }

  protected applyStyle(preset: StylePreset): void {
    this.mapState.update((state) => applyPreset(state, preset));
  }

  private presetKey(presetId: string): string | undefined {
    const keyed = findPreset(presetId).keyed;
    return keyed ? this.basemap.keys()[keyed] : undefined;
  }

  protected presetStyles(preset: StylePreset) {
    return resolveStyles(preset, this.presetKey(preset.id));
  }

  protected galleryView(preset: StylePreset) {
    return preset.pitch ? GALLERY_TILT_VIEW : GALLERY_VIEW;
  }

  protected previewOptions(preset: StylePreset) {
    return {
      interactive: false,
      ...(preset.pitch && { pitch: preset.pitch }),
      ...(preset.bearing && { bearing: preset.bearing }),
    };
  }
}
