/** Site languages. `en` is the prerendered one; `pt-BR` is applied after hydration. */
export type Lang = 'en' | 'pt-BR';

export const LANGS: readonly Lang[] = ['en', 'pt-BR'];

/** A value per language, for data that lives outside the dictionary (navigation items). */
export type Localized<T> = Record<Lang, T>;

/**
 * Shell + home strings. The docs prose, blocks and playground stay English for now:
 * add their strings here, under their own key, when they get translated.
 */
const en = {
  language: {
    short: 'EN',
    switchTo: 'Mudar para português',
  },
  header: {
    homeLabel: 'ng-mapcn home',
  },
  search: {
    trigger: 'Search...',
    description: 'Jump to pages, components, and docs',
    empty: 'No results found',
    navigate: 'navigate',
    select: 'select',
    close: 'close',
  },
  mobileNav: {
    menu: 'Menu',
    label: 'Site navigation',
  },
  basemap: {
    title: 'Map style',
    hint: 'Change the map style used by every map on this site',
    currentLabel: 'Change map style, current: ',
    description: 'Every map on this site follows your pick.',
    default: 'Default',
    vector: 'Vector',
    raster: 'Raster',
    apiKey: 'API key',
    noKey: 'No key needed',
    getKey: 'Get a key',
    pasteKey: 'Paste your API key',
    optionalOnLocalhost: 'Optional on localhost',
    storedLocally: 'Stored only in your browser.',
    /** Per provider id (`BasemapId`); providers without a note are left out. */
    notes: {
      osm: 'Raster tiles. Dev/demo only — see the OSM tile usage policy.',
      stadia: 'Key optional on localhost (rate limited).',
    } as Partial<Record<string, string>>,
  },
  github: {
    label: 'GitHub repository',
    stars: (count: number) => `GitHub repository, ${count} stars`,
  },
  docs: {
    onThisPage: 'On This Page',
    linkTo: 'Link to ',
    viewCode: 'View Code',
    copied: 'Copied',
    copyCode: 'Copy code',
    copyCommand: 'Copy command',
    type: 'Type',
    default: 'Default',
    description: 'Description',
  },
  footer: {
    tagline:
      'Free & open-source, ready-to-use, customizable map components for Angular. An Angular port of',
    released: 'Released under the',
    license: 'MIT License',
    product: 'Product',
    community: 'Community',
    resources: 'Resources',
    documentation: 'Documentation',
    components: 'Components',
    blocks: 'Blocks',
    credits: 'Credits',
    issues: 'Issues',
  },
  home: {
    badge: 'Now on MapLibre GL v6',
    heading: 'Beautiful maps, made simple',
    description: 'Ready to use, customizable map components for Angular.',
    descriptionLine2: 'Built on MapLibre. Styled with Tailwind.',
    getStarted: 'Get Started',
    viewComponents: 'View Components',
    examplesHeading: 'Angular map examples built with ng-mapcn',
    copyPrompt: 'Copy prompt for your agent',
    copiedPrompt: 'Copied — paste into your agent',
    analytics: {
      activeUsers: 'Active Users',
      vsLastHour: 'vs last hour',
      users: 'users',
    },
    trail: {
      name: 'Central Park Loop',
      miles: 'Miles',
      mins: 'Mins',
      cal: 'Cal',
    },
    delivery: {
      store: 'Store',
      onTheWay: 'On the way',
      home: 'Home',
    },
    ev: {
      available: 'Available',
      inUse: 'In Use',
      offline: 'Offline',
      remaining: (minutes: number) => `~${minutes} min remaining`,
    },
  },
};

export type Messages = typeof en;

const ptBR: Messages = {
  language: {
    short: 'PT',
    switchTo: 'Switch to English',
  },
  header: {
    homeLabel: 'Início do ng-mapcn',
  },
  search: {
    trigger: 'Buscar...',
    description: 'Vá para páginas, componentes e documentação',
    empty: 'Nenhum resultado encontrado',
    navigate: 'navegar',
    select: 'selecionar',
    close: 'fechar',
  },
  mobileNav: {
    menu: 'Menu',
    label: 'Navegação do site',
  },
  basemap: {
    title: 'Estilo do mapa',
    hint: 'Muda o estilo usado por todos os mapas deste site',
    currentLabel: 'Mudar estilo do mapa, atual: ',
    description: 'Todos os mapas do site seguem a sua escolha.',
    default: 'Padrão',
    vector: 'Vetorial',
    raster: 'Raster',
    apiKey: 'Chave de API',
    noKey: 'Sem chave',
    getKey: 'Obter uma chave',
    pasteKey: 'Cole sua chave de API',
    optionalOnLocalhost: 'Opcional no localhost',
    storedLocally: 'Fica salva só no seu navegador.',
    notes: {
      osm: 'Tiles raster. Só para desenvolvimento e demos: veja a política de uso de tiles do OSM.',
      stadia: 'Chave opcional no localhost (com limite de requisições).',
    },
  },
  github: {
    label: 'Repositório no GitHub',
    stars: (count: number) => `Repositório no GitHub, ${count} estrelas`,
  },
  docs: {
    onThisPage: 'Nesta página',
    linkTo: 'Link para ',
    viewCode: 'Ver código',
    copied: 'Copiado',
    copyCode: 'Copiar código',
    copyCommand: 'Copiar comando',
    type: 'Tipo',
    default: 'Padrão',
    description: 'Descrição',
  },
  footer: {
    tagline:
      'Componentes de mapa para Angular, gratuitos, open source, prontos para usar e personalizáveis. Um port para Angular do',
    released: 'Distribuído sob a',
    license: 'Licença MIT',
    product: 'Produto',
    community: 'Comunidade',
    resources: 'Recursos',
    documentation: 'Documentação',
    components: 'Componentes',
    blocks: 'Blocks',
    credits: 'Créditos',
    issues: 'Issues',
  },
  home: {
    badge: 'Agora com MapLibre GL v6',
    heading: 'Mapas bonitos, sem complicação',
    description: 'Componentes de mapa para Angular, prontos para usar e personalizáveis.',
    descriptionLine2: 'Feitos com MapLibre. Estilizados com Tailwind.',
    getStarted: 'Começar',
    viewComponents: 'Ver componentes',
    examplesHeading: 'Exemplos de mapas em Angular feitos com ng-mapcn',
    copyPrompt: 'Copiar prompt para o seu agente',
    copiedPrompt: 'Copiado — cole no seu agente',
    analytics: {
      activeUsers: 'Usuários ativos',
      vsLastHour: 'vs. última hora',
      users: 'usuários',
    },
    trail: {
      name: 'Volta no Central Park',
      miles: 'Milhas',
      mins: 'Min',
      cal: 'Cal',
    },
    delivery: {
      store: 'Loja',
      onTheWay: 'A caminho',
      home: 'Casa',
    },
    ev: {
      available: 'Disponível',
      inUse: 'Em uso',
      offline: 'Offline',
      remaining: (minutes: number) => `~${minutes} min restantes`,
    },
  },
};

export const MESSAGES: Localized<Messages> = { en, 'pt-BR': ptBR };
