import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { LanguageService } from '@/shared/i18n/language.service';

import { CodeBlockComponent } from '../../shared/code-block';
import { DocsImports } from '../../shared/docs';
import { type PropRow, PropTableComponent } from '../../shared/prop-table';
import {
  ANGULAR_JSON_TEST,
  EVENTS_SPEC,
  FAKE_TIMERS_SPEC,
  FIRST_SPEC,
  HARNESS_SPEC,
  INSTALL_CDK,
  JEST_CONFIG,
  JEST_SETUP,
  POPUP_CLICKS_SPEC,
  SELECTORS_E2E,
  VITEST_CONFIG,
  VITEST_SETUP,
} from './testing.examples';

@Component({
  selector: 'app-testing',
  standalone: true,
  imports: [DocsImports, CodeBlockComponent, PropTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-docs-page
      title="Testing your maps"
      description="Unit-test components that render ng-map in jsdom, without WebGL, with the same MapLibre fake the library tests itself with."
      titlePt="Testando seus mapas"
      descriptionPt="Teste unitariamente componentes que renderizam ng-map no jsdom, sem WebGL, com o mesmo fake do MapLibre que a biblioteca usa nos próprios testes."
    >
      <app-docs-section title="How it works" titlePt="Como funciona">
        @if (i18n.isPt()) {
          <p>
            O MapLibre precisa de WebGL, que o jsdom não tem, e o ng-mapcn importa o
            <code [class]="code">maplibre-gl</code> estaticamente. Por isso o kit de testes substitui o
            módulo inteiro: um fake com a mesma superfície (<code [class]="code">Map</code>,
            <code [class]="code">Marker</code>, <code [class]="code">Popup</code>, ...) que registra cada
            chamada, dispara eventos sob demanda e renderiza marcadores, popups e controles dentro do
            container do mapa, para você consultá-los como qualquer outro DOM. O seu test runner troca o
            módulo pelo mock de módulos dele.
          </p>
          <p>Três entry points vêm no pacote <code [class]="code">ng-mapcn</code>:</p>
        } @else {
          <p>
            MapLibre needs WebGL, which jsdom does not have, and ng-mapcn imports
            <code [class]="code">maplibre-gl</code> statically. So the testing toolkit replaces the
            whole module: a fake with the same surface (<code [class]="code">Map</code>,
            <code [class]="code">Marker</code>, <code [class]="code">Popup</code>, ...) that records
            every call, fires events on demand and renders markers, popups and controls into the map
            container, so you can query them like any other DOM. Your test runner swaps the module
            through its module mocking.
          </p>
          <p>Three entry points ship in the <code [class]="code">ng-mapcn</code> package:</p>
        }
        <app-prop-table nameLabel="Entry point" [rows]="entryPoints" [showDefault]="false" />
        @if (i18n.isPt()) {
          <app-docs-note>
            <strong>Só para testes:</strong> nunca importe esses entry points no código da aplicação. O
            fake acabaria no seu bundle no lugar do MapLibre.
          </app-docs-note>
        } @else {
          <app-docs-note>
            <strong>Tests only:</strong> never import these entry points from application code. The
            fake would end up in your bundle in place of MapLibre.
          </app-docs-note>
        }
      </app-docs-section>

      <app-docs-section title="Vitest setup" titlePt="Configuração com Vitest">
        @if (i18n.isPt()) {
          <p>
            O Vitest é o runner principal (é ele que o builder <code [class]="code">unit-test</code> do
            Angular usa). São necessários dois arquivos. O arquivo de setup faz o mock do
            <code [class]="code">maplibre-gl</code> e transforma os métodos do fake em spies
            <code [class]="code">vi.fn()</code>:
          </p>
        } @else {
          <p>
            Vitest is the first-class runner (it is what Angular's
            <code [class]="code">unit-test</code> builder uses). Two files are needed. The setup file
            mocks <code [class]="code">maplibre-gl</code> and turns the fake's methods into
            <code [class]="code">vi.fn()</code> spies:
          </p>
        }
        <app-code-block [code]="vitestSetup" filename="src/testing/setup.ts" />
        @if (i18n.isPt()) {
          <p>
            A config diz ao Vitest para processar o próprio <code [class]="code">ng-mapcn</code> em vez de
            carregá-lo de <code [class]="code">node_modules</code>:
          </p>
        } @else {
          <p>
            The config tells Vitest to process <code [class]="code">ng-mapcn</code> itself instead of
            loading it from <code [class]="code">node_modules</code>:
          </p>
        }
        <app-code-block [code]="vitestConfig" filename="vitest.config.mts" />
        @if (i18n.isPt()) {
          <p>Depois aponte o target de testes da Angular CLI para os dois arquivos:</p>
        } @else {
          <p>Then point the Angular CLI test target at both files:</p>
        }
        <app-code-block [code]="angularJsonTest" filename="angular.json" />
        @if (i18n.isPt()) {
          <app-docs-note>
            <strong>Por que a regex de inline importa:</strong> sem
            <code [class]="code">server.deps.inline</code> o Node carrega o
            <code [class]="code">ng-mapcn</code> empacotado como módulo externo, que importa o
            <code [class]="code">maplibre-gl</code> real e ignora o
            <code [class]="code">vi.mock</code>. O padrão também cobre os entry points
            <code [class]="code">ng-mapcn/testing*</code>, assim o fake continua sendo uma única instância
            de módulo, compartilhada pela biblioteca, pelos helpers e pelos seus specs.
          </app-docs-note>
        } @else {
          <app-docs-note>
            <strong>Why the inline regex matters:</strong> without
            <code [class]="code">server.deps.inline</code> Node loads the packaged
            <code [class]="code">ng-mapcn</code> as an external module, which imports the real
            <code [class]="code">maplibre-gl</code> and ignores
            <code [class]="code">vi.mock</code>. The pattern also covers the
            <code [class]="code">ng-mapcn/testing*</code> entry points, so the fake stays a single
            module instance shared by the library, the helpers and your specs.
          </app-docs-note>
        }
      </app-docs-section>

      <app-docs-section title="Jest setup" titlePt="Configuração com Jest">
        @if (i18n.isPt()) {
          <p>
            O Jest mapeia o módulo em vez de fazer mock. Aponte o
            <code [class]="code">maplibre-gl</code> para o fake e passe
            <code [class]="code">jest.fn</code> como fábrica de spies:
          </p>
        } @else {
          <p>
            Jest maps the module instead of mocking it. Point
            <code [class]="code">maplibre-gl</code> at the fake and pass
            <code [class]="code">jest.fn</code> as the spy factory:
          </p>
        }
        <app-code-block [code]="jestConfig" filename="jest.config.js" />
        <app-code-block [code]="jestSetup" filename="src/testing/setup.ts" />
        @if (i18n.isPt()) {
          <app-docs-note>
            <strong>Não testado pelo ng-mapcn.</strong> Os testes da biblioteca e do demo rodam só no
            Vitest. A configuração do Jest segue o contrato documentado do fake, mas não roda no CI. O
            build ESM do <code [class]="code">ng-mapcn</code> também precisa do transform de Angular que
            você já usa no Jest. Abra uma issue se tiver algum problema.
          </app-docs-note>
          <p>
            <strong>Karma e Jasmine não são suportados.</strong> Eles não conseguem substituir um módulo
            ES, então não há como trocar o <code [class]="code">maplibre-gl</code> pelo fake.
          </p>
        } @else {
          <app-docs-note>
            <strong>Not tested by ng-mapcn.</strong> The library's own tests and the demo run on
            Vitest only. The Jest setup follows the fake's documented contract, but it has not been
            run in CI. The ESM build of <code [class]="code">ng-mapcn</code> also needs your usual
            Angular transform for Jest. Please open an issue if you hit a problem.
          </app-docs-note>
          <p>
            <strong>Karma and Jasmine are not supported.</strong> They cannot replace an ES module, so
            there is no way to swap <code [class]="code">maplibre-gl</code> for the fake.
          </p>
        }
      </app-docs-section>

      <app-docs-section title="Your first spec" titlePt="Seu primeiro spec">
        @if (i18n.isPt()) {
          <p>
            <code [class]="code">renderMap()</code> renderiza um template dentro de um host que importa o
            <code [class]="code">ng-map</code> e devolve o fixture, o mapa fake e o
            <code [class]="code">MapContextService</code>. Componentes de camada esperam o mapa carregar,
            então chame <code [class]="code">loadMap()</code> antes de verificar sources e layers:
          </p>
        } @else {
          <p>
            <code [class]="code">renderMap()</code> renders a template inside a host that imports
            <code [class]="code">ng-map</code> and returns the fixture, the fake map and the
            <code [class]="code">MapContextService</code>. Layer components wait for the map to load,
            so call <code [class]="code">loadMap()</code> before asserting on sources and layers:
          </p>
        }
        <app-code-block [code]="firstSpec" filename="delivery-map.spec.ts" />
        @if (i18n.isPt()) {
          <p>
            Este spec não é pseudocódigo: a suíte de testes do próprio demo roda exatamente este texto e
            falha se a página e o teste se desencontrarem.
          </p>
        } @else {
          <p>
            This spec is not pseudo-code: the demo's own test suite runs this exact text and fails if
            the page and the test drift apart.
          </p>
        }
      </app-docs-section>

      <app-docs-section title="Helpers">
        @if (i18n.isPt()) {
          <p>
            Tudo abaixo é exportado por <code [class]="code">ng-mapcn/testing</code>. Chame
            <code [class]="code">resetMapTesting()</code> no <code [class]="code">afterEach</code>: o
            <code [class]="code">renderMap()</code> corrige os getters de layout que faltam no jsdom.
          </p>
        } @else {
          <p>
            Everything below is exported by <code [class]="code">ng-mapcn/testing</code>. Call
            <code [class]="code">resetMapTesting()</code> in <code [class]="code">afterEach</code>:
            <code [class]="code">renderMap()</code> patches the layout getters jsdom lacks.
          </p>
        }
        <app-prop-table nameLabel="Function" [rows]="helpers" [showDefault]="false" />
        <app-code-block [code]="eventsSpec" filename="route-interactions.spec.ts" />
        @if (i18n.isPt()) {
          <app-docs-note>
            <strong>Mude valores do host com <code [class]="code">update()</code> ou signals.</strong> Em
            apps zoneless (o padrão do Angular, e qualquer setup de teste sem zone.js) atribuir
            <code [class]="code">fixture.componentInstance.x = …</code> não marca nada para verificação,
            então o próximo <code [class]="code">detectChanges()</code> pula o host e a checagem do modo
            dev do Angular lança <code [class]="code">NG0100</code>.
            <code [class]="code">update()</code> marca o host para você. Senão, chame
            <code [class]="code">fixture.changeDetectorRef.markForCheck()</code> depois da atribuição, como
            em qualquer teste Angular zoneless, ou passe um signal em
            <code [class]="code">hostProps</code> e leia-o no template
            (<code [class]="code">theme()</code>).
          </app-docs-note>
        } @else {
          <app-docs-note>
            <strong>Change host values through <code [class]="code">update()</code> or signals.</strong>
            In zoneless apps (the Angular default, and any test setup without zone.js) assigning
            <code [class]="code">fixture.componentInstance.x = …</code> marks nothing for check, so
            the next <code [class]="code">detectChanges()</code> skips the host and Angular's
            dev-mode check throws <code [class]="code">NG0100</code>.
            <code [class]="code">update()</code> marks the host for you. Otherwise call
            <code [class]="code">fixture.changeDetectorRef.markForCheck()</code> after the assignment,
            as in any zoneless Angular test, or pass a signal in
            <code [class]="code">hostProps</code> and read it in the template
            (<code [class]="code">theme()</code>).
          </app-docs-note>
        }
        @if (i18n.isPt()) {
          <app-docs-note>
            <strong>Um <code [class]="code">renderMap()</code> por teste.</strong> Ele configura o
            <code [class]="code">TestBed</code>, então uma segunda chamada no mesmo teste lança
            <code [class]="code">TestBed already instantiated</code>. Para testar vários mapas, coloque
            todos em um template: <code [class]="code">getFakeMap()</code> e o
            <code [class]="code">map</code> devolvido são o primeiro, e
            <code [class]="code">fakeRegistry.maps</code> guarda todos.
          </app-docs-note>
        } @else {
          <app-docs-note>
            <strong>One <code [class]="code">renderMap()</code> per test.</strong> It configures
            <code [class]="code">TestBed</code>, so a second call in the same test throws
            <code [class]="code">TestBed already instantiated</code>. To test several maps, put them
            in one template: <code [class]="code">getFakeMap()</code> and the returned
            <code [class]="code">map</code> are the first one, and
            <code [class]="code">fakeRegistry.maps</code> holds them all.
          </app-docs-note>
        }
      </app-docs-section>

      <app-docs-section title="Inspecting layers and sources" titlePt="Inspecionando layers e sources">
        @if (i18n.isPt()) {
          <p>
            O mapa fake é um objeto comum que você pode inspecionar. Três coisas são API pública estável:
            <code [class]="code">fakeRegistry</code>, os getters do fake e
            <code [class]="code">structuralCalls()</code>.
          </p>
          <ul>
            <li>
              <code [class]="code">getFakeMap(fixture)</code> devolve o mapa fake do primeiro
              <code [class]="code">ng-map</code>. Use os getters dele (<code [class]="code">getLayer</code
              >, <code [class]="code">getSource</code>, <code [class]="code">getCenter</code>,
              <code [class]="code">getZoom</code>, <code [class]="code">getLayerOrder</code>,
              <code [class]="code">hasImage</code>, <code [class]="code">getTerrain</code>, ...) e os spies
              (<code [class]="code">jumpTo</code>, <code [class]="code">panBy</code>,
              <code [class]="code">setStyle</code>, <code [class]="code">setData</code>, ...) nas
              verificações.
            </li>
            <li>
              <code [class]="code">structuralCalls(map)</code> lista as operações de source e layer em
              ordem, como <code [class]="code">addSource:&lt;id&gt;</code>,
              <code [class]="code">addLayer:&lt;id&gt;</code>,
              <code [class]="code">removeLayer:&lt;id&gt;</code> e
              <code [class]="code">removeSource:&lt;id&gt;</code>. O formato é estável.
            </li>
            <li>
              <code [class]="code">fakeRegistry</code> guarda todos os
              <code [class]="code">maps</code>, <code [class]="code">markers</code> e
              <code [class]="code">popups</code> criados desde o último reset, por exemplo
              <code [class]="code">fakeRegistry.markers[0].getLngLat()</code>.
            </li>
          </ul>
          <app-docs-note>
            <strong>Não verifique <code [class]="code">map.calls</code>.</strong> As strings desse log de
            depuração não são estáveis e podem mudar em qualquer versão. Verifique pelos getters ou pelo
            <code [class]="code">structuralCalls()</code>.
          </app-docs-note>
        } @else {
          <p>
            The fake map is a plain object you can inspect. Three things are stable public API:
            <code [class]="code">fakeRegistry</code>, the fake's getters and
            <code [class]="code">structuralCalls()</code>.
          </p>
          <ul>
            <li>
              <code [class]="code">getFakeMap(fixture)</code> returns the fake map of the first
              <code [class]="code">ng-map</code>. Use its getters (<code [class]="code">getLayer</code
              >, <code [class]="code">getSource</code>, <code [class]="code">getCenter</code>,
              <code [class]="code">getZoom</code>, <code [class]="code">getLayerOrder</code>,
              <code [class]="code">hasImage</code>, <code [class]="code">getTerrain</code>, ...) and
              its spies (<code [class]="code">jumpTo</code>, <code [class]="code">panBy</code>,
              <code [class]="code">setStyle</code>,
              <code [class]="code">setData</code>, ...) for assertions.
            </li>
            <li>
              <code [class]="code">structuralCalls(map)</code> lists the source and layer operations
              in order, as <code [class]="code">addSource:&lt;id&gt;</code>,
              <code [class]="code">addLayer:&lt;id&gt;</code>,
              <code [class]="code">removeLayer:&lt;id&gt;</code> and
              <code [class]="code">removeSource:&lt;id&gt;</code>. Its format is stable.
            </li>
            <li>
              <code [class]="code">fakeRegistry</code> holds every
              <code [class]="code">maps</code>, <code [class]="code">markers</code> and
              <code [class]="code">popups</code> created since the last reset, for example
              <code [class]="code">fakeRegistry.markers[0].getLngLat()</code>.
            </li>
          </ul>
          <app-docs-note>
            <strong>Do not assert on <code [class]="code">map.calls</code>.</strong> The raw strings
            of that debugging log are not stable and may change in any release. Assert through the
            getters or <code [class]="code">structuralCalls()</code>.
          </app-docs-note>
        }
      </app-docs-section>

      <app-docs-section title="Popups and map clicks" titlePt="Popups e cliques no mapa">
        @if (i18n.isPt()) {
          <p>
            O fake fecha popups do mesmo jeito que o MapLibre, então um spec vê o mesmo comportamento do
            navegador:
          </p>
          <ul>
            <li>
              Um <code [class]="code">click</code> no mapa (por exemplo
              <code [class]="code">fireMapEvent(map, 'click')</code>) fecha todo popup aberto que foi criado
              sem <code [class]="code">closeOnClick: false</code>. O padrão do MapLibre é
              <code [class]="code">true</code>, que o <code [class]="code">ng-map-popup</code> mantém; o
              <code [class]="code">ng-marker-popup</code> usa <code [class]="code">false</code> por padrão.
            </li>
            <li>
              Remover um marcador (<code [class]="code">Marker.remove()</code>, que roda quando um
              <code [class]="code">ng-map-marker</code> é destruído) fecha o popup aberto dele.
            </li>
          </ul>
          <p>
            Os dois disparam o evento <code [class]="code">close</code> do popup, então o
            <code [class]="code">popupClose</code> emite e o <code [class]="code">open</code> do
            <code [class]="code">ng-map-popup</code> vira <code [class]="code">false</code>. Para manter um
            popup aberto enquanto o spec dispara cliques no mapa, use
            <code [class]="code">[closeOnClick]="false"</code>:
          </p>
        } @else {
          <p>
            The fake closes popups the way MapLibre does, so a spec sees the same behaviour as the
            browser:
          </p>
          <ul>
            <li>
              A map <code [class]="code">click</code> (for example
              <code [class]="code">fireMapEvent(map, 'click')</code>) closes every open popup created
              without <code [class]="code">closeOnClick: false</code>. MapLibre's default is
              <code [class]="code">true</code>, which <code [class]="code">ng-map-popup</code> keeps;
              <code [class]="code">ng-marker-popup</code> defaults to
              <code [class]="code">false</code>.
            </li>
            <li>
              Removing a marker (<code [class]="code">Marker.remove()</code>, which runs when an
              <code [class]="code">ng-map-marker</code> is destroyed) closes its open popup.
            </li>
          </ul>
          <p>
            Both fire the popup's <code [class]="code">close</code> event, so
            <code [class]="code">popupClose</code> emits and
            <code [class]="code">ng-map-popup</code>'s <code [class]="code">open</code> turns
            <code [class]="code">false</code>. To keep a popup open while the spec fires map clicks,
            bind <code [class]="code">[closeOnClick]="false"</code>:
          </p>
        }
        <app-code-block [code]="popupClicksSpec" filename="popup-clicks.spec.ts" />
      </app-docs-section>

      <app-docs-section title="Component harnesses">
        @if (i18n.isPt()) {
          <p>
            <code [class]="code">ng-mapcn/testing/harness</code> exporta
            <a
              href="https://angular.dev/guide/testing/component-harnesses-overview"
              target="_blank"
              rel="noopener noreferrer"
              [class]="link"
              >component harnesses do Angular CDK</a
            >
            que leem e controlam o DOM renderizado, para que os specs não dependam de seletores. Eles rodam
            num <code [class]="code">TestBed</code> sobre o fake, que renderiza marcadores, popups e
            controles onde o MapLibre renderiza. A suíte end-to-end do repositório confere esse contrato de
            DOM (os seletores usados pelos harnesses e o estado ARIA do marcador) contra o MapLibre real no
            Chromium.
          </p>
          <p>
            O <code [class]="code">NgMapMarkerHarness</code> lê o estado do popup do marcador pelos
            atributos ARIA: <code [class]="code">hasPopup()</code> é verdadeiro quando o marcador tem um
            <code [class]="code">ng-marker-popup</code> (<code [class]="code">aria-haspopup</code>), e
            <code [class]="code">isPopupOpen()</code> quando o popup do próprio marcador está aberto
            (<code [class]="code">aria-expanded</code>), não importa quais outros popups estejam abertos no
            mapa. Quando o conteúdo do marcador é um botão próprio, ele lê o
            <code [class]="code">aria-expanded</code> desse botão, que o app espelha a partir do popup
            (veja Limitações).
          </p>
        } @else {
          <p>
            <code [class]="code">ng-mapcn/testing/harness</code> exports
            <a
              href="https://angular.dev/guide/testing/component-harnesses-overview"
              target="_blank"
              rel="noopener noreferrer"
              [class]="link"
              >Angular CDK component harnesses</a
            >
            that read and drive the rendered DOM, so specs stay free of selectors. They run in a
            <code [class]="code">TestBed</code> on top of the fake, which renders markers, popups and
            controls where MapLibre does. The repository's end-to-end suite checks that DOM contract
            (the selectors the harnesses use and the marker's ARIA state) against the real MapLibre
            in Chromium.
          </p>
          <p>
            <code [class]="code">NgMapMarkerHarness</code> reads the marker's popup state from its
            ARIA attributes: <code [class]="code">hasPopup()</code> is true when the marker has an
            <code [class]="code">ng-marker-popup</code> (<code [class]="code">aria-haspopup</code>),
            and <code [class]="code">isPopupOpen()</code> when that marker's own popup is open
            (<code [class]="code">aria-expanded</code>), whatever other popups are open on the map.
            When the marker content is its own button, it reads that button's
            <code [class]="code">aria-expanded</code>, which the app mirrors from the popup (see
            Limitations).
          </p>
        }
        <app-prop-table nameLabel="Harness" [rows]="harnesses" [showDefault]="false" />
        <app-code-block [code]="harnessSpec" filename="marker-popup.spec.ts" />
        @if (i18n.isPt()) {
          <p>
            Os harnesses são um entry point separado de propósito: eles importam
            <code [class]="code">&#64;angular/cdk/testing</code>, que é uma
            <strong>peer dependency opcional</strong> do ng-mapcn. Instale só se for usá-los; o
            <code [class]="code">ng-mapcn/testing</code> funciona sem ela.
          </p>
        } @else {
          <p>
            The harnesses are a separate entry point on purpose: they import
            <code [class]="code">&#64;angular/cdk/testing</code>, which is an
            <strong>optional peer dependency</strong> of ng-mapcn. Install it only if you use them;
            <code [class]="code">ng-mapcn/testing</code> works without it.
          </p>
        }
        <app-code-block [code]="installCdk" lang="bash" [showLineNumbers]="false" />
      </app-docs-section>

      <app-docs-section title="DOM selectors for end-to-end tests" titlePt="Seletores de DOM para testes end-to-end">
        @if (i18n.isPt()) {
          <p>
            Os harnesses encontram tudo por meio do <code [class]="code">MAP_TEST_SELECTORS</code>,
            exportado por <code [class]="code">ng-mapcn/testing</code> (não pelo entry dos harnesses,
            então não precisa do <code [class]="code">&#64;angular/cdk</code>). Ele é o contrato de DOM
            estável de um mapa renderizado, igual com o fake e com o MapLibre real: reutilize-o no
            Playwright ou no Cypress em vez de fixar as classes no código. A suíte end-to-end do
            repositório confere cada entrada contra o MapLibre real no Chromium.
          </p>
        } @else {
          <p>
            The harnesses find everything through <code [class]="code">MAP_TEST_SELECTORS</code>,
            exported by <code [class]="code">ng-mapcn/testing</code> (not by the harness entry, so it
            needs no <code [class]="code">&#64;angular/cdk</code>). It is the stable DOM contract of a
            rendered map, the same with the fake and with the real MapLibre: reuse it in Playwright
            or Cypress instead of hard-coding the classes. The repository's end-to-end suite checks
            every entry against the real MapLibre in Chromium.
          </p>
        }
        <app-prop-table nameLabel="Key" [rows]="selectors" [showDefault]="false" />
        <app-code-block [code]="selectorsE2e" filename="e2e/map.spec.ts" />
      </app-docs-section>

      <app-docs-section title="Fake timers">
        @if (i18n.isPt()) {
          <p>
            O <code [class]="code">&lt;ng-map&gt;</code> espera 100 ms depois do
            <code [class]="code">styledata</code> antes de abrir o portão de carregamento, e
            <code [class]="code">loadMap()</code> e <code [class]="code">reloadStyle()</code> aguardam esse
            tempo. Por padrão eles esperam num timer real, que um relógio fake nunca dispararia. Com fake
            timers instalados, diga a eles como avançar o seu relógio:
          </p>
        } @else {
          <p>
            <code [class]="code">&lt;ng-map&gt;</code> waits 100 ms after
            <code [class]="code">styledata</code> before it opens its load gate, and
            <code [class]="code">loadMap()</code> and <code [class]="code">reloadStyle()</code> wait
            that out. By default they wait on a real timer, which a fake clock would never fire. With
            fake timers installed, tell them how to advance your clock:
          </p>
        }
        <app-code-block [code]="fakeTimersSpec" filename="fake-timers.spec.ts" />
        @if (i18n.isPt()) {
          <p>
            Use os dois juntos: defina <code [class]="code">advanceTimers</code> só enquanto os fake timers
            estiverem instalados (<code [class]="code">vi.advanceTimersByTime</code> lança erro quando
            estão desligados) e volte para <code [class]="code">null</code> no
            <code [class]="code">afterEach</code>, como acima. Com Jest, passe
            <code [class]="code">(ms) =&gt; jest.advanceTimersByTime(ms)</code>. Se houver fake timers
            instalados e <code [class]="code">advanceTimers</code> não estiver definido, os dois helpers
            lançam na hora um erro que cita o <code [class]="code">configureMapTesting</code>, em vez de
            travar até o teste estourar o tempo. Qualquer biblioteca de fake timers é detectada: o
            <code [class]="code">&#64;sinonjs/fake-timers</code> (Vitest, Jest) pela sua marca, e qualquer
            outra porque o <code [class]="code">setTimeout</code> já não é o que estava em vigor quando o
            <code [class]="code">ng-mapcn/testing</code> foi importado (o patch do zone.js não conta). Um
            <code [class]="code">setTimeout</code> substituído ou mockado é então verificado pelo
            comportamento, para que um spy ou wrapper que ainda roda em tempo real não seja confundido com
            um relógio fake.
          </p>
        } @else {
          <p>
            Pair the two: set <code [class]="code">advanceTimers</code> only while fake timers are
            installed (<code [class]="code">vi.advanceTimersByTime</code> throws when they are off),
            and reset it to <code [class]="code">null</code> in
            <code [class]="code">afterEach</code> as above. With Jest, pass
            <code [class]="code">(ms) =&gt; jest.advanceTimersByTime(ms)</code>. If fake timers are
            installed and <code [class]="code">advanceTimers</code> is not set, both helpers throw
            right away with an error that names <code [class]="code">configureMapTesting</code>,
            instead of hanging until the test times out. Any fake-timer library is detected:
            <code [class]="code">&#64;sinonjs/fake-timers</code> (Vitest, Jest) by its tag, anything
            else because <code [class]="code">setTimeout</code> is no longer the one in place when
            <code [class]="code">ng-mapcn/testing</code> was imported (zone.js patching it does not
            count). A replaced or mocked <code [class]="code">setTimeout</code> is then checked
            behaviourally, so a spy or wrapper that still runs on real time is not mistaken for a
            fake clock.
          </p>
        }
        @if (i18n.isPt()) {
          <app-docs-note>
            <strong>Instale fake timers sem marca depois do import.</strong> Sem zone.js, uma biblioteca
            que não seja o <code [class]="code">&#64;sinonjs/fake-timers</code> e que substitua o
            <code [class]="code">setTimeout</code> antes do primeiro import de
            <code [class]="code">ng-mapcn/testing</code> não pode ser detectada: os helpers então esperam no
            relógio fake até o teste estourar o tempo. Com o zone.js carregado, a referência é o original
            que ele guardou, então a ordem não importa.
          </app-docs-note>
        } @else {
          <app-docs-note>
            <strong>Install untagged fake timers after the import.</strong> Without zone.js, a library
            other than <code [class]="code">&#64;sinonjs/fake-timers</code> that replaces
            <code [class]="code">setTimeout</code> before <code [class]="code">ng-mapcn/testing</code>
            is first imported cannot be detected: the helpers then wait on the fake clock until the
            test times out. With zone.js loaded, the original it saved is the reference, so the order
            does not matter.
          </app-docs-note>
        }
      </app-docs-section>

      <app-docs-section title="Limitations" titlePt="Limitações">
        @if (i18n.isPt()) {
          <ul>
            <li>
              <strong>Sem renderização.</strong> O fake não desenha nada: não há saída em canvas, e
              <code [class]="code">queryRenderedFeatures</code> e o hit testing por pixel não estão
              disponíveis. Dispare os eventos você mesmo com <code [class]="code">fireMapEvent()</code>.
              Use testes end-to-end com um navegador de verdade (a suíte e2e do repositório roda o
              Playwright contra o MapLibre real no Chromium, veja o
              <a
                href="https://github.com/juanvieiraprado99/ng-mapcn/blob/main/CONTRIBUTING.md#e2e-tests"
                target="_blank"
                rel="noopener noreferrer"
                [class]="link"
                >CONTRIBUTING.md</a
              >) quando precisar de renderização real.
            </li>
            <li>
              <strong>Popups fecham como no MapLibre.</strong> Um <code [class]="code">click</code>
              disparado no mapa fecha popups sem <code [class]="code">closeOnClick: false</code>, e remover
              um marcador fecha o popup dele (veja Popups e cliques no mapa). Um spec que dispara cliques no
              mapa com um popup aberto precisa desligar isso com
              <code [class]="code">[closeOnClick]="false"</code>.
            </li>
            <li>
              <strong>Só Vitest e Jest.</strong> Karma e Jasmine não conseguem fazer mock de um módulo ES, e
              a configuração do Jest está documentada, mas não testada.
            </li>
            <li>
              <strong>Quem usa copiar e colar.</strong> O <code [class]="code">ng add ng-mapcn</code> copia
              o código-fonte dos componentes, mas não os arquivos de teste. Instale o pacote
              <code [class]="code">ng-mapcn</code> como dependência de desenvolvimento para ter o fake, os
              helpers e os harnesses.
            </li>
            <li>
              <strong>O harness de controles usa <code [class]="code">:has()</code> do CSS.</strong> Ele
              encontra o botão da bússola pelo ícone, então precisa de uma implementação de DOM com suporte a
              <code [class]="code">:has()</code> (o jsdom usado nos testes da biblioteca tem).
            </li>
            <li>
              <strong>Marcadores cujo conteúdo tem um controle próprio.</strong> Quando o
              <code [class]="code">ng-marker-content</code> contém um
              <code [class]="code">&lt;button&gt;</code> ou link, esse controle é o alvo do teclado e o
              elemento do marcador fica sem role, então não recebe <code [class]="code">aria-expanded</code>.
              Espelhe o estado no seu botão (<code [class]="code">&lt;ng-marker-popup #info&gt;</code> mais
              <code [class]="code">[attr.aria-expanded]="info.isOpen()"</code>) e o
              <code [class]="code">isPopupOpen()</code> lê esse valor do primeiro botão ou link do conteúdo.
              Sem isso o <code [class]="code">isPopupOpen()</code> lança erro: confira o popup com
              <code [class]="code">NgMapHarness.getPopups()</code>.
            </li>
            <li>
              <strong>O que a suíte end-to-end prova.</strong> Ela roda os seletores dos harnesses e as
              checagens ARIA do marcador num navegador contra o MapLibre real, não as classes dos harnesses
              em si, que precisam de um <code [class]="code">TestBed</code>.
            </li>
            <li>
              <strong>Controles são encontrados pela estrutura.</strong> Os rótulos dos botões são
              traduzíveis, então o harness de controles localiza zoom, bússola, localização e tela cheia pela
              posição e pelos atributos, não pelo <code [class]="code">aria-label</code>.
            </li>
          </ul>
        } @else {
          <ul>
            <li>
              <strong>No rendering.</strong> The fake draws nothing: there is no canvas output, and
              <code [class]="code">queryRenderedFeatures</code> and pixel hit testing are not
              available. Fire the events yourself with
              <code [class]="code">fireMapEvent()</code>.
              Use end-to-end tests with a real browser (the repository's own e2e suite runs Playwright
              against real MapLibre in Chromium, see
              <a
                href="https://github.com/juanvieiraprado99/ng-mapcn/blob/main/CONTRIBUTING.md#e2e-tests"
                target="_blank"
                rel="noopener noreferrer"
                [class]="link"
                >CONTRIBUTING.md</a
              >) when you need real rendering.
            </li>
            <li>
              <strong>Popups close like MapLibre's.</strong> A fired map
              <code [class]="code">click</code> closes popups without
              <code [class]="code">closeOnClick: false</code>, and removing a marker closes its popup
              (see Popups and map clicks). A spec that fires map clicks with a popup open must opt out
              with <code [class]="code">[closeOnClick]="false"</code>.
            </li>
            <li>
              <strong>Vitest and Jest only.</strong> Karma and Jasmine cannot mock an ES module, and
              the Jest setup is documented but not tested.
            </li>
            <li>
              <strong>Copy-paste users.</strong> <code [class]="code">ng add ng-mapcn</code> copies
              the component sources but not the testing files. Install the
              <code [class]="code">ng-mapcn</code> package as a dev dependency to get the fake, the
              helpers and the harnesses.
            </li>
            <li>
              <strong>The controls harness uses CSS <code [class]="code">:has()</code>.</strong> It
              finds the compass button by its icon, so it needs a DOM implementation that supports
              <code [class]="code">:has()</code> (the jsdom used by the library's own tests does).
            </li>
            <li>
              <strong>Markers whose content has its own control.</strong> When
              <code [class]="code">ng-marker-content</code> holds a
              <code [class]="code">&lt;button&gt;</code> or link, that control is the keyboard
              target and the marker element has no role, so it gets no
              <code [class]="code">aria-expanded</code>. Mirror the state on your button
              (<code [class]="code">&lt;ng-marker-popup #info&gt;</code> plus
              <code [class]="code">[attr.aria-expanded]="info.isOpen()"</code>) and
              <code [class]="code">isPopupOpen()</code> reads it from the first button or link in the
              content. Without it <code [class]="code">isPopupOpen()</code> throws: check the popup
              with <code [class]="code">NgMapHarness.getPopups()</code> instead.
            </li>
            <li>
              <strong>What the end-to-end suite proves.</strong> It runs the harness selectors and the
              marker ARIA checks in a browser against the real MapLibre, not the harness classes
              themselves, which need a <code [class]="code">TestBed</code>.
            </li>
            <li>
              <strong>Controls are found by structure.</strong> Button labels are translatable, so
              the controls harness locates zoom, compass, locate and fullscreen by their position and
              attributes, not by <code [class]="code">aria-label</code>.
            </li>
          </ul>
        }
      </app-docs-section>
    </app-docs-page>
  `,
})
export class TestingComponent {
  protected readonly i18n = inject(LanguageService);
  readonly vitestSetup = VITEST_SETUP;
  readonly vitestConfig = VITEST_CONFIG;
  readonly angularJsonTest = ANGULAR_JSON_TEST;
  readonly jestConfig = JEST_CONFIG;
  readonly jestSetup = JEST_SETUP;
  readonly firstSpec = FIRST_SPEC;
  readonly eventsSpec = EVENTS_SPEC;
  readonly fakeTimersSpec = FAKE_TIMERS_SPEC;
  readonly popupClicksSpec = POPUP_CLICKS_SPEC;
  readonly harnessSpec = HARNESS_SPEC;
  readonly installCdk = INSTALL_CDK;
  readonly selectorsE2e = SELECTORS_E2E;

  readonly entryPoints: PropRow[] = [
    {
      name: 'ng-mapcn/testing/maplibre',
      type: 'Map, Marker, Popup, Point, fakeRegistry, configureFakeMapLibre',
      default: '',
      description:
        'The runner-neutral fake that replaces maplibre-gl. It imports nothing, so it works with any runner.',
      descriptionPt:
        'O fake neutro de runner que substitui o maplibre-gl. Não importa nada, então funciona com qualquer runner.',
    },
    {
      name: 'ng-mapcn/testing',
      type: 'renderMap, loadMap, reloadStyle, getFakeMap, structuralCalls, MAP_TEST_SELECTORS, ...',
      default: '',
      description:
        'Helpers that render a template with ng-map and drive the fake, and the DOM selectors for any test. No @angular/cdk.',
      descriptionPt:
        'Helpers que renderizam um template com ng-map e controlam o fake, e os seletores de DOM para qualquer teste. Sem @angular/cdk.',
    },
    {
      name: 'ng-mapcn/testing/harness',
      type: 'NgMapHarness, NgMapMarkerHarness, NgMapPopupHarness, NgMapControlsHarness',
      default: '',
      description: 'Angular CDK component harnesses. Needs the optional @angular/cdk peer.',
      descriptionPt: 'Component harnesses do Angular CDK. Precisa da peer opcional @angular/cdk.',
    },
  ];

  readonly helpers: PropRow[] = [
    {
      name: 'renderMap',
      type: '(template, { imports, providers, hostProps, size }) => Promise<{ fixture, map, ctx }>',
      default: '',
      description:
        'Renders the template inside a standalone host, with ng-map imported, and runs change detection until the map exists. Size defaults to 400x300 because jsdom has no layout. The map is not loaded yet. Call it once per test.',
      descriptionPt:
        'Renderiza o template dentro de um host standalone, com ng-map importado, e roda a detecção de mudanças até o mapa existir. O tamanho padrão é 400x300 porque o jsdom não tem layout. O mapa ainda não está carregado. Chame uma vez por teste.',
    },
    {
      name: 'loadMap',
      type: '(fixture, map?) => Promise<void>',
      default: '',
      description:
        'Simulates the first style load: fires load and styledata, waits out the 100 ms debounce, then runs change detection so layer components add their sources and layers. Throws when fake timers are installed without advanceTimers.',
      descriptionPt:
        'Simula o primeiro carregamento de estilo: dispara load e styledata, espera o debounce de 100 ms e roda a detecção de mudanças para que os componentes de camada adicionem sources e layers. Lança erro quando há fake timers instalados sem advanceTimers.',
    },
    {
      name: 'reloadStyle',
      type: '(fixture, map?) => Promise<void>',
      default: '',
      description:
        'Simulates the style requested by setStyle (a theme or styles change) arriving: every source and layer is dropped and the components re-add them.',
      descriptionPt:
        'Simula a chegada do estilo pedido pelo setStyle (troca de tema ou de styles): todo source e layer é descartado e os componentes os adicionam de novo.',
    },
    {
      name: 'update',
      type: '(fixture, props) => void',
      default: '',
      description:
        'Assigns host properties, marks the host for check and runs change detection, so it works with and without zone.js.',
      descriptionPt:
        'Atribui propriedades do host, marca o host para verificação e roda a detecção de mudanças, então funciona com e sem zone.js.',
    },
    {
      name: 'fireMapEvent',
      type: '(map, event, payload?, layerId?) => void',
      default: '',
      description:
        "Fires a map event like MapLibre would. Pass a layer id for layer events, as with map.on('click', layerId, handler).",
      descriptionPt:
        'Dispara um evento do mapa como o MapLibre faria. Passe um id de layer para eventos de layer, como em map.on(\'click\', layerId, handler).',
    },
    {
      name: 'getFakeMap',
      type: '(fixture) => FakeMap',
      default: '',
      description:
        'The fake map of the first ng-map. Throws if the map was not created (zero container size).',
      descriptionPt:
        'O mapa fake do primeiro ng-map. Lança erro se o mapa não foi criado (container com tamanho zero).',
    },
    {
      name: 'structuralCalls',
      type: '(map) => string[]',
      default: '',
      description: 'The ordered source and layer add and remove operations. Stable format.',
      descriptionPt:
        'As operações de adicionar e remover sources e layers, em ordem. Formato estável.',
    },
    {
      name: 'setMapSize',
      type: '({ width, height } | null) => void',
      default: '',
      description:
        'Changes the container size the map sees, also after rendering. null means zero size, which keeps ng-map from creating its map.',
      descriptionPt:
        'Muda o tamanho de container que o mapa enxerga, também depois de renderizar. null significa tamanho zero, o que impede o ng-map de criar o mapa.',
    },
    {
      name: 'configureMapTesting',
      type: '({ advanceTimers? }) => void',
      default: '',
      description: 'Sets how loadMap and reloadStyle wait: see Fake timers.',
      descriptionPt: 'Define como loadMap e reloadStyle esperam: veja Fake timers.',
    },
    {
      name: 'resetMapTesting',
      type: '() => void',
      default: '',
      description:
        'Restores the layout getters renderMap patched and clears fakeRegistry. Call it in afterEach.',
      descriptionPt:
        'Restaura os getters de layout que o renderMap alterou e limpa o fakeRegistry. Chame no afterEach.',
    },
  ];

  /** Mirrors MAP_TEST_SELECTORS (docs-testing.spec.ts checks they match). */
  readonly selectors: PropRow[] = [
    { name: 'map', type: "'ng-map'", default: '', description: 'The ng-map host.', descriptionPt: 'O host ng-map.' },
    { name: 'loader', type: "'.ng-map-loader'", default: '', description: 'The loader overlay.', descriptionPt: 'O overlay de carregamento.' },
    {
      name: 'marker',
      type: "'.maplibregl-marker'",
      default: '',
      description: 'A marker element, in .maplibregl-canvas-container.',
      descriptionPt: 'Um elemento de marcador, em .maplibregl-canvas-container.',
    },
    {
      name: 'popup',
      type: "'.maplibregl-popup'",
      default: '',
      description: 'An open popup or tooltip, a direct child of the map container.',
      descriptionPt: 'Um popup ou tooltip aberto, filho direto do container do mapa.',
    },
    {
      name: 'popupCard',
      type: "'.ng-popup-card'",
      default: '',
      description: 'The role="dialog" card of ng-marker-popup / ng-map-popup.',
      descriptionPt: 'O card role="dialog" de ng-marker-popup / ng-map-popup.',
    },
    { name: 'tooltip', type: "'.ng-tooltip-pill'", default: '', description: 'The pill of ng-marker-tooltip.', descriptionPt: 'A pílula do ng-marker-tooltip.' },
    {
      name: 'popupClose',
      type: "'.ng-popup-close'",
      default: '',
      description: 'The close button of a popup card (closeButton input).',
      descriptionPt: 'O botão de fechar de um card de popup (input closeButton).',
    },
    { name: 'controls', type: "'.ng-controls'", default: '', description: 'ng-map-controls, in a control corner.', descriptionPt: 'ng-map-controls, num canto de controles.' },
    {
      name: 'controlGroup',
      type: "'.ng-control-group'",
      default: '',
      description: 'The button group of ng-map-controls.',
      descriptionPt: 'O grupo de botões do ng-map-controls.',
    },
  ];

  readonly harnesses: PropRow[] = [
    {
      name: 'NgMapHarness',
      type: 'isLoading, getMarkers, getPopups, getControls',
      default: '',
      description:
        'The map host. Markers, popups and controls are rendered inside the map container, so you find them from here.',
      descriptionPt:
        'O host do mapa. Marcadores, popups e controles são renderizados dentro do container do mapa, então você os encontra a partir daqui.',
    },
    {
      name: 'NgMapMarkerHarness',
      type: 'getText, getAriaLabel, click, hover, mouseAway, focus, pressEnter, hasPopup, isPopupOpen',
      default: '',
      description:
        'A marker. Filter with { text, label }. hasPopup reads aria-haspopup, isPopupOpen reads aria-expanded: the state of this marker only.',
      descriptionPt:
        'Um marcador. Filtre com { text, label }. hasPopup lê aria-haspopup, isPopupOpen lê aria-expanded: o estado só deste marcador.',
    },
    {
      name: 'NgMapPopupHarness',
      type: 'getText, isTooltip, hasCloseButton, close, pressEscape',
      default: '',
      description: 'An open popup or tooltip. A closed popup is not in the DOM. Filter with { text }.',
      descriptionPt:
        'Um popup ou tooltip aberto. Um popup fechado não está no DOM. Filtre com { text }.',
    },
    {
      name: 'NgMapControlsHarness',
      type: 'zoomIn, zoomOut, resetNorth, locate, isLocating, toggleFullscreen, isFullscreen',
      default: '',
      description:
        'The button group of ng-map-controls. An action throws when its button is hidden by showZoom, showCompass, showLocate or showFullscreen.',
      descriptionPt:
        'O grupo de botões do ng-map-controls. Uma ação lança erro quando o botão dela está oculto por showZoom, showCompass, showLocate ou showFullscreen.',
    },
  ];

  /** mapcn `DocsLink` / `DocsCode`. */
  protected readonly link = 'text-foreground font-medium underline underline-offset-4';
  protected readonly code = 'bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm';
}
