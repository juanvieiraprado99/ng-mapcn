import { Pipe, type PipeTransform } from '@angular/core';

import { API_REFERENCE_PT } from '../docs/api-reference.data.pt';

/**
 * pt-BR glossary for the playground data (block specs, control labels, style presets and
 * example scenes), keyed by the English text. The data files stay English because their
 * texts also feed the generated code; `playgroundText()` translates them for display only.
 * The spec checks that every displayed text has an entry.
 */
export const PLAYGROUND_PT: Record<string, string> = {
  // --- shared option labels
  Default: 'Padrão',
  'Theme default': 'Padrão do tema',

  // --- block specs
  Map: 'Mapa',
  'The root component: basemap, theme, projection and camera.':
    'O componente raiz: basemap, tema, projeção e câmera.',
  Marker: 'Marcador',
  'A DOM marker at a coordinate. Drag it when draggable is on.':
    'Um marcador DOM numa coordenada. Arraste-o quando draggable estiver ligado.',
  Longitude: 'Longitude',
  Latitude: 'Latitude',
  Draggable: 'Arrastável',
  Rotation: 'Rotação',
  Anchor: 'Âncora',
  'Applied when the marker is created (the playground re-creates it).':
    'Aplicado quando o marcador é criado (o playground o recria).',
  Route: 'Rota',
  'A polyline through coordinates, styled with color, width and dashes.':
    'Uma polilinha passando por coordenadas, estilizada com cor, largura e tracejado.',
  Color: 'Cor',
  Width: 'Largura',
  Opacity: 'Opacidade',
  Dash: 'Tracejado',
  Solid: 'Contínuo',
  'Dotted [2, 2]': 'Pontilhado [2, 2]',
  'Dashed [6, 3]': 'Tracejado [6, 3]',
  Interactive: 'Interativo',
  'Pointer cursor and click/hover outputs (not shown here).':
    'Cursor de ponteiro e outputs de clique/hover (não mostrados aqui).',
  GeoJSON: 'GeoJSON',
  'Fill and outline layers for polygons, with a hover state.':
    'Camadas de preenchimento e contorno para polígonos, com estado de hover.',
  'Fill color': 'Cor de preenchimento',
  'The library default follows the theme (#d4d4d4 light, #404040 dark).':
    'O padrão da biblioteca segue o tema (#d4d4d4 claro, #404040 escuro).',
  'Fill opacity': 'Opacidade do preenchimento',
  'Outline color': 'Cor do contorno',
  'The library default follows the theme (#ffffff light, #171717 dark).':
    'O padrão da biblioteca segue o tema (#ffffff claro, #171717 escuro).',
  'Outline width': 'Largura do contorno',
  'Hover color': 'Cor no hover',
  'Fill color while a polygon is hovered (needs Interactive).':
    'Cor de preenchimento enquanto o mouse está sobre um polígono (precisa de Interativo).',
  'Interactive (cursor and hover)': 'Interativo (cursor e hover)',
  Arcs: 'Arcos',
  'Curved great-circle-style links between origin and destination points.':
    'Ligações curvas, no estilo de círculo máximo, entre pontos de origem e destino.',
  Curvature: 'Curvatura',
  Clusters: 'Clusters',
  'Clustered points that expand as you zoom, from GeoJSON data or a URL.':
    'Pontos agrupados que se expandem com o zoom, a partir de dados GeoJSON ou de uma URL.',
  'Cluster radius': 'Raio do cluster',
  'Cluster max zoom': 'Zoom máximo do cluster',
  'Point color': 'Cor do ponto',
  'Zoom on cluster click': 'Zoom ao clicar no cluster',
  'Cluster colors (small, medium, large)': 'Cores do cluster (pequeno, médio, grande)',
  'Thresholds [medium, large]': 'Limites [médio, grande]',
  Heatmap: 'Mapa de calor',
  'Point density as a heatmap layer, weighted by a numeric property.':
    'Densidade de pontos como uma camada de mapa de calor, ponderada por uma propriedade numérica.',
  Radius: 'Raio',
  Intensity: 'Intensidade',
  Gradient: 'Gradiente',
  Fire: 'Fogo',
  Ocean: 'Oceano',
  'Raster tiles': 'Tiles raster',
  'An XYZ raster tile source drawn as a layer, with live paint tuning.':
    'Uma source de tiles raster XYZ desenhada como camada, com ajuste de paint ao vivo.',
  Visible: 'Visível',
  Saturation: 'Saturação',
  'Hue rotate': 'Rotação de matiz',
  '3D buildings': 'Prédios 3D',
  'Extruded buildings from the basemap vector tiles. Needs a basemap with a building layer (Carto default); pick the 3D tilt preset.':
    'Prédios extrudados a partir dos tiles vetoriais do basemap. Precisa de um basemap com camada de prédios (o Carto padrão); escolha o preset Inclinação 3D.',
  'Min zoom': 'Zoom mínimo',
  Orange: 'Laranja',
  'By height': 'Pela altura',
  Terrain: 'Terreno',
  '3D terrain from the public Terrarium elevation tiles, with an optional hillshade layer. Tilt the map to see the relief.':
    'Terreno 3D a partir dos tiles públicos de elevação Terrarium, com uma camada opcional de sombreamento de relevo. Incline o mapa para ver o relevo.',
  Exaggeration: 'Exagero',
  Hillshade: 'Sombreamento de relevo',
  'Hillshade strength': 'Intensidade do sombreamento',
  'Shadow color': 'Cor da sombra',
  Slate: 'Ardósia',
  Rust: 'Ferrugem',
  'Image overlay': 'Sobreposição de imagem',
  'An image pinned to four corner coordinates, drawn as a raster layer.':
    'Uma imagem fixada em quatro coordenadas de canto, desenhada como camada raster.',
  Popup: 'Popup',
  'A standalone popup at a coordinate, with your own content.':
    'Um popup independente numa coordenada, com o seu próprio conteúdo.',
  Open: 'Aberto',
  'Close button': 'Botão de fechar',
  'Close on map click': 'Fechar ao clicar no mapa',
  Draw: 'Desenho',
  'Draw points, lines and polygons (terra-draw). Pick a mode, then click the map; Select edits a shape.':
    'Desenhe pontos, linhas e polígonos (terra-draw). Escolha um modo e clique no mapa; Selecionar edita uma forma.',
  Mode: 'Modo',
  'Pan (static)': 'Mover (estático)',
  Point: 'Ponto',
  Line: 'Linha',
  Polygon: 'Polígono',
  Select: 'Selecionar',
  Shapes: 'Formas',
  All: 'Todas',
  'Polygons only': 'Só polígonos',
  'Points and lines': 'Pontos e linhas',
  Editable: 'Editável',
  Rose: 'Rosa',
  Green: 'Verde',

  // --- style presets and map controls
  'Carto (default)': 'Carto (padrão)',
  'Positron in light mode, Dark Matter in dark mode. No configuration needed.':
    'Positron no modo claro, Dark Matter no escuro. Sem configuração.',
  'Default: no input needed. © CARTO, © OpenStreetMap contributors.':
    'Padrão: nenhum input necessário. © CARTO, © colaboradores do OpenStreetMap.',
  'Carto Voyager': 'Carto Voyager',
  'The colorful Voyager basemap for light mode, Dark Matter for dark mode.':
    'O colorido basemap Voyager no modo claro, Dark Matter no escuro.',
  '© CARTO, © OpenStreetMap contributors.': '© CARTO, © colaboradores do OpenStreetMap.',
  OpenFreeMap: 'OpenFreeMap',
  'Free vector tiles with no key or limits: Positron and Dark.':
    'Tiles vetoriais gratuitos, sem chave nem limites: Positron e Dark.',
  '© OpenFreeMap, © OpenMapTiles, data from OpenStreetMap.':
    '© OpenFreeMap, © OpenMapTiles, dados do OpenStreetMap.',
  OpenStreetMap: 'OpenStreetMap',
  'Standard OSM raster tiles. Light only: the same tiles show in dark mode.':
    'Tiles raster padrão do OSM. Só claro: os mesmos tiles aparecem no modo escuro.',
  '© OpenStreetMap contributors. Dev/demo only (OSM tile usage policy).':
    '© colaboradores do OpenStreetMap. Só para dev/demo (política de uso de tiles do OSM).',
  MapTiler: 'MapTiler',
  'MapTiler Streets vector tiles, light and dark. Needs your API key.':
    'Tiles vetoriais MapTiler Streets, claro e escuro. Precisa da sua chave de API.',
  'Paste your key in the header map style picker. © MapTiler, © OpenStreetMap contributors.':
    'Cole a sua chave no seletor de estilo do mapa no header. © MapTiler, © colaboradores do OpenStreetMap.',
  'Stadia Maps': 'Stadia Maps',
  'Alidade Smooth vector tiles, light and dark. Key optional on localhost.':
    'Tiles vetoriais Alidade Smooth, claro e escuro. Chave opcional no localhost.',
  '© Stadia Maps, © OpenMapTiles, © OpenStreetMap contributors.':
    '© Stadia Maps, © OpenMapTiles, © colaboradores do OpenStreetMap.',
  'Carto Positron': 'Carto Positron',
  'The light Carto basemap in both themes: a calm canvas for colorful data.':
    'O basemap claro do Carto nos dois temas: uma tela calma para dados coloridos.',
  'Carto Dark Matter': 'Carto Dark Matter',
  'The dark Carto basemap in both themes, for glowing heatmaps and arcs.':
    'O basemap escuro do Carto nos dois temas, para mapas de calor e arcos brilhantes.',
  'OpenFreeMap Liberty': 'OpenFreeMap Liberty',
  'A detailed, colorful street style with no key; Dark in dark mode.':
    'Um estilo de ruas detalhado e colorido, sem chave; Dark no modo escuro.',
  'OpenFreeMap Bright': 'OpenFreeMap Bright',
  'A bright, high-contrast street style with no key; Dark in dark mode.':
    'Um estilo de ruas claro e de alto contraste, sem chave; Dark no modo escuro.',
  'Satellite (Esri)': 'Satélite (Esri)',
  'Esri World Imagery raster tiles: satellite and aerial photos, no key.':
    'Tiles raster Esri World Imagery: fotos de satélite e aéreas, sem chave.',
  'Dev/demo use; check the Esri terms before shipping. © Esri, Maxar, Earthstar Geographics.':
    'Uso em dev/demo; confira os termos da Esri antes de ir para produção. © Esri, Maxar, Earthstar Geographics.',
  'OSM Humanitarian': 'OSM Humanitário',
  'The Humanitarian OpenStreetMap style (HOT) as raster tiles.':
    'O estilo Humanitarian OpenStreetMap (HOT) como tiles raster.',
  '© OpenStreetMap contributors, tiles by HOT and OSM France. Fair use only.':
    '© colaboradores do OpenStreetMap, tiles do HOT e do OSM France. Só uso razoável.',
  Blank: 'Em branco',
  'A transparent, tile-less canvas for your own layers.':
    'Uma tela transparente, sem tiles, para as suas próprias camadas.',
  'Globe projection': 'Projeção de globo',
  'The default basemap on a 3D globe instead of Web Mercator.':
    'O basemap padrão num globo 3D em vez do Web Mercator.',
  '3D tilt': 'Inclinação 3D',
  'A pitched, rotated camera, the starting point for 3D buildings.':
    'Uma câmera inclinada e girada, o ponto de partida para prédios 3D.',
  Basemap: 'Basemap',
  Theme: 'Tema',
  'Auto (follows the site)': 'Automático (segue o site)',
  Light: 'Claro',
  Dark: 'Escuro',
  Projection: 'Projeção',
  Mercator: 'Mercator',
  Globe: 'Globo',
  Zoom: 'Zoom',
  Pitch: 'Inclinação',
  Bearing: 'Rotação',

  // --- example scenes
  'Delivery route': 'Rota de entrega',
  'A thick route across Manhattan with a pin at the drop-off and a popup.':
    'Uma rota grossa atravessando Manhattan, com um pino no ponto de entrega e um popup.',
  'Flight network': 'Rede de voos',
  'Great-circle arcs between hubs on the globe.': 'Arcos de círculo máximo entre hubs no globo.',
  'Earthquake density': 'Densidade de terremotos',
  'A heatmap under clustered points, on the dark Carto basemap.':
    'Um mapa de calor sob pontos agrupados, no basemap escuro do Carto.',
  'Alpine terrain': 'Terreno alpino',
  'Exaggerated terrain and hillshade over satellite imagery in the Dolomites.':
    'Terreno exagerado e sombreamento de relevo sobre imagens de satélite nas Dolomitas.',
  'City in 3D': 'Cidade em 3D',
  'Buildings extruded and colored by height over lower Manhattan.':
    'Prédios extrudados e coloridos pela altura no sul de Manhattan.',
  'Sketch an area': 'Esboce uma área',
  'Draw polygons over the GeoJSON areas, then switch to Select to edit them.':
    'Desenhe polígonos sobre as áreas GeoJSON e depois mude para Selecionar para editá-los.',

  // --- JSON field validation
  'Not valid JSON.': 'JSON inválido.',
  'Keeping the last value.': 'O último valor foi mantido.',
  'Three CSS colors, e.g. ["#22c55e", "#eab308", "#ef4444"].':
    'Três cores CSS, por exemplo ["#22c55e", "#eab308", "#ef4444"].',
  'Two increasing numbers, e.g. [100, 750].': 'Dois números crescentes, por exemplo [100, 750].',
};

/**
 * The pt-BR text of a playground string, or the string itself (English or untranslated).
 * Control hints borrowed from the API reference (`describeControls`) use its glossary.
 */
export function playgroundText(text: string, pt: boolean): string {
  return pt ? (PLAYGROUND_PT[text] ?? API_REFERENCE_PT[text] ?? text) : text;
}

/** `{{ spec.label | pgText: pt() }}`: pure, so it re-runs only when the text or language changes. */
@Pipe({ name: 'pgText' })
export class PlaygroundTextPipe implements PipeTransform {
  transform(text: string, pt: boolean): string {
    return playgroundText(text, pt);
  }
}
