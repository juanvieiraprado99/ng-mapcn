import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { StyleSpecification } from 'maplibre-gl';
import { MapComponent, type MapStylesConfig } from 'ng-mapcn';

import { LanguageService } from '@/shared/i18n/language.service';

import { BasemapService } from '../../../shared/basemap.service';
import { DocsImports } from '../../../shared/docs';
import { ExampleSectionComponent } from '../../../shared/example-section';

const CARTO_CODE = `<!-- No [styles] input: Carto Positron (light) / Dark Matter (dark) -->
<ng-map [center]="[2.3522, 48.8566]" [zoom]="11" />

<!-- Other Carto variants, passed explicitly -->
<ng-map
  [styles]="{
    light: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json'
  }"
/>`;

const OPENFREEMAP_CODE = `import { Component } from '@angular/core';
import { MapComponent, MapStylesConfig } from 'ng-mapcn';

@Component({
  selector: 'app-openfreemap',
  standalone: true,
  imports: [MapComponent],
  template: \`
    <div class="h-[420px]">
      <ng-map [center]="[13.388, 52.517]" [zoom]="11" [styles]="styles" />
    </div>
  \`,
})
export class OpenFreeMapComponent {
  // No key, no registration, no request limits.
  // Styles: liberty | bright | positron | dark | fiord
  readonly styles: MapStylesConfig = {
    light: 'https://tiles.openfreemap.org/styles/positron',
    dark: 'https://tiles.openfreemap.org/styles/dark',
  };
}`;

const OSM_CODE = `import { Component } from '@angular/core';
import type { StyleSpecification } from 'maplibre-gl';
import { MapComponent, MapStylesConfig } from 'ng-mapcn';

// OpenStreetMap serves raster tiles, not a hosted style.json — build the
// MapLibre style by hand. Keep it as a constant: ng-map compares the resolved
// style by identity before calling setStyle().
const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

@Component({
  selector: 'app-osm-map',
  standalone: true,
  imports: [MapComponent],
  template: \`
    <div class="h-[420px]">
      <ng-map [center]="[-0.1276, 51.5074]" [zoom]="12" [styles]="styles" />
    </div>
  \`,
})
export class OsmMapComponent {
  // Raster has no dark variant — same style for both themes.
  readonly styles: MapStylesConfig = { light: OSM_STYLE, dark: OSM_STYLE };
}`;

const MAPTILER_CODE = `import { Component } from '@angular/core';
import { MapComponent, MapStylesConfig } from 'ng-mapcn';

@Component({
  selector: 'app-maptiler-map',
  standalone: true,
  imports: [MapComponent],
  template: \`
    <div class="h-[420px]">
      <ng-map [center]="[-46.633, -23.55]" [zoom]="11" [styles]="styles" />
    </div>
  \`,
})
export class MapTilerMapComponent {
  // Get a key at https://cloud.maptiler.com/account/keys/
  // Style ids: streets-v4, streets-v4-dark, dataviz-v4, dataviz-v4-dark,
  //            satellite, outdoor-v2, ... (v2 ids still work)
  private readonly key = 'YOUR_MAPTILER_KEY';

  readonly styles: MapStylesConfig = {
    light: \`https://api.maptiler.com/maps/streets-v4/style.json?key=\${this.key}\`,
    dark: \`https://api.maptiler.com/maps/streets-v4-dark/style.json?key=\${this.key}\`,
  };
}`;

const STADIA_CODE = `import { Component } from '@angular/core';
import { MapComponent, MapStylesConfig } from 'ng-mapcn';

@Component({
  selector: 'app-stadia-map',
  standalone: true,
  imports: [MapComponent],
  template: \`
    <div class="h-[420px]">
      <ng-map [center]="[12, 53]" [zoom]="5" [styles]="styles" />
    </div>
  \`,
})
export class StadiaMapComponent {
  // On localhost / 127.0.0.1 the key is optional (rate limited). In production
  // use an API key or domain-based auth: https://client.stadiamaps.com/
  // Styles: alidade_smooth, alidade_smooth_dark, outdoors, osm_bright, stamen_*
  private readonly auth = '?api_key=YOUR_STADIA_KEY';

  readonly styles: MapStylesConfig = {
    light: \`https://tiles.stadiamaps.com/styles/alidade_smooth.json\${this.auth}\`,
    dark: \`https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json\${this.auth}\`,
  };
}`;

const APP_WIDE_CODE = `// basemap.service.ts — one signal holding the app's basemap
import { computed, Injectable, signal } from '@angular/core';
import { MapStylesConfig } from 'ng-mapcn';

@Injectable({ providedIn: 'root' })
export class BasemapService {
  readonly provider = signal<'carto' | 'openfreemap'>('carto');

  readonly styles = computed<MapStylesConfig | undefined>(() =>
    this.provider() === 'openfreemap'
      ? {
          light: 'https://tiles.openfreemap.org/styles/positron',
          dark: 'https://tiles.openfreemap.org/styles/dark',
        }
      : undefined, // undefined = built-in Carto defaults
  );
}

// app.config.ts
import { inject } from '@angular/core';
import { provideMapStyles } from 'ng-mapcn';

export const appConfig: ApplicationConfig = {
  providers: [
    // Also accepts a plain config: provideMapStyles({ light, dark })
    provideMapStyles(() => inject(BasemapService).styles),
  ],
};`;

