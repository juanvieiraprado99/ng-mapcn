import { ChangeDetectionStrategy, Component } from '@angular/core';
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
    <app-docs-page title="Introduction" description="Copy-paste map components for Angular.">
      <app-docs-section>
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
      </app-docs-section>

      <app-docs-section title="Philosophy">
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
      </app-docs-section>

      <app-docs-section title="Why ng-mapcn?">
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
      </app-docs-section>

      <app-docs-section title="Any Map Style">
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
      </app-docs-section>

      <app-docs-section title="Features">
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          @for (feature of features; track feature.title) {
            <div class="bg-surface space-y-3 rounded-lg p-4">
              <div class="flex items-center gap-2.5">
                <ng-icon [name]="feature.icon" size="16" class="text-muted-foreground" />
                <h3 class="text-foreground text-base font-medium">{{ feature.title }}</h3>
              </div>
              <p class="text-muted-foreground text-sm">{{ feature.description }}</p>
            </div>
          }
        </div>
      </app-docs-section>
    </app-docs-page>
  `,
})
export class GettingStartedComponent {
  /** mapcn `DocsLink` / `DocsCode`. */
  protected readonly link = 'text-foreground font-medium underline underline-offset-4';
  protected readonly code = 'bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm';

  readonly features = [
    {
      icon: 'lucideZap',
      title: 'Zero Config',
      description: 'Works out of the box with free map tiles. No API keys needed.',
    },
    {
      icon: 'lucidePalette',
      title: 'Theme Aware',
      description: 'Automatically switches between light and dark map styles.',
    },
    {
      icon: 'lucidePuzzle',
      title: 'Composable',
      description: 'Build complex UIs with simple, composable components.',
    },
    {
      icon: 'lucideCode',
      title: 'TypeScript',
      description: 'Full type safety with comprehensive TypeScript support.',
    },
    {
      icon: 'lucideBox',
      title: 'Copy & Paste',
      description: 'Own your code. Use schematics to copy the source into your project.',
    },
    {
      icon: 'lucideLayers',
      title: 'Any Map Style',
      description: 'Use any MapLibre-compatible tiles: MapTiler, Carto, OpenStreetMap, and more.',
    },
  ];
}
