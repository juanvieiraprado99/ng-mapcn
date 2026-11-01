import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MapComponent, MapPopupComponent } from 'ng-mapcn';

import { ZardButtonComponent } from '@/shared/components/button';
import { LanguageService } from '@/shared/i18n/language.service';

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
        <ng-map-popup
          [longitude]="-74.006"
          [latitude]="40.7128"
          [closeButton]="true"
          [(open)]="showPopup"
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
      titlePt="Popups"
      descriptionPt="Popups independentes, que ficam no mapa sem um marcador."
    >
      <app-example-section
        title="Standalone Popup"
        titlePt="Popup independente"
        sectionId="standalone-popup"
        [code]="popupCode"
      >
        <span description>
          @if (i18n.isPt()) {
            Use <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map-popup</code> para mostrar um popup em qualquer ponto do mapa. Ao contrário do
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-marker-popup</code>, popups independentes não ficam presos a marcadores e podem ser controlados
            por código: ligue <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">[(open)]</code> a um signal e, ao fechar o popup (botão de fechar ou clique no
            mapa), ele grava <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">false</code> de volta, enquanto definir <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">true</code> o abre de novo. Os popups funcionam
            bem com teclado: o foco entra no popup quando ele abre, e <kbd class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">Esc</kbd> o fecha (o evento é interrompido,
            então um dialog que esteja por trás continua aberto). O card é um <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">role="dialog"</code> não modal,
            nomeado por <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ariaLabel</code> ("Map popup" por padrão). Para popups que acompanham o hover, use
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">[closeOnClick]="false"</code> para que um clique não os feche, e adicione
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">className="ng-popup-passthrough"</code> para que o popup deixe o ponteiro passar até o mapa. Sem
            isso o cursor pode entrar no popup, o mouseleave da camada dispara e o popup some.
          } @else {
            Use
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map-popup</code>
            to display a popup at any location on the map. Unlike
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-marker-popup</code>,
            standalone popups are not attached to markers and can be controlled
            programmatically: bind
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">[(open)]</code>
            to a signal and closing the popup (close button or map click) writes
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">false</code>
            back, while setting it to
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">true</code>
            opens it again. Popups are keyboard friendly: focus moves into the popup when it opens, and
            <kbd class="bg-muted rounded-md px-1.5 py-0.5 font-mono text-sm">Esc</kbd> closes it (the event is
            stopped, so a host dialog stays open). The card is a non-modal
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">role="dialog"</code>
            named by
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ariaLabel</code>
            ("Map popup" by default). For popups that follow the hover, set
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">[closeOnClick]="false"</code>
            so a click does not dismiss them, and add
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">className="ng-popup-passthrough"</code>
            so the popup lets the pointer through to the map. Without it the cursor can move into the
            popup, the layer's mouseleave fires and the popup disappears.
          }
        </span>
        <div class="relative h-full">
          <ng-map
            [center]="[-74.006, 40.7128]"
            [zoom]="13"
          >
            <ng-map-popup
              [longitude]="-74.006"
              [latitude]="40.7128"
              [closeButton]="true"
              [(open)]="showPopup"
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
  protected readonly i18n = inject(LanguageService);
  readonly popupCode = POPUP_CODE;

  readonly showPopup = signal(true);
}
