import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';

import { renderRoute } from '../../../testing/render-route';
import { createLayer, decodeScene, encodeScene } from './playground-scene';
import { initialMapState } from './style-presets';

describe('playground page', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
    document.documentElement.className = '';
  });

  /** Opens a zard select by its host id and clicks the option with that label. */
  const pick = (
    harness: { detectChanges(): void },
    root: HTMLElement,
    id: string,
    label: string,
  ) => {
    root.querySelector<HTMLButtonElement>(`#${id} button[role="combobox"]`)!.click();
    harness.detectChanges();
    const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (item) => item.textContent?.trim() === label,
    )!;
    option.click();
    harness.detectChanges();
  };

  /** One keyboard step per press on the zard slider thumb. */
  const press = (
    harness: { detectChanges(): void },
    root: HTMLElement,
    id: string,
    key: string,
    times: number,
  ) => {
    const thumb = root.querySelector<HTMLElement>(`#${id} [data-slot="slider-thumb"]`)!;
    for (let i = 0; i < times; i++) {
      thumb.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    }
    harness.detectChanges();
  };

  const snippet = (root: HTMLElement) =>
    root.querySelector('#snippet app-code-block')?.textContent ?? '';

  /** Clicks the button with this accessible name (`aria-label`). */
  const press$ = (harness: { detectChanges(): void }, root: HTMLElement, label: string) => {
    const button = root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
    if (!button) throw new Error(`No button "${label}"`);
    button.click();
    harness.detectChanges();
  };

  const layerNames = (root: HTMLElement) =>
    [...root.querySelectorAll('[data-layer]')].map((li) => li.getAttribute('data-layer'));

  it('generates labelled controls and a snippet that follows the inputs', async () => {
    const { harness, errors } = await renderRoute('/playground');
    const root = harness.fixture.nativeElement as HTMLElement;

    // Route is the default component: its controls are labelled and the snippet is live.
    expect(root.querySelector('#pg-route-width')).not.toBeNull();
    expect(
      root.querySelector('#pg-route-width [data-slot="slider-thumb"]')?.getAttribute('aria-label'),
    ).toBe('Width');
    expect(snippet(root)).toContain('<ng-map-route');
    expect(snippet(root)).not.toContain('[width]');

    press(harness, root, 'pg-route-width', 'ArrowRight', 6);
    expect(snippet(root)).toContain('[width]="9"');

    // The basemap select applies a gallery preset to the map snippet.
    pick(harness, root, 'pg-map-presetId', 'Blank');
    expect(snippet(root)).toContain('[blank]="true"');
    expect(errors).toEqual([]);
  });

  it('adds a block on top of the stack and edits the selected layer', async () => {
    const { harness, errors } = await renderRoute('/playground');
    const root = harness.fixture.nativeElement as HTMLElement;

    press$(harness, root, 'Add Heatmap');

    expect(layerNames(root)).toEqual(['heatmap', 'route']);
    // Both are drawn: the route first (bottom of the stack), then the heatmap.
    const code = snippet(root);
    expect(code).toContain('weightProperty="mag"');
    expect(code.indexOf('<ng-map-route')).toBeLessThan(code.indexOf('<ng-map-heatmap'));
    // The inspector follows the selection.
    expect(root.querySelector('#pg-heatmap-radius')).not.toBeNull();
    expect(root.querySelector('#pg-route-width')).toBeNull();

    root.querySelector<HTMLButtonElement>('[data-layer="route"] button[aria-pressed]')!.click();
    harness.detectChanges();
    expect(root.querySelector('#pg-route-width')).not.toBeNull();
    expect(errors).toEqual([]);
  });

  it('reorders, hides, duplicates and removes layers', async () => {
    const { harness, errors } = await renderRoute('/playground');
    const root = harness.fixture.nativeElement as HTMLElement;
    press$(harness, root, 'Add Arcs');

    press$(harness, root, 'Move arc down');
    expect(layerNames(root)).toEqual(['route', 'arc']);
    expect(snippet(root).indexOf('<ng-map-arc')).toBeLessThan(
      snippet(root).indexOf('<ng-map-route'),
    );

    press$(harness, root, 'Hide arc');
    expect(snippet(root)).not.toContain('<ng-map-arc');
    press$(harness, root, 'Show arc');
    expect(snippet(root)).toContain('<ng-map-arc');

    root.querySelector<HTMLButtonElement>('[data-layer="route"] button[aria-pressed]')!.click();
    harness.detectChanges();
    press$(harness, root, 'Duplicate route');
    expect(layerNames(root)).toEqual(['route-2', 'route', 'arc']);
    expect(snippet(root)).toContain('id="route-2"');
    expect(root.querySelector('#pg-route-2-width')).not.toBeNull();

    press$(harness, root, 'Remove route-2');
    press$(harness, root, 'Remove route');
    expect(layerNames(root)).toEqual(['arc']);
    expect(snippet(root)).not.toContain('<ng-map-route');
    expect(errors).toEqual([]);
  });

  it('clears the scene to a bare map and resets it', async () => {
    const { harness } = await renderRoute('/playground');
    const root = harness.fixture.nativeElement as HTMLElement;
    const toolbar = (name: string) =>
      [...root.querySelectorAll<HTMLButtonElement>('[role="toolbar"] button')].find(
        (button) => button.textContent?.trim() === name,
      )!;

    toolbar('Clear').click();
    harness.detectChanges();
    expect(layerNames(root)).toEqual([]);
    expect(snippet(root)).not.toContain('</ng-map>');
    expect(root.textContent).toContain('Drag a block here');

    toolbar('Reset').click();
    harness.detectChanges();
    expect(layerNames(root)).toEqual(['route']);
  });

  it('opens a shared scene and copies the current one as a link', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    // jsdom has no clipboard.
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    onTestFinished(() => {
      delete (navigator as { clipboard?: unknown }).clipboard;
    });
    const code = encodeScene({
      layers: [createLayer([], 'heatmap')],
      map: { ...initialMapState(4), presetId: 'blank' },
    });

    const { harness, errors } = await renderRoute(`/playground?scene=${code}`);
    const root = harness.fixture.nativeElement as HTMLElement;
    expect(layerNames(root)).toEqual(['heatmap']);
    expect(snippet(root)).toContain('[blank]="true"');

    const copy = [...root.querySelectorAll<HTMLButtonElement>('[role="toolbar"] button')].find(
      (button) => button.textContent?.includes('Copy link'),
    )!;
    copy.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const url = new URL(writeText.mock.calls[0][0] as string);
    expect(url.pathname).toBe('/playground');
    const copied = decodeScene(url.searchParams.get('scene'))!;
    expect(copied.layers.map((layer) => layer.specId)).toEqual(['heatmap']);
    expect(copied.map.presetId).toBe('blank');
    expect(root.textContent).toContain('Link copied');
    expect(errors).toEqual([]);
  });

  it('falls back to the default scene for a broken link', async () => {
    const { harness, errors } = await renderRoute('/playground?scene=broken');
    expect(layerNames(harness.fixture.nativeElement)).toEqual(['route']);
    expect(errors).toEqual([]);
  });

  it('applies a gallery card to the playground map', async () => {
    const { harness } = await renderRoute('/playground');
    const root = harness.fixture.nativeElement as HTMLElement;

    root.querySelector<HTMLButtonElement>('button[aria-label^="Apply Globe"]')!.click();
    harness.detectChanges();

    expect(snippet(root)).toContain(`[projection]="{ type: 'globe' }"`);
    expect(
      root.querySelector('#pg-map-projection button[role="combobox"]')?.textContent?.trim(),
    ).toBe('Globe');
  });

  it('survives clearing or corrupting the cluster JSON controls', async () => {
    const { harness, errors } = await renderRoute('/playground');
    const root = harness.fixture.nativeElement as HTMLElement;
    press$(harness, root, 'Add Clusters');

    const colors = root.querySelector<HTMLTextAreaElement>('#pg-cluster-clusterColors')!;
    const type = (text: string) => {
      colors.value = text;
      colors.dispatchEvent(new Event('input', { bubbles: true }));
      harness.detectChanges();
    };
    type('null');
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Three CSS colors');
    type('');
    expect(root.querySelector('[role="alert"]')).toBeNull();
    expect(snippet(root)).not.toContain('undefined');
    expect(errors).toEqual([]);
  });

  it('renders the marker with its content and follows a drag', async () => {
    const { harness, errors } = await renderRoute('/playground');
    const root = harness.fixture.nativeElement as HTMLElement;
    press$(harness, root, 'Add Marker');

    expect(snippet(root)).toContain('<ng-marker-content />');
    expect(root.querySelector('app-playground-marker')).not.toBeNull();
    expect(errors).toEqual([]);
  });

  it('links hints and readouts to their fields', async () => {
    const { harness } = await renderRoute('/playground');
    const root = harness.fixture.nativeElement as HTMLElement;

    const width = root.querySelector('#pg-route-width')!;
    expect(root.querySelector('#pg-route-width-label')?.textContent?.trim()).toBe('Width');
    expect(root.querySelector('output[for="pg-route-width"]')).not.toBeNull();
    const interactive = root.querySelector('#pg-route-interactive')!;
    const hint = root.querySelector('#' + interactive.getAttribute('aria-describedby'));
    expect(hint?.textContent).toContain('Pointer cursor');
    expect(width.getAttribute('aria-describedby')).not.toBeNull();
  });

  it('applies the OpenStreetMap preset with its snippet and no errors', async () => {
    const { harness, errors } = await renderRoute('/playground');
    const root = harness.fixture.nativeElement as HTMLElement;

    pick(harness, root, 'pg-map-presetId', 'OpenStreetMap');

    expect(snippet(root)).toContain('[styles]="styles"');
    expect(root.querySelector('button[aria-label^="Apply OpenStreetMap"]')).not.toBeNull();
    expect(root.textContent).toContain('OSM_STYLE');
    expect(errors).toEqual([]);
  });

  it('warns when 3D buildings meet a basemap without the carto source', async () => {
    const { harness } = await renderRoute('/playground');
    const root = harness.fixture.nativeElement as HTMLElement;
    press$(harness, root, 'Add 3D buildings');
    expect(root.textContent).not.toContain('Carto vector tiles');

    root.querySelector<HTMLButtonElement>('button[aria-label^="Apply OpenFreeMap"]')!.click();
    harness.detectChanges();
    expect(root.textContent).toContain('Carto vector tiles');
  });
});
