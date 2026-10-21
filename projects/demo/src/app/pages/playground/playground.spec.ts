import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderRoute } from '../../../testing/render-route';

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

  it('switches component and resets its inputs', async () => {
    const { harness, errors } = await renderRoute('/playground');
    const root = harness.fixture.nativeElement as HTMLElement;

    const heatmap = [...root.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Heatmap',
    )!;
    heatmap.click();
    harness.detectChanges();

    expect(snippet(root)).toContain('<ng-map-heatmap');
    expect(snippet(root)).toContain('weightProperty="mag"');
    expect(root.querySelector('#pg-heatmap-radius')).not.toBeNull();
    expect(root.querySelector('#pg-route-width')).toBeNull();
    expect(heatmap.getAttribute('aria-pressed')).toBe('true');
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
    [...root.querySelectorAll('button')]
      .find((button) => button.textContent?.trim() === 'Clusters')!
      .click();
    harness.detectChanges();

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
    [...root.querySelectorAll('button')]
      .find((button) => button.textContent?.trim() === 'Marker')!
      .click();
    harness.detectChanges();

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

  it('warns when 3D buildings meet a basemap without building tiles', async () => {
    const { harness } = await renderRoute('/playground');
    const root = harness.fixture.nativeElement as HTMLElement;
    [...root.querySelectorAll('button')]
      .find((button) => button.textContent?.trim() === '3D buildings')!
      .click();
    harness.detectChanges();
    expect(root.textContent).not.toContain('Carto vector tiles');

    root.querySelector<HTMLButtonElement>('button[aria-label^="Apply OpenStreetMap"]')!.click();
    harness.detectChanges();
    expect(root.textContent).toContain('Carto vector tiles');
  });
});
