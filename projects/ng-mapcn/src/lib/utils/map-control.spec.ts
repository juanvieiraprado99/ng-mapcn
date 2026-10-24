import { Component, input, type TemplateRef, viewChild } from '@angular/core';
import { type Map as MapLibreMap } from 'maplibre-gl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderMap, update } from '../../testing/render';
import { mountMapControl } from './map-control';

@Component({
  selector: 'ng-probe',
  template: `<ng-template #tpl
    ><span class="probe">{{ text() }}</span></ng-template
  >`,
})
class ProbeComponent {
  readonly text = input('a');
  readonly tpl = viewChild.required<TemplateRef<unknown>>('tpl');
}

describe('mountMapControl', () => {
  afterEach(() => vi.restoreAllMocks());

  async function mount() {
    const { fixture, map } = await renderMap(`<ng-map /><ng-probe [text]="text" />`, {
      imports: [ProbeComponent],
      hostProps: { text: 'hello' },
    });
    const probe = fixture.debugElement.query((d) => d.componentInstance instanceof ProbeComponent);
    const component = probe.componentInstance as ProbeComponent;
    const teardown = mountMapControl(
      map as unknown as MapLibreMap,
      component.tpl(),
      probe.injector,
      'top-left',
    );
    return { fixture, map: map!, teardown };
  }

  it('renders the template inside the corner container', async () => {
    const { map } = await mount();
    expect(
      map.getContainer().querySelector('.maplibregl-ctrl-top-left .ng-map-control .probe'),
    ).not.toBeNull();
  });

  it('updates bindings', async () => {
    const { fixture, map } = await mount();
    const probe = () => map.getContainer().querySelector('.probe')!;
    expect(probe().textContent).toBe('hello');

    update(fixture, { text: 'bye' });

    expect(probe().textContent).toBe('bye');
  });

  it('teardown removes the control and destroys the view', async () => {
    const { map, teardown } = await mount();

    teardown();

    expect(map.getContainer().querySelector('.probe')).toBeNull();
    expect(map.calls).toContain('removeControl');
  });

  it('teardown survives a removed map', async () => {
    const { map, teardown } = await mount();
    map.removeControl = vi.fn(() => {
      throw new Error('gone');
    });

    expect(() => teardown()).not.toThrow();
    expect(map.getContainer().querySelector('.probe')).toBeNull();
  });
});
