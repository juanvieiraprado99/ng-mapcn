import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Pipe,
  type PipeTransform,
} from '@angular/core';

import { LanguageService } from '@/shared/i18n/language.service';

import { CodeBlockComponent } from '../../shared/code-block';
import { DocsImports } from '../../shared/docs';
import { type PropRow, PropTableComponent } from '../../shared/prop-table';
// Single source of truth: `scripts/generate-llms-txt.mjs` reads this same file
// to build /llms.txt and /llms-full.txt.
import apiData from './api-reference.data.json';
import { API_REFERENCE_PT } from './api-reference.data.pt';

/** Adds the pt-BR description from the glossary; PropTable shows it when the site is in pt-BR. */
function withPt(rows: PropRow[]): PropRow[] {
  return rows.map((row) => ({ ...row, descriptionPt: API_REFERENCE_PT[row.description] }));
}

/** `{{ text | apiText: pt }}`: the pt-BR text from the glossary, or the English one. */
@Pipe({ name: 'apiText' })
export class ApiTextPipe implements PipeTransform {
  transform(text: string, pt: boolean): string {
    return pt ? (API_REFERENCE_PT[text] ?? text) : text;
  }
}

interface TestingEntry {
  id: string;
  title: string;
  entry: string;
  description: string;
  exports: PropRow[];
}

interface ApiSection {
  id: string;
  title: string;
  selector: string;
  description: string;
  inputs: PropRow[];
  outputs: PropRow[];
}

