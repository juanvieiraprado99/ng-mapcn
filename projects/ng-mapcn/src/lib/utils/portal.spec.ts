import {
  Component,
  effect,
  inject,
  Injector,
  signal,
  type TemplateRef,
  viewChild,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { renderPortal } from './portal';

@Component({
  selector: 'ng-portal-probe',
  template: `<ng-template #tpl
    ><span class="probe">{{ text() }}</span></ng-template
  >`,
})
class PortalProbeComponent {
  readonly text = signal('a');
  readonly tpl = viewChild.required<TemplateRef<unknown>>('tpl');
  readonly injector = inject(Injector);
}

describe('renderPortal', () => {
  it('moves the template nodes into the target and tears them down', () => {
    const fixture = TestBed.createComponent(PortalProbeComponent);
    fixture.detectChanges();
    const target = document.createElement('div');

    const destroy = renderPortal(fixture.componentInstance.tpl(), TestBed.inject(Injector), target);

    expect(target.querySelector('.probe')?.textContent).toBe('a');
    destroy();
    expect(target.querySelector('.probe')).toBeNull();
  });

  it('does not track the template signals in the calling effect', () => {
    const fixture = TestBed.createComponent(PortalProbeComponent);
    fixture.detectChanges();
    const { componentInstance: probe } = fixture;
    const target = document.createElement('div');
    let runs = 0;

    TestBed.runInInjectionContext(() =>
      effect(() => {
        runs++;
        renderPortal(probe.tpl(), probe.injector, target);
      }),
    );
    TestBed.tick();
    expect(runs).toBe(1);

    probe.text.set('b');
    TestBed.tick();

    expect(runs).toBe(1);
  });
});
