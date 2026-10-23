import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  input,
  model,
  PLATFORM_ID,
  signal,
  type TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';

import { injectMapLabels, type MapLabels } from '../../providers/map-labels.provider';
import { MapContextService } from '../../services/map-context.service';
import { type MapStylesConfig } from '../../styles/map-styles';
import { classTokens } from '../../utils/class-name';
import { type MapControlPosition, mountMapControl } from '../../utils/map-control';
import { nextId } from '../../utils/map-utils';

export interface MapStyleOption {
  id: string;
  label: string;
  /** Basemap styles applied while this option is selected (keep the object stable between renders). */
  styles: MapStylesConfig;
}

@Component({
  selector: 'ng-map-style-switcher',
  templateUrl: './map-style-switcher.component.html',
  styleUrl: './map-style-switcher.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ng-map-style-switcher-host' },
})
export class MapStyleSwitcherComponent {
  readonly options = input.required<MapStyleOption[]>();
  /** Id of the selected option; `undefined` leaves the map's own style untouched. */
  readonly value = model<string | undefined>();
  readonly position = input<MapControlPosition>('top-right');

  /** Per-component label overrides, merged over `provideMapLabels` and the English defaults. */
  readonly labels = input<Partial<MapLabels>>();
  /** Extra space-separated classes for the rendered `.ng-style-switcher` element (reactive; built-in classes are kept). */
  readonly className = input<string>();

  private readonly control = viewChild.required<TemplateRef<unknown>>('control');
  protected readonly baseId = nextId('ng-style-switcher');
  protected readonly buttonId = `${this.baseId}-button`;
  protected readonly listId = `${this.baseId}-list`;

  protected readonly open = signal(false);
  protected readonly activeIndex = signal(0);

  protected readonly rootClass = computed(() =>
    classTokens(this.className(), ['ng-style-switcher']).join(' '),
  );
  protected readonly selected = computed(() =>
    this.options().find((option) => option.id === this.value()),
  );
  /** Contains the visible text (WCAG 2.5.3) and announces the current selection. */
  protected readonly buttonLabel = computed(() => {
    const selected = this.selected();
    return selected ? `${this.l().mapStyle}: ${selected.label}` : this.l().mapStyle;
  });
  protected readonly opensUp = computed(() => this.position().startsWith('bottom'));
  protected readonly activeId = computed(() => this.optionId(this.activeIndex()));

  // Hierarchical DI — throws when placed outside <ng-map>, like mapcn's useMap()
  protected readonly l = injectMapLabels(this.labels);
  private readonly ctx = inject(MapContextService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);

  constructor() {
    effect((onCleanup) => {
      const map = this.ctx.map();
      if (!map || !this.isBrowser) return;
      onCleanup(mountMapControl(map, this.control(), this.injector, this.position()));
    });

    // The override only exists while an option is selected: no value leaves the map's own style.
    let applied = false;
    effect(() => {
      const styles = this.selected()?.styles;
      untracked(() => {
        if (styles) {
          this.ctx.setStyleOverride(styles);
          applied = true;
        } else if (applied) {
          this.ctx.setStyleOverride(undefined);
          applied = false;
        }
      });
    });
    inject(DestroyRef).onDestroy(() => {
      if (applied) this.ctx.setStyleOverride(undefined);
    });

    // Close on a pointer press anywhere outside the card.
    effect((onCleanup) => {
      if (!this.open() || !this.isBrowser) return;
      const handler = (event: Event) => {
        const root = this.document.getElementById(this.baseId);
        if (!root?.contains(event.target as Node)) this.open.set(false);
      };
      this.document.addEventListener('pointerdown', handler);
      onCleanup(() => this.document.removeEventListener('pointerdown', handler));
    });
  }

  protected optionId(index: number): string {
    return `${this.baseId}-option-${index}`;
  }

  protected toggle(): void {
    if (this.open()) this.close(true);
    else this.show();
  }

  protected onButtonKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!this.open()) this.show();
    } else if (event.key === 'Escape' && this.open()) {
      event.preventDefault();
      this.close(true);
    }
  }

  protected onListKeydown(event: KeyboardEvent): void {
    const count = this.options().length;
    switch (event.key) {
      case 'ArrowDown':
        this.activeIndex.update((index) => (index + 1) % count);
        break;
      case 'ArrowUp':
        this.activeIndex.update((index) => (index - 1 + count) % count);
        break;
      case 'Home':
        this.activeIndex.set(0);
        break;
      case 'End':
        this.activeIndex.set(count - 1);
        break;
      case 'Enter':
      case ' ':
        this.select(this.activeIndex());
        break;
      case 'Escape':
        this.close(true);
        break;
      case 'Tab':
        this.close(false);
        return;
      default:
        return;
    }
    event.preventDefault();
  }

  protected select(index: number): void {
    const option = this.options()[index];
    if (option) this.value.set(option.id);
    this.close(true);
  }

  private show(): void {
    if (!this.options().length) return;
    const index = this.options().findIndex((option) => option.id === this.value());
    this.activeIndex.set(Math.max(index, 0));
    this.open.set(true);
    this.focusAfterRender(this.listId);
  }

  private close(refocus: boolean): void {
    this.open.set(false);
    if (refocus) this.focusAfterRender(this.buttonId);
  }

  // The view is portaled into a MapLibre element: wait until it has rendered before focusing.
  private focusAfterRender(id: string): void {
    if (!this.isBrowser) return;
    afterNextRender(() => this.document.getElementById(id)?.focus(), {
      injector: this.injector,
    });
  }
}