const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

const CARTO_VOYAGER: MapStylesConfig = {
  light: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
};

const OPENFREEMAP: MapStylesConfig = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};

const OSM: MapStylesConfig = { light: OSM_STYLE, dark: OSM_STYLE };

@Component({
  selector: 'app-basemaps-page',
  standalone: true,
  imports: [DocsImports, ExampleSectionComponent, MapComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-docs-page
      title="Map Styles"
      description="ng-mapcn renders any MapLibre-compatible basemap. Carto is the default; here is a working example for each major provider."
      titlePt="Estilos de mapa"
      descriptionPt="O ng-mapcn renderiza qualquer basemap compatível com MapLibre. Carto é o padrão; aqui há um exemplo funcionando para cada um dos principais provedores."
    >
      <app-docs-section>
        @if (i18n.isPt()) {
          <p>
            Passe uma config <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">styles</code> por tema para um único mapa, ou chame <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">provideMapStyles()</code> uma vez
            para definir o basemap do app inteiro — é exatamente o que o seletor de basemap no header
            deste site faz, então todos os mapas abaixo (e de todas as outras páginas) o acompanham ao
            vivo.
          </p>
        } @else {
          <p>
          Pass a per-theme
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">styles</code>
          config to a single map, or call
          <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">provideMapStyles()</code>
          once to set the basemap for the whole app — that is exactly what the
          basemap picker in this site's header does, so every map below (and on
          every other page) follows it live.
          </p>
        }
      </app-docs-section>

      <app-example-section
        title="Carto (default)"
        titlePt="Carto (padrão)"
        sectionId="carto"
        [code]="cartoCode"
      >
        <span description>
          @if (i18n.isPt()) {
            Usado quando nenhum <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">styles</code> é informado: Positron no tema claro, Dark Matter no escuro. Sem
            chave de API. Outras variantes: <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">voyager-gl-style</code> e os estilos <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">*-nolabels-*</code> — esta prévia
            usa o Voyager.
          } @else {
            Used when no
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">styles</code>
            is given: Positron for light, Dark Matter for dark. No API key.
            Other variants: <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">voyager-gl-style</code>
            and the <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">*-nolabels-*</code>
            styles — this preview uses Voyager.
          }
        </span>
        <ng-map [center]="[2.3522, 48.8566]" [zoom]="11" [styles]="carto" />
      </app-example-section>

      <app-example-section
        title="OpenFreeMap"
        sectionId="openfreemap"
        [code]="openFreeMapCode"
      >
        <span description>
          @if (i18n.isPt()) {
            Tiles vetoriais gratuitos feitos com dados do OpenStreetMap — sem cadastro, sem chave de API e
            sem limite de requisições. Estilos: <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">liberty</code>, <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">bright</code>, <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">positron</code>, <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">dark</code>, <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">fiord</code>.
          } @else {
            Free vector tiles built from OpenStreetMap data — no registration, no
            API key, no request limits. Styles:
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">liberty</code>,
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">bright</code>,
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">positron</code>,
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">dark</code>,
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">fiord</code>.
          }
        </span>
        <ng-map [center]="[13.388, 52.517]" [zoom]="11" [styles]="openFreeMap" />
      </app-example-section>

      <app-example-section
        title="OpenStreetMap"
        sectionId="openstreetmap"
        [code]="osmCode"
      >
        <span description>
          @if (i18n.isPt()) {
            O OSM não hospeda um <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">style.json</code> — ele serve tiles raster, então o estilo do MapLibre é escrito
            à mão. Guarde o objeto numa constante: o mapa compara o estilo resolvido por identidade antes
            de chamar <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">setStyle</code>. O servidor público de tiles é só para desenvolvimento e demos pequenas —
            leia a
            <a
              href="https://operations.osmfoundation.org/policies/tiles/"
              target="_blank"
              rel="noreferrer"
              class="underline underline-offset-4"
              >política de uso de tiles</a
            >
            antes de colocar em produção (o OpenFreeMap é a alternativa direta).
          } @else {
            OSM does not host a <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">style.json</code> —
            it serves raster tiles, so the MapLibre style is written by hand. Keep
            the object in a constant: the map compares the resolved style by
            identity before calling
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">setStyle</code>.
            The public tile server is for development and small demos only — read
            the
            <a
              href="https://operations.osmfoundation.org/policies/tiles/"
              target="_blank"
              rel="noreferrer"
              class="underline underline-offset-4"
              >tile usage policy</a
            >
            before shipping it (OpenFreeMap is the drop-in alternative).
          }
        </span>
        <ng-map [center]="[-0.1276, 51.5074]" [zoom]="12" [styles]="osm" />
      </app-example-section>

      <app-example-section
        title="MapTiler"
        sectionId="maptiler"
        [code]="maptilerCode"
      >
        <span description>
          @if (i18n.isPt()) {
            Exige chave de API (<code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">?key=</code>). Os ids de estilo seguem o padrão <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">streets-v4</code> /
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">streets-v4-dark</code> (também <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">dataviz-v4</code>, <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">satellite</code>). Para ver ao vivo, escolha
            <strong>MapTiler</strong> no header e cole a sua chave — ela fica guardada só no seu
            navegador.
          } @else {
            Requires an API key (<code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">?key=</code>).
            Style ids follow the
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">streets-v4</code> /
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">streets-v4-dark</code>
            pattern (also <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">dataviz-v4</code>,
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">satellite</code>).
            To preview it live, pick <strong>MapTiler</strong> in the header and
            paste your key — it is kept in your browser only.
          }
        </span>
        @if (maptilerStyles(); as styles) {
          <ng-map [center]="[-46.633, -23.55]" [zoom]="11" [styles]="styles" />
        } @else {
          <div
            class="text-muted-foreground flex h-full items-center justify-center p-6 text-center text-sm"
          >
            @if (i18n.isPt()) {
              Escolha <strong class="mx-1 font-medium">MapTiler</strong> no header e cole uma chave de API
              para ver este basemap.
            } @else {
              Select <strong class="mx-1 font-medium">MapTiler</strong> in the
              header and paste an API key to preview this basemap.
            }
          </div>
        }
      </app-example-section>

      <app-example-section
        title="Stadia Maps"
        sectionId="stadia"
        [code]="stadiaCode"
      >
        <span description>
          @if (i18n.isPt()) {
            Sem chave no <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">localhost</code> (com limite de requisições); em produção use <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">?api_key=</code> ou
            autenticação por domínio. Estilos: <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">alidade_smooth</code>, <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">alidade_smooth_dark</code>, <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">outdoors</code>,
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">osm_bright</code>.
          } @else {
            Keyless on
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">localhost</code>
            (rate limited); in production use
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">?api_key=</code>
            or domain-based auth. Styles:
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">alidade_smooth</code>,
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">alidade_smooth_dark</code>,
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">outdoors</code>,
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">osm_bright</code>.
          }
        </span>
        <ng-map [center]="[12, 53]" [zoom]="5" [styles]="stadiaStyles()" />
      </app-example-section>

      <app-example-section
        title="App-wide basemap"
        titlePt="Basemap para o app inteiro"
        sectionId="app-wide"
        [code]="appWideCode"
      >
        <span description>
          @if (i18n.isPt()) {
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">provideMapStyles()</code> define o basemap padrão de todo <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map</code> do app. Precedência:
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">[styles]</code> → <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">[blank]</code> → <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">provideMapStyles()</code> → Carto. Passe um signal e o basemap troca em
            tempo de execução — o seletor do header deste site é esse signal.
          } @else {
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">provideMapStyles()</code>
            sets the default basemap for every
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">ng-map</code> in
            the app. Precedence:
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">[styles]</code> →
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">[blank]</code> →
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm">provideMapStyles()</code>
            → Carto. Pass a signal and the basemap swaps at runtime — the header
            picker on this site is that signal.
          }
        </span>
        <ng-map [center]="[-74.006, 40.713]" [zoom]="10" />
      </app-example-section>
    </app-docs-page>
  `,
})
export class BasemapsPageComponent {
  protected readonly i18n = inject(LanguageService);
  private readonly basemap = inject(BasemapService);

  readonly cartoCode = CARTO_CODE;
  readonly openFreeMapCode = OPENFREEMAP_CODE;
  readonly osmCode = OSM_CODE;
  readonly maptilerCode = MAPTILER_CODE;
  readonly stadiaCode = STADIA_CODE;
  readonly appWideCode = APP_WIDE_CODE;

  readonly carto = CARTO_VOYAGER;
  readonly openFreeMap = OPENFREEMAP;
  readonly osm = OSM;

  /** Live preview only works once a key is pasted in the header. */
  readonly maptilerStyles = computed<MapStylesConfig | undefined>(() => {
    const key = this.basemap.keys()['maptiler'];
    if (!key) return undefined;
    return {
      light: `https://api.maptiler.com/maps/streets-v4/style.json?key=${encodeURIComponent(key)}`,
      dark: `https://api.maptiler.com/maps/streets-v4-dark/style.json?key=${encodeURIComponent(key)}`,
    };
  });

  /** Stadia works without a key on localhost, so always render it. */
  readonly stadiaStyles = computed<MapStylesConfig>(() => {
    const key = this.basemap.keys()['stadia'];
    const auth = key ? `?api_key=${encodeURIComponent(key)}` : '';
    return {
      light: `https://tiles.stadiamaps.com/styles/alidade_smooth.json${auth}`,
      dark: `https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json${auth}`,
    };
  });
}
