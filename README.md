# ng-mapcn

**Beautiful maps for Angular, made simple.**

Free & open source map components for Angular 18+. Zero config, one command setup.
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
      <ng-zoom-control [mapId]="'my-map'" position="top-right"></ng-zoom-control>
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

#### ZoomControl

```html
<ng-zoom-control
  [mapId]="'my-map'"
  position="top-right"
  (zoomIn)="onZoomIn()"
  (zoomOut)="onZoomOut()"
></ng-zoom-control>
```

#### CompassControl

```html
<ng-compass-control
  [mapId]="'my-map'"
  position="top-right"
  (resetNorth)="onResetNorth()"
></ng-compass-control>
```

#### LocateControl

```html
<ng-locate-control
  [mapId]="'my-map'"
  position="top-right"
  [config]="{ watchPosition: true }"
  (locate)="onLocate($event)"
></ng-locate-control>
```

#### FullscreenControl

```html
<ng-fullscreen-control
  [mapId]="'my-map'"
  position="top-right"
  (fullscreenChange)="onFullscreenChange($event)"
></ng-fullscreen-control>
```

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

The library uses SCSS with CSS variables for theming, inspired by shadcn/ui.

### Theme Variables

The library provides CSS variables that adapt to light/dark mode:

```scss
:root {
  --background: hsl(0 0% 100%);
  --foreground: hsl(222.2 84% 4.9%);
  --primary: hsl(221.2 83.2% 53.3%);
  // ... more variables
}
```

### Custom Styling

You can customize the appearance by overriding CSS variables:

```scss
:root {
  --primary: #your-color;
  --border-radius: 0.5rem;
}
```

## Examples

See the `projects/demo` directory for complete examples.

## API Reference

### Interfaces

- `MapConfig` - Map configuration
- `MarkerConfig` - Marker configuration
- `RouteConfig` - Route configuration
- `ControlConfig` - Control configuration
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
