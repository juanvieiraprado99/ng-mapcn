# Exemplos da biblioteca ng-mapcn

Este documento descreve os exemplos disponíveis na aplicação demo (`projects/demo`). Use-o para documentação, landing page ou como referência de uso dos componentes.

**Como rodar a demo:** na raiz do projeto execute `ng serve demo` e acesse a aplicação no navegador. A navegação entre exemplos depende do roteamento configurado em `app.ts` / `app.html`.

---

## 1. Basic Map

**Arquivos:** `projects/demo/src/app/examples/basic-map/`

**O que demonstra:** Mapa mínimo com centro, zoom e controle de zoom. Ponto de partida para qualquer uso da biblioteca.

**Componentes usados:** `MapComponent`, `MapControlsComponent`

**Configuração do mapa:**

- `mapId`: `'basic-map'`
- `center`: `[0, 0]`
- `zoom`: `2`
- Controles: apenas zoom, posição `top-right`

**Trecho do template:**

```html
<ng-map [mapId]="mapId" [center]="[0, 0]" [zoom]="2" (mapReady)="onMapReady($event)"></ng-map>
<ng-map-controls [mapId]="mapId" [position]="'top-right'" [showZoom]="true"></ng-map-controls>
```

---

## 2. Controls Map (Todos os controles)

**Arquivos:** `projects/demo/src/app/examples/controls-map/`

**O que demonstra:** Mapa com todos os controles disponíveis: zoom, bússola, localizar (geolocalização) e tela cheia.

**Componentes usados:** `MapComponent`, `MapControlsComponent`

**Configuração do mapa:**

- `mapId`: `'controls-map'`
- `center`: `[-74.5, 40]` (região de Nova York)
- `zoom`: `10`
- Controles: zoom, compass, locate, fullscreen — todos em `top-right`

**Trecho do template:**

```html
<ng-map-controls
  [mapId]="mapId"
  [position]="'top-right'"
  [showZoom]="true"
  [showCompass]="true"
  [showLocate]="true"
  [showFullscreen]="true"
></ng-map-controls>
```

---

## 3. Custom Style Map

**Arquivos:** `projects/demo/src/app/examples/custom-style-map/`

**O que demonstra:** Mapa com estilo customizado via URL (ou especificação de estilo). Neste exemplo usa o estilo de demonstração do MapLibre.

**Componentes usados:** `MapComponent`, `MapControlsComponent`

**Configuração do mapa:**

- `mapId`: `'custom-style-map'`
- `center`: `[0, 0]`, `zoom`: `2`
- `style`: `'https://demotiles.maplibre.org/style.json'` (pode ser trocado por qualquer URL ou objeto de estilo MapLibre)

**Trecho relevante (classe):**

```typescript
customStyle = 'https://demotiles.maplibre.org/style.json';
```

```html
<ng-map
  [mapId]="mapId"
  [center]="[0, 0]"
  [zoom]="2"
  [style]="customStyle"
  (mapReady)="onMapReady($event)"
></ng-map>
```

---

## 4. Dark Theme Map

**Arquivos:** `projects/demo/src/app/examples/dark-theme-map/`

**O que demonstra:** Mapa em tema escuro usando o input `theme="'dark'"`. O estilo do mapa e dos controles seguem o tema escuro.

**Componentes usados:** `MapComponent`, `MapControlsComponent`

**Configuração do mapa:**

- `mapId`: `'dark-theme-map'`
- `center`: `[0, 0]`, `zoom`: `2`
- `theme`: `'dark'`

**Trecho do template:**

```html
<div class="demo-container dark-theme">
  <ng-map
    [mapId]="mapId"
    [center]="[0, 0]"
    [zoom]="2"
    [theme]="'dark'"
    (mapReady)="onMapReady($event)"
  ></ng-map>
  ...
</div>
```

---

## 5. Fly To Globe Map

**Arquivos:** `projects/demo/src/app/examples/flyto-globe-map/`

**O que demonstra:** Mapa com projeção **globo** e animação **flyTo** para uma coordenada (ex.: Mairinque, SP) via `MapService.flyTo()`.

**Componentes usados:** `MapComponent`, `MapControlsComponent`

**Configuração do mapa:**

