import { ChangeDetectionStrategy, Component } from '@angular/core';

import { CodeBlockComponent } from '../../shared/code-block';
import { DocsImports } from '../../shared/docs';
import { type PropRow, PropTableComponent } from '../../shared/prop-table';
// Single source of truth: `scripts/generate-llms-txt.mjs` reads this same file
// to build /llms.txt and /llms-full.txt.
import apiData from './api-reference.data.json';

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
  imports: [DocsImports, PropTableComponent, CodeBlockComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-docs-page
      title="API Reference"
      description="Complete reference for all map components and their inputs and outputs."
    >
      <app-docs-note>
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
      </app-docs-note>

      <app-docs-section title="Component Anatomy">
        <p>All parts of the component set you can use and combine to build your map.</p>
        <app-code-block [code]="anatomyCode" [showCopyButton]="false" />
      </app-docs-section>

      @for (section of sections; track section.id) {
        <app-docs-section [title]="section.title" [anchor]="section.id">
          <p>
            <code [class]="code">{{ section.selector }}</code>
          </p>
          <p>{{ section.description }}</p>
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
          Component-scoped service provided by <code [class]="code">ng-map</code> - the Angular
          equivalent of mapcn's <code [class]="code">useMap()</code> hook. Inject it in any component
          projected inside <code [class]="code">ng-map</code> to access the raw map.
        </p>
        <app-prop-table nameLabel="Member" [rows]="contextRows" />
      </app-docs-section>

      <app-docs-section title="provideMapStyles()" anchor="providemapstyles">
        <p>
          Sets the app-wide default basemap through the
          <code [class]="code">MAP_DEFAULT_STYLES</code> token. Every
          <code [class]="code">ng-map</code> without its own <code [class]="code">styles</code> input
          (and without <code [class]="code">blank</code>) uses it; pass a signal to swap the basemap
          at runtime. Precedence: <code [class]="code">styles</code> →
          <code [class]="code">blank</code> → <code [class]="code">provideMapStyles()</code> → Carto
          default.
        </p>
        <app-code-block [code]="provideStylesCode" />
        <app-prop-table nameLabel="Argument" [rows]="provideStylesRows" />
      </app-docs-section>

      <app-docs-section title="provideMapLabels()" anchor="providemaplabels">
        <p>
          Translates the control buttons, the loader and the popup close button through the
          <code [class]="code">MAP_LABELS</code> token. Partial labels merge over the English
          defaults; pass a signal to follow the active locale. A
          <code [class]="code">labels</code> input on <code [class]="code">ng-map</code>,
          <code [class]="code">ng-map-controls</code> and
          <code [class]="code">ng-map-popup</code> overrides it per component.
        </p>
        <app-code-block [code]="provideLabelsCode" />
        <app-prop-table nameLabel="Argument" [rows]="provideLabelsRows" />
      </app-docs-section>
    </app-docs-page>
  `,
})
export class ApiReferenceComponent {
  readonly anatomyCode = apiData.anatomyCode;
  readonly provideStylesCode = apiData.provideStylesCode;

  readonly provideLabelsCode = apiData.provideLabelsCode;
  readonly provideLabelsRows: PropRow[] = apiData.provideLabelsRows;
  readonly provideStylesRows: PropRow[] = apiData.provideStylesRows;
  readonly contextRows: PropRow[] = apiData.contextRows;
  readonly sections: ApiSection[] = apiData.sections;

  /** mapcn `DocsLink` / `DocsCode`. */
  protected readonly link = 'text-foreground font-medium underline underline-offset-4';
  protected readonly code = 'bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm';
}
