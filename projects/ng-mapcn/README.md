# ng-mapcn

**Beautiful maps for Angular, made simple.**

Inspired by [mapcn](https://www.mapcn.dev/) (React). Free & open source map components for Angular 18+. Zero config, one command setup. Built on MapLibre GL, styled with SCSS, inspired by shadcn/ui.

[GitHub Repository](https://github.com/juanvieiraprado99/ng-mapcn) | [Report Bug](https://github.com/juanvieiraprado99/ng-mapcn/issues)

## Features

- 🎨 **Theme-aware** — Automatically adapts to light/dark mode
- 🎯 **Zero config** — Works out of the box with sensible defaults
- 📦 **shadcn/ui compatible** — Uses the same patterns and styling conventions
- 🗺️ **MapLibre GL powered** — Full access to MapLibre's powerful mapping capabilities
- 🧩 **Composable** — Build complex map UIs with simple, declarative components
- 📍 **Markers & Popups** — Rich marker system with popups, tooltips, and labels
- 🛤️ **Routes** — Draw routes and paths on your maps
- 🎮 **Controls** — Zoom, compass, locate, and fullscreen controls

## Installation

```bash
npm install ng-mapcn maplibre-gl
```

## Quick Start

### 1. Import the CSS

Add MapLibre CSS to your `angular.json`:

```json
{
  "styles": ["node_modules/maplibre-gl/dist/maplibre-gl.css"]
}
```

Or import in your global styles:

```scss
@import 'maplibre-gl/dist/maplibre-gl.css';
```

### 2. Use the Components

```typescript
import { Component } from '@angular/core';
import { MapComponent, ZoomControlComponent } from 'ng-mapcn';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [MapComponent, ZoomControlComponent],
  template: `
    <div style="width: 100%; height: 400px;">
      <ng-map
        [mapId]="'my-map'"
        [center]="[0, 0]"
        [zoom]="2"
        (mapReady)="onMapReady($event)"
      ></ng-map>
      <ng-map-controls
        [mapId]="'my-map'"
        [position]="'top-right'"
        [showZoom]="true"
      ></ng-map-controls>
    </div>
  `,
})
export class MapComponent {
  onMapReady(map: any) {
    console.log('Map ready!', map);
  }
}
```

## Components

### MapComponent

The main map component.

```html
<ng-map
  [mapId]="'my-map'"
  [center]="[lng, lat]"
  [zoom]="10"
  [style]="'https://demotiles.maplibre.org/style.json'"
  [theme]="'auto'"
  (mapReady)="onMapReady($event)"
  (mapClick)="onMapClick($event)"
></ng-map>
```

**Inputs:** `mapId`, `center`, `zoom`, `style`, `theme`, `config`  
**Outputs:** `mapReady`, `mapClick`, `mapMove`, `mapZoom`

### MarkerComponent

Add markers with popups and tooltips.

```html
<ng-marker
  [mapId]="'my-map'"
  [config]="{
    position: [-74.5, 40],
    popup: { title: 'New York', content: 'The Big Apple' },
    color: '#3b82f6'
  }"
  (markerClick)="onMarkerClick($event)"
></ng-marker>
```

### RouteComponent

Draw routes/paths on your map.

```html
<ng-route
  [mapId]="'my-map'"
  [config]="{
    coordinates: [[-74.5, 40], [-73.5, 41]],
    color: '#3b82f6',
    width: 3
  }"
></ng-route>
```

### Control Components

- **ng-map-controls** — Adiciona os controles nativos do MapLibre ao mapa (zoom, bússola, geolocalização, tela cheia). Inputs: `mapId`, `position`, `showZoom`, `showCompass`, `showLocate`, `showFullscreen`.

## Services

- **MapService** — `flyTo()`, `getCenter()`, `zoomIn()`, `fitBounds()`, etc.
- **ThemeService** — `setTheme()`, `toggleTheme()`, `getTheme()`
- **MarkerService** — Add/remove markers programmatically
- **OsrmService** — Route planning via OSRM API

## Styling

The library uses SCSS with CSS variables for theming. Override variables to match your design system.

## License

MIT © [Juan Prado](https://github.com/juanvieiraprado99)

## Credits

- Inspired by [mapcn](https://www.mapcn.dev/) (React)
- Built with [MapLibre GL](https://maplibre.org/)
- Styling inspired by [shadcn/ui](https://ui.shadcn.com/)