- `mapId`: `'flyto-globe-map'`
- `center`: `[0, 0]`, `zoom`: `2`
- `projection`: `{ type: 'globe' }`
- Controles: zoom, compass, fullscreen

**Recursos demonstrados:**

- Projeção globo (`[projection]="{ type: 'globe' }"`)
- Botão que chama `mapService.flyTo(mapId, coordinates, zoom, duration)` com duração de 2 segundos

**Trecho relevante (classe):**

```typescript
mairinqueCoordinates: [number, number] = [-47.1855, -23.5393];
mairinqueZoom = 14;

flyToMairinque(): void {
  this.mapService.flyTo(this.mapId, this.mairinqueCoordinates, this.mairinqueZoom, 2000);
}
```

---

## 6. Fly To Markers Map

**Arquivos:** `projects/demo/src/app/examples/flyto-markers-map/`

**O que demonstra:** Vários marcadores (cidades brasileiras); ao clicar em um marcador, o mapa faz **flyTo** até a posição do marcador com zoom 14 e animação de 1,5 s.

**Componentes usados:** `MapComponent`, `MapControlsComponent`, `MarkerComponent`

**Configuração do mapa:**

- `mapId`: `'flyto-markers-map'`
- `center`: `[-47.0, -23.0]`, `zoom`: `5`
- Marcadores: São Paulo, Rio de Janeiro, Belo Horizonte, Curitiba, Porto Alegre, Brasília, Salvador, Recife (cada um com popup)

**Recursos demonstrados:**

- Múltiplos marcadores com `MarkerConfig` (position, color, size, popup)
- Evento `(markerClick)` para chamar `mapService.flyTo(mapId, markerConfig.position, 14, 1500)`

**Trecho do template:**

```html
@for (marker of markers; track marker.id) {
<ng-marker
  [mapId]="mapId"
  [config]="marker"
  (markerClick)="onMarkerClick($event, marker)"
></ng-marker>
}
```

---

## 7. Markers Map

**Arquivos:** `projects/demo/src/app/examples/markers-map/`

**O que demonstra:** Marcadores em várias cidades do mundo com diferentes **tamanhos** (small, medium, large), **cores** e **popups** com conteúdo HTML. Inclui também uma **rota** (linha) entre dois pontos (Mairinque e São Roque, SP).

**Componentes usados:** `MapComponent`, `MapControlsComponent`, `MarkerComponent`, `RouteComponent`

**Configuração do mapa:**

- `mapId`: `'markers-map'`
- `center`: `[-47.16, -23.53]`, `zoom`: `12`
- Vários marcadores (NY, Paris, Tokyo, London, Sydney, Rio, Dubai, Moscow, Cairo, Mumbai) com popup e tamanhos/cores diferentes
- Uma rota com `RouteConfig`: coordinates, color, width, opacity, lineCap, lineJoin

**Recursos demonstrados:**

- `MarkerConfig`: id, position, color, size, popup (content HTML, closeButton)
- `RouteConfig`: id, coordinates, color, width, opacity, lineCap, lineJoin
- Uso de `@for` para renderizar múltiplos `<ng-marker>` e `<ng-route>`

---

## 8. Routes Map

**Arquivos:** `projects/demo/src/app/examples/routes-map/`

**O que demonstra:** Múltiplas **rotas** (linhas) no mapa: rotas genéricas (EUA, Europa) e uma rota com **paradas** e **marcadores numerados** (NYC: City Hall → Empire State → Grand Central → Central Park).

**Componentes usados:** `MapComponent`, `MapControlsComponent`, `RouteComponent`

**Configuração do mapa:**

- `mapId`: `'routes-map'`
- `center`: `[-73.98, 40.75]`, `zoom`: `11.2`
- Várias rotas com `RouteConfig`; uma delas com `stops` e `showStopMarkers: true`

**Recursos demonstrados:**

- Várias linhas com cores e espessuras diferentes
- Rota com `stops` (array de `{ name, lng, lat }`) e `showStopMarkers: true` para marcadores numerados ao longo do trajeto

**Exemplo de rota com paradas:**

```typescript
{
  id: 'route-nyc-stops',
  coordinates: [ /* ... */ ],
  color: '#3b82f6',
  width: 4,
  stops: [
    { name: 'City Hall', lng: -74.006, lat: 40.7128 },
    { name: 'Empire State Building', lng: -73.9857, lat: 40.7484 },
    // ...
  ],
  showStopMarkers: true,
}
```

