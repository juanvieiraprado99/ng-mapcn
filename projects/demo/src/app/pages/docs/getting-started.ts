import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBox,
  lucideCode,
  lucideLayers,
  lucidePalette,
  lucidePuzzle,
  lucideZap,
} from '@ng-icons/lucide';

import { LanguageService } from '@/shared/i18n/language.service';

import { DocsImports } from '../../shared/docs';

@Component({
  selector: 'app-getting-started',
  standalone: true,
  imports: [DocsImports, RouterLink, NgIcon],
  viewProviders: [
    provideIcons({ lucideBox, lucideCode, lucideLayers, lucidePalette, lucidePuzzle, lucideZap }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-docs-page
      title="Introduction"
      description="Copy-paste map components for Angular."
      titlePt="Introdução"
      descriptionPt="Componentes de mapa para Angular, no estilo copiar e colar."
    >
      <app-docs-section>
        @if (i18n.isPt()) {
          <p>
            O <strong>ng-mapcn</strong> oferece componentes de mapa bonitos, acessíveis e
            personalizáveis. É um port para Angular do
            <a href="https://mapcn.dev" target="_blank" rel="noopener noreferrer" [class]="link"
              >mapcn</a
            >, feito com
            <a href="https://maplibre.org" target="_blank" rel="noopener noreferrer" [class]="link"
              >MapLibre GL</a
            >, estilizado com
            <a href="https://tailwindcss.com" target="_blank" rel="noopener noreferrer" [class]="link"
              >Tailwind CSS</a
            >
            e pensado para parecer nativo do Angular moderno: componentes standalone, signals e zero
            configuração.
          </p>
        } @else {
          <p>
            <strong>ng-mapcn</strong> provides beautifully designed, accessible, and customizable map
            components. It is an Angular port of
            <a href="https://mapcn.dev" target="_blank" rel="noopener noreferrer" [class]="link"
              >mapcn</a
            >, built on
            <a href="https://maplibre.org" target="_blank" rel="noopener noreferrer" [class]="link"
              >MapLibre GL</a
            >, styled with
            <a href="https://tailwindcss.com" target="_blank" rel="noopener noreferrer" [class]="link"
              >Tailwind CSS</a
            >, and designed to feel native to modern Angular: standalone components, signals, and zero
            configuration.
          </p>
        }
      </app-docs-section>

      <app-docs-section title="Philosophy" titlePt="Filosofia">
        @if (i18n.isPt()) {
          <p>
            O ng-mapcn segue o modelo do shadcn para mapas: componentes que você pode ter como seus, sem
            lock-in e com padrões sensatos que funcionam de imediato.
          </p>
          <p>
            Mapas costumam ser tratados como caixas-pretas, escondidos atrás de bibliotecas wrapper e SDKs
            cheios de configuração. O ng-mapcn segue outro caminho: fica perto do MapLibre, mantém a API
            familiar e deixa você descer até a instância do mapa sempre que precisar de mais controle.
          </p>
          <p>
            O objetivo é simples: fazer os mapas parecerem parte do resto da sua stack de UI — componíveis,
            com suporte a tema, acessíveis e fáceis de personalizar.
          </p>
        } @else {
          <p>
            ng-mapcn follows the shadcn model for maps: components you can own, with zero lock-in and
            sensible defaults that work immediately.
          </p>
          <p>
            Maps are often treated as black boxes hidden behind wrapper libraries and
            configuration-heavy SDKs. ng-mapcn takes a different approach. It stays close to MapLibre,
            keeps the API familiar, and lets you drop down to the raw map instance whenever you need
            more control.
          </p>
          <p>
            The goal is simple: make maps feel like the rest of your UI stack - composable, themeable,
            accessible, and easy to customize.
          </p>
        }
      </app-docs-section>

      <app-docs-section title="Why ng-mapcn?" titlePt="Por que ng-mapcn?">
        @if (i18n.isPt()) {
          <p>
            A maioria das configurações de mapa em Angular é opinativa demais ou pesada demais. O ng-mapcn
            foi feito para times que querem entregar rápido sem abrir mão do controle:
          </p>
          <ul>
            <li>
              <strong>O código é seu:</strong> instale via schematics e copie os componentes para o seu
              projeto — ou use o pacote npm.
            </li>
            <li>
              <strong>Comece rápido:</strong> rode um comando e renderize seu primeiro mapa com padrões
              prontos para produção.
            </li>
            <li>
              <strong>Cresça com segurança:</strong> construa direto sobre o MapLibre e desça para as APIs
              brutas quando precisar.
            </li>
            <li>
              <strong>Nativo do Angular:</strong> componentes standalone, inputs/outputs com signals e
              detecção de mudanças OnPush em tudo.
            </li>
          </ul>
        } @else {
          <p>
            Most Angular map setups are either too opinionated or too heavy. ng-mapcn is built for
            teams that want to ship quickly without giving up control:
          </p>
          <ul>
            <li>
              <strong>Own Your Code:</strong> Install via schematics and copy the components into your
              project - or use the npm package.
            </li>
            <li>
              <strong>Start Fast:</strong> Run one command and render your first map with
              production-ready defaults.
            </li>
            <li>
              <strong>Scale Safely:</strong> Build on top of MapLibre directly, then drop to raw APIs
              when needed.
            </li>
            <li>
              <strong>Angular Native:</strong> Standalone components, signal inputs/outputs, and OnPush
              change detection throughout.
            </li>
          </ul>
        }
      </app-docs-section>

      <app-docs-section title="Any Map Style" titlePt="Qualquer estilo de mapa">
        @if (i18n.isPt()) {
          <p>
            O ng-mapcn funciona com quaisquer
            <a
              href="https://maplibre.org/maplibre-style-spec/"
              target="_blank"
              rel="noopener noreferrer"
              [class]="link"
              >tiles compatíveis com MapLibre</a
            >
            — defina por mapa com o input <code [class]="code">styles</code>, ou para o app inteiro com
            <code [class]="code">provideMapStyles()</code>. Há um exemplo funcionando para cada provedor
            na página <a routerLink="/docs/basemaps" [class]="link">Estilos de mapa</a> (e o seletor de
            basemap no header troca o site inteiro ao vivo):
          </p>
          <ul>
            <li>
              <a href="https://carto.com/basemaps" target="_blank" rel="noopener noreferrer" [class]="link"
                >Carto</a
              >
              — basemaps limpos e minimalistas, ótimos para visualização de dados. É o padrão; não precisa
              de chave de API.
            </li>
            <li>
              <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer" [class]="link"
                >OpenFreeMap</a
              >
              — tiles vetoriais gratuitos com dados do OpenStreetMap. Sem chave e sem limite de
              requisições.
            </li>
            <li>
              <a
                href="https://www.openstreetmap.org"
                target="_blank"
                rel="noopener noreferrer"
                [class]="link"
                >OpenStreetMap</a
              >
              — dados de mapa mantidos pela comunidade. Serve tiles raster em vez de um
              <code [class]="code">style.json</code> hospedado, então o estilo é escrito à mão (só para
              dev/demo, pela política de uso de tiles do OSM).
            </li>
            <li>
              <a href="https://www.maptiler.com" target="_blank" rel="noopener noreferrer" [class]="link"
                >MapTiler</a
              >
              — tiles vetoriais bonitos, com muitas opções de personalização. Exige chave de API.
            </li>
            <li>
              <a href="https://stadiamaps.com" target="_blank" rel="noopener noreferrer" [class]="link"
                >Stadia Maps</a
              >
              — hospedagem de tiles rápida e confiável, com vários estilos. Sem chave no
              <code [class]="code">localhost</code>; chave de API ou autenticação por domínio em produção.
            </li>
            <li>E qualquer outro provedor que suporte a especificação de estilo do MapLibre</li>
          </ul>
        } @else {
          <p>
            ng-mapcn works with any
            <a
              href="https://maplibre.org/maplibre-style-spec/"
              target="_blank"
              rel="noopener noreferrer"
              [class]="link"
              >MapLibre-compatible tiles</a
            >
            - set them per map with the <code [class]="code">styles</code> input, or app-wide with
            <code [class]="code">provideMapStyles()</code>. There is a working example for each
            provider on the <a routerLink="/docs/basemaps" [class]="link">Map Styles</a> page (and the
            basemap picker in the header switches this whole site live):
          </p>
          <ul>
            <li>
              <a href="https://carto.com/basemaps" target="_blank" rel="noopener noreferrer" [class]="link"
                >Carto</a
              >
              - Clean, minimal basemaps perfect for data visualization. The default; no API key.
            </li>
            <li>
              <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer" [class]="link"
                >OpenFreeMap</a
              >
              - Free vector tiles from OpenStreetMap data. No key, no request limits.
            </li>
            <li>
              <a
                href="https://www.openstreetmap.org"
                target="_blank"
                rel="noopener noreferrer"
                [class]="link"
                >OpenStreetMap</a
              >
              - Community-driven map data. Serves raster tiles rather than a hosted
              <code [class]="code">style.json</code>, so the style is written by hand (dev/demo use
              only, per the OSM tile usage policy).
            </li>
            <li>
              <a href="https://www.maptiler.com" target="_blank" rel="noopener noreferrer" [class]="link"
                >MapTiler</a
              >
              - Beautiful vector tiles with extensive customization options. Requires an API key.
            </li>
            <li>
              <a href="https://stadiamaps.com" target="_blank" rel="noopener noreferrer" [class]="link"
                >Stadia Maps</a
              >
              - Fast, reliable tile hosting with multiple styles. Keyless on
              <code [class]="code">localhost</code>; API key or domain auth in production.
            </li>
            <li>And any other provider that supports the MapLibre style spec</li>
          </ul>
        }
      </app-docs-section>

      <app-docs-section title="Features" titlePt="Recursos">
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          @for (feature of features; track feature.title) {
            @let pt = i18n.isPt();
            <div class="bg-surface space-y-3 rounded-lg p-4">
              <div class="flex items-center gap-2.5">
                <ng-icon [name]="feature.icon" size="16" class="text-muted-foreground" />
                <h3 class="text-foreground text-base font-medium">
                  {{ pt ? feature.titlePt : feature.title }}
                </h3>
              </div>
              <p class="text-muted-foreground text-sm">
                {{ pt ? feature.descriptionPt : feature.description }}
              </p>
            </div>
          }
        </div>
      </app-docs-section>
    </app-docs-page>
  `,
})
export class GettingStartedComponent {
  protected readonly i18n = inject(LanguageService);
  /** mapcn `DocsLink` / `DocsCode`. */
  protected readonly link = 'text-foreground font-medium underline underline-offset-4';
  protected readonly code = 'bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm';

  readonly features = [
    {
      icon: 'lucideZap',
      title: 'Zero Config',
      titlePt: 'Zero configuração',
      description: 'Works out of the box with free map tiles. No API keys needed.',
      descriptionPt: 'Funciona de cara com tiles gratuitos. Sem chave de API.',
    },
    {
      icon: 'lucidePalette',
      title: 'Theme Aware',
      titlePt: 'Segue o tema',
      description: 'Automatically switches between light and dark map styles.',
      descriptionPt: 'Alterna sozinho entre estilos de mapa claro e escuro.',
    },
    {
      icon: 'lucidePuzzle',
      title: 'Composable',
      titlePt: 'Componível',
      description: 'Build complex UIs with simple, composable components.',
      descriptionPt: 'Monte interfaces complexas com componentes simples e combináveis.',
    },
    {
      icon: 'lucideCode',
      title: 'TypeScript',
      titlePt: 'TypeScript',
      description: 'Full type safety with comprehensive TypeScript support.',
      descriptionPt: 'Tipagem completa, com suporte abrangente a TypeScript.',
    },
    {
      icon: 'lucideBox',
      title: 'Copy & Paste',
      titlePt: 'Copiar e colar',
      description: 'Own your code. Use schematics to copy the source into your project.',
      descriptionPt:
        'O código é seu. Use os schematics para copiar o código-fonte para o seu projeto.',
    },
    {
      icon: 'lucideLayers',
      title: 'Any Map Style',
      titlePt: 'Qualquer estilo de mapa',
      description: 'Use any MapLibre-compatible tiles: MapTiler, Carto, OpenStreetMap, and more.',
      descriptionPt:
        'Use quaisquer tiles compatíveis com MapLibre: MapTiler, Carto, OpenStreetMap e outros.',
    },
  ];
}
