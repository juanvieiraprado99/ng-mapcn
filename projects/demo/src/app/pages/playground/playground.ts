import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { MarkerOptions } from 'maplibre-gl';
import { MapComponent, type MapViewport } from 'ng-mapcn';

import { FooterComponent } from '@/layout/footer';
import { CodeBlockComponent } from '@/shared/code-block';
import { PageHeaderImports } from '@/shared/page-header';

import apiData from '../docs/api-reference.data.json';
import { PLAYGROUND_COMPONENTS } from './playground-components';
import { type ControlChange, PlaygroundControlsComponent } from './playground-controls';
import { PlaygroundMarkerComponent } from './playground-marker';
import {
  buildSnippet,
  controlDefaults,
  type PlaygroundSpec,
  resolveInputs,
  type Values,
} from './playground-schema';
import { findSpec, PLAYGROUND_SPECS } from './playground-specs';
import {
  applyPreset,
  findPreset,
  initialMapState,
  MAP_CONTROLS,
  mapInputs,
  mapSnippetInput,
  type MapState,
  presetSnippet,
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

/** Tilted presets frame a city; the rest show the whole world. */
const GALLERY_VIEW = { center: [2.35, 30] as [number, number], zoom: 1.2 };
const GALLERY_TILT_VIEW = { center: [-74.0134, 40.7061] as [number, number], zoom: 14 };

@Component({
  selector: 'app-playground',
  standalone: true,
  imports: [
    NgComponentOutlet,
    RouterLink,
    MapComponent,
    CodeBlockComponent,
    FooterComponent,
    PageHeaderImports,
    PlaygroundControlsComponent,
    PlaygroundMarkerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header align="left" size="sm">
      <app-page-header-heading>Playground</app-page-header-heading>
      <app-page-header-description>
        Pick a component, edit its inputs and watch the real map update. The snippet below always
        matches what you see, ready to paste into your app.
      </app-page-header-description>
    </app-page-header>

    <section class="container space-y-20" aria-label="Playground">
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div class="min-w-0 space-y-4">
          <div role="group" aria-label="Component" class="flex flex-wrap gap-2">
            @for (item of specs; track item.id) {
              <button
                type="button"
                class="hover:bg-accent aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:border-primary rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
                [attr.aria-pressed]="item.id === spec().id"
                (click)="selectedId.set(item.id)"
              >
                {{ item.label }}
              </button>
            }
          </div>
          <p class="text-muted-foreground text-sm">{{ spec().description }}</p>
          <p class="text-muted-foreground text-xs">
            Popups, terrain, vector and image sources and draw are not in the playground; see the
            <a routerLink="/docs/components/map" class="underline underline-offset-4"
              >component docs</a
            >.
          </p>

          <div class="bg-card relative h-[520px] overflow-hidden rounded-xl border shadow-sm">
            @for (key of [spec().id]; track key) {
              <ng-map
                class="block h-full w-full"
                [center]="view().center"
                [zoom]="view().zoom"
                [styles]="mapProps().styles"
                [blank]="mapProps().blank"
                [theme]="mapProps().theme"
                [projection]="mapProps().projection"
                [viewport]="viewport()"
                (viewportChange)="onViewport($event)"
              >
                @if (markerProps(); as marker) {
                  <app-playground-marker
                    [longitude]="marker.longitude"
                    [latitude]="marker.latitude"
                    [draggable]="marker.draggable"
                    [rotation]="marker.rotation"
                    [anchor]="marker.anchor"
                    (moved)="onMarkerMoved($event)"
                  />
                } @else if (layerComponent(); as layer) {
                  <ng-container *ngComponentOutlet="layer; inputs: layerInputs()" />
                }
              </ng-map>
            }
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

        <aside class="space-y-8" aria-label="Controls">
          @if (spec().controls.length) {
            @for (key of [spec().id]; track key) {
              <div>
                <h2 class="mb-3 text-sm font-semibold tracking-tight">{{ spec().label }} inputs</h2>
                <app-playground-controls
                  [controls]="describedControls()"
                  [values]="values()"
                  [idPrefix]="'pg-' + spec().id"
                  (valueChange)="onLayerChange($event)"
                />
              </div>
            }
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
                  [styles]="preset.styles"
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

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.viewportTimer));
  }

  protected readonly specs = PLAYGROUND_SPECS;
  protected readonly presets = STYLE_PRESETS;
  protected readonly mapControls = MAP_CONTROLS;
  protected readonly globe = { type: 'globe' } as const;
  protected readonly tabs: { id: SnippetTab; label: string }[] = [
    { id: 'template', label: 'Template' },
    { id: 'component', label: 'Component' },
  ];

  protected readonly selectedId = signal(PLAYGROUND_SPECS[2].id);
  protected readonly snippetTab = signal<SnippetTab>('template');

  protected readonly spec = computed(() => findSpec(this.selectedId()));
  protected readonly describedControls = computed(() => describeControls(this.spec()).controls);
  protected readonly view = computed(() => this.spec().view);

  /** Editable input values; reset to the defaults whenever the component changes. */
  protected readonly values = linkedSignal<PlaygroundSpec, Values>({
    source: this.spec,
    computation: (spec) => controlDefaults(spec.controls),
  });

  /** Map look; the basemap and theme survive a component switch, the camera is reframed. */
  protected readonly mapState = linkedSignal<PlaygroundSpec, MapState>({
    source: this.spec,
    computation: (spec, previous) => {
      const base = initialMapState(spec.view.zoom);
      const preset = findPreset(previous?.value.presetId ?? base.presetId);
      const next = applyPreset({ ...base, theme: previous?.value.theme ?? base.theme }, preset);
      return {
        ...next,
        pitch: preset.pitch ?? spec.view.pitch ?? 0,
        bearing: preset.bearing ?? spec.view.bearing ?? 0,
      };
    },
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
  protected readonly mapProps = computed(() => mapInputs(this.mapState(), this.view()));
  /** Only changes when the camera fields do, so unrelated edits never re-jump the map. */
  protected readonly viewport = computed(() => this.mapProps().viewport, {
    equal: (a, b) =>
      a.zoom === b.zoom &&
      a.pitch === b.pitch &&
      a.bearing === b.bearing &&
      a.center?.[0] === b.center?.[0] &&
      a.center?.[1] === b.center?.[1],
  });

  /** The marker is rendered by its wrapper (anchor re-create and `dragEnd`), not the outlet. */
  protected readonly markerProps = computed(() => {
    if (this.spec().id !== 'marker') return null;
    const values = this.values();
    return {
      longitude: Number(values['longitude']),
      latitude: Number(values['latitude']),
      draggable: values['draggable'] === true,
      rotation: Number(values['rotation']),
      anchor: values['anchor'] as MarkerOptions['anchor'],
    };
  });
  protected readonly layerComponent = computed(() => {
    const className = this.spec().className;
    return className ? (PLAYGROUND_COMPONENTS[className] ?? null) : null;
  });
  protected readonly layerInputs = computed(() => resolveInputs(this.spec(), this.values()));

  private readonly snippet = computed(() =>
    buildSnippet(this.spec(), this.values(), mapSnippetInput(this.mapState(), this.view())),
  );
  protected readonly snippetCode = computed(() =>
    this.snippetTab() === 'template' ? this.snippet().template : this.snippet().component,
  );

  protected readonly activePreset = computed(() => findPreset(this.mapState().presetId));
  protected readonly gallerySnippet = computed(() => presetSnippet(this.activePreset()));

  protected onLayerChange({ key, value }: ControlChange): void {
    this.values.update((values) => ({ ...values, [key]: value }));
  }

  protected onMarkerMoved({ lng, lat }: { lng: number; lat: number }): void {
    this.values.update((values) => ({
      ...values,
      longitude: +lng.toFixed(4),
      latitude: +lat.toFixed(4),
    }));
  }

  /**
   * The user panned, zoomed or rotated: mirror the camera into the sliders and the snippet.
   * Debounced, since the map reports every frame. The controlled viewport then matches the live
   * camera, so the next slider change moves only the field it edits.
   */
  protected onViewport(viewport: MapViewport): void {
    clearTimeout(this.viewportTimer);
    const specId = this.spec().id;
    this.viewportTimer = setTimeout(() => {
      if (this.spec().id !== specId) return;
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

  protected applyStyle(preset: StylePreset): void {
    this.mapState.update((state) => applyPreset(state, preset));
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
