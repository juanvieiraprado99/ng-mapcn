# ng-mapcn

**Beautiful maps for Angular, made simple.**

Free & open source map components for Angular 21+. Zero config, one command setup.
Built on MapLibre GL, styled with SCSS, inspired by shadcn/ui.

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
import { MapComponent, MapControlsComponent } from 'ng-mapcn';

@Component({
  selector: 'app-my-map',
  standalone: true,
  imports: [MapComponent, MapControlsComponent],
  template: `
    <div style="width: 100%; height: 400px;">
      <ng-map
        [mapId]="'my-map'"
        [center]="[0, 0]"
        [zoom]="2"
        (mapReady)="onMapReady($event)"
      ></ng-map>
      <ng-map-controls [mapId]="'my-map'" [showZoom]="true" [showLocate]="true"></ng-map-controls>
    </div>
  `,
})
export class MyMapComponent {
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

**Inputs:**

- `mapId` - Unique identifier for the map instance
- `center` - Initial center coordinates `[lng, lat]`
- `zoom` - Initial zoom level
- `style` - Map style URL or specification
- `theme` - Theme mode: `'light'` | `'dark'` | `'auto'`
- `config` - Full map configuration object

**Outputs:**

- `mapReady` - Emitted when map is loaded
- `mapClick` - Emitted on map click
- `mapMove` - Emitted on map move
- `mapZoom` - Emitted on zoom change

### MarkerComponent

Add markers to your map.

```html
<ng-marker
  [mapId]="'my-map'"
  [config]="{
    position: [-74.5, 40],
    popup: {
      title: 'New York',
      content: 'The Big Apple'
    },
    color: '#3b82f6'
  }"
  (markerClick)="onMarkerClick($event)"
></ng-marker>
```

**Inputs:**

- `mapId` - Map instance ID
- `config` - Marker configuration (see `MarkerConfig` interface)

**Outputs:**

- `markerClick` - Emitted when marker is clicked
- `markerHover` - Emitted when marker is hovered

### RouteComponent

Draw routes/paths on your map.

```html
<ng-route
  [mapId]="'my-map'"
  [config]="{
    coordinates: [[-74.5, 40], [-73.5, 41]],
    color: '#3b82f6',
    width: 3,
    dashed: false
  }"
  (routeClick)="onRouteClick($event)"
></ng-route>
```

**Inputs:**

- `mapId` - Map instance ID
- `config` - Route configuration (see `RouteConfig` interface)

**Outputs:**

- `routeClick` - Emitted when route is clicked

### Control Components

#### MapControlsComponent

Adiciona os controles nativos do MapLibre ao mapa (zoom, bússola, geolocalização, tela cheia).

```html
<ng-map-controls
  [mapId]="'my-map'"
  [position]="'top-right'"
  [showZoom]="true"
  [showCompass]="true"
  [showLocate]="true"
  [showFullscreen]="true"
></ng-map-controls>
```

**Inputs:** `mapId`, `position`, `showZoom`, `showCompass`, `showLocate`, `showFullscreen`, `visualizePitch`, `visualizeRoll`.

## Services

### MapService

Centralized map management and utilities.

```typescript
import { MapService } from 'ng-mapcn';

constructor(private mapService: MapService) {}

// Fly to location
this.mapService.flyTo('my-map', [-74.5, 40], 15);

// Get map center
const center = this.mapService.getCenter('my-map');

// Zoom in
this.mapService.zoomIn('my-map');
```

### ThemeService

Theme management for light/dark mode.

```typescript
import { ThemeService } from 'ng-mapcn';

constructor(private themeService: ThemeService) {}

// Set theme
this.themeService.setTheme('dark');

// Toggle theme
this.themeService.toggleTheme();

// Get current theme
const theme = this.themeService.getTheme();
```

### MarkerService

Marker management.

```typescript
import { MarkerService } from 'ng-mapcn';

constructor(
  private markerService: MarkerService,
  private mapService: MapService
) {}

// Add marker programmatically
const map = this.mapService.getMap('my-map');
if (map) {
  this.markerService.addMarker('my-map', {
    position: [-74.5, 40],
    popup: { title: 'Marker', content: 'Description' }
  }, map);
}
```

## Styling

The library uses SCSS with CSS custom properties for theming, inspired by shadcn/ui.
Import the library styles in your `angular.json` or global stylesheet:

```json
{ "styles": ["node_modules/ng-mapcn/styles.scss"] }
```

### Theme Variables

CSS variables are defined using `oklch` and automatically switch between light and dark:

```scss
/* light (default) */
--background:   oklch(99% 0 0);
--foreground:   oklch(15% 0.02 240);
--primary:      oklch(55% 0.2 240);
--border:       oklch(92% 0.005 240);

/* dark (.dark class or data-theme="dark") */
--background:   oklch(15% 0.02 240);
--foreground:   oklch(97% 0.005 240);
--primary:      oklch(65% 0.2 240);
--border:       oklch(30% 0.02 240);
```

### Custom Styling

Override any variable on `:root` to apply your own brand colors:

```scss
:root {
  --primary: oklch(55% 0.22 150); /* green */
  --radius-md: 0.25rem;           /* sharper corners */
}
```

## Examples

See the `projects/demo` directory for complete examples.

## API Reference

### Interfaces

- `MapConfig` - Map configuration
- `MarkerConfig` - Marker configuration
- `RouteConfig` - Route configuration
- `ControlPosition` - Control position on the map
- `ThemeConfig` - Theme configuration

See the source code for detailed interface definitions.

## Development

```bash
# Install dependencies
npm install

# Build library
ng build ng-mapcn

# Run demo app
ng serve demo

# Build for production
ng build ng-mapcn --configuration production
```

## License

MIT License - see the LICENSE file for details.

## Credits

- Built with [MapLibre GL](https://maplibre.org/)
- Styling inspired by [shadcn/ui](https://ui.shadcn.com/)
- Inspired by [mapcn](https://github.com/AnmolSaini16/mapcn) (React version)