@Component({
  selector: 'app-api-reference',
  standalone: true,
  imports: [DocsImports, PropTableComponent, CodeBlockComponent, ApiTextPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-docs-page
      title="API Reference"
      description="Complete reference for all map components and their inputs and outputs."
      titlePt="Referência da API"
      descriptionPt="Referência completa de todos os componentes de mapa, com seus inputs e outputs."
    >
      <app-docs-note>
        @if (i18n.isPt()) {
          <strong>Nota:</strong> Esta biblioteca é construída sobre o
          <a
            href="https://maplibre.org/maplibre-gl-js/docs/API/"
            target="_blank"
            rel="noopener noreferrer"
            [class]="link"
            >MapLibre GL JS</a
          >. A maioria dos componentes estende as opções nativas do MapLibre. Consulte a
          <a
            href="https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/"
            target="_blank"
            rel="noopener noreferrer"
            [class]="link"
            >API do Map do MapLibre</a
          >
          para opções adicionais que não estão listadas aqui.
        } @else {
          <strong>Note:</strong> This library is built on top of
          <a
            href="https://maplibre.org/maplibre-gl-js/docs/API/"
            target="_blank"
            rel="noopener noreferrer"
            [class]="link"
            >MapLibre GL JS</a
          >. Most components extend the native MapLibre options. Refer to the
          <a
            href="https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/"
            target="_blank"
            rel="noopener noreferrer"
            [class]="link"
            >MapLibre Map API</a
          >
          for additional options not listed here.
        }
      </app-docs-note>

      <app-docs-section title="Component Anatomy" titlePt="Anatomia dos componentes">
        <p>
          @if (i18n.isPt()) {
            Todas as partes do conjunto de componentes que você pode usar e combinar para montar o
            seu mapa.
          } @else {
            All parts of the component set you can use and combine to build your map.
          }
        </p>
        <app-code-block [code]="anatomyCode" [showCopyButton]="false" />
      </app-docs-section>

      @for (section of sections; track section.id) {
        <app-docs-section [title]="section.title" [anchor]="section.id">
          <p>
            <code [class]="code">{{ section.selector }}</code>
          </p>
          <p>{{ section.description | apiText: i18n.isPt() }}</p>
          @if (section.inputs.length > 0) {
            <app-prop-table title="Inputs" nameLabel="Input" [rows]="section.inputs" />
          }
          @if (section.outputs.length > 0) {
            <app-prop-table title="Outputs" nameLabel="Output" [rows]="section.outputs" />
          }
        </app-docs-section>
      }

      <app-docs-section title="MapContextService" anchor="mapcontextservice">
        <p>
          @if (i18n.isPt()) {
            Serviço no escopo do componente, fornecido pelo <code [class]="code">ng-map</code> — o
            equivalente em Angular do hook <code [class]="code">useMap()</code> do mapcn. Injete-o
            em qualquer componente projetado dentro de <code [class]="code">ng-map</code> para
            acessar o mapa cru.
          } @else {
            Component-scoped service provided by <code [class]="code">ng-map</code> - the Angular
            equivalent of mapcn's <code [class]="code">useMap()</code> hook. Inject it in any
            component projected inside <code [class]="code">ng-map</code> to access the raw map.
          }
        </p>
        <app-prop-table [nameLabel]="memberLabel()" [rows]="contextRows" />
      </app-docs-section>

      <app-docs-section title="provideMapStyles()" anchor="providemapstyles">
        <p>
          @if (i18n.isPt()) {
            Define o basemap padrão da aplicação inteira pelo token
            <code [class]="code">MAP_DEFAULT_STYLES</code>. Todo
            <code [class]="code">ng-map</code> sem o próprio input
            <code [class]="code">styles</code> (e sem <code [class]="code">blank</code>) o usa;
            passe um signal para trocar o basemap em tempo de execução. Precedência:
            <code [class]="code">styles</code> → <code [class]="code">blank</code> →
            <code [class]="code">provideMapStyles()</code> → padrão do Carto.
          } @else {
            Sets the app-wide default basemap through the
            <code [class]="code">MAP_DEFAULT_STYLES</code> token. Every
            <code [class]="code">ng-map</code> without its own
            <code [class]="code">styles</code> input (and without
            <code [class]="code">blank</code>) uses it; pass a signal to swap the basemap at
            runtime. Precedence: <code [class]="code">styles</code> →
            <code [class]="code">blank</code> → <code [class]="code">provideMapStyles()</code> →
            Carto default.
          }
        </p>
        <app-code-block [code]="provideStylesCode" />
        <app-prop-table [nameLabel]="argumentLabel()" [rows]="provideStylesRows" />
      </app-docs-section>

      <app-docs-section title="provideMapLabels()" anchor="providemaplabels">
        <p>
          @if (i18n.isPt()) {
            Traduz os botões de controle, o loader, o botão de fechar do popup e o nome padrão do
            card do popup pelo token <code [class]="code">MAP_LABELS</code>. Rótulos parciais são
            mesclados sobre os padrões em inglês; passe um signal para seguir o locale ativo. Um
            input <code [class]="code">labels</code> em <code [class]="code">ng-map</code>,
            <code [class]="code">ng-map-controls</code> e
            <code [class]="code">ng-map-popup</code> o sobrescreve por componente.
          } @else {
            Translates the control buttons, the loader, the popup close button and the popup card
            fallback name through the
            <code [class]="code">MAP_LABELS</code> token. Partial labels merge over the English
            defaults; pass a signal to follow the active locale. A
            <code [class]="code">labels</code> input on <code [class]="code">ng-map</code>,
            <code [class]="code">ng-map-controls</code> and
            <code [class]="code">ng-map-popup</code> overrides it per component.
          }
        </p>
        <app-code-block [code]="provideLabelsCode" />
        <app-prop-table [nameLabel]="argumentLabel()" [rows]="provideLabelsRows" />
      </app-docs-section>

      @for (entry of testing; track entry.id) {
        <app-docs-section [title]="entry.title" [anchor]="entry.id">
          <p>
            <code [class]="code">{{ entry.entry }}</code>
          </p>
          <p>{{ entry.description | apiText: i18n.isPt() }}</p>
          <app-prop-table nameLabel="Export" [rows]="entry.exports" [showDefault]="false" />
        </app-docs-section>
      }
    </app-docs-page>
  `,
})
export class ApiReferenceComponent {
  protected readonly i18n = inject(LanguageService);

  readonly anatomyCode = apiData.anatomyCode;
  readonly provideStylesCode = apiData.provideStylesCode;

  readonly provideLabelsCode = apiData.provideLabelsCode;
  readonly provideLabelsRows: PropRow[] = withPt(apiData.provideLabelsRows);
  readonly provideStylesRows: PropRow[] = withPt(apiData.provideStylesRows);
  readonly contextRows: PropRow[] = withPt(apiData.contextRows);
  readonly sections: ApiSection[] = apiData.sections.map((section) => ({
    ...section,
    inputs: withPt(section.inputs),
    outputs: withPt(section.outputs),
  }));
  /** Testing toolkit entry points: not components, so they list exports instead of inputs. */
  readonly testing: TestingEntry[] = apiData.testing.map((entry) => ({
    ...entry,
    exports: withPt(entry.exports),
  }));

  protected readonly memberLabel = computed(() => (this.i18n.isPt() ? 'Membro' : 'Member'));
  protected readonly argumentLabel = computed(() => (this.i18n.isPt() ? 'Argumento' : 'Argument'));

  /** mapcn `DocsLink` / `DocsCode`. */
  protected readonly link = 'text-foreground font-medium underline underline-offset-4';
  protected readonly code = 'bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm';
}
