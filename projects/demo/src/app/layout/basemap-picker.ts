import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideChevronsUpDown, lucideExternalLink } from '@ng-icons/lucide';
import { type BasemapProvider, BasemapService } from '@/shared/basemap.service';
import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardInputComponent } from '@/shared/components/input';
import { type ZardPopoverDirective, ZardPopoverImports } from '@/shared/components/popover';
import { BasemapSwatchComponent } from './basemap-swatch';

/**
 * Basemap provider switcher — an ng-mapcn demo extra (mapcn has none). The
 * header shows the current basemap as a small map swatch; the popover lists
 * every provider as a preview card, with the API key field for keyed ones.
 */
@Component({
  selector: 'app-basemap-picker',
  standalone: true,
  imports: [
    NgIcon,
    ZardBadgeComponent,
    ZardButtonComponent,
    ZardInputComponent,
    ZardPopoverImports,
    BasemapSwatchComponent,
  ],
  viewProviders: [provideIcons({ lucideCheck, lucideChevronsUpDown, lucideExternalLink })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      z-button
      zType="outline"
      zSize="sm"
      type="button"
      class="gap-2 pr-2 pl-1"
      zPopover
      #popover="zPopover"
      [zContent]="content"
      zAlign="end"
      [zSideOffset]="8"
      [attr.aria-label]="'Change map style, current: ' + basemap.provider().label"
      title="Change the map style used by every map on this site"
    >
      <app-basemap-swatch [provider]="basemap.providerId()" class="h-6 w-9 rounded-[5px]" />
      <span class="flex flex-col items-start gap-0.5 leading-none">
        <span class="text-muted-foreground text-[10px] font-normal">Map style</span>
        <span class="text-xs font-medium">{{ basemap.provider().label }}</span>
      </span>
      @if (missingKey()) {
        <span class="size-1.5 rounded-full bg-amber-500" aria-hidden="true"></span>
      }
      <ng-icon name="lucideChevronsUpDown" size="14" class="text-muted-foreground" />
    </button>

    <ng-template #content>
      <z-popover class="w-80 gap-0 p-0">
        <z-popover-header class="px-3.5 pt-3 pb-2">
          <z-popover-title>Map style</z-popover-title>
          <z-popover-description class="text-xs">
            Every map on this site follows your pick.
          </z-popover-description>
        </z-popover-header>

        <div role="radiogroup" aria-label="Map style" class="flex flex-col gap-0.5 p-1.5 pt-0">
          @for (provider of basemap.providers; track provider.id) {
            @let selected = provider.id === basemap.providerId();
            <button
              type="button"
              role="radio"
              [attr.aria-checked]="selected"
              [attr.data-selected]="selected"
              (click)="select(provider, popover)"
              class="group hover:bg-accent focus-visible:ring-ring/50 data-[selected=true]:bg-accent flex items-center gap-3 rounded-md p-1.5 text-left outline-none focus-visible:ring-[3px]"
            >
              <app-basemap-swatch
                [provider]="provider.id"
                class="h-11 w-16 shrink-0 rounded-md transition-transform group-hover:scale-[1.03]"
              />
              <span class="flex min-w-0 flex-1 flex-col gap-1">
                <span class="flex items-center gap-1.5 text-sm font-medium">
                  {{ provider.label }}
                  @if (provider.id === 'carto') {
                    <z-badge zType="secondary" class="px-1.5 py-0 text-[10px]">Default</z-badge>
                  }
                </span>
                <span class="text-muted-foreground text-xs">
                  {{ provider.kind === 'vector' ? 'Vector' : 'Raster' }} ·
                  {{ provider.needsKey ? 'API key' : 'No key needed' }}
                </span>
              </span>
              <ng-icon
                name="lucideCheck"
                size="16"
                class="text-foreground mr-1 shrink-0 opacity-0 group-data-[selected=true]:opacity-100"
              />
            </button>
          }
        </div>

        @if (basemap.provider().needsKey) {
          <div class="bg-muted/40 flex flex-col gap-2 border-t px-3.5 py-3">
            <div class="flex items-center justify-between">
              <label for="basemap-key" class="text-xs font-medium">
                {{ basemap.provider().label }} API key
              </label>
              @if (basemap.provider().keyUrl; as keyUrl) {
                <a
                  [href]="keyUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
                >
                  Get a key
                  <ng-icon name="lucideExternalLink" size="12" />
                </a>
              }
            </div>
            <input
              z-input
              id="basemap-key"
              class="h-8"
              type="password"
              autocomplete="off"
              spellcheck="false"
              [placeholder]="keyPlaceholder()"
              [value]="basemap.key()"
              (input)="setKey($any($event.target).value)"
            />
            <p class="text-muted-foreground text-[11px] leading-snug">
              Stored only in your browser.
              @if (basemap.provider().note; as note) {
                {{ note }}
              }
            </p>
          </div>
        } @else if (basemap.provider().note; as note) {
          <p class="text-muted-foreground border-t px-3.5 py-2.5 text-[11px] leading-snug">
            {{ note }}
          </p>
        }
      </z-popover>
    </ng-template>
  `,
})
export class BasemapPickerComponent {
  protected readonly basemap = inject(BasemapService);

  /** MapTiler renders nothing without a key; Stadia works keyless on localhost. */
  protected readonly missingKey = computed(
    () => this.basemap.provider().id === 'maptiler' && !this.basemap.key(),
  );

  protected readonly keyPlaceholder = computed(() =>
    this.basemap.provider().id === 'stadia' ? 'Optional on localhost' : 'Paste your API key',
  );

  /** Keyed providers keep the popover open so the key can be pasted right away. */
  protected select(provider: BasemapProvider, popover: ZardPopoverDirective): void {
    this.basemap.select(provider.id);
    if (!provider.needsKey) popover.hide();
  }

  protected setKey(key: string): void {
    this.basemap.setKey(this.basemap.provider().id, key);
  }
}
