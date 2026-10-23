import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CodeSurfaceComponent } from './code-surface';

@Component({
  imports: [CodeSurfaceComponent],
  template: `<app-code-surface [code]="code()" lang="angular-html" />`,
})
class HostComponent {
  readonly code = signal('<ng-map />');
}

function render() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const isHighlighted = () => root.querySelector('pre.shiki span[style]') !== null;
  // The first highlight loads Shiki and its grammars, well over a second on a cold run.
  const highlighted = () =>
    vi.waitFor(
      () => {
        fixture.detectChanges();
        expect(isHighlighted()).toBe(true);
      },
      { timeout: 15_000 },
    );
  return { fixture, root, highlighted };
}

describe('CodeSurfaceComponent', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders the code uncoloured, then highlighted', async () => {
    const { root, highlighted } = render();
    expect(root.textContent).toContain('<ng-map />');

    await highlighted();
    expect(root.textContent).toContain('<ng-map />');
  });

  it('shows a changed snippet at once instead of the previous highlight', async () => {
    const { fixture, root, highlighted } = render();
    await highlighted();

    fixture.componentInstance.code.set('<ng-map [zoom]="3" />');
    fixture.detectChanges();

    expect(root.textContent).toContain('<ng-map [zoom]="3" />');
    await highlighted();
    expect(root.textContent).toContain('<ng-map [zoom]="3" />');
  });
});
