/**
 * pt-BR texts of `roadmap.data.ts`, by milestone id. Goals and deliverables follow
 * the English order (`done` flags stay in the English file); the spec checks the counts.
 */
export interface RoadmapMilestonePt {
  title: string;
  description: string;
  goals: string[];
  deliverables: string[];
}

export const ROADMAP_PT: Record<string, RoadmapMilestonePt> = {
  stable: {
    title: '22.0.0 estável',
    description:
      'O destino deste roadmap. Todo marco de "O que vem a seguir" sai primeiro na linha beta 22.0.0; depois a API pública é congelada e a 22.0.0 é lançada com garantias de semver, pronta para produção.',
    goals: ['Roadmap completo', 'API congelada', 'Semver'],
    deliverables: [
      'Processo de release documentado (Release-As, prerelease desligado)',
      'Checagens de smoke, SSR e acessibilidade em todas as páginas de docs',
      'Todos os marcos de "O que vem a seguir" lançados',
      'Revisão da API pública: todo input, output e export finalizado',
      'Release-As: 22.0.0 e "prerelease": false',
      'Comandos de instalação sem @beta no README e nas docs',
      'Política de suporte para as linhas 21.x e 18.x',
    ],
  },
  foundation: {
    title: 'Fundação: o port do mapcn',
    description:
      'O núcleo do mapcn refeito para Angular: componentes standalone, inputs com signals e um contexto de mapa no escopo do componente no lugar do useMap().',
    goals: ['Paridade com o mapcn', 'Signals', 'Copiar e colar'],
    deliverables: [
      'ng-map com estilos guiados pelo tema, estilo em branco e viewport controlado',
      'ng-map-controls: zoom, bússola, localização e tela cheia',
      'Família de marcadores: conteúdo, popup, tooltip e rótulo',
      'ng-map-popup independente',
      'Camadas de rota, GeoJSON, arco e cluster',
      'Schematics ng add e map para a instalação por cópia',
      'Site de docs no estilo do mapcn.dev e galeria de blocks',
    ],
  },
  'developer-experience': {
    title: 'Experiência de desenvolvimento',
    description:
      'APIs tipadas, ganchos de estilo e traduções, para que os componentes se encaixem em apps e design systems reais.',
    goals: ['Tipagem', 'Estilo', 'i18n', 'Agentes'],
    deliverables: [
      'Skill de agente do ng-mapcn no skills.sh',
      'Camadas GeoJSON e cluster tipadas pelas propriedades das features',
      'Inputs className para conteúdo em portal e controles',
      'Rótulos de controles e de acessibilidade configuráveis e traduzíveis',
      'Opções de popup e um input open em mão dupla',
      'Progresso de rota, estado ativo, RouteProgress e RouteMarker',
    ],
  },
  'beyond-mapcn': {
    title: 'Além do mapcn',
    description:
      'Camadas que o mapcn ainda não tem, além de acesso por teclado e renderização no servidor prontos para uso.',
    goals: ['Novas camadas', '3D', 'Acessibilidade', 'SSR'],
    deliverables: [
      'ng-map-heatmap',
      '[fitBounds] declarativo no ng-map',
      'Sources raster, vetoriais e PMTiles, mais sobreposição de imagem',
      'Prédios 3D, terreno e sombreamento de relevo',
      'ng-mapcn/draw para pontos, linhas e polígonos',
      'Acesso por teclado para marcadores, popups, tooltips e arrasto',
      'Suporte a renderização no servidor e hidratação',
      'Playground interativo e galeria de estilos',
    ],
  },
  'scene-builder': {
    title: 'Playground e construtor de cenas',
    description: 'Monte um mapa visualmente e copie o código Angular que o renderiza.',
    goals: ['Playground', 'Geração de código'],
    deliverables: [
      'Construtor de cenas com pilha de camadas arrastável',
      'Links compartilháveis e código de componente gerado',
      'Cenas de exemplo: entregas, voos, terremotos, Alpes, cidade 3D, rascunho',
      '15 presets de basemap, do Carto ao satélite e ao globo',
    ],
  },
  'testing-toolkit': {
    title: 'Kit de testes',
    description:
      'Teste apps que usam o ng-mapcn sem WebGL, com o mesmo fake do MapLibre que a biblioteca usa.',
    goals: ['Testes', 'Harnesses'],
    deliverables: [
      'Entry point ng-mapcn/testing com o fake do MapLibre',
      'Component harnesses para mapa, marcador e popup',
      'Página de docs "Testando seus mapas"',
    ],
  },
  'new-components': {
    title: 'Novos componentes',
    description:
      'As peças que apps de mapa vivem reescrevendo à mão, como filhos componíveis do ng-map.',
    goals: ['Componentes', 'MapLibre'],
    deliverables: [
      'ng-map-legend para escalas de coroplético, mapa de calor e cluster',
      'ng-map-scale: barra de escala métrica e imperial',
      'ng-map-minimap: mapa de visão geral sincronizado com o viewport principal',
      'ng-map-symbol-layer: ícones e rótulos de texto a partir de sprites ou imagens',
      'ng-map-style-switcher: seletor de basemap como controle',
      'Reprodução animada de rota com play, pausa e velocidade',
    ],
  },
  'dx-docs-ai': {
    title: 'DX, docs e IA',
    description:
      'Tornar o ng-mapcn fácil de usar para pessoas e para agentes de código, com ferramentas de primeira linha para assistentes de IA.',
    goals: ['llms.txt', 'Skill de agente', 'Docs'],
    deliverables: [
      'llms.txt e llms-full.txt para agentes',
      'Skill de agente do ng-mapcn no skills.sh',
      'Receitas da skill geradas a partir das cenas do playground',
      'Copiar a página como Markdown e abrir no playground a partir de cada exemplo das docs',
    ],
  },
  'search-routing': {
    title: 'Busca e rotas',
    description:
      'Encontrar lugares e traçar direções com provedores plugáveis, para que cada app escolha o próprio geocodificador e roteador.',
    goals: ['Geocodificação', 'Direções', 'Provedores'],
    deliverables: [
      'ng-map-search: busca de endereços com Nominatim, MapTiler ou um provedor próprio',
      'Geocodificação reversa no clique',
      'Helper de direções (OSRM, Valhalla ou próprio) que alimenta o ng-map-route',
      'Isócronas: a área alcançável em N minutos',
    ],
  },
  'angular-forms': {
    title: 'Integração com Angular forms',
    description:
      'Mapas como campos de formulário: escolher um local ou desenhar uma área, ligados a Signal Forms ou reactive forms.',
    goals: ['Forms', 'Signals'],
    deliverables: [
      'ng-map-location-picker como form control (lng/lat)',
      'ng-map-draw como form control para features GeoJSON',
      'Seletores de bounding box e de raio para filtros de busca',
    ],
  },
  'real-time': {
    title: 'Dados em tempo real',
    description:
      'Mapas ao vivo a partir de streams: movimento suave de marcadores e camadas que se atualizam a partir de Observables ou signals.',
    goals: ['Streaming', 'Animação'],
    deliverables: [
      'Interpolação suave para marcadores atualizados por um stream',
      'Dados de camada a partir de Observables e feeds WebSocket',
      'Rastros: histórico que se apaga atrás dos marcadores em movimento',
    ],
  },
  'measure-analyze': {
    title: 'Medir e analisar',
    description: 'Ferramentas espaciais sobre o ng-mapcn/draw, sem uma stack de GIS.',
    goals: ['Desenho', 'Análise'],
    deliverables: [
      'Ferramenta de medição de distância e área',
      'Selecionar as features dentro de um polígono desenhado',
      'Helpers de snapping e edição para o draw',
    ],
  },
  'per-component-install': {
    title: 'Instalação por componente, no estilo shadcn',
    description:
      'Copie só o que você usa: escolha componentes e deixe o schematic resolver os arquivos de que eles dependem.',
    goals: ['Schematics', 'Registro'],
    deliverables: [
      'ng g ng-mapcn:map --components=marker,route com resolução de dependências',
      'Manifesto de registro que liga cada componente aos seus arquivos',
      'Schematics de blocks: adicione um block da galeria ao seu app com um comando',
    ],
  },
  'blocks-templates': {
    title: 'Mais blocks e templates',
    description: 'Telas prontas para partir delas, no estilo da galeria de blocks atual.',
    goals: ['Blocks', 'Templates'],
    deliverables: [
      'Dashboard de rastreamento de frota',
      'Busca de imóveis com filtros e lista de resultados',
      'Roteiro de viagem com rotas dia a dia',
      'Radar meteorológico com linha do tempo raster animada',
      'Territórios de vendas com regiões editáveis',
    ],
  },
};

const MONTHS_PT: Record<string, string> = {
  January: 'janeiro',
  February: 'fevereiro',
  March: 'março',
  April: 'abril',
  May: 'maio',
  June: 'junho',
  July: 'julho',
  August: 'agosto',
  September: 'setembro',
  October: 'outubro',
  November: 'novembro',
  December: 'dezembro',
};

/** "22.0.0-beta.7 · October 2026" → "22.0.0-beta.7 · outubro de 2026". */
export function periodPt(period: string): string {
  return period.replace(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December) (\d{4})\b/,
    (_, month: string, year: string) => `${MONTHS_PT[month]} de ${year}`,
  );
}
