import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MapComponent, MapControlsComponent } from 'ng-mapcn';

import { LanguageService } from '@/shared/i18n/language.service';

import { CodeBlockComponent } from '../../shared/code-block';
import { DocsImports } from '../../shared/docs';
import { InstallCommandComponent } from '../../shared/install-command';

const USAGE_CODE = `import { Component } from '@angular/core';
import { MapComponent, MapControlsComponent } from 'ng-mapcn';

@Component({
  selector: 'app-my-map',
  standalone: true,
  imports: [MapComponent, MapControlsComponent],
  template: \`
    <div class="h-[320px] overflow-hidden rounded-lg border">
      <ng-map [center]="[-74.006, 40.7128]" [zoom]="11">
        <ng-map-controls />
      </ng-map>
    </div>
  \`,
})
export class MyMapComponent {}`;

@Component({
  selector: 'app-installation',
  standalone: true,
  imports: [
    DocsImports,
    CodeBlockComponent,
    InstallCommandComponent,
    MapComponent,
    MapControlsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-docs-page
      title="Installation"
      description="How to install and set up ng-mapcn in your project."
      titlePt="Instalação"
      descriptionPt="Como instalar e configurar o ng-mapcn no seu projeto."
    >
      <app-docs-section title="Prerequisites" titlePt="Pré-requisitos">
        @if (i18n.isPt()) {
          <p>
            Um projeto Angular 22+. O
            <a href="https://tailwindcss.com" target="_blank" rel="noopener noreferrer" [class]="link"
              >Tailwind CSS</a
            >
            é opcional, mas recomendado para estilizar o conteúdo de marcadores e popups.
          </p>
        } @else {
          <p>
            An Angular 22+ project.
            <a href="https://tailwindcss.com" target="_blank" rel="noopener noreferrer" [class]="link"
              >Tailwind CSS</a
            >
            is optional but recommended for styling marker and popup content.
          </p>
        }
      </app-docs-section>

      <app-docs-section title="Installation" titlePt="Instalação">
        @if (i18n.isPt()) {
          <p>Rode o comando abaixo para adicionar os componentes de mapa:</p>
        } @else {
          <p>Run the following command to add the map components:</p>
        }
        <app-install-command />
        @if (i18n.isPt()) {
          <p>
            Isso copia o código-fonte dos componentes para o seu app (no estilo shadcn), instala o
            <code [class]="code">maplibre-gl</code> e registra o CSS dele. O
            <code [class]="code">ng add</code> instala com o gerenciador de pacotes do seu workspace (npm,
            pnpm, yarn ou bun).
          </p>
          <p>Se preferir, instale como um pacote npm comum:</p>
        } @else {
          <p>
            This copies the component sources into your app (shadcn-style), installs
            <code [class]="code">maplibre-gl</code> and registers its CSS.
            <code [class]="code">ng add</code> installs with your workspace's package manager (npm,
            pnpm, yarn or bun).
          </p>
          <p>Alternatively, install it as a regular npm package:</p>
        }
        <app-install-command packages="ng-mapcn maplibre-gl" />
      </app-docs-section>

      <app-docs-section title="Usage" titlePt="Uso">
        @if (i18n.isPt()) {
          <p>Importe e use os componentes de mapa:</p>
        } @else {
          <p>Import and use the map components:</p>
        }
        <app-code-block [code]="usageCode" />
        <div class="bg-card h-[320px] overflow-hidden rounded-lg border shadow-sm">
          <ng-map [center]="[-74.006, 40.7128]" [zoom]="11">
            <ng-map-controls />
          </ng-map>
        </div>
        @if (i18n.isPt()) {
          <app-docs-note>
            <strong>Observação:</strong> por padrão, o mapa usa os tiles gratuitos do CARTO, que alternam
            sozinhos entre os temas claro e escuro.
          </app-docs-note>
        } @else {
          <app-docs-note>
            <strong>Note:</strong> The map uses free CARTO basemap tiles by default. Tiles
            automatically switch between light and dark themes.
          </app-docs-note>
        }
      </app-docs-section>

      <app-docs-section title="AI agent skill" titlePt="Skill para agentes de IA">
        @if (i18n.isPt()) {
          <p>
            Usa um agente de código (Claude Code, Cursor, Codex, GitHub Copilot, Windsurf, Gemini e
            outros)? Instale a
            <a [href]="skillUrl" target="_blank" rel="noopener noreferrer" [class]="link"
              >skill do ng-mapcn</a
            >
            para que ele use a API real (seletores, inputs, outputs, setup e receitas) em vez de
            adivinhar:
          </p>
        } @else {
          <p>
            Using a coding agent (Claude Code, Cursor, Codex, GitHub Copilot, Windsurf, Gemini and
            others)? Install the
            <a [href]="skillUrl" target="_blank" rel="noopener noreferrer" [class]="link"
              >ng-mapcn skill</a
            >
            so it uses the real API (selectors, inputs, outputs, setup and recipes) instead of
            guessing:
          </p>
        }
        <app-code-block [code]="skillCommand" lang="bash" [showLineNumbers]="false" />
        @if (i18n.isPt()) {
          <p>
            Ela funciona com a CLI do
            <a href="https://skills.sh" target="_blank" rel="noopener noreferrer" [class]="link"
              >skills.sh</a
            >. Passe <code [class]="code">--list</code> para ver a skill antes, ou
            <code [class]="code">--skill ng-mapcn</code> para instalá-la explicitamente. Agentes sem
            suporte a skills podem ler o
            <a href="/llms-full.txt" target="_blank" rel="noopener" [class]="link">llms-full.txt</a>.
          </p>
        } @else {
          <p>
            It works with the
            <a href="https://skills.sh" target="_blank" rel="noopener noreferrer" [class]="link"
              >skills.sh</a
            >
            CLI. Pass <code [class]="code">--list</code> to preview the skill, or
            <code [class]="code">--skill ng-mapcn</code> to install it explicitly. Agents that do not
            support skills can read
            <a href="/llms-full.txt" target="_blank" rel="noopener" [class]="link">llms-full.txt</a> instead.
          </p>
        }
      </app-docs-section>
    </app-docs-page>
  `,
})
export class InstallationComponent {
  protected readonly i18n = inject(LanguageService);
  readonly usageCode = USAGE_CODE;
  readonly skillCommand = 'npx skills add juanvieiraprado99/ng-mapcn';
  readonly skillUrl = 'https://github.com/juanvieiraprado99/ng-mapcn/tree/main/skills/ng-mapcn';

  /** mapcn `DocsLink` / `DocsCode`. */
  protected readonly link = 'text-foreground font-medium underline underline-offset-4';
  protected readonly code = 'bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm';
}
