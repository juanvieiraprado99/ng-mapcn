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
  return { fixture, root, isHighlighted };
}

describe('CodeSurfaceComponent', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders the code uncoloured, then highlighted', async () => {
    const { fixture, root, isHighlighted } = render();
    expect(root.textContent).toContain('<ng-map />');

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(isHighlighted()).toBe(true);
    });
    expect(root.textContent).toContain('<ng-map />');
  });

  it('shows a changed snippet at once instead of the previous highlight', async () => {
    const { fixture, root, isHighlighted } = render();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(isHighlighted()).toBe(true);
    });

    fixture.componentInstance.code.set('<ng-map [zoom]="3" />');
    fixture.detectChanges();

    expect(root.textContent).toContain('<ng-map [zoom]="3" />');
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(isHighlighted()).toBe(true);
    });
    expect(root.textContent).toContain('<ng-map [zoom]="3" />');
  });
});
