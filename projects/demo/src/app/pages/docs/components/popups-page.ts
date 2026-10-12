import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MapComponent, MapPopupComponent } from 'ng-mapcn';

import { ZardButtonComponent } from '@/shared/components/button';

import { DocsImports } from '../../../shared/docs';
import { ExampleSectionComponent } from '../../../shared/example-section';

const POPUP_CODE = `import { Component, signal } from '@angular/core';
import { MapComponent, MapPopupComponent } from 'ng-mapcn';

@Component({
  selector: 'app-standalone-popup',
  standalone: true,
  imports: [MapComponent, MapPopupComponent],
  template: \`
    <div class="relative h-[420px]">
      <ng-map [center]="[-74.006, 40.7128]" [zoom]="13">
        @if (showPopup()) {
          <ng-map-popup
            [longitude]="-74.006"
            [latitude]="40.7128"
            [closeButton]="true"
            (popupClose)="showPopup.set(false)"
          >
            <div class="space-y-2">
              <h3 class="font-semibold">New York City</h3>
              <p class="text-muted-foreground text-sm">
                The city that never sleeps. Population: 8.3 million
              </p>
              <button
                type="button"
                (click)="showPopup.set(false)"
                class="hover:bg-accent w-full rounded-md border px-3 py-1.5 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </ng-map-popup>
        }
      </ng-map>

      @if (!showPopup()) {
        <button
          type="button"
          (click)="showPopup.set(true)"
          class="bg-primary text-primary-foreground absolute bottom-4 left-4 z-10 rounded-md px-3 py-1.5 text-sm font-medium"
        >
          Show Popup
        </button>
      }
    </div>
  \`,
})
export class StandalonePopupComponent {
  readonly showPopup = signal(true);
}`;

@Component({
  selector: 'app-popups-page',
  standalone: true,
  imports: [
    DocsImports,
    ExampleSectionComponent,
    MapComponent,
    MapPopupComponent,
    ZardButtonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-docs-page
      title="Popups"
      description="Standalone popups that live on the map without a marker."
    >
      <app-example-section
        title="Standalone Popup"
        sectionId="standalone-popup"
        [code]="popupCode"
      >
        <span description>
          Use
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map-popup</code>
          to display a popup at any location on the map. Unlike
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-marker-popup</code>,
          standalone popups are not attached to markers and can be controlled
          programmatically.
        </span>
        <div class="relative h-full">
          <ng-map
            [center]="[-74.006, 40.7128]"
            [zoom]="13"
          >
            @if (showPopup()) {
              <ng-map-popup
                [longitude]="-74.006"
                [latitude]="40.7128"
                [closeButton]="true"
                (popupClose)="showPopup.set(false)"
              >
                <div class="space-y-2">
                  <h3 class="font-semibold">New York City</h3>
                  <p class="text-muted-foreground text-sm">
                    The city that never sleeps. Population: 8.3 million
                  </p>
                  <button
                    z-button
                    zType="outline"
                    zSize="sm"
                    type="button"
                    class="w-full"
                    (click)="showPopup.set(false)"
                  >
                    Close
                  </button>
                </div>
              </ng-map-popup>
            }
          </ng-map>

          @if (!showPopup()) {
            <button
              z-button
              zSize="sm"
              type="button"
              class="absolute bottom-4 left-4 z-10"
              (click)="showPopup.set(true)"
            >
              Show Popup
            </button>
          }
        </div>
      </app-example-section>
    </app-docs-page>
  `,
})
export class PopupsPageComponent {
  readonly popupCode = POPUP_CODE;

  readonly showPopup = signal(true);
}
