# Preview: Página da biblioteca no npm

Este documento simula como a biblioteca **ng-mapcn** apareceria na página do [npm](https://www.npmjs.com/) após a publicação. Use como referência para conferir as informações exibidas.

---

## Metadados no topo da página (npmjs.com/package/ng-mapcn)

| Campo          | Valor                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Nome**       | `ng-mapcn`                                                                                                                      |
| **Descrição**  | Beautiful maps for Angular, made simple. MapLibre GL components for Angular 18+ with theme-aware styling inspired by shadcn/ui. |
| **Versão**     | 18.0.0-beta.2                                                                                                                   |
| **Instalação** | `npm install ng-mapcn maplibre-gl`                                                                                              |

### Links exibidos

- **Homepage:** https://github.com/juanvieiraprado99/ng-mapcn#readme
- **Repository:** https://github.com/juanvieiraprado99/ng-mapcn
- **Bugs:** https://github.com/juanvieiraprado99/ng-mapcn/issues
- **npm:** https://www.npmjs.com/package/ng-mapcn

### Lateral / metadados adicionais

- **Keywords:** angular, angular-18, map, maplibre, maplibre-gl, map-components, shadcn, theme-aware, markers, routes, geolocation
- **License:** MIT
- **Author:** Juan Prado (https://github.com/juanvieiraprado99)
- **Engines:** Node >=18.0.0, npm >=9.0.0

### Dependências (peer)

- `@angular/common`: ^18.2.14
- `@angular/core`: ^18.2.14
- `maplibre-gl`: ^5.16.0

---

## Conteúdo do README (corpo da página)

O npm exibe o conteúdo do arquivo **README.md** da pasta publicada (no build, o que está em `projects/ng-mapcn/README.md`). Abaixo está o texto que será mostrado.

---

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
import { MapComponent, MapControlsComponent } from 'ng-mapcn';

@Component({
  selector: 'app-map',
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

---

## Como publicar

1. **Login no npm** (se ainda não estiver logado):

   ```bash
   npm login
   ```

2. **Build da biblioteca (produção)**:

   ```bash
   ng build ng-mapcn --configuration production
   ```

3. **Publicar a partir do pacote gerado**:

   ```bash
   cd dist/ng-mapcn
   npm publish
   ```

   Para publicar como **beta** (já que a versão é `18.0.0-beta.2`):

   ```bash
   npm publish --tag beta
   ```

4. **Ou usar o script do root** (build + publish em sequência):
   ```bash
   npm run publish:lib
   ```
   Para publicar com tag `beta`:
   ```bash
   ng build ng-mapcn --configuration production && cd dist/ng-mapcn && npm publish --tag beta
   ```

### Primeira publicação

- Confirme que o nome `ng-mapcn` está disponível no npm (`npm search ng-mapcn` ou acesse https://www.npmjs.com/package/ng-mapcn).
- Se o pacote for **scoped** (ex.: `@seu-usuario/ng-mapcn`), use `npm publish --access public` na primeira vez.

### Atualizar versão antes de publicar

No `projects/ng-mapcn/package.json` altere o campo `version` (ex.: `18.0.0-beta.3`, `18.0.0`, etc.). O build usa esse arquivo; o `package.json` em `dist/ng-mapcn` é gerado a partir dele.
