import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideExternalLink } from '@ng-icons/lucide';

import { type BasemapProvider, BasemapService } from '@/shared/basemap.service';
import { ZardInputComponent } from '@/shared/components/input';

import { BasemapSwatchComponent } from './basemap-swatch';

/**
 * Compact map style switcher for the mobile menu: one row of swatches (scrolls
 * sideways on narrow screens) and the API key field when the pick needs one.
 */
@Component({
  selector: 'app-basemap-picker-compact',
  standalone: true,
  imports: [NgIcon, ZardInputComponent, BasemapSwatchComponent],
  viewProviders: [provideIcons({ lucideExternalLink })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-3' },
  template: `
    <div
      role="radiogroup"
      aria-label="Map style"
      class="-mx-6 -my-1 flex gap-3 overflow-x-auto px-6 py-1 [scrollbar-width:none]"
    >
      @for (provider of basemap.providers; track provider.id) {
        @let selected = provider.id === basemap.providerId();
        <button
          type="button"
          role="radio"
          [attr.aria-checked]="selected"
          [attr.data-selected]="selected"
          (click)="select(provider)"
          class="group flex w-18 shrink-0 flex-col items-center gap-1.5 outline-none"
        >
          <app-basemap-swatch
            [provider]="provider.id"
            class="group-focus-visible:outline-ring h-12 w-18 rounded-lg outline-offset-2 group-focus-visible:outline-2 group-data-[selected=true]:outline-2 group-data-[selected=true]:outline-foreground"
          />
          <span
            class="text-muted-foreground group-data-[selected=true]:text-foreground w-full truncate text-center text-xs font-medium"
          >
            {{ provider.label }}
          </span>
        </button>
      }
    </div>

    @if (basemap.provider().needsKey) {
      <div class="flex items-center gap-2">
        <input
          z-input
          type="password"
          autocomplete="off"
          spellcheck="false"
          class="h-9 flex-1"
          [placeholder]="keyPlaceholder()"
          [value]="basemap.key()"
          (input)="setKey($any($event.target).value)"
          [attr.aria-label]="basemap.provider().label + ' API key'"
        />
        @if (basemap.provider().keyUrl; as keyUrl) {
          <a
            [href]="keyUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1 text-xs"
          >
            Get a key
            <ng-icon name="lucideExternalLink" size="12" />
          </a>
        }
      </div>
    }
  `,
})
export class BasemapPickerCompactComponent {
  protected readonly basemap = inject(BasemapService);

  /** A pick that is ready to render, so the menu can close. */
  readonly picked = output<void>();

  protected readonly keyPlaceholder = computed(
    () =>
      `${this.basemap.provider().label} API key` +
      (this.basemap.provider().id === 'stadia' ? ' (optional on localhost)' : ''),
  );

  /** Keyed providers without a stored key stay open to show the key field. */
  protected select(provider: BasemapProvider): void {
    this.basemap.select(provider.id);
    if (!provider.needsKey || this.basemap.key()) this.picked.emit();
  }

  protected setKey(key: string): void {
    this.basemap.setKey(this.basemap.provider().id, key);
  }
}
