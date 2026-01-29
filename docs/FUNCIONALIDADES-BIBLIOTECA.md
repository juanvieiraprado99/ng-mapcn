# ng-mapcn — Documento de Funcionalidades da Biblioteca

Este documento descreve todas as funcionalidades da biblioteca **ng-mapcn** para uso na landing page e na documentação. Os tópicos estão separados para facilitar a explicação e a organização do conteúdo da página.

---

## 0. Inspiração e posicionamento

**ng-mapcn** é inspirado no [mapcn](https://www.mapcn.dev/) — biblioteca de mapas para **React** com o slogan _"Beautiful maps, made simple"_, construída sobre MapLibre e estilizada com Tailwind, seguindo a filosofia do [shadcn/ui](https://ui.shadcn.com/).

- **mapcn (React):** componentes de mapa prontos para uso, customizáveis, baseados em MapLibre e com estética shadcn.
- **ng-mapcn (Angular):** a mesma ideia trazida para o ecossistema **Angular**, com **Angular 18+** como versão mínima, mantendo a estilização inspirada no shadcn (variáveis CSS, temas claro/escuro, componentes composáveis).

Ou seja: **ng-mapcn** é o equivalente em Angular do mapcn — mapas bonitos e simples, feitos para quem usa Angular 18+ e quer a mesma experiência de uso e estilo que o mapcn oferece em React.

---

## 1. Visão geral

**ng-mapcn** é uma biblioteca Angular para exibir mapas interativos de forma simples e declarativa.

- **Slogan:** _"Beautiful maps for Angular, made simple."_ (Mapas bonitos para Angular, feitos de forma simples.)
- **Público:** Desenvolvedores **Angular 18+** que precisam de mapas em aplicações web.
- **Base:** MapLibre GL (motor de mapas open source), assim como o [mapcn](https://www.mapcn.dev/).
- **Estilo:** Inspirado no shadcn/ui — componentes declarativos, composáveis e com variáveis CSS para temas (alinhado à proposta visual do mapcn para React).

---

## 2. Principais características (destaques para a landing)

### 2.1 Theme-aware (consciente do tema)

- O mapa se adapta automaticamente ao modo **claro** ou **escuro**.
- Modo **auto**: segue a preferência do sistema (preferência de tema do SO/navegador).
- Estilos padrão: Carto Positron (claro) e Carto Dark Matter (escuro).
- Possibilidade de definir estilos customizados por tema (light/dark).

### 2.2 Zero config

- Funciona com valores padrão sensatos: centro, zoom, estilo e tema já configurados.
- Basta usar `<ng-map>` com um `mapId` e, opcionalmente, centro e zoom.
- Não é obrigatório passar `config` completo para começar.

### 2.3 Estilização inspirada no shadcn/ui (como o mapcn)

- Mesma filosofia do [mapcn](https://www.mapcn.dev/): componentes composáveis e estética shadcn.
- No Angular: componentes standalone, estilização via variáveis CSS e temas claro/escuro.
- Fácil integração em projetos que já usam shadcn/ui (ou design systems baseados em variáveis CSS).

### 2.4 MapLibre GL

- Acesso às capacidades do MapLibre: zoom, rotação, pitch, projeções (ex.: globo), estilos vetoriais, etc.
- Instância do mapa exposta no evento `mapReady` para uso avançado quando necessário.

### 2.5 Composável

- Mapa, marcadores, rotas e controles são componentes separados.
- O usuário monta a UI do mapa combinando apenas os componentes que precisa (ex.: mapa + zoom + localizar).

### 2.6 Marcadores e popups

- Sistema de marcadores com popups (título e conteúdo), tooltips no hover e opção de ícone/cor/tamanho.
- Marcadores arrastáveis, com rotação e escala.
- Suporte a marcadores numerados em rotas (paradas).

### 2.7 Rotas

- Desenho de linhas (rotas/caminhos) no mapa com coordenadas.
- Cor, espessura, traço (dashed), opacidade, line-cap e line-join configuráveis.
- Paradas (stops) com marcadores numerados e dados OSRM (distância, duração).

### 2.8 Planejamento de rotas (OSRM)

- Componente de planejamento que calcula rotas entre origem e destino via API OSRM.
- Múltiplas rotas alternativas, seleção de rota e exibição de duração/distância formatadas.

### 2.9 Controles

- **Zoom** (mais/menos).
- **Bússola** (resetar norte, rotação visual).
- **Localizar** (geolocalização do usuário, opção de acompanhamento contínuo).
- **Tela cheia.**

Todos posicionáveis (top-left, top-right, bottom-left, bottom-right) e adicionados via um único componente `ng-map-controls`, que utiliza os controles nativos do MapLibre (NavigationControl, GeolocateControl, FullscreenControl).

---

## 3. Componentes

### 3.1 MapComponent (`ng-map`)

**O que faz:** Cria e gerencia a instância do mapa (MapLibre). É o componente base; os demais (marcadores, rotas, controles) referenciam o mapa pelo `mapId`.

**Inputs principais:**

- `mapId` — Identificador único do mapa (permite vários mapas na mesma página).
- `center` — Centro inicial `[lng, lat]`.
- `zoom` — Nível de zoom inicial.
- `style` — URL ou especificação do estilo do mapa.
- `styles` — Estilos separados para tema claro e escuro.
- `projection` — Projeção (ex.: globo).
- `theme` — `'light'` | `'dark'` | `'auto'`.
- `config` — Objeto completo de configuração (minZoom, maxZoom, pitch, bearing, interações, etc.).

**Outputs:**

- `mapReady` — Emitido quando o mapa está carregado; entrega a instância do MapLibre.
- `mapClick` — Clique no mapa.
- `mapMove` / `mapMoveEnd` — Movimento do mapa.
- `mapZoom` / `mapZoomEnd` — Mudança de zoom.

**Config (MapConfig) — opções úteis:** center, zoom, minZoom, maxZoom, style, styles, projection, pitch, bearing, doubleClickZoom, dragRotate, dragPan, keyboard, scrollZoom, touchZoomRotate, boxZoom, theme.

---

### 3.2 MarkerComponent (`ng-marker`)

**O que faz:** Adiciona um marcador em uma posição do mapa, com suporte a popup, tooltip, ícone e eventos.

**Inputs:**

- `mapId` — ID do mapa.
- `config` — Objeto MarkerConfig.

**Outputs:**

- `markerClick` — Clique no marcador.
- `markerHover` — Hover no marcador.

**MarkerConfig (resumo):**

- `position` — `[lng, lat]`.
- `id` — Para remoção/rastreamento.
- `icon` — URL ou elemento HTML customizado.
- `color` — Cor do marcador padrão.
- `size` — `'small'` | `'medium'` | `'large'`.
- `draggable` — Se pode ser arrastado.
- `popup` — Título, conteúdo, âncora, offset, closeButton, closeOnClick, maxWidth, focusAfterOpen.
- `tooltip` — Texto, âncora, offset, showOnHover.
- `className`, `data`, `visible`, `rotation`, `scale`.

---

### 3.3 RouteComponent (`ng-route`)

**O que faz:** Desenha uma linha (rota) no mapa a partir de uma lista de coordenadas. Pode exibir paradas numeradas e usar dados OSRM.

**Inputs:**

- `mapId` — ID do mapa.
- `config` — Objeto RouteConfig.

**Outputs:**

- `routeClick` — Clique na linha (entrega evento e config).

**RouteConfig (resumo):**

- `coordinates` — Array de `[lng, lat]`.
- `id` — Identificador da rota.
- `color`, `width`, `opacity` — Aparência da linha.
- `dashed`, `dashArray` — Linha tracejada.
- `lineCap`, `lineJoin` — Estilo das pontas e junções.
- `showArrows`, `arrowSpacing` — Setas de direção.
- `stops` — Paradas (nome, lng, lat) para marcadores numerados.
- `showStopMarkers` — Exibir ou não marcadores de parada.
- `osrmData` — Dados OSRM (duração, distância) para uso na UI.

---

### 3.4 RoutePlanningComponent (`ng-route-planning`)

**O que faz:** Calcula rotas entre ponto de partida e destino via OSRM, exibe múltiplas alternativas, permite escolher uma rota e mostra marcadores de início/fim. Usa internamente `ng-route` e `ng-marker`.

**Inputs:**

- `start` — `{ lng, lat, name? }`.
- `end` — `{ lng, lat, name? }`.
- `mapId` — ID do mapa.
- `selectedRouteIndex` — Índice da rota selecionada (destaque visual).
- `osrmOptions` — Perfil (driving/walking/cycling), alternatives, overview, geometries, serverUrl.

**Outputs:**

- `routesLoaded` — Rotas carregadas (array de OsrmRouteData).
- `routeSelected` — Usuário selecionou uma rota (index + route).
- `loadingChange` — Estado de carregamento (true/false).

**Comportamento:** Faz a requisição à API OSRM, desenha as rotas (selecionada em destaque), mostra marcadores de início (verde) e fim (vermelho) e estado de loading/erro. O pai pode usar `formatDuration` e `formatDistance` (via serviço) para exibir tempo e distância.

---

### 3.5 Controles (MapControlsComponent)

**MapControlsComponent (`ng-map-controls`):** Adiciona ao mapa os controles nativos do MapLibre (NavigationControl, GeolocateControl, FullscreenControl), conforme os inputs ativados. O componente não renderiza UI própria; os controles são injetados pelo MapLibre dentro do container do mapa.

**Inputs:**

- `mapId` — ID do mapa (default: `'default-map'`).
- `position` — Posição dos controles: `'top-left'` | `'top-right'` | `'bottom-left'` | `'bottom-right'` (default: `'top-right'`).
- `showZoom` — Exibir botões de zoom (default: `true`).
- `showCompass` — Exibir bússola / resetar norte (default: `false`).
- `showLocate` — Exibir controle de geolocalização (default: `false`).
- `showFullscreen` — Exibir controle de tela cheia (default: `false`).
- `visualizePitch` — Visualizar pitch no controle de navegação (default: `false`).
- `visualizeRoll` — Visualizar roll no controle de navegação (default: `false`).

---

## 4. Serviços

### 4.1 MapService

**Função:** Gerenciar instâncias de mapa (registro/obtenção) e oferecer métodos de controle.

- **Registro:** `registerMap(id, map)` / `unregisterMap(id)` (uso interno do `ng-map`).
- **Acesso:** `getMap(id)`, `getMapSignal(id)` (signal reativo para uso em componentes).
- **Navegação:** `flyTo(id, center, zoom?, duration?)`, `easeTo`, `jumpTo`, `fitBounds(id, bounds, options?)`.
- **Estado:** `getCenter(id)`, `getZoom(id)`, `setCenter(id, center)`, `setZoom(id, zoom)`.
- **Controles:** `zoomIn(id)`, `zoomOut(id)`, `resetNorth(id)`, `resetNorthPitch(id)`.
- **Eventos:** `createMapEventObservable(mapId, eventType)` para escutar eventos do MapLibre.

Útil para fly-to em coordenadas, ajustar vista aos bounds ou reagir a mudanças de centro/zoom em outros componentes.

---

### 4.2 ThemeService

**Função:** Gerenciar tema claro/escuro e persistir preferência.

- `setTheme(mode)` — `'light'` | `'dark'` | `'auto'`.
- `getTheme()` — Retorna `'light'` ou `'dark'`.
- `toggleTheme()` — Alterna entre light e dark.
- Suporte a preferência do sistema quando modo é `'auto'`, e opção de persistir em localStorage (chave configurável).

O mapa e os componentes que dependem de tema (ex.: marcadores) reagem ao tema atual.

---

### 4.3 MarkerService

**Função:** Criar, remover e atualizar marcadores (e tooltips) associados a um mapa. Usado internamente por `ng-marker` e pelo desenho de paradas em rotas.

- `addMarker(mapId, config, map)` — Adiciona marcador com popup/tooltip conforme config.
- `removeMarker(mapId, markerId)`, `removeAllMarkers(mapId)`.
- `getMarker(mapId, markerId)`, `getAllMarkers(mapId)`.
- `updateMarkerPosition(mapId, markerId, position)`.
- `addStopMarker(mapId, stop, number, map, color?)` — Marcador numerado para paradas de rota.

Útil para adicionar/remover marcadores de forma imperativa além do uso declarativo do `ng-marker`.

---

### 4.4 OsrmService

**Função:** Chamar a API OSRM para obter rotas entre dois pontos e formatar duração/distância.

- `getRoutes(start, end, options?)` — Retorna `Promise<OsrmRouteData[]>` (coordenadas, duration, distance).
- Opções: `profile` (driving/walking/cycling), `alternatives`, `overview`, `geometries`, `serverUrl`.
- `formatDuration(seconds)` — Ex.: "5 min", "1h 30m".
- `formatDistance(meters)` — Ex.: "500 m", "2.5 km".

Usado pelo `RoutePlanningComponent`; pode ser usado diretamente para integrações customizadas.

---

## 5. Temas e estilos

- **Variáveis CSS:** A biblioteca usa variáveis CSS (estilo shadcn) para cores e espaçamentos; o mapa e os controles se adaptam ao tema aplicado no documento (ex.: `data-theme="dark"` ou classes `theme-dark` / `theme-light`).
- **Estilos padrão do mapa:** Light = Carto Positron, Dark = Carto Dark Matter (definidos em `map-styles.ts`).
- **Customização:** É possível passar um único `style` (URL ou objeto) ou `styles: { light: '...', dark: '...' }` no mapa para estilos próprios por tema.
- **SCSS:** A lib exporta estilos (variáveis, mixins, utilitários) para quem quiser customizar ainda mais.

---

## 6. Interfaces / tipos (referência rápida)

- **MapConfig** — Configuração completa do mapa (center, zoom, style, theme, interações, etc.).
- **MarkerConfig** — Posição, ícone, cor, tamanho, popup, tooltip, draggable, etc.
- **PopupConfig** — title, content, anchor, offset, closeButton, closeOnClick, maxWidth.
- **TooltipConfig** — text, anchor, offset, showOnHover.
- **RouteConfig** — coordinates, color, width, dashed, stops, osrmData, etc.
- **ControlPosition** — Posição dos controles: `'top-left'` | `'top-right'` | `'bottom-left'` | `'bottom-right'`.
- **ThemeConfig / ThemeMode** — mode, detectSystemPreference, storageKey, onThemeChange.
- **OsrmRouteData** — coordinates, duration, distance.
- **OsrmRouteOptions** — profile, alternatives, overview, geometries, serverUrl.
- **RouteStop** — name, lng, lat.

Esses tipos podem ser mencionados na landing como “API tipada e documentada”.

---

## 7. Exemplos incluídos (demo)

O projeto inclui uma aplicação demo com exemplos que cobrem:

- **basic-map** — Mapa mínimo com centro e zoom.
- **controls-map** — Mapa com controles (zoom, bússola, localizar, tela cheia).
- **custom-style-map** — Mapa com estilo customizado (URL ou objeto).
- **dark-theme-map** — Mapa em tema escuro.
- **flyto-globe-map** — Mapa com projeção globo e flyTo.
- **flyto-markers-map** — Marcadores e navegação (flyTo) para coordenadas.
- **markers-map** — Marcadores com popup e configurações.
- **route-planning-map** — Planejamento de rotas com OSRM (origem/destino, alternativas, duração/distância).
- **routes-map** — Rotas desenhadas manualmente (coordinates).
- **tooltips-map** — Marcadores com tooltips no hover.

Esses nomes podem ser usados na landing como “Exemplos” ou “Demos” com breve descrição de cada um.

---

## 8. Instalação e uso mínimo

- **Requisito:** Angular 18 ou superior.
- **Instalação:** `npm install ng-mapcn maplibre-gl`
- **CSS:** Incluir `maplibre-gl/dist/maplibre-gl.css` (angular.json ou global styles).
- **Uso mínimo:** Importar `MapComponent` e, por exemplo, `ZoomControlComponent`; colocar um container com altura; usar `<ng-map [mapId]="'my-map'" [center]="[0,0]" [zoom]="2" (mapReady)="onMapReady($event)">` e `<ng-zoom-control [mapId]="'my-map'" position="top-right">`.

Isso pode ser a seção “Quick start” ou “Começando em 30 segundos” na landing.

---

## 9. Sugestões de seções para a landing page

1. **Hero** — Nome, slogan, breve descrição e CTA (ex.: “Ver documentação”, “Instalar”).
2. **Features** — Lista visual das características (theme-aware, zero config, MapLibre, composable, marcadores, rotas, planejamento OSRM, controles).
3. **Componentes** — Cards ou lista: Mapa, Marcadores, Rotas, Planejamento de rotas, Controles (com descrição de 1–2 linhas cada).
4. **Serviços** — MapService, ThemeService, MarkerService, OsrmService (uma linha cada + link para docs).
5. **Temas** — Light/dark/auto, estilos padrão e customização.
6. **Exemplos / Demo** — Grid com os exemplos (basic, controls, markers, routes, route-planning, tooltips, flyto, globe, dark, custom style) com link para a app demo.
7. **Instalação** — Comando npm e passo de incluir o CSS.
8. **Quick start** — Trecho de código mínimo (template + import).
9. **API / Tipos** — Menção à API tipada (interfaces) e link para documentação detalhada.
10. **Créditos / Licença** — Inspirado no [mapcn](https://www.mapcn.dev/) (React). MapLibre GL, shadcn/ui, licença MIT.

---

## 10. Textos prontos para copiar/adaptar

**Título sugerido:**  
ng-mapcn — Mapas bonitos para Angular, feitos de forma simples.

**Subtítulo:**  
Inspirado no [mapcn](https://www.mapcn.dev/) (React). Componentes de mapa para Angular 18+ com MapLibre GL — theme-aware, zero config e estilização inspirada no shadcn/ui.

**CTA principal:**  
Instalar · Ver documentação · Ver exemplos

**Feature bullets (uma linha cada):**

- Adapta-se ao tema claro/escuro do seu app.
- Funciona sem configuração; personalize quando quiser.
- Compatível com o ecossistema e estilo shadcn/ui.
- Baseado no MapLibre GL, com acesso total à API quando precisar.
- Monte o mapa que quiser: mapa, marcadores, rotas e controles em conjunto.
- Marcadores com popups, tooltips e ícones customizados.
- Desenhe rotas e planeje trajetos com cálculo real (OSRM).
- Controles de zoom, bússola, localização e tela cheia.

Este documento pode ser usado integralmente para redigir ou revisar a landing page e a documentação da biblioteca.
