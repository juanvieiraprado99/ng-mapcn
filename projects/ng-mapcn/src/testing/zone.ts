import { NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

/**
 * Spies on the injected `NgZone.run` and records whether code is currently running inside it —
 * enough to assert that an output is emitted inside the Angular zone, which is what a zone.js app
 * needs to run change detection. The spy replaces `run`, so this holds whether or not the test
 * target loads zone.js (the library's does; the demo's is zoneless).
 */
export function trackZoneRun(): { runs: number; inside: boolean } {
  const state = { runs: 0, inside: false };
  const zone = TestBed.inject(NgZone);
  vi.spyOn(zone, 'run').mockImplementation(((fn: () => unknown) => {
    state.runs++;
    const previous = state.inside;
    state.inside = true;
    try {
      return fn();
    } finally {
      state.inside = previous;
    }
  }) as NgZone['run']);
  return state;
}
