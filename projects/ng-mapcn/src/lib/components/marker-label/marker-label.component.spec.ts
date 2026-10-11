import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { MarkerLabelComponent } from './marker-label.component';

@Component({
  imports: [MarkerLabelComponent],
  template: `<ng-marker-label [position]="position()">Label text</ng-marker-label>`,
})
class HostComponent {
  readonly position = signal<'top' | 'bottom'>('top');
}

describe('MarkerLabelComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const label = (): HTMLElement => fixture.nativeElement.querySelector('ng-marker-label');
    return { fixture, label };
  }

  it('is positioned on top by default and projects its content', () => {
    const { label } = setup();

    expect(label().className).toBe('ng-marker-label ng-marker-label--top');
    expect(label().textContent).toBe('Label text');
  });

  it('switches to the bottom variant', () => {
    const { fixture, label } = setup();

    fixture.componentInstance.position.set('bottom');
    fixture.detectChanges();

    expect(label().className).toBe('ng-marker-label ng-marker-label--bottom');
  });
});
