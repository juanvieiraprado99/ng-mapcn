import { ChangeDetectionStrategy, Component } from '@angular/core';

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
    >
      <app-docs-section title="How it works">
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
        <app-prop-table nameLabel="Entry point" [rows]="entryPoints" [showDefault]="false" />
        <app-docs-note>
          <strong>Tests only:</strong> never import these entry points from application code. The
          fake would end up in your bundle in place of MapLibre.
        </app-docs-note>
      </app-docs-section>

      <app-docs-section title="Vitest setup">
        <p>
          Vitest is the first-class runner (it is what Angular's
          <code [class]="code">unit-test</code> builder uses). Two files are needed. The setup file
          mocks <code [class]="code">maplibre-gl</code> and turns the fake's methods into
          <code [class]="code">vi.fn()</code> spies:
        </p>
        <app-code-block [code]="vitestSetup" filename="src/testing/setup.ts" />
        <p>
          The config tells Vitest to process <code [class]="code">ng-mapcn</code> itself instead of
          loading it from <code [class]="code">node_modules</code>:
        </p>
        <app-code-block [code]="vitestConfig" filename="vitest.config.mts" />
        <p>Then point the Angular CLI test target at both files:</p>
        <app-code-block [code]="angularJsonTest" filename="angular.json" />
        <app-docs-note>
          <strong>Why the inline regex matters:</strong> without
          <code [class]="code">server.deps.inline</code> Node loads the packaged
          <code [class]="code">ng-mapcn</code> as an external module, which imports the real
          <code [class]="code">maplibre-gl</code> and ignores
          <code [class]="code">vi.mock</code>. The pattern also covers the
          <code [class]="code">ng-mapcn/testing*</code> entry points, so the fake stays a single
          module instance shared by the library, the helpers and your specs.
        </app-docs-note>
      </app-docs-section>

      <app-docs-section title="Jest setup">
        <p>
          Jest maps the module instead of mocking it. Point
          <code [class]="code">maplibre-gl</code> at the fake and pass
          <code [class]="code">jest.fn</code> as the spy factory:
        </p>
        <app-code-block [code]="jestConfig" filename="jest.config.js" />
        <app-code-block [code]="jestSetup" filename="src/testing/setup.ts" />
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
      </app-docs-section>

      <app-docs-section title="Your first spec">
        <p>
          <code [class]="code">renderMap()</code> renders a template inside a host that imports
          <code [class]="code">ng-map</code> and returns the fixture, the fake map and the
          <code [class]="code">MapContextService</code>. Layer components wait for the map to load,
          so call <code [class]="code">loadMap()</code> before asserting on sources and layers:
        </p>
        <app-code-block [code]="firstSpec" filename="delivery-map.spec.ts" />
        <p>
          This spec is not pseudo-code: the demo's own test suite runs this exact text and fails if
          the page and the test drift apart.
        </p>
      </app-docs-section>

      <app-docs-section title="Helpers">
        <p>
          Everything below is exported by <code [class]="code">ng-mapcn/testing</code>. Call
          <code [class]="code">resetMapTesting()</code> in <code [class]="code">afterEach</code>:
          <code [class]="code">renderMap()</code> patches the layout getters jsdom lacks.
        </p>
        <app-prop-table nameLabel="Function" [rows]="helpers" [showDefault]="false" />
        <app-code-block [code]="eventsSpec" filename="route-interactions.spec.ts" />
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
        <app-docs-note>
          <strong>One <code [class]="code">renderMap()</code> per test.</strong> It configures
          <code [class]="code">TestBed</code>, so a second call in the same test throws
          <code [class]="code">TestBed already instantiated</code>. To test several maps, put them
          in one template: <code [class]="code">getFakeMap()</code> and the returned
          <code [class]="code">map</code> are the first one, and
          <code [class]="code">fakeRegistry.maps</code> holds them all.
        </app-docs-note>
      </app-docs-section>

      <app-docs-section title="Inspecting layers and sources">
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
            its spies (<code [class]="code">jumpTo</code>, <code [class]="code">setStyle</code>,
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
      </app-docs-section>

      <app-docs-section title="Popups and map clicks">
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
        <app-code-block [code]="popupClicksSpec" filename="popup-clicks.spec.ts" />
      </app-docs-section>

      <app-docs-section title="Component harnesses">
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
        </p>
        <app-prop-table nameLabel="Harness" [rows]="harnesses" [showDefault]="false" />
        <app-code-block [code]="harnessSpec" filename="marker-popup.spec.ts" />
        <p>
          The harnesses are a separate entry point on purpose: they import
          <code [class]="code">&#64;angular/cdk/testing</code>, which is an
          <strong>optional peer dependency</strong> of ng-mapcn. Install it only if you use them;
          <code [class]="code">ng-mapcn/testing</code> works without it.
        </p>
        <app-code-block [code]="installCdk" lang="bash" [showLineNumbers]="false" />
      </app-docs-section>

      <app-docs-section title="Fake timers">
        <p>
          <code [class]="code">&lt;ng-map&gt;</code> waits 100 ms after
          <code [class]="code">styledata</code> before it opens its load gate, and
          <code [class]="code">loadMap()</code> and <code [class]="code">reloadStyle()</code> wait
          that out. By default they wait on a real timer, which a fake clock would never fire. With
          fake timers installed, tell them how to advance your clock:
        </p>
        <app-code-block [code]="fakeTimersSpec" filename="fake-timers.spec.ts" />
        <p>
          Pair the two: set <code [class]="code">advanceTimers</code> only while fake timers are
          installed (<code [class]="code">vi.advanceTimersByTime</code> throws when they are off),
          and reset it to <code [class]="code">null</code> in
          <code [class]="code">afterEach</code> as above. With Jest, pass
          <code [class]="code">(ms) =&gt; jest.advanceTimersByTime(ms)</code>. If fake timers are
          installed and <code [class]="code">advanceTimers</code> is not set, both helpers throw
          right away with an error that names <code [class]="code">configureMapTesting</code>,
          instead of hanging until the test times out. They detect Vitest's and Jest's fake timers
          (both <code [class]="code">&#64;sinonjs/fake-timers</code>) and Jest's legacy timers.
        </p>
      </app-docs-section>

      <app-docs-section title="Limitations">
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
            <code [class]="code">aria-expanded</code>.
            <code [class]="code">isPopupOpen()</code> throws for such a marker: check the popup with
            <code [class]="code">NgMapHarness.getPopups()</code> instead.
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
      </app-docs-section>
    </app-docs-page>
  `,
})
export class TestingComponent {
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

  readonly entryPoints: PropRow[] = [
    {
      name: 'ng-mapcn/testing/maplibre',
      type: 'Map, Marker, Popup, Point, fakeRegistry, configureFakeMapLibre',
      default: '',
      description:
        'The runner-neutral fake that replaces maplibre-gl. It imports nothing, so it works with any runner.',
    },
    {
      name: 'ng-mapcn/testing',
      type: 'renderMap, loadMap, reloadStyle, getFakeMap, structuralCalls, ...',
      default: '',
      description: 'Helpers that render a template with ng-map and drive the fake.',
    },
    {
      name: 'ng-mapcn/testing/harness',
      type: 'NgMapHarness, NgMapMarkerHarness, NgMapPopupHarness, NgMapControlsHarness',
      default: '',
      description: 'Angular CDK component harnesses. Needs the optional @angular/cdk peer.',
    },
  ];

  readonly helpers: PropRow[] = [
    {
      name: 'renderMap',
      type: '(template, { imports, providers, hostProps, size }) => Promise<{ fixture, map, ctx }>',
      default: '',
      description:
        'Renders the template inside a standalone host, with ng-map imported, and runs change detection until the map exists. Size defaults to 400x300 because jsdom has no layout. The map is not loaded yet. Call it once per test.',
    },
    {
      name: 'loadMap',
      type: '(fixture, map?) => Promise<void>',
      default: '',
      description:
        'Simulates the first style load: fires load and styledata, waits out the 100 ms debounce, then runs change detection so layer components add their sources and layers. Throws when fake timers are installed without advanceTimers.',
    },
    {
      name: 'reloadStyle',
      type: '(fixture, map?) => Promise<void>',
      default: '',
      description:
        'Simulates the style requested by setStyle (a theme or styles change) arriving: every source and layer is dropped and the components re-add them.',
    },
    {
      name: 'update',
      type: '(fixture, props) => void',
      default: '',
      description:
        'Assigns host properties, marks the host for check and runs change detection, so it works with and without zone.js.',
    },
    {
      name: 'fireMapEvent',
      type: '(map, event, payload?, layerId?) => void',
      default: '',
      description:
        "Fires a map event like MapLibre would. Pass a layer id for layer events, as with map.on('click', layerId, handler).",
    },
    {
      name: 'getFakeMap',
      type: '(fixture) => FakeMap',
      default: '',
      description:
        'The fake map of the first ng-map. Throws if the map was not created (zero container size).',
    },
    {
      name: 'structuralCalls',
      type: '(map) => string[]',
      default: '',
      description: 'The ordered source and layer add and remove operations. Stable format.',
    },
    {
      name: 'setMapSize',
      type: '({ width, height } | null) => void',
      default: '',
      description:
        'Changes the container size the map sees, also after rendering. null means zero size, which keeps ng-map from creating its map.',
    },
    {
      name: 'configureMapTesting',
      type: '({ advanceTimers? }) => void',
      default: '',
      description: 'Sets how loadMap and reloadStyle wait: see Fake timers.',
    },
    {
      name: 'resetMapTesting',
      type: '() => void',
      default: '',
      description:
        'Restores the layout getters renderMap patched and clears fakeRegistry. Call it in afterEach.',
    },
  ];

  readonly harnesses: PropRow[] = [
    {
      name: 'NgMapHarness',
      type: 'isLoading, getMarkers, getPopups, getControls',
      default: '',
      description:
        'The map host. Markers, popups and controls are rendered inside the map container, so you find them from here.',
    },
    {
      name: 'NgMapMarkerHarness',
      type: 'getText, getAriaLabel, click, hover, mouseAway, focus, pressEnter, hasPopup, isPopupOpen',
      default: '',
      description:
        'A marker. Filter with { text, label }. hasPopup reads aria-haspopup, isPopupOpen reads aria-expanded: the state of this marker only.',
    },
    {
      name: 'NgMapPopupHarness',
      type: 'getText, isTooltip, hasCloseButton, close, pressEscape',
      default: '',
      description: 'An open popup or tooltip. A closed popup is not in the DOM. Filter with { text }.',
    },
    {
      name: 'NgMapControlsHarness',
      type: 'zoomIn, zoomOut, resetNorth, locate, isLocating, toggleFullscreen, isFullscreen',
      default: '',
      description:
        'The button group of ng-map-controls. An action throws when its button is hidden by showZoom, showCompass, showLocate or showFullscreen.',
    },
  ];

  /** mapcn `DocsLink` / `DocsCode`. */
  protected readonly link = 'text-foreground font-medium underline underline-offset-4';
  protected readonly code = 'bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm';
}
