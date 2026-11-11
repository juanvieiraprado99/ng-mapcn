import { describe, expect, it } from 'vitest';

import { importedNames, installItemsFor } from './install-items';

describe('importedNames', () => {
  it('reads multi-line imports, type modifiers and aliases from ng-mapcn and ng-mapcn/draw', () => {
    const code = `import { Component } from '@angular/core';
import {
  MapComponent,
  type MapStyleOption,
  MapScaleComponent as Scale,
} from 'ng-mapcn';
import type { MapViewport } from 'ng-mapcn';
import { MapDrawComponent } from 'ng-mapcn/draw';`;
    expect(importedNames(code)).toEqual([
      'MapComponent',
      'MapStyleOption',
      'MapScaleComponent',
      'MapViewport',
      'MapDrawComponent',
    ]);
  });
});

describe('installItemsFor', () => {
  it('maps imports to registry items in registry order, without core', () => {
    const code = `import { MapComponent, MapScaleComponent, MapControlsComponent } from 'ng-mapcn';`;
    expect(installItemsFor(code)).toEqual(['controls', 'scale']);
  });

  it('drops items another selected item already brings', () => {
    const code = `import { MapMarkerComponent, MarkerPopupComponent, MarkerContentComponent } from 'ng-mapcn';`;
    expect(installItemsFor(code)).toEqual(['marker-content', 'marker-popup']);
  });

  it('maps type-only imports to the item that owns them', () => {
    const code = `import { MapComponent, type MapStyleOption, MapStyleSwitcherComponent } from 'ng-mapcn';`;
    expect(installItemsFor(code)).toEqual(['style-switcher']);
  });

  it('maps the draw entry point to draw', () => {
    const code = `import { MapComponent } from 'ng-mapcn';
import { MapDrawComponent } from 'ng-mapcn/draw';`;
    expect(installItemsFor(code)).toEqual(['draw']);
  });

  it('reads element tags from template fragments without imports', () => {
    const code = `<ng-map [zoom]="11">
  <ng-map-marker [longitude]="0" [latitude]="0" />
  <ng-map-popup [longitude]="0" [latitude]="0">Hi</ng-map-popup>
</ng-map>`;
    expect(installItemsFor(code)).toEqual(['marker', 'popup']);
  });

  it('does not take a longer selector for a shorter one', () => {
    expect(installItemsFor(`<ng-route-playback-control />`)).toEqual(['route-playback-control']);
  });

  it('returns nothing for a core-only snippet', () => {
    expect(installItemsFor(`import { MapComponent, MapViewport } from 'ng-mapcn';`)).toEqual([]);
  });
});
