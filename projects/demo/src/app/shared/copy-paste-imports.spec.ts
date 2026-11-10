import { describe, expect, it } from 'vitest';

import { COPY_PASTE_ALIAS, toCopyPasteImports } from './copy-paste-imports';

describe('toCopyPasteImports', () => {
  it('rewrites the core and draw entry points, single or double quoted, multi-line', () => {
    const code = `import { Component } from '@angular/core';
import {
  MapComponent,
  type MapStyleOption,
} from 'ng-mapcn';
import { MapControlsComponent } from "ng-mapcn";
import { MapDrawComponent } from 'ng-mapcn/draw';`;
    expect(toCopyPasteImports(code)).toBe(`import { Component } from '@angular/core';
import {
  MapComponent,
  type MapStyleOption,
} from '${COPY_PASTE_ALIAS}';
import { MapControlsComponent } from "${COPY_PASTE_ALIAS}";
import { MapDrawComponent } from '${COPY_PASTE_ALIAS}/draw';`);
  });

  it('leaves npm-only entry points, other packages and prose alone', () => {
    const code = `import { renderMap } from 'ng-mapcn/testing';
import { MapLibreFake } from 'ng-mapcn/testing/maplibre';
import { ZardButtonComponent } from '@/shared/components/button';
import maplibregl from 'maplibre-gl';
// ng-mapcn draws maps; see 'ng-mapcn-extra'
import { X } from 'ng-mapcn-extra';`;
    expect(toCopyPasteImports(code)).toBe(code);
  });

  it('rewrites a side-effect import', () => {
    expect(toCopyPasteImports(`import 'ng-mapcn';`)).toBe(`import '${COPY_PASTE_ALIAS}';`);
  });
});