---

## 9. Route Planning Map

**Arquivos:** `projects/demo/src/app/examples/route-planning-map/`

**O que demonstra:** **Planejamento de rotas** com a API OSRM: origem (Amsterdam) e destino (Rotterdam). O componente `ng-route-planning` calcula as rotas, desenha no mapa e permite escolher entre alternativas; exibe **tempo** e **distância** formatados.

**Componentes usados:** `MapComponent`, `MapControlsComponent`, `RoutePlanningComponent`

**Configuração do mapa:**

- `mapId`: `'route-planning-map'`
- `center` e `zoom`: calculados entre start e end
- `ng-route-planning` com `[start]`, `[end]`, `[selectedRouteIndex]` e outputs `routesLoaded`, `routeSelected`, `loadingChange`

**Recursos demonstrados:**

- `RoutePlanningComponent` com inputs `start`, `end`, `mapId`, `selectedRouteIndex`
- Uso de `OsrmService.formatDuration()` e `formatDistance()` na UI
- Painel de rotas com botões para selecionar alternativa (rota ativa em destaque no mapa)
- Estado de loading durante o cálculo

**Trecho do template:**

```html
<ng-route-planning
  [mapId]="mapId"
  [start]="start"
  [end]="end"
  [selectedRouteIndex]="selectedIndex"
  (routesLoaded)="onRoutesLoaded($event)"
  (routeSelected)="onRouteSelected($event)"
  (loadingChange)="onLoadingChange($any($event))"
></ng-route-planning>
```

---

## 10. Tooltips Map

**Arquivos:** `projects/demo/src/app/examples/tooltips-map/`

**O que demonstra:** Marcadores com **tooltips** no hover: diferentes **âncoras** (top, bottom, left, right, top-left, bottom-right), **offset** (número ou `[x, y]`), `enabled` e `showOnHover`. Inclui marcador sem tooltip e um com `showOnHover: false`.

**Componentes usados:** `MapComponent`, `MapControlsComponent`, `MarkerComponent`

**Configuração do mapa:**

- `mapId`: `'tooltips-map'`
- `center`: `[20, 20]`, `zoom`: `2`
- Vários marcadores (NY, Paris, Tokyo, London, Sydney, Rio, Dubai, Moscow, Cairo, Mumbai) com `tooltip` configurado de formas diferentes

**Recursos demonstrados:**

- `MarkerConfig.tooltip`: text, enabled, anchor, offset, showOnHover
- Âncoras: top, bottom, left, right, top-left, bottom-right
- Offset como número ou array `[x, y]`
- Marcador sem tooltip; marcador com tooltip desabilitado ou `showOnHover: false`

---

## Resumo rápido (para uso em lista ou landing)

| Exemplo            | Descrição breve                                                    |
| ------------------ | ------------------------------------------------------------------ |
| **Basic Map**      | Mapa mínimo com zoom.                                              |
| **Controls Map**   | Mapa com todos os controles: zoom, bússola, localizar, tela cheia. |
| **Custom Style**   | Mapa com estilo customizado (URL ou objeto).                       |
| **Dark Theme**     | Mapa em tema escuro (`theme="'dark'"`).                            |
| **Fly To Globe**   | Projeção globo + animação flyTo para uma coordenada.               |
| **Fly To Markers** | Marcadores; clique faz flyTo até o marcador.                       |
| **Markers Map**    | Marcadores com tamanhos, cores e popups; inclui uma rota.          |
| **Routes Map**     | Múltiplas rotas; uma com paradas e marcadores numerados.           |
| **Route Planning** | Rotas OSRM entre dois pontos; alternativas, tempo e distância.     |
| **Tooltips Map**   | Marcadores com tooltips (âncora, offset, enabled, showOnHover).    |

---

## Como usar este documento

- **Documentação:** copie as seções ou a tabela resumo para a doc da biblioteca.
- **Landing page:** use a tabela resumo ou os “O que demonstra” para textos curtos; link para a demo ao vivo se existir.
- **Referência:** cada seção indica componentes, configurações e trechos de código relevantes para reproduzir o exemplo.
