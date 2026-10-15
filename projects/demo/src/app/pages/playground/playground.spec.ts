import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderRoute } from '../../../testing/render-route';

describe('playground page', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
    document.documentElement.className = '';
  });

  const snippet = (root: HTMLElement) =>
    root.querySelector('#snippet app-code-block')?.textContent ?? '';

  it('generates labelled controls and a snippet that follows the inputs', async () => {
    const { harness, errors } = await renderRoute('/playground');
    const root = harness.fixture.nativeElement as HTMLElement;

    // Route is the default component: its controls are labelled and the snippet is live.
    const width = root.querySelector<HTMLInputElement>('#pg-route-width')!;
    expect(width).not.toBeNull();
    expect(root.querySelector('label[for="pg-route-width"]')).not.toBeNull();
    expect(snippet(root)).toContain('<ng-map-route');
    expect(snippet(root)).not.toContain('[width]');

    width.value = '9';
    width.dispatchEvent(new Event('input', { bubbles: true }));
    harness.detectChanges();
    expect(snippet(root)).toContain('[width]="9"');

    // The basemap select applies a gallery preset to the map snippet.
    const basemap = root.querySelector<HTMLSelectElement>('#pg-map-presetId')!;
    basemap.value = String(
      [...basemap.options].findIndex((option) => option.textContent?.includes('Blank')),
    );
    basemap.dispatchEvent(new Event('change', { bubbles: true }));
    harness.detectChanges();
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
      root.querySelector<HTMLSelectElement>('#pg-map-projection')!.selectedOptions[0].text,
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
    expect(root.querySelector('label[for="pg-route-width"]')?.textContent?.trim()).toBe('Width');
    expect(root.querySelector('output[for="pg-route-width"]')).not.toBeNull();
    const interactive = root.querySelector('#pg-route-interactive')!;
    const hint = root.querySelector('#' + interactive.getAttribute('aria-describedby'));
    expect(hint?.textContent).toContain('Pointer cursor');
    expect(width.getAttribute('aria-describedby')).not.toBeNull();
  });
});
