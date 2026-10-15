import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { type ControlChange, PlaygroundControlsComponent } from './playground-controls';
import type { Control } from './playground-schema';
import { validateClusterColors } from './playground-specs';

const CONTROLS: Control[] = [
  {
    kind: 'json',
    key: 'colors',
    label: 'Colors',
    default: ['#111111', '#222222', '#333333'],
    validate: validateClusterColors,
  },
];

@Component({
  standalone: true,
  imports: [PlaygroundControlsComponent],
  template: `<app-playground-controls
    [controls]="controls"
    [values]="values()"
    (valueChange)="changes.push($event)"
  />`,
})
class HostComponent {
  readonly controls = CONTROLS;
  readonly values = signal({ colors: CONTROLS[0].default });
  readonly changes: ControlChange[] = [];
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const field = (fixture.nativeElement as HTMLElement).querySelector<HTMLTextAreaElement>(
    '#pg-colors',
  )!;
  const type = (text: string) => {
    field.value = text;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  };
  const error = () =>
    (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent?.trim();
  return { fixture, field, type, error, changes: fixture.componentInstance.changes };
}

describe('PlaygroundControlsComponent json control', () => {
  it('emits valid values and shows no error', () => {
    const { type, error, changes } = setup();
    type('["red", "#00ff00", "rgb(0 0 255)"]');

    expect(changes).toEqual([{ key: 'colors', value: ['red', '#00ff00', 'rgb(0 0 255)'] }]);
    expect(error()).toBeUndefined();
  });

  it('keeps the last value and reports a validation error for wrong shapes', () => {
    const { type, error, changes } = setup();

    for (const text of ['null', '"red"', '[]', '[1, 2, 3]', '["red", "blue"]']) {
      type(text);
      expect(error(), text).toContain('Three CSS colors');
    }
    expect(changes).toEqual([]);

    type('{nope');
    expect(error()).toContain('Not valid JSON');
    expect(changes).toEqual([]);
  });

  it('resets to the default when the text is cleared (never emits undefined)', () => {
    const { type, field, error, changes } = setup();
    type('null');
    expect(error()).toBeDefined();

    type('   ');
    expect(changes).toEqual([{ key: 'colors', value: CONTROLS[0].default }]);
    expect(field.value).toBe('["#111111","#222222","#333333"]');
    expect(error()).toBeUndefined();
  });
});
