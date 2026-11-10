import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { FooterComponent } from '@/layout/footer';
import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { cardVariants } from '@/shared/components/card';
import { LanguageService } from '@/shared/i18n/language.service';
import { PageHeaderImports } from '@/shared/page-header';

interface Credit {
  readonly name: string;
  readonly role: string;
  readonly rolePt: string;
  readonly description: string;
  readonly descriptionPt: string;
  readonly url: string;
  readonly docsUrl?: string;
}

@Component({
  selector: 'app-credits',
  standalone: true,
  imports: [ZardBadgeComponent, ZardButtonComponent, PageHeaderImports, FooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header align="left" size="sm">
      <app-page-header-heading>{{ pt() ? 'Créditos' : 'Credits' }}</app-page-header-heading>
      <app-page-header-description>
        {{
          pt()
            ? 'O ng-mapcn se apoia nos ombros destes projetos.'
            : 'ng-mapcn stands on the shoulders of these projects.'
        }}
      </app-page-header-description>
    </app-page-header>

    <section class="animate-fade-up animate-stagger container max-w-6xl" style="--stagger: 3.5">
      <div class="grid gap-5 sm:grid-cols-2">
        @for (credit of credits; track credit.name) {
          <div [class]="card">
            <div class="flex h-full flex-col gap-3 px-4">
              <div class="flex items-center gap-2">
                <span class="font-semibold">{{ credit.name }}</span>
                <z-badge zType="secondary">{{ pt() ? credit.rolePt : credit.role }}</z-badge>
              </div>
              <p class="text-muted-foreground flex-1 text-sm leading-relaxed">
                {{ pt() ? credit.descriptionPt : credit.description }}
              </p>
              <div class="flex items-center gap-2 pt-1">
                <a
                  z-button
                  zType="outline"
                  zSize="sm"
                  [href]="credit.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  >{{ pt() ? 'Visitar site' : 'Visit site' }}</a
                >
                @if (credit.docsUrl) {
                  <a
                    z-button
                    zType="ghost"
                    zSize="sm"
                    [href]="credit.docsUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    >Docs</a
                  >
                }
              </div>
            </div>
          </div>
        }
      </div>
    </section>

    <app-footer />
  `,
})
export class CreditsComponent {
  protected readonly i18n = inject(LanguageService);
  protected readonly pt = this.i18n.isPt;
  protected readonly card = cardVariants();

  readonly credits: readonly Credit[] = [
    {
      name: 'mapcn',
      role: 'Inspiration',
      rolePt: 'Inspiração',
      description:
        'The React + MapLibre GL library ng-mapcn is an Angular port of. Its composable API and shadcn-style copy-paste distribution are the blueprint for this library.',
      descriptionPt:
        'A biblioteca React + MapLibre GL da qual o ng-mapcn é um port para Angular. A API componível e a distribuição por cópia no estilo shadcn são o modelo desta biblioteca.',
      url: 'https://www.mapcn.dev',
      docsUrl: 'https://www.mapcn.dev/docs',
    },
    {
      name: 'Zard UI',
      role: 'UI kit',
      rolePt: 'Kit de UI',
      description:
        'Angular component library used to build this demo and documentation site — buttons, cards, badges, tables and tabs are all Zard components.',
      descriptionPt:
        'Biblioteca de componentes Angular usada para construir este demo e o site de documentação — botões, cards, badges, tabelas e abas são todos componentes Zard.',
      url: 'https://zardui.com',
      docsUrl: 'https://zardui.com/docs/installation',
    },
    {
      name: 'MapLibre GL JS',
      role: 'Engine',
      rolePt: 'Motor',
      description:
        'The open-source rendering engine every ng-mapcn component drives under the hood.',
      descriptionPt:
        'O motor de renderização open source que todo componente do ng-mapcn controla por baixo dos panos.',
      url: 'https://maplibre.org',
    },
    {
      name: 'Carto',
      role: 'Basemaps',
      rolePt: 'Basemaps',
      description: 'The free light and dark basemaps used by default — no API key required.',
      descriptionPt: 'Os basemaps gratuitos claro e escuro usados por padrão — sem chave de API.',
      url: 'https://carto.com',
    },
  ];
}
