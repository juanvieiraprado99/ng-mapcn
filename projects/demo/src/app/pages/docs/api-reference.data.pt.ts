/**
 * pt-BR glossary for `api-reference.data.json`, keyed by the English description. The JSON stays
 * English because `scripts/generate-llms-txt.mjs` builds /llms.txt from it; the page translates the
 * descriptions for display only. The spec checks that every description has an entry.
 */
export const API_REFERENCE_PT: Record<string, string> = {
  "Per-theme basemap. A theme left undefined falls back to the Carto default for that theme.":
    "Basemap por tema. Um tema deixado como undefined usa o padrão do Carto para esse tema.",
  "Provider for the app-wide basemap. The factory form runs in an injection context, so it can inject() a service holding the signal.":
    "Provider do basemap da aplicação inteira. A forma de factory roda num contexto de injeção, então pode usar inject() num serviço que guarda o signal.",
  "The token itself, if you want to provide it by hand.":
    "O próprio token, se você quiser fazer o provide à mão.",
  "Every user-facing and aria string the library renders. Defaults are English: 'Zoom in', 'Zoom out', 'Reset north', 'My location', 'Toggle fullscreen', 'Loading map', 'Close popup', 'Map popup', 'Map marker', 'Map scale', 'Map legend', 'Show legend', 'Hide legend', 'Map style', 'Overview map', 'Show overview map', 'Hide overview map', 'Play', 'Pause', 'Playback progress', 'Playback speed'.":
    "Todos os textos visíveis e de aria que a biblioteca renderiza. Os padrões são em inglês: 'Zoom in', 'Zoom out', 'Reset north', 'My location', 'Toggle fullscreen', 'Loading map', 'Close popup', 'Map popup', 'Map marker', 'Map scale', 'Map legend', 'Show legend', 'Hide legend', 'Map style', 'Overview map', 'Show overview map', 'Hide overview map', 'Play', 'Pause', 'Playback progress', 'Playback speed'.",
  "Provider for app-wide labels; missing keys fall back to the English defaults. The factory form runs in an injection context, so it can inject() a service holding the signal.":
    "Provider dos rótulos da aplicação inteira; chaves ausentes usam os padrões em inglês. A forma de factory roda num contexto de injeção, então pode usar inject() num serviço que guarda o signal.",
  "The English defaults.":
    "Os padrões em inglês.",
  "The raw maplibre-gl Map instance, or null before init.":
    "A instância Map crua do maplibre-gl, ou null antes da inicialização.",
  "True when the style is loaded and layers can be added. Gates every source/layer operation; closes during a theme/basemap switch and re-opens once it settles (or fails).":
    "True quando o estilo está carregado e camadas podem ser adicionadas. Libera toda operação de source/camada; fecha durante uma troca de tema ou basemap e reabre quando ela termina (ou falha).",
  "Theme currently applied to the map.":
    "Tema aplicado ao mapa no momento.",
  "Style last requested or applied by ng-map (URL or spec), null before the map exists. It is set before the swap finishes and kept when the change is a no-op diff or the fetch fails. ng-map-minimap mirrors it.":
    "Último estilo pedido ou aplicado pelo ng-map (URL ou spec), null antes de o mapa existir. É definido antes de a troca terminar e mantido quando a mudança é um diff sem efeito ou o fetch falha. O ng-map-minimap o espelha.",
  "Whether a source component (raster, vector, image overlay) currently has a source with this id on the map. Reactive inside effect(); false while a theme switch has removed the style. Wait on it before adding layers that reference source: id.":
    "Se um componente de source (raster, vector, image overlay) tem no momento uma source com esse id no mapa. Reativo dentro de effect(); false enquanto uma troca de tema removeu o estilo. Espere por ele antes de adicionar camadas que referenciam source: id.",
  "Ids of the sources currently announced by source components.":
    "Ids das sources anunciadas no momento pelos componentes de source.",
  "Announces a source you added yourself so hasSource(id) sees it; returns the release function to call when you remove it.":
    "Anuncia uma source que você mesmo adicionou, para que hasSource(id) a veja; retorna a função de liberação a chamar quando você a remover.",
  "Fits the camera to options.bounds, or to the union of the children's data. Returns false when the map is not loaded or there are no bounds.":
    "Ajusta a câmera a options.bounds, ou à união dos dados dos filhos. Retorna false quando o mapa não está carregado ou não há bounds.",
  "Union of the bounds registered by the children, as [west, south, east, north].":
    "União dos bounds registrados pelos filhos, como [oeste, sul, leste, norte].",
  "Takes a reference to a style image, adding it when the style has none under that id (the first user provides the pixels). Returns the release function: the image is removed with its last reference, and only if it is still the one added here. Release while the gate is closed and acquire again once it re-opens. Used by ng-map-symbol-layer.":
    "Pega uma referência a uma imagem do estilo, adicionando-a quando o estilo não tem nenhuma com esse id (o primeiro usuário fornece os pixels). Retorna a função de liberação: a imagem é removida com a última referência, e só se ainda for a que foi adicionada aqui. Libere enquanto o gate está fechado e pegue de novo quando ele reabrir. Usado pelo ng-map-symbol-layer.",
  "Contributes a bounds source to fit-to-bounds. The getter runs reactively; returns the unregister function (call it on destroy).":
    "Contribui com uma fonte de bounds para o fit-to-bounds. O getter roda de forma reativa; retorna a função de cancelamento (chame-a no destroy).",
  "The root container component that initializes MapLibre GL and provides context to child components. Automatically handles theme switching between light and dark modes.":
    "O componente contêiner raiz que inicializa o MapLibre GL e fornece contexto aos componentes filhos. Cuida automaticamente da troca entre os temas claro e escuro.",
  "Initial center coordinates as [longitude, latitude].":
    "Coordenadas iniciais do centro, como [longitude, latitude].",
  "Initial zoom level of the map.":
    "Nível de zoom inicial do mapa.",
  "Custom style URLs or style objects for light and dark themes.":
    "URLs de estilo ou objetos de estilo personalizados para os temas claro e escuro.",
  "Swaps the basemap for a transparent, tile-less canvas. Add your own layers on top.":
    "Troca o basemap por um canvas transparente, sem tiles. Adicione suas próprias camadas por cima.",
  "Map projection, e.g. { type: 'globe' }.":
    "Projeção do mapa, por exemplo { type: 'globe' }.",
  "Force a theme, or 'auto' to follow the dark/light class on <html>.":
    "Força um tema, ou 'auto' para seguir a classe dark/light no <html>.",
  "Shows the loading overlay.":
    "Mostra a sobreposição de carregamento.",
  "Label overrides (loading), merged over provideMapLabels() and the English defaults.":
    "Sobrescritas de rótulos (loading), mescladas sobre provideMapLabels() e os padrões em inglês.",
  "Controlled viewport ({ center, zoom, bearing, pitch }). Pair with viewportChange.":
    "Viewport controlado ({ center, zoom, bearing, pitch }). Use junto com viewportChange.",
  "Fits the camera to bounds ({ bounds?, padding?, maxZoom?, duration?, animate? }). Without bounds it fits the union of the children's data (markers, GeoJSON, routes, arcs, clusters, heatmaps). Runs after load and refits only when the bounds change; the first fit never animates; maxZoom defaults to 16. A draggable marker bound to signals refits while dragged: pass explicit bounds for that case. Imperative form: MapContextService.fitBounds().":
    "Ajusta a câmera a bounds ({ bounds?, padding?, maxZoom?, duration?, animate? }). Sem bounds, ajusta à união dos dados dos filhos (marcadores, GeoJSON, rotas, arcos, clusters, mapas de calor). Roda depois do load e reajusta só quando os bounds mudam; o primeiro ajuste nunca anima; maxZoom tem padrão 16. Um marcador arrastável ligado a signals reajusta enquanto é arrastado: passe bounds explícitos nesse caso. Forma imperativa: MapContextService.fitBounds().",
  "Extra MapLibre MapOptions (scrollZoom, dragRotate, …) passed to the map constructor.":
    "MapOptions extras do MapLibre (scrollZoom, dragRotate, …) passadas ao construtor do mapa.",
  "Emits on every viewport change (move, zoom, rotate, pitch).":
    "Emite a cada mudança de viewport (mover, zoom, girar, inclinar).",
  "Emits the raw maplibre-gl Map instance once loaded.":
    "Emite a instância Map crua do maplibre-gl assim que carrega.",
  "Emits when the map is clicked.":
    "Emite quando o mapa é clicado.",
  "Emits when the map fails to initialize or load.":
    "Emite quando o mapa falha ao inicializar ou carregar.",
  "Renders map control buttons: zoom, compass, locate, and fullscreen. Mounted inside MapLibre's corner containers, so it stacks with the scale, legend and style switcher; style it with className. Must be used inside ng-map.":
    "Renderiza os botões de controle do mapa: zoom, bússola, localização e tela cheia. Montado dentro dos contêineres de canto do MapLibre, então se empilha com a escala, a legenda e o seletor de estilo; estilize-o com className. Deve ser usado dentro de ng-map.",
  "Corner of the map to place the controls in.":
    "Canto do mapa onde ficam os controles.",
  "Show zoom in/out buttons.":
    "Mostra os botões de aproximar/afastar.",
  "Show compass button (resets bearing).":
    "Mostra o botão de bússola (redefine o bearing).",
  "Show geolocate button.":
    "Mostra o botão de geolocalização.",
  "Show fullscreen toggle button.":
    "Mostra o botão de tela cheia.",
  "Label overrides (zoomIn, zoomOut, resetNorth, locate, fullscreen), merged over provideMapLabels() and the English defaults.":
    "Sobrescritas de rótulos (zoomIn, zoomOut, resetNorth, locate, fullscreen), mescladas sobre provideMapLabels() e os padrões em inglês.",
  "Extra space-separated classes added to the rendered .ng-controls element. Reactive; the built-in class is always kept.":
    "Classes extras, separadas por espaço, adicionadas ao elemento .ng-controls renderizado. Reativo; a classe embutida é sempre mantida.",
  "Emits the user position after a successful locate.":
    "Emite a posição do usuário depois de uma localização bem-sucedida.",
  "Emits when locating fails (denied, timeout) or when the browser has no geolocation.":
    "Emite quando a localização falha (negada, timeout) ou quando o navegador não tem geolocalização.",
  "A scale bar mounted as a MapLibre control in a corner of the map. It updates while the map moves or zooms, rounds to a 1/2/5 length and formats the value with Intl for the app locale. Must be used inside ng-map.":
    "Uma barra de escala montada como controle do MapLibre num canto do mapa. Atualiza enquanto o mapa se move ou muda de zoom, arredonda para um comprimento 1/2/5 e formata o valor com Intl no locale da aplicação. Deve ser usado dentro de ng-map.",
  "Unit system of the bar. 'both' draws a metric and an imperial bar.":
    "Sistema de unidades da barra. 'both' desenha uma barra métrica e uma imperial.",
  "Longest bar length in pixels.":
    "Comprimento máximo da barra em pixels.",
  "Corner of the map to place the scale in.":
    "Canto do mapa onde fica a escala.",
  "Label overrides (scale), merged over provideMapLabels() and the English defaults.":
    "Sobrescritas de rótulos (scale), mescladas sobre provideMapLabels() e os padrões em inglês.",
  "Extra space-separated classes added to the rendered .ng-scale element. Reactive; the built-in class is always kept.":
    "Classes extras, separadas por espaço, adicionadas ao elemento .ng-scale renderizado. Reativo; a classe embutida é sempre mantida.",
  "A legend card mounted as a MapLibre control. Describes data with category swatches and colour gradients; projected content renders below the sections. Must be used inside ng-map.":
    "Um card de legenda montado como controle do MapLibre. Descreve os dados com amostras de categoria e gradientes de cor; o conteúdo projetado aparece abaixo das seções. Deve ser usado dentro de ng-map.",
  "Legend sections: { type: 'categories', title?, entries: { color, label, shape?: 'circle' | 'square' | 'line' }[] } or { type: 'gradient', title?, stops: { color, value }[], format?: (value) => string }. Gradients always label the first and last stop; middle stops are hidden when they would overlap a neighbour.":
    "Seções da legenda: { type: 'categories', title?, entries: { color, label, shape?: 'circle' | 'square' | 'line' }[] } ou { type: 'gradient', title?, stops: { color, value }[], format?: (value) => string }. Gradientes sempre rotulam a primeira e a última parada; paradas do meio ficam ocultas quando sobreporiam uma vizinha.",
  "Heading of the legend; also its accessible name.":
    "Título da legenda; também é o seu nome acessível.",
  "Corner of the map to place the legend in.":
    "Canto do mapa onde fica a legenda.",
  "Shows a header button that hides the legend body; its accessible name is the heading followed by the show/hide label (e.g. \"Places, Hide legend\").":
    "Mostra um botão no cabeçalho que oculta o corpo da legenda; o nome acessível dele é o título seguido do rótulo de mostrar/ocultar (por exemplo \"Places, Hide legend\").",
  "Whether the body is hidden. A model(): supports two-way binding with [(collapsed)].":
    "Se o corpo está oculto. Um model(): aceita two-way binding com [(collapsed)].",
  "Label overrides (legend, showLegend, hideLegend), merged over provideMapLabels() and the English defaults.":
    "Sobrescritas de rótulos (legend, showLegend, hideLegend), mescladas sobre provideMapLabels() e os padrões em inglês.",
  "Extra space-separated classes added to the rendered .ng-legend element. Reactive; the built-in class is always kept.":
    "Classes extras, separadas por espaço, adicionadas ao elemento .ng-legend renderizado. Reativo; a classe embutida é sempre mantida.",
  "Emits when the legend is collapsed or expanded (the model output of collapsed).":
    "Emite quando a legenda é recolhida ou expandida (o output do model collapsed).",
  "A listbox in a map corner that switches the basemap between the given options. The selected option overrides provideMapStyles() and the map's [styles] for that map; with no value the map keeps its own style. Keep each option's styles object referentially stable: an inline object literal is a new style every render and re-runs setStyle. Must be used inside ng-map.":
    "Um listbox num canto do mapa que troca o basemap entre as opções dadas. A opção selecionada sobrescreve provideMapStyles() e o [styles] desse mapa; sem valor, o mapa mantém o próprio estilo. Mantenha o objeto styles de cada opção referencialmente estável: um objeto literal inline é um estilo novo a cada render e roda setStyle de novo. Deve ser usado dentro de ng-map.",
  "Choices: { id: string; label: string; styles: MapStylesConfig }. Keep the array and each styles object referentially stable (declare them once, not inline in the template).":
    "Opções: { id: string; label: string; styles: MapStylesConfig }. Mantenha o array e cada objeto styles referencialmente estáveis (declare-os uma vez, não inline no template).",
  "Id of the selected option. A model(): supports [(value)]. undefined leaves the map's own style untouched.":
    "Id da opção selecionada. Um model(): aceita [(value)]. undefined deixa o estilo do próprio mapa intacto.",
  "Corner of the map to place the switcher in.":
    "Canto do mapa onde fica o seletor.",
  "Label overrides (mapStyle), merged over provideMapLabels() and the English defaults.":
    "Sobrescritas de rótulos (mapStyle), mescladas sobre provideMapLabels() e os padrões em inglês.",
  "Extra space-separated classes added to the rendered .ng-style-switcher element. Reactive; the built-in class is always kept.":
    "Classes extras, separadas por espaço, adicionadas ao elemento .ng-style-switcher renderizado. Reativo; a classe embutida é sempre mantida.",
  "Emits the selected option id (the model output of value).":
    "Emite o id da opção selecionada (o output do model value).",
  "An overview map mounted as a MapLibre control in a corner of the map (stacks with the other controls). A second map follows the main viewport at a lower zoom, draws the main viewport footprint (correct with bearing and pitch) and is always mercator and north-up. Clicking recenters the main map (easeTo), dragging pans it, and arrow keys pan it 100 px while the minimap is focused. It mirrors the main map's effective basemap (theme and style switcher) unless styles or blank is set. Collapsing destroys the minimap instance and frees its WebGL context. Renders nothing on the server. The minimap shows no attribution: a custom styles override's attribution is the app's responsibility. Must be used inside ng-map.":
    "Um mapa de visão geral montado como controle do MapLibre num canto do mapa (se empilha com os outros controles). Um segundo mapa segue o viewport principal num zoom menor, desenha a área do viewport principal (correta com bearing e pitch) e é sempre mercator e com o norte para cima. Clicar recentraliza o mapa principal (easeTo), arrastar o desloca, e as setas o deslocam 100 px enquanto o minimapa tem o foco. Espelha o basemap efetivo do mapa principal (tema e seletor de estilo), a não ser que styles ou blank esteja definido. Recolher destrói a instância do minimapa e libera o contexto WebGL. Não renderiza nada no servidor. O minimapa não mostra atribuição: a atribuição de um styles personalizado é responsabilidade da aplicação. Deve ser usado dentro de ng-map.",
  "Corner of the map to place the minimap in.":
    "Canto do mapa onde fica o minimapa.",
  "Width of the map area, in pixels.":
    "Largura da área do mapa, em pixels.",
  "Height of the map area, in pixels.":
    "Altura da área do mapa, em pixels.",
  "The minimap zoom is max(main zoom - zoomOffset, 0).":
    "O zoom do minimapa é max(zoom principal - zoomOffset, 0).",
  "Own basemap, themed by the resolved theme. Wins over blank and over the main map's style.":
    "Basemap próprio, com o tema resolvido. Tem prioridade sobre blank e sobre o estilo do mapa principal.",
  "Uses the blank style; ignored when styles is set.":
    "Usa o estilo em branco; ignorado quando styles está definido.",
  "Whether the overview map is collapsed. A model(): supports two-way binding with [(collapsed)]. Collapsing destroys the minimap instance.":
    "Se o mapa de visão geral está recolhido. Um model(): aceita two-way binding com [(collapsed)]. Recolher destrói a instância do minimapa.",
  "Label overrides (minimap, showMinimap, hideMinimap), merged over provideMapLabels() and the English defaults.":
    "Sobrescritas de rótulos (minimap, showMinimap, hideMinimap), mescladas sobre provideMapLabels() e os padrões em inglês.",
  "Extra space-separated classes added to the rendered .ng-minimap element. Reactive; the built-in class is always kept.":
    "Classes extras, separadas por espaço, adicionadas ao elemento .ng-minimap renderizado. Reativo; a classe embutida é sempre mantida.",
  "Emits when the minimap is collapsed or expanded (the model output of collapsed).":
    "Emite quando o minimapa é recolhido ou expandido (o output do model collapsed).",
  "A container for marker-related components. Provides context for its children and handles marker positioning.":
    "Um contêiner para os componentes do marcador. Fornece contexto aos filhos e cuida do posicionamento do marcador.",
  "Longitude coordinate of the marker.":
    "Coordenada de longitude do marcador.",
  "Latitude coordinate of the marker.":
    "Coordenada de latitude do marcador.",
  "Allows the marker to be dragged.":
    "Permite arrastar o marcador.",
  "Pixel offset applied to the marker element.":
    "Deslocamento em pixels aplicado ao elemento do marcador.",
  "Rotation of the marker in degrees.":
    "Rotação do marcador em graus.",
  "Part of the marker element positioned at the coordinates.":
    "Parte do elemento do marcador posicionada nas coordenadas.",
  "How the marker rotates with the map.":
    "Como o marcador gira com o mapa.",
  "How the marker tilts with the map pitch.":
    "Como o marcador se inclina com o pitch do mapa.",
  "Accessible name of the marker (aria-label). Interactive markers whose content has no text fall back to labels.marker ('Map marker'); a static labelled marker gets role=\"img\".":
    "Nome acessível do marcador (aria-label). Marcadores interativos cujo conteúdo não tem texto usam labels.marker ('Map marker'); um marcador estático com rótulo recebe role=\"img\".",
  "Label overrides (marker), merged over provideMapLabels() and the English defaults.":
    "Sobrescritas de rótulos (marker), mescladas sobre provideMapLabels() e os padrões em inglês.",
  "Pixels a draggable marker moves per arrow key press.":
    "Pixels que um marcador arrastável se move a cada toque de seta.",
  "Pixels per arrow key press while Shift is held.":
    "Pixels por toque de seta com Shift pressionado.",
  "Emits when the marker is clicked, or when Enter or Space (on keyup) is pressed on the focused marker, also with ng-marker-popup. Give icon-only clickable markers their own ariaLabel. A marker with this handler becomes a role=button tab stop.":
    "Emite quando o marcador é clicado, ou quando Enter ou Espaço (no keyup) é pressionado no marcador em foco, também com ng-marker-popup. Dê um ariaLabel próprio a marcadores clicáveis só com ícone. Um marcador com esse handler vira uma parada de tab com role=button.",
  "Emits when the pointer enters the marker.":
    "Emite quando o ponteiro entra no marcador.",
  "Emits when the pointer leaves the marker.":
    "Emite quando o ponteiro sai do marcador.",
  "Emits when dragging starts.":
    "Emite quando o arraste começa.",
  "Emits continuously while dragging.":
    "Emite continuamente durante o arraste.",
  "Emits the final position after dragging.":
    "Emite a posição final depois do arraste.",
  "Renders the visual content of a marker via content projection. If left empty, a default blue dot is rendered; it follows conditional content (shown while nothing is projected). Must be used inside ng-map-marker.":
    "Renderiza o conteúdo visual de um marcador via projeção de conteúdo. Se ficar vazio, renderiza um ponto azul padrão; ele acompanha conteúdo condicional (aparece enquanto nada é projetado). Deve ser usado dentro de ng-map-marker.",
  "Extra space-separated classes added to the rendered .ng-marker-content element. Reactive; the built-in class is always kept.":
    "Classes extras, separadas por espaço, adicionadas ao elemento .ng-marker-content renderizado. Reativo; a classe embutida é sempre mantida.",
  "An always-visible text label above or below the marker. Must be used inside ng-marker-content.":
    "Um rótulo de texto sempre visível acima ou abaixo do marcador. Deve ser usado dentro de ng-marker-content.",
  "Side of the marker the label appears on.":
    "Lado do marcador em que o rótulo aparece.",
  "A popup attached to the marker that opens on click. Must be used inside ng-map-marker. Keyboard: the marker becomes a focusable role=button with aria-haspopup=dialog (unless you set them) and aria-expanded (true while its popup is open, whatever opened or closed it); while open, aria-controls names the popup card (.ng-popup-card, which gets a generated id). Enter/Space opens it, focus moves into the popup, and Escape closes it, stops propagation and returns focus to the marker. The card is a non-modal role=dialog (no aria-modal) named by aria-label: the popup's ariaLabel, else the marker's ariaLabel, else 'Map popup' (labels.popup). A marker whose content has its own button gets no role and no aria-expanded (that button is the keyboard target): mirror the state on it through a template reference, <ng-marker-popup #info> with aria-haspopup=\"dialog\" [attr.aria-expanded]=\"info.isOpen()\" [attr.aria-controls]=\"info.isOpen() ? info.cardId : null\" on the button. Public members: isOpen (Signal<boolean>, in sync with every open and close) and cardId (the id of the .ng-popup-card, in the DOM only while open).":
    "Um popup preso ao marcador que abre no clique. Deve ser usado dentro de ng-map-marker. Teclado: o marcador vira um role=button focável com aria-haspopup=dialog (a não ser que você os defina) e aria-expanded (true enquanto o popup está aberto, seja lá o que o abriu ou fechou); enquanto aberto, aria-controls aponta para o card do popup (.ng-popup-card, que recebe um id gerado). Enter/Espaço o abre, o foco vai para dentro do popup, e Escape o fecha, interrompe a propagação e devolve o foco ao marcador. O card é um role=dialog não modal (sem aria-modal) nomeado por aria-label: o ariaLabel do popup, senão o ariaLabel do marcador, senão 'Map popup' (labels.popup). Um marcador cujo conteúdo tem um botão próprio não recebe role nem aria-expanded (esse botão é o alvo do teclado): espelhe o estado nele por uma referência de template, <ng-marker-popup #info> com aria-haspopup=\"dialog\" [attr.aria-expanded]=\"info.isOpen()\" [attr.aria-controls]=\"info.isOpen() ? info.cardId : null\" no botão. Membros públicos: isOpen (Signal<boolean>, em sincronia com toda abertura e fechamento) e cardId (o id do .ng-popup-card, no DOM só enquanto aberto).",
  "Shows a close button in the popup.":
    "Mostra um botão de fechar no popup.",
  "Pixel offset from the marker. Reconciled live via setOffset; MapLibre's default when unset.":
    "Deslocamento em pixels a partir do marcador. Reconciliado ao vivo via setOffset; usa o padrão do MapLibre quando não definido.",
  "Which side of the marker the popup anchors to. Applied at creation only.":
    "Lado do marcador ao qual o popup se ancora. Aplicado só na criação.",
  "CSS max-width of the popup container. Reconciled live via setMaxWidth.":
    "max-width CSS do contêiner do popup. Reconciliado ao vivo via setMaxWidth.",
  "Closes the popup when the map is clicked. Applied at creation only.":
    "Fecha o popup quando o mapa é clicado. Aplicado só na criação.",
  "Accessible name of the card, a non-modal role=dialog (aria-label; reactive). Falls back to the marker's ariaLabel, then to 'Map popup' (labels.popup).":
    "Nome acessível do card, um role=dialog não modal (aria-label; reativo). Usa o ariaLabel do marcador e, na falta dele, 'Map popup' (labels.popup).",
  "Label overrides (closePopup, popup), merged over provideMapLabels() and the English defaults.":
    "Sobrescritas de rótulos (closePopup, popup), mescladas sobre provideMapLabels() e os padrões em inglês.",
  "Extra space-separated classes added to the rendered .ng-popup-card element. Reactive; the built-in class is always kept.":
    "Classes extras, separadas por espaço, adicionadas ao elemento .ng-popup-card renderizado. Reativo; a classe embutida é sempre mantida.",
  "Emits when the popup closes.":
    "Emite quando o popup fecha.",
  "A tooltip that appears on marker hover and keyboard focus (Escape or blur closes it; the marker becomes a tab stop). Must be used inside ng-map-marker.":
    "Um tooltip que aparece no hover e no foco de teclado do marcador (Escape ou blur o fecha; o marcador vira uma parada de tab). Deve ser usado dentro de ng-map-marker.",
  "Pixel distance between the marker and the tooltip.":
    "Distância em pixels entre o marcador e o tooltip.",
  "Which side of the coordinates the tooltip anchors to.":
    "Lado das coordenadas ao qual o tooltip se ancora.",
  "Extra space-separated classes added to the rendered .ng-tooltip-pill element. Reactive; the built-in class is always kept.":
    "Classes extras, separadas por espaço, adicionadas ao elemento .ng-tooltip-pill renderizado. Reativo; a classe embutida é sempre mantida.",
  "A standalone popup component that can be placed anywhere on the map without a marker. Must be used inside ng-map. Keyboard: focus moves into the popup when it opens, and Escape inside it closes it (stops propagation, so a host dialog stays open). The card is a non-modal role=dialog (no aria-modal) named by aria-label: ariaLabel, else 'Map popup' (labels.popup).":
    "Um componente de popup independente que pode ficar em qualquer lugar do mapa, sem marcador. Deve ser usado dentro de ng-map. Teclado: o foco vai para dentro do popup quando ele abre, e Escape dentro dele o fecha (interrompe a propagação, então um diálogo hospedeiro continua aberto). O card é um role=dialog não modal (sem aria-modal) nomeado por aria-label: ariaLabel, senão 'Map popup' (labels.popup).",
  "Longitude coordinate of the popup.":
    "Coordenada de longitude do popup.",
  "Latitude coordinate of the popup.":
    "Coordenada de latitude do popup.",
  "Pixel offset of the popup.":
    "Deslocamento em pixels do popup.",
  "CSS max-width of the popup container.":
    "max-width CSS do contêiner do popup.",
  "Closes the popup when the map is clicked. Applied at creation only. Set false for popups that follow the hover.":
    "Fecha o popup quando o mapa é clicado. Aplicado só na criação. Use false em popups que seguem o hover.",
  "Accessible name of the card, a non-modal role=dialog (aria-label; reactive). Falls back to 'Map popup' (labels.popup).":
    "Nome acessível do card, um role=dialog não modal (aria-label; reativo). Na falta dele, usa 'Map popup' (labels.popup).",
  "Extra space-separated classes added to the rendered .ng-popup-card element. Reactive; the built-in class is always kept. Pass ng-popup-passthrough to make the whole popup non-interactive (pointer-events: none), so a hover popup does not capture the cursor and close itself.":
    "Classes extras, separadas por espaço, adicionadas ao elemento .ng-popup-card renderizado. Reativo; a classe embutida é sempre mantida. Passe ng-popup-passthrough para deixar o popup inteiro não interativo (pointer-events: none), assim um popup de hover não captura o cursor e não se fecha sozinho.",
  "Whether the popup is shown. Two-way bindable with [(open)]: closing it writes false, setting true opens it again at the current position.":
    "Se o popup está visível. Aceita two-way binding com [(open)]: fechá-lo grava false, e definir true o abre de novo na posição atual.",
  "Emits when the popup closes, by the user or by setting open to false.":
    "Emite quando o popup fecha, pelo usuário ou por open ser definido como false.",
  "Emits the new open state (the [(open)] binding).":
    "Emite o novo estado de open (o binding [(open)]).",
  "Renders a line/route from the given coordinates. Must be used inside ng-map. Supports click and hover interactions, an active (highlighted) state and a covered-progress line via child ng-route-progress / ng-route-marker components.":
    "Renderiza uma linha/rota a partir das coordenadas dadas. Deve ser usado dentro de ng-map. Aceita interações de clique e hover, um estado ativo (destacado) e uma linha de progresso percorrido via os componentes filhos ng-route-progress / ng-route-marker.",
  "Array of [longitude, latitude] points forming the line.":
    "Array de pontos [longitude, latitude] que formam a linha.",
  "Optional stable id for the underlying source/layer.":
    "Id estável opcional para a source/camada subjacente.",
  "Line color.":
    "Cor da linha.",
  "Line width in pixels.":
    "Largura da linha em pixels.",
  "Line opacity.":
    "Opacidade da linha.",
  "Dash pattern, e.g. [2, 2].":
    "Padrão de tracejado, por exemplo [2, 2].",
  "Enables pointer events on the line.":
    "Habilita eventos de ponteiro na linha.",
  "Id of an existing layer to insert the route (and its progress line) below. Applied at creation only.":
    "Id de uma camada existente abaixo da qual inserir a rota (e a sua linha de progresso). Aplicado só na criação.",
  "Covered fraction of the route (0 to 1). Drawn by a child ng-route-progress and followed by ng-route-marker at=\"progress\".":
    "Fração percorrida da rota (0 a 1). Desenhada por um ng-route-progress filho e seguida por ng-route-marker at=\"progress\".",
  "Highlights the route: the active* inputs override the base paint while true.":
    "Destaca a rota: os inputs active* sobrescrevem o paint base enquanto for true.",
  "Line color while active. Falls back to color.":
    "Cor da linha enquanto ativa. Na falta dela, usa color.",
  "Line width while active. Falls back to width.":
    "Largura da linha enquanto ativa. Na falta dela, usa width.",
  "Line opacity while active. Falls back to opacity.":
    "Opacidade da linha enquanto ativa. Na falta dela, usa opacity.",
  "Dash pattern while active. Falls back to dashArray.":
    "Padrão de tracejado enquanto ativa. Na falta dele, usa dashArray.",
  "Emits when the route is clicked.":
    "Emite quando a rota é clicada.",
  "Emits when the pointer enters the route (the cursor becomes a pointer).":
    "Emite quando o ponteiro entra na rota (o cursor vira ponteiro).",
  "Emits when the pointer leaves the route.":
    "Emite quando o ponteiro sai da rota.",
  "Draws the covered part of the parent ng-map-route, as set by its progress input (computed by cumulative distance along the line). Use inside ng-map-route.":
    "Desenha a parte percorrida do ng-map-route pai, conforme o input progress dele (calculado pela distância acumulada ao longo da linha). Use dentro de ng-map-route.",
  "Color of the covered line.":
    "Cor da linha percorrida.",
  "Width of the covered line in pixels.":
    "Largura da linha percorrida em pixels.",
  "Opacity of the covered line.":
    "Opacidade da linha percorrida.",
  "Dash pattern of the covered line.":
    "Padrão de tracejado da linha percorrida.",
  "A marker placed along the parent ng-map-route. Project ng-marker-content (and label, popup, tooltip) into it. Created once and moved as progress or coordinates change.":
    "Um marcador posicionado ao longo do ng-map-route pai. Projete ng-marker-content (e label, popup, tooltip) nele. Criado uma vez e movido conforme o progresso ou as coordenadas mudam.",
  "Position on the route: its start, end, the current progress, or a fraction between 0 and 1 of the total distance.":
    "Posição na rota: o início, o fim, o progresso atual ou uma fração entre 0 e 1 da distância total.",
  "Animates the parent ng-map-route over time. While present it overrides the route's progress input, so ng-route-progress and ng-route-marker at=\"progress\" follow along. Control it through the playing/progress/speed bindings or the play(), pause(), toggle(), restart() and seek() methods on a template reference. The frame loop runs outside the Angular zone. Use inside ng-map-route.":
    "Anima o ng-map-route pai ao longo do tempo. Enquanto presente, sobrescreve o input progress da rota, então ng-route-progress e ng-route-marker at=\"progress\" acompanham. Controle-o pelos bindings playing/progress/speed ou pelos métodos play(), pause(), toggle(), restart() e seek() numa referência de template. O loop de frames roda fora da zona do Angular. Use dentro de ng-map-route.",
  "Whether the animation is running. A model(): supports [(playing)].":
    "Se a animação está rodando. Um model(): aceita [(playing)].",
  "Covered fraction of the route. The value applied to the route (and by seek()) is clamped to 0-1; the model keeps what you write. A model(): supports [(progress)].":
    "Fração percorrida da rota. O valor aplicado à rota (e por seek()) é limitado a 0-1; o model mantém o que você escreve. Um model(): aceita [(progress)].",
  "Playback rate multiplier. A model(): supports [(speed)].":
    "Multiplicador da velocidade de reprodução. Um model(): aceita [(speed)].",
  "Milliseconds a full pass takes at speed 1.":
    "Milissegundos que uma passada completa leva na velocidade 1.",
  "Wrap to the start instead of stopping at the end.":
    "Volta ao início em vez de parar no fim.",
  "Center the camera on the playback head every frame and on seek(). A user drag suspends following until play() or restart() (or follow is turned off and on); it waits while the map is moving.":
    "Centraliza a câmera na cabeça da reprodução a cada frame e no seek(). Um arraste do usuário suspende o acompanhamento até play() ou restart() (ou até follow ser desligado e ligado); ele espera enquanto o mapa está se movendo.",
  "Emits once when playback reaches the end (never when loop is on). Emitted inside the Angular zone.":
    "Emite uma vez quando a reprodução chega ao fim (nunca com loop ligado). Emitido dentro da zona do Angular.",
  "Emits the new playing state (the [(playing)] binding).":
    "Emite o novo estado de playing (o binding [(playing)]).",
  "Emits the new progress (the [(progress)] binding).":
    "Emite o novo progress (o binding [(progress)]).",
  "Emits the new speed (the [(speed)] binding).":
    "Emite a nova speed (o binding [(speed)]).",
  "Play/pause button, progress scrubber and speed selector for an ng-route-playback, mounted as a MapLibre control so it stacks with the other corner controls. Place it as a direct child of ng-map (not inside the route) and point for at the playback template reference.":
    "Botão de play/pause, barra de progresso e seletor de velocidade para um ng-route-playback, montado como controle do MapLibre para se empilhar com os outros controles de canto. Coloque-o como filho direto de ng-map (não dentro da rota) e aponte for para a referência de template do playback.",
  "The playback to drive, e.g. #pb on ng-route-playback.":
    "O playback a controlar, por exemplo #pb no ng-route-playback.",
  "Corner of the map to place the control in.":
    "Canto do mapa onde fica o controle.",
  "Speeds offered by the selector; the current speed is added when missing.":
    "Velocidades oferecidas pelo seletor; a velocidade atual é adicionada quando falta.",
  "Label overrides (play, pause, playbackProgress, playbackSpeed), merged over provideMapLabels() and the English defaults.":
    "Sobrescritas de rótulos (play, pause, playbackProgress, playbackSpeed), mescladas sobre provideMapLabels() e os padrões em inglês.",
  "Extra space-separated classes added to the rendered .ng-playback element. Reactive; the built-in class is always kept.":
    "Classes extras, separadas por espaço, adicionadas ao elemento .ng-playback renderizado. Reativo; a classe embutida é sempre mantida.",
  "Renders curved lines between coordinate pairs using quadratic Bézier interpolation, with longitude unwrapping across the antimeridian. Must be used inside ng-map.":
    "Renderiza linhas curvas entre pares de coordenadas com interpolação de Bézier quadrática, desfazendo o salto de longitude no antimeridiano. Deve ser usado dentro de ng-map.",
  "Arcs to draw: { id, from: [lng, lat], to: [lng, lat] }. Extra properties are exposed to paint expressions.":
    "Arcos a desenhar: { id, from: [lng, lat], to: [lng, lat] }. Propriedades extras ficam disponíveis para expressões de paint.",
  "How much the arc bends.":
    "Quanto o arco se curva.",
  "Number of interpolation points per arc.":
    "Número de pontos de interpolação por arco.",
  "MapLibre line paint properties.":
    "Propriedades de paint de linha do MapLibre.",
  "MapLibre line layout properties.":
    "Propriedades de layout de linha do MapLibre.",
  "Paint overrides applied to the hovered arc via feature-state.":
    "Sobrescritas de paint aplicadas ao arco sob o hover via feature-state.",
  "Enables pointer events (adds an invisible hit layer).":
    "Habilita eventos de ponteiro (adiciona uma camada de clique invisível).",
  "Insert the layer before this layer id.":
    "Insere a camada antes desse id de camada.",
  "Emits { arc, longitude, latitude, originalEvent } when an arc is clicked.":
    "Emite { arc, longitude, latitude, originalEvent } quando um arco é clicado.",
  "Emits on hover; null when the pointer leaves.":
    "Emite no hover; null quando o ponteiro sai.",
  "Renders GeoJSON polygons and lines with theme-aware monochrome defaults and declarative feature-state hover. Accepts a URL or an inline GeoJSON object. Generic over the feature properties: MapGeoJSONComponent<P>, with P inferred from data. Must be used inside ng-map.":
    "Renderiza polígonos e linhas GeoJSON com padrões monocromáticos que seguem o tema e hover declarativo por feature-state. Aceita uma URL ou um objeto GeoJSON inline. Genérico nas propriedades da feature: MapGeoJSONComponent<P>, com P inferido de data. Deve ser usado dentro de ng-map.",
  "GeoJSON object or URL string. P types the featureClick/featureHover payloads.":
    "Objeto GeoJSON ou string de URL. P tipa os payloads de featureClick/featureHover.",
  "Feature property used as feature id — required for hover feature-state.":
    "Propriedade da feature usada como id da feature — necessária para o feature-state de hover.",
  "Fill paint properties.":
    "Propriedades de paint do preenchimento.",
  "Outline paint properties.":
    "Propriedades de paint do contorno.",
  "Fill paint overrides applied to the hovered feature.":
    "Sobrescritas de paint do preenchimento aplicadas à feature sob o hover.",
  "Enables pointer events and hover tracking.":
    "Habilita eventos de ponteiro e o rastreamento de hover.",
  "Insert the layers before this layer id.":
    "Insere as camadas antes desse id de camada.",
  "Emits { feature, longitude, latitude, originalEvent } on click.":
    "Emite { feature, longitude, latitude, originalEvent } no clique.",
  "Renders clustered points with MapLibre GL native clustering. Automatically styles cluster circles by point count, zooms in on cluster click. Generic over the feature properties: MapClusterLayerComponent<P>, with P inferred from data. Must be used inside ng-map.":
    "Renderiza pontos agrupados com o clustering nativo do MapLibre GL. Estiliza automaticamente os círculos de cluster pela contagem de pontos e dá zoom ao clicar num cluster. Genérico nas propriedades da feature: MapClusterLayerComponent<P>, com P inferido de data. Deve ser usado dentro de ng-map.",
  "GeoJSON points (object or URL string). P types the pointClick payload.":
    "Pontos GeoJSON (objeto ou string de URL). P tipa o payload de pointClick.",
  "Optional stable id prefix for the source and layers: cluster-source-<id>, clusters-<id>, cluster-count-<id>, unclustered-point-<id>. Changing it re-creates them.":
    "Prefixo de id estável opcional para a source e as camadas: cluster-source-<id>, clusters-<id>, cluster-count-<id>, unclustered-point-<id>. Mudá-lo as recria.",
  "Insert the cluster layers before this layer id. Applied at creation only.":
    "Insere as camadas de cluster antes desse id de camada. Aplicado só na criação.",
  "Max zoom at which points are clustered.":
    "Zoom máximo em que os pontos são agrupados.",
  "Cluster radius in pixels.":
    "Raio do cluster em pixels.",
  "Circle colors for small/medium/large clusters. ng-mapcn defaults to green/yellow/red; mapcn uses ['#3b82f6', '#1d4ed8', '#1e3a8a'].":
    "Cores dos círculos para clusters pequenos/médios/grandes. O ng-mapcn usa verde/amarelo/vermelho por padrão; o mapcn usa ['#3b82f6', '#1d4ed8', '#1e3a8a'].",
  "Point-count thresholds between color tiers.":
    "Limites de contagem de pontos entre as faixas de cor.",
  "Color of unclustered points.":
    "Cor dos pontos não agrupados.",
  "Zooms into a cluster when it is clicked.":
    "Dá zoom num cluster quando ele é clicado.",
  "Emits { feature, coordinates } when an unclustered point is clicked.":
    "Emite { feature, coordinates } quando um ponto não agrupado é clicado.",
  "Emits { clusterId, coordinates, pointCount } when a cluster is clicked.":
    "Emite { clusterId, coordinates, pointCount } quando um cluster é clicado.",
  "Renders GeoJSON points as a MapLibre heatmap layer with a theme-aware default gradient. Generic over the feature properties: MapHeatmapComponent<P>, with P inferred from data. Must be used inside ng-map.":
    "Renderiza pontos GeoJSON como uma camada heatmap do MapLibre, com um gradiente padrão que segue o tema. Genérico nas propriedades da feature: MapHeatmapComponent<P>, com P inferido de data. Deve ser usado dentro de ng-map.",
  "GeoJSON points (object or URL string).":
    "Pontos GeoJSON (objeto ou string de URL).",
  "Optional stable id prefix for the source and layer: heatmap-source-<id>, heatmap-layer-<id>. Changing it re-creates them.":
    "Prefixo de id estável opcional para a source e a camada: heatmap-source-<id>, heatmap-layer-<id>. Mudá-lo as recria.",
  "Insert the layer before this layer id. Applied at creation only.":
    "Insere a camada antes desse id de camada. Aplicado só na criação.",
  "Numeric feature property used as the point weight. Without it every point weighs the same.":
    "Propriedade numérica da feature usada como peso do ponto. Sem ela, todos os pontos pesam o mesmo.",
  "[min, max] of weightProperty, mapped linearly to a weight of 0..1.":
    "[mín, máx] de weightProperty, mapeado linearmente para um peso de 0..1.",
  "Influence radius of each point in pixels. Accepts MapLibre expressions.":
    "Raio de influência de cada ponto em pixels. Aceita expressões do MapLibre.",
  "Global intensity multiplier. Accepts MapLibre expressions.":
    "Multiplicador global de intensidade. Aceita expressões do MapLibre.",
  "Layer opacity. Accepts MapLibre expressions.":
    "Opacidade da camada. Aceita expressões do MapLibre.",
  "Color stops [density 0..1, color]. Sorted, with a transparent stop at 0 prepended when missing. Defaults to defaultHeatmapGradients for the resolved theme.":
    "Paradas de cor [densidade 0..1, cor]. Ordenadas, com uma parada transparente em 0 adicionada no início quando falta. O padrão é defaultHeatmapGradients para o tema resolvido.",
  "Minimum zoom at which the heatmap is rendered.":
    "Zoom mínimo em que o mapa de calor é renderizado.",
  "Zoom from which the heatmap is no longer rendered (e.g. to hand over to a point layer).":
    "Zoom a partir do qual o mapa de calor deixa de ser renderizado (por exemplo, para passar a vez a uma camada de pontos).",
  "Escape hatch: heatmap paint properties merged last.":
    "Válvula de escape: propriedades de paint do heatmap mescladas por último.",
  "Icons and text labels for GeoJSON points as a MapLibre symbol layer (collision-aware). Images are registered from a URL or decoded pixels, shared by id between layers and survive theme switches; SDF and non-SDF images cannot be mixed in one layer. Generic over the feature properties: MapSymbolLayerComponent<P>, with P inferred from data. Must be used inside ng-map.":
    "Ícones e rótulos de texto para pontos GeoJSON como uma camada symbol do MapLibre (com detecção de colisão). As imagens são registradas a partir de uma URL ou de pixels decodificados, compartilhadas por id entre camadas e sobrevivem às trocas de tema; imagens SDF e não SDF não podem ser misturadas numa camada. Genérico nas propriedades da feature: MapSymbolLayerComponent<P>, com P inferido de data. Deve ser usado dentro de ng-map.",
  "Optional stable id prefix for the source and layer: symbol-source-<id>, symbol-layer-<id>. Changing it re-creates them.":
    "Prefixo de id estável opcional para a source e a camada: symbol-source-<id>, symbol-layer-<id>. Mudá-lo as recria.",
  "Images to register by id, referenced from icon. A MapSymbolImage is a URL (PNG, WebP or JPEG), { url, sdf?, pixelRatio? } or { data, sdf?, pixelRatio? } with decoded pixels. URLs are decoded once and re-added after a theme switch. Ids are shared per map: layers registering the same id use one image (the first to add it provides the pixels, so give different images different ids), removed when the last layer using it goes away; an id the style already has is never removed. SDF and non-SDF images cannot be mixed in one layer; use one layer per kind.":
    "Imagens a registrar por id, referenciadas a partir de icon. Uma MapSymbolImage é uma URL (PNG, WebP ou JPEG), { url, sdf?, pixelRatio? } ou { data, sdf?, pixelRatio? } com pixels decodificados. As URLs são decodificadas uma vez e readicionadas depois de uma troca de tema. Os ids são compartilhados por mapa: camadas que registram o mesmo id usam uma única imagem (a primeira a adicioná-la fornece os pixels, então dê ids diferentes a imagens diferentes), removida quando a última camada que a usa sai; um id que o estilo já tem nunca é removido. Imagens SDF e não SDF não podem ser misturadas numa camada; use uma camada por tipo.",
  "Image id, or an expression resolving to one ([\"get\", \"kind\"]).":
    "Id da imagem, ou uma expressão que resolve para um ([\"get\", \"kind\"]).",
  "Icon scale.":
    "Escala do ícone.",
  "Icon color. Only applies to SDF images ({ url, sdf: true }). SDF and non-SDF images cannot be mixed in one layer; use one layer per kind.":
    "Cor do ícone. Só se aplica a imagens SDF ({ url, sdf: true }). Imagens SDF e não SDF não podem ser misturadas numa camada; use uma camada por tipo.",
  "Label text: a {property} template, a plain string or an expression. Needs the style glyphs; ignored (with a console warning) on the blank style.":
    "Texto do rótulo: um template {property}, uma string simples ou uma expressão. Precisa dos glyphs do estilo; ignorado (com um aviso no console) no estilo em branco.",
  "Font stack for the labels. Defaults to the basemap's own, which its glyph server serves.":
    "Pilha de fontes dos rótulos. O padrão é a do próprio basemap, servida pelo servidor de glyphs dele.",
  "Label size in pixels.":
    "Tamanho do rótulo em pixels.",
  "Label color (#171717 light, #fafafa dark).":
    "Cor do rótulo (#171717 claro, #fafafa escuro).",
  "Label halo color (#ffffff light, #0a0a0a dark).":
    "Cor do halo do rótulo (#ffffff claro, #0a0a0a escuro).",
  "Label halo width in pixels.":
    "Largura do halo do rótulo em pixels.",
  "Which part of the label touches the anchor.":
    "Qual parte do rótulo encosta na âncora.",
  "Label offset in ems.":
    "Deslocamento do rótulo em ems.",
  "Draw icons and labels even when they collide (sets icon-allow-overlap and text-allow-overlap).":
    "Desenha ícones e rótulos mesmo quando colidem (define icon-allow-overlap e text-allow-overlap).",
  "Minimum zoom at which the layer is rendered.":
    "Zoom mínimo em que a camada é renderizada.",
  "Zoom from which the layer is no longer rendered.":
    "Zoom a partir do qual a camada deixa de ser renderizada.",
  "MapLibre filter expression, reconciled live.":
    "Expressão de filtro do MapLibre, reconciliada ao vivo.",
  "Escape hatch: layout properties merged last.":
    "Válvula de escape: propriedades de layout mescladas por último.",
  "Escape hatch: paint properties merged last.":
    "Válvula de escape: propriedades de paint mescladas por último.",
  "Whether features respond to mouse events.":
    "Se as features respondem a eventos de mouse.",
  "Emits { feature, longitude, latitude, originalEvent } when a symbol is clicked. Requires interactive.":
    "Emite { feature, longitude, latitude, originalEvent } quando um símbolo é clicado. Requer interactive.",
  "Emits the hovered symbol (again when the pointer moves to another one), and null when the pointer leaves. Requires interactive. Inline data without feature ids gets ids generated from the feature index (generateId); data with ids keeps them.":
    "Emite o símbolo sob o hover (de novo quando o ponteiro passa para outro) e null quando o ponteiro sai. Requer interactive. Dados inline sem ids de feature recebem ids gerados a partir do índice da feature (generateId); dados com ids os mantêm.",
  "Raster tile source (XYZ, TMS, WMS) plus the raster layer that draws it. Source and layer are re-added after a theme switch. Must be used inside ng-map.":
    "Source de tiles raster (XYZ, TMS, WMS) mais a camada raster que a desenha. Source e camada são readicionadas depois de uma troca de tema. Deve ser usado dentro de ng-map.",
  "MapLibre source id, used verbatim (other components reference it as source: id). The layer is raster-layer-<id>. Changing it re-creates both.":
    "Id da source no MapLibre, usado como está (outros componentes a referenciam como source: id). A camada é raster-layer-<id>. Mudá-lo recria as duas.",
  "Tile URL templates ({z}/{x}/{y}, {bbox-epsg-3857} for WMS). Updated in place with setTiles.":
    "Templates de URL de tile ({z}/{x}/{y}, {bbox-epsg-3857} para WMS). Atualizados no lugar com setTiles.",
  "TileJSON URL, instead of tiles (takes precedence). Updated in place with setUrl.":
    "URL de TileJSON, no lugar de tiles (tem precedência). Atualizada no lugar com setUrl.",
  "Tile size in pixels. Applied at creation.":
    "Tamanho do tile em pixels. Aplicado na criação.",
  "Minimum tile zoom. Applied at creation.":
    "Zoom mínimo dos tiles. Aplicado na criação.",
  "Maximum tile zoom. Applied at creation.":
    "Zoom máximo dos tiles. Aplicado na criação.",
  "Attribution for the map attribution control. Applied at creation.":
    "Atribuição para o controle de atribuição do mapa. Aplicado na criação.",
  "[west, south, east, north] limit of the tiles. Applied at creation.":
    "Limite [oeste, sul, leste, norte] dos tiles. Aplicado na criação.",
  "Tile addressing scheme. Applied at creation.":
    "Esquema de endereçamento dos tiles. Aplicado na criação.",
  "Raster layer opacity (raster-opacity).":
    "Opacidade da camada raster (raster-opacity).",
  "Whether the layer is drawn; the source stays loaded when hidden.":
    "Se a camada é desenhada; a source continua carregada quando oculta.",
  "Escape hatch: raster paint properties merged last.":
    "Válvula de escape: propriedades de paint raster mescladas por último.",
  "Vector tile source (MVT, TileJSON or pmtiles://). Adds the source only: draw it with layers that reference it by id and wait for it with MapContextService.hasSource(id). ng-mapcn does not depend on pmtiles; register the protocol yourself with maplibregl.addProtocol. When torn down or the style reloads it removes every layer still using the source, then the source: gate your layers on hasSource(id). tiles vs url mode is fixed at creation. Must be used inside ng-map.":
    "Source de tiles vetoriais (MVT, TileJSON ou pmtiles://). Adiciona só a source: desenhe-a com camadas que a referenciam pelo id e espere por ela com MapContextService.hasSource(id). O ng-mapcn não depende de pmtiles; registre o protocolo você mesmo com maplibregl.addProtocol. Quando é destruída ou o estilo recarrega, remove toda camada que ainda usa a source e depois a source: condicione suas camadas a hasSource(id). O modo tiles ou url é fixado na criação. Deve ser usado dentro de ng-map.",
  "MapLibre source id, used verbatim; layers reference it as source: id. Announced through MapContextService.hasSource(id) while it exists. Changing it re-creates the source.":
    "Id da source no MapLibre, usado como está; as camadas a referenciam como source: id. Anunciado por MapContextService.hasSource(id) enquanto existe. Mudá-lo recria a source.",
  "Tile URL templates. Updated in place with setTiles.":
    "Templates de URL de tile. Atualizados no lugar com setTiles.",
  "TileJSON URL or pmtiles://<archive url> (register the pmtiles protocol first), instead of tiles. Updated in place with setUrl.":
    "URL de TileJSON ou pmtiles://<url do arquivo> (registre o protocolo pmtiles antes), no lugar de tiles. Atualizada no lugar com setUrl.",
  "Feature property (or per source-layer map) used as the feature id, which enables feature-state on vector tiles. Applied at creation.":
    "Propriedade da feature (ou mapa por source-layer) usada como id da feature, o que habilita feature-state em tiles vetoriais. Aplicado na criação.",
  "Georeferenced image pinned to four corner coordinates, drawn as a raster layer. Must be used inside ng-map.":
    "Imagem georreferenciada presa a quatro coordenadas de canto, desenhada como camada raster. Deve ser usado dentro de ng-map.",
  "MapLibre image source id, used verbatim. The layer is image-layer-<id>. Changing it re-creates both.":
    "Id da source de imagem no MapLibre, usado como está. A camada é image-layer-<id>. Mudá-lo recria as duas.",
  "Image URL. Changing it calls updateImage on the live source.":
    "URL da imagem. Mudá-la chama updateImage na source ativa.",
  "Four [lng, lat] corners, clockwise from the top-left. Changing them calls setCoordinates.":
    "Quatro cantos [lng, lat], em sentido horário a partir do canto superior esquerdo. Mudá-los chama setCoordinates.",
  "Layer opacity (raster-opacity).":
    "Opacidade da camada (raster-opacity).",
  "Whether the layer is drawn.":
    "Se a camada é desenhada.",
  "Escape hatch: raster paint properties merged last (e.g. raster-fade-duration: 0 to avoid a flash on url change).":
    "Válvula de escape: propriedades de paint raster mescladas por último (por exemplo raster-fade-duration: 0 para evitar um flash ao trocar a url).",
  "3D extrusion of polygons (fill-extrusion layer), e.g. 3D buildings. Creates only the layer: the source is a basemap source or one added by a source component or the application, and the layer waits for it. Re-added after a theme switch. Must be used inside ng-map.":
    "Extrusão 3D de polígonos (camada fill-extrusion), por exemplo prédios em 3D. Cria só a camada: a source é uma source do basemap ou uma adicionada por um componente de source ou pela aplicação, e a camada espera por ela. Readicionada depois de uma troca de tema. Deve ser usado dentro de ng-map.",
  "Layer id prefix; the layer is fill-extrusion-layer-<id>. Changing it re-creates the layer.":
    "Prefixo do id da camada; a camada é fill-extrusion-layer-<id>. Mudá-lo recria a camada.",
  "Id of the source to extrude: a tile source component, an application source or a basemap source. Without it, the Carto basemap's building source is used ('protomaps', or 'carto' in the earlier styles). The layer is added once map.getSource(source) exists.":
    "Id da source a extrudar: um componente de source de tiles, uma source da aplicação ou uma source do basemap. Sem ele, usa a source de prédios do basemap do Carto ('protomaps', ou 'carto' nos estilos mais antigos). A camada é adicionada assim que map.getSource(source) existe.",
  "Layer of a vector source. Omit for GeoJSON sources.":
    "Camada de uma source vetorial. Omita para sources GeoJSON.",
  "Feature property with the height in meters.":
    "Propriedade da feature com a altura em metros.",
  "Feature property with the base height in meters.":
    "Propriedade da feature com a altura da base em metros.",
  "Fill color; defaults to a theme-aware gray (defaultExtrusionColors).":
    "Cor de preenchimento; o padrão é um cinza que segue o tema (defaultExtrusionColors).",
  "Layer opacity, 0..1.":
    "Opacidade da camada, 0..1.",
  "Minimum zoom at which the extrusion is drawn (the Carto tiles stop at 14).":
    "Zoom mínimo em que a extrusão é desenhada (os tiles do Carto param no 14).",
  "Zoom from which the extrusion is no longer drawn.":
    "Zoom a partir do qual a extrusão deixa de ser desenhada.",
  "MapLibre filter, updated with setFilter. null removes the default filter.":
    "Filtro do MapLibre, atualizado com setFilter. null remove o filtro padrão.",
  "Escape hatch: fill-extrusion paint properties merged last.":
    "Válvula de escape: propriedades de paint de fill-extrusion mescladas por último.",
  "3D terrain from a raster-dem source (map.setTerrain) with an optional hillshade layer. The terrain is style-level state: it is re-applied after a theme switch and disabled on teardown. One terrain per map. Must be used inside ng-map.":
    "Terreno 3D a partir de uma source raster-dem (map.setTerrain) com uma camada de hillshade opcional. O terreno é estado do estilo: é reaplicado depois de uma troca de tema e desligado no teardown. Um terreno por mapa. Deve ser usado dentro de ng-map.",
  "Id prefix: DEM source terrain-source-<id>, hillshade source terrain-hillshade-source-<id>, hillshade layer terrain-hillshade-<id>. Changing it re-creates all.":
    "Prefixo de id: source DEM terrain-source-<id>, source de hillshade terrain-hillshade-source-<id>, camada de hillshade terrain-hillshade-<id>. Mudá-lo recria tudo.",
  "Elevation tile URL templates. Applied at creation.":
    "Templates de URL dos tiles de elevação. Aplicado na criação.",
  "TileJSON URL, instead of tiles (takes precedence). Applied at creation.":
    "URL de TileJSON, no lugar de tiles (tem precedência). Aplicado na criação.",
  "Encoding of the elevation tiles. Applied at creation.":
    "Codificação dos tiles de elevação. Aplicado na criação.",
  "Minimum zoom of the elevation tiles. Applied at creation.":
    "Zoom mínimo dos tiles de elevação. Aplicado na criação.",
  "Maximum zoom of the elevation tiles. Applied at creation.":
    "Zoom máximo dos tiles de elevação. Aplicado na criação.",
  "How tall the terrain looks. Changing it calls setTerrain again.":
    "Quão alto o terreno parece. Mudá-lo chama setTerrain de novo.",
  "Draw a hillshade layer (with its own DEM source). Added and removed on toggle; the terrain is untouched.":
    "Desenha uma camada de hillshade (com a própria source DEM). Adicionada e removida ao alternar; o terreno não é afetado.",
  "Hillshade intensity, 0..1 (MapLibre default 0.5).":
    "Intensidade do hillshade, 0..1 (padrão do MapLibre 0.5).",
  "Hillshade color of the shaded slopes.":
    "Cor do hillshade nas encostas sombreadas.",
  "Hillshade color of the lit slopes.":
    "Cor do hillshade nas encostas iluminadas.",
  "Hillshade accent color for steep slopes.":
    "Cor de destaque do hillshade para encostas íngremes.",
  "Escape hatch: hillshade paint properties merged last.":
    "Válvula de escape: propriedades de paint do hillshade mescladas por último.",
  "Insert the hillshade layer before this layer id. Applied when the layer is created only.":
    "Insere a camada de hillshade antes desse id de camada. Aplicado só quando a camada é criada.",
  "Draws, selects and edits points, lines and polygons on terra-draw. Lives in the optional ng-mapcn/draw entry point (import { MapDrawComponent } from 'ng-mapcn/draw') and needs the terra-draw and terra-draw-maplibre-gl-adapter peer dependencies. A theme switch (setStyle) stops and restarts terra-draw with the same features and mode. Must be used inside ng-map.":
    "Desenha, seleciona e edita pontos, linhas e polígonos com o terra-draw. Fica no entry point opcional ng-mapcn/draw (import { MapDrawComponent } from 'ng-mapcn/draw') e precisa das peer dependencies terra-draw e terra-draw-maplibre-gl-adapter. Uma troca de tema (setStyle) para e reinicia o terra-draw com as mesmas features e o mesmo modo. Deve ser usado dentro de ng-map.",
  "Shapes the user can draw. Changing it restarts terra-draw with the same features and drops an unfinished shape.":
    "Formas que o usuário pode desenhar. Mudá-lo reinicia o terra-draw com as mesmas features e descarta uma forma inacabada.",
  "Active tool (two-way with [(mode)]). A mode that is not enabled falls back to 'static'.":
    "Ferramenta ativa (two-way com [(mode)]). Um modo que não está habilitado volta para 'static'.",
  "Drawn features as a GeoJSON FeatureCollection of Point, LineString and Polygon (two-way with [(features)]). Updates when a draw, edit or delete completes. Assigning a collection diffs by feature id; features keep their own ids (any non-empty string or finite number) and those without one get an id; unsupported geometries are dropped and reported through mapError.":
    "Features desenhadas como uma FeatureCollection GeoJSON de Point, LineString e Polygon (two-way com [(features)]). Atualiza quando um desenho, edição ou exclusão termina. Atribuir uma coleção faz o diff pelo id da feature; as features mantêm os próprios ids (qualquer string não vazia ou número finito) e as que não têm recebem um id; geometrias não suportadas são descartadas e reportadas por mapError.",
  "Enables the select mode: select, drag, reshape and delete features. Changing it restarts terra-draw and drops an unfinished shape.":
    "Habilita o modo select: selecionar, arrastar, remodelar e excluir features. Mudá-lo reinicia o terra-draw e descarta uma forma inacabada.",
  "Accent color of the drawn shapes (#rrggbb). Defaults to a theme-aware blue. Changing it restyles the modes in place (no restart).":
    "Cor de destaque das formas desenhadas (#rrggbb). O padrão é um azul que segue o tema. Mudá-la reestiliza os modos no lugar (sem reinício).",
  "Emits { feature, mode, action } when a new shape is completed.":
    "Emite { feature, mode, action } quando uma forma nova é concluída.",
  "Emits { feature, mode, action } when an existing feature is moved, reshaped or otherwise edited.":
    "Emite { feature, mode, action } quando uma feature existente é movida, remodelada ou editada de outra forma.",
  "Emits the selected Feature (select mode).":
    "Emite a Feature selecionada (modo select).",
  "Emits the id of the deselected feature.":
    "Emite o id da feature desmarcada.",
  "Runner-neutral fake of the maplibre-gl module, for unit tests only. It has no imports (it never imports ng-mapcn or a test runner), so it works with any runner that can swap an ES module: Vitest (vi.mock('maplibre-gl', () => import('ng-mapcn/testing/maplibre'))) and Jest (moduleNameMapper '^maplibre-gl$'; documented, not tested by ng-mapcn). Karma/Jasmine are not supported. The fake records every call, fires events on demand and attaches markers, popups and controls to the map container DOM. Stable API: fakeRegistry, the getters and the test-only helpers (fire, listenerCount, finishStyleLoad, ...). The raw calls log is for debugging: its strings may change in any release.":
    "Fake do módulo maplibre-gl, neutro quanto ao runner, só para testes unitários. Não tem imports (nunca importa ng-mapcn nem um runner de testes), então funciona com qualquer runner capaz de trocar um módulo ES: Vitest (vi.mock('maplibre-gl', () => import('ng-mapcn/testing/maplibre'))) e Jest (moduleNameMapper '^maplibre-gl$'; documentado, não testado pelo ng-mapcn). Karma/Jasmine não são suportados. O fake registra toda chamada, dispara eventos sob demanda e anexa marcadores, popups e controles ao DOM do contêiner do mapa. API estável: fakeRegistry, os getters e os helpers só de teste (fire, listenerCount, finishStyleLoad, ...). O log cru calls é para depuração: as strings dele podem mudar em qualquer release.",
  "Fake of maplibre-gl Map. Getters (getLayer, getSource, getCenter, getZoom, getLayerOrder, hasImage, getTerrain, ...), spied methods (jumpTo, setStyle, setData, ...) and test-only helpers: fire(event, payload?, layerId?), listenerCount(event, layerId?), setMoving(value), hasPendingStyle(), finishStyleLoad(), finishStyleLoadWithoutChanges(), failStyleLoad(error?). calls is an unstable debugging log.":
    "Fake do Map do maplibre-gl. Getters (getLayer, getSource, getCenter, getZoom, getLayerOrder, hasImage, getTerrain, ...), métodos espionados (jumpTo, setStyle, setData, ...) e helpers só de teste: fire(event, payload?, layerId?), listenerCount(event, layerId?), setMoving(value), hasPendingStyle(), finishStyleLoad(), finishStyleLoadWithoutChanges(), failStyleLoad(error?). calls é um log de depuração instável.",
  "Fake of maplibre-gl Marker. Its element is attached to the map container. Like MapLibre, a click or Enter/Space on the element toggles its popup, and remove() closes the open popup (firing its close event).":
    "Fake do Marker do maplibre-gl. O elemento dele é anexado ao contêiner do mapa. Como no MapLibre, um clique ou Enter/Espaço no elemento alterna o popup, e remove() fecha o popup aberto (disparando o evento close dele).",
  "Fake of maplibre-gl Popup. Its element is attached to the map container while open. Like MapLibre, a map click (fire('click'), fireMapEvent(map, 'click')) closes it unless it was created with closeOnClick: false (default true; ng-map-popup keeps the default, ng-marker-popup defaults to false). A spec that fires map clicks with a popup open binds [closeOnClick]=\"false\".":
    "Fake do Popup do maplibre-gl. O elemento dele fica anexado ao contêiner do mapa enquanto aberto. Como no MapLibre, um clique no mapa (fire('click'), fireMapEvent(map, 'click')) o fecha, a não ser que tenha sido criado com closeOnClick: false (padrão true; o ng-map-popup mantém o padrão, o ng-marker-popup usa false por padrão). Um spec que dispara cliques no mapa com um popup aberto usa [closeOnClick]=\"false\".",
  "Fake of maplibre-gl Point (x, y, Point.convert()).":
    "Fake do Point do maplibre-gl (x, y, Point.convert()).",
  "Fake of the global worker URL. Starts as an empty string, like the real one.":
    "Fake da URL global do worker. Começa como string vazia, como a real.",
  "Fake of the protocol registry. Registered protocols are listed in fakeRegistry.protocols.":
    "Fake do registro de protocolos. Os protocolos registrados ficam listados em fakeRegistry.protocols.",
  "Every map, marker and popup created since the last reset(). Call fakeRegistry.reset() in beforeEach. Stable API.":
    "Todo mapa, marcador e popup criado desde o último reset(). Chame fakeRegistry.reset() no beforeEach. API estável.",
  "Types of the fake Map, Marker and Popup instances.":
    "Tipos das instâncias fake de Map, Marker e Popup.",
  "Call once in the test setup. spy wraps the fake's spied methods: Vitest passes vi.fn, Jest passes jest.fn. Defaults to the identity, so the fake runs without a runner. Applies to instances created after the call; fakeRegistry.reset() does not undo it.":
    "Chame uma vez no setup dos testes. spy envolve os métodos espionados do fake: o Vitest passa vi.fn, o Jest passa jest.fn. O padrão é a identidade, então o fake roda sem runner. Vale para instâncias criadas depois da chamada; fakeRegistry.reset() não a desfaz.",
  "Helpers that render a template with <ng-map> and drive the fake from ng-mapcn/testing/maplibre, which the test setup must install in place of maplibre-gl. Never import it from application code. It needs no @angular/cdk. Stable API: these functions, fakeRegistry, the fake's getters and structuralCalls(). The fake's raw calls strings are not stable: assert through structuralCalls() or the getters. Change host values after rendering through update() or signals passed in hostProps: in zoneless apps (the Angular default; test setups without zone.js) assigning fixture.componentInstance.x directly needs fixture.changeDetectorRef.markForCheck(), as in any zoneless Angular test. Call renderMap() once per test (a second call throws 'TestBed already instantiated'); put several maps in one template.":
    "Helpers que renderizam um template com <ng-map> e controlam o fake de ng-mapcn/testing/maplibre, que o setup dos testes precisa instalar no lugar de maplibre-gl. Nunca importe a partir do código da aplicação. Não precisa de @angular/cdk. API estável: estas funções, fakeRegistry, os getters do fake e structuralCalls(). As strings cruas de calls do fake não são estáveis: verifique por structuralCalls() ou pelos getters. Mude os valores do host depois de renderizar por update() ou por signals passados em hostProps: em apps zoneless (o padrão do Angular; setups de teste sem zone.js) atribuir fixture.componentInstance.x diretamente precisa de fixture.changeDetectorRef.markForCheck(), como em qualquer teste Angular zoneless. Chame renderMap() uma vez por teste (uma segunda chamada lança 'TestBed already instantiated'); coloque vários mapas num template só.",
  "Renders template in a standalone host that imports MapComponent, then runs change detection until the map exists. Options: imports, providers (environment providers such as provideZonelessChangeDetection() too), hostProps (assigned before the first change detection) and size (default 400x300, null for zero). Returns { fixture, map, ctx }. Once per test. The map is not loaded yet: call loadMap(). Patches the layout getters: call resetMapTesting() in afterEach.":
    "Renderiza template num host standalone que importa MapComponent e roda a detecção de mudanças até o mapa existir. Opções: imports, providers (inclusive environment providers como provideZonelessChangeDetection()), hostProps (atribuídas antes da primeira detecção de mudanças) e size (padrão 400x300, null para zero). Retorna { fixture, map, ctx }. Uma vez por teste. O mapa ainda não está carregado: chame loadMap(). Altera os getters de layout: chame resetMapTesting() no afterEach.",
  "Fires load and styledata, waits out the 100 ms style debounce (with configureMapTesting({ advanceTimers }) or a real timer), then runs change detection so layer components add their sources and layers. Throws a clear error when fake timers are installed without advanceTimers, instead of hanging.":
    "Dispara load e styledata, espera o debounce de estilo de 100 ms (com configureMapTesting({ advanceTimers }) ou um timer real) e roda a detecção de mudanças para que os componentes de camada adicionem suas sources e camadas. Lança um erro claro quando fake timers estão instalados sem advanceTimers, em vez de travar.",
  "Simulates the style requested by setStyle (a theme or styles change) arriving: every source and layer is dropped, style.load and styledata fire, then the components re-add everything. Without a pending setStyle it only fires styledata. Throws like loadMap() on fake timers without advanceTimers.":
    "Simula a chegada do estilo pedido por setStyle (uma mudança de tema ou de styles): toda source e camada é descartada, style.load e styledata disparam e os componentes readicionam tudo. Sem um setStyle pendente, só dispara styledata. Lança erro como loadMap() com fake timers sem advanceTimers.",
  "Assigns host properties, marks the host for check and runs change detection, so it works with and without zone.js.":
    "Atribui propriedades do host, marca o host para checagem e roda a detecção de mudanças, então funciona com e sem zone.js.",
  "The fake map of the first <ng-map>. Throws if it has not created its map (zero container size or an error).":
    "O mapa fake do primeiro <ng-map>. Lança erro se ele não criou o mapa (contêiner de tamanho zero ou um erro).",
  "Fires a map event, like MapLibre would. With a layer id it reaches handlers registered with map.on(event, layerId, handler). Run change detection afterwards if the handlers update the view.":
    "Dispara um evento do mapa, como o MapLibre faria. Com um id de camada, chega aos handlers registrados com map.on(event, layerId, handler). Rode a detecção de mudanças depois se os handlers atualizam a view.",
  "The source and layer operations recorded on the map, in order, as 'addSource:<id>', 'addLayer:<id>', 'removeLayer:<id>' and 'removeSource:<id>'. Stable format.":
    "As operações de source e camada registradas no mapa, em ordem, como 'addSource:<id>', 'addLayer:<id>', 'removeLayer:<id>' e 'removeSource:<id>'. Formato estável.",
  "Sets the container size the map sees (jsdom has no layout). renderMap() patches offsetWidth and offsetHeight to read it live, so it can change after rendering. null means zero size.":
    "Define o tamanho de contêiner que o mapa vê (o jsdom não tem layout). renderMap() altera offsetWidth e offsetHeight para lê-lo ao vivo, então ele pode mudar depois de renderizar. null significa tamanho zero.",
  "advanceTimers advances the runner fake clock by ms; loadMap() and reloadStyle() use it to wait out the style debounce. Vitest: (ms) => vi.advanceTimersByTime(ms). Set it only while fake timers are installed and reset it to null afterwards. Without it the helpers wait on a real timer, and throw if fake timers are installed: @sinonjs/fake-timers (Vitest, Jest) by its tag, any other library because setTimeout is no longer the one in place when ng-mapcn/testing was imported (zone.js patching does not count), confirmed with a 0 ms probe so a spy or wrapper that still runs on real time is not reported. Without zone.js, an untagged library installed before the import cannot be detected.":
    "advanceTimers avança o relógio fake do runner em ms; loadMap() e reloadStyle() o usam para esperar o debounce de estilo. Vitest: (ms) => vi.advanceTimersByTime(ms). Defina-o só enquanto fake timers estão instalados e volte-o para null depois. Sem ele, os helpers esperam num timer real e lançam erro se fake timers estiverem instalados: @sinonjs/fake-timers (Vitest, Jest) pela tag, qualquer outra biblioteca porque o setTimeout já não é o mesmo de quando ng-mapcn/testing foi importado (o patch do zone.js não conta), confirmado com uma sonda de 0 ms para que um spy ou wrapper que ainda roda em tempo real não seja reportado. Sem zone.js, uma biblioteca sem tag instalada antes do import não pode ser detectada.",
  "Restores the HTMLElement offset getters and clears fakeRegistry. Call it in afterEach.":
    "Restaura os getters de offset de HTMLElement e limpa o fakeRegistry. Chame-o no afterEach.",
  "The stable DOM contract of a rendered map, as CSS selectors: 'ng-map', '.ng-map-loader', '.maplibregl-marker', '.maplibregl-popup' (an open popup or tooltip), '.ng-popup-card' (the role=dialog card), '.ng-tooltip-pill', '.ng-popup-close', '.ng-controls', '.ng-control-group'. The same with the fake and the real MapLibre (the repository's e2e suite checks it in Chromium), so reuse it in Playwright or Cypress tests. The harnesses are built on it. It lives here, not in ng-mapcn/testing/harness, so it needs no @angular/cdk. A selector changes only in a major release. Type of its keys: MapTestSelector.":
    "O contrato de DOM estável de um mapa renderizado, como seletores CSS: 'ng-map', '.ng-map-loader', '.maplibregl-marker', '.maplibregl-popup' (um popup ou tooltip aberto), '.ng-popup-card' (o card role=dialog), '.ng-tooltip-pill', '.ng-popup-close', '.ng-controls', '.ng-control-group'. É o mesmo com o fake e com o MapLibre real (a suíte e2e do repositório o verifica no Chromium), então reutilize-o em testes com Playwright ou Cypress. Os harnesses são construídos sobre ele. Fica aqui, e não em ng-mapcn/testing/harness, para não precisar de @angular/cdk. Um seletor só muda numa versão major. Tipo das chaves: MapTestSelector.",
  "Angular CDK component harnesses for <ng-map>, its markers, popups and controls. They read and drive the DOM only and run in a TestBed on top of the fake; the repository's e2e suite checks the same DOM contract (MAP_TEST_SELECTORS from ng-mapcn/testing, which they use, and the marker ARIA state) against real MapLibre in Chromium. This is a separate entry point because it imports @angular/cdk/testing, an optional peer dependency of ng-mapcn: install @angular/cdk to use it. Every harness has a static with(filters) predicate. NgMapControlsHarness uses CSS :has(). Button labels are translatable, so NgMapControlsHarness finds its buttons by structure, not by aria-label.":
    "Component harnesses do Angular CDK para <ng-map>, seus marcadores, popups e controles. Eles só leem e controlam o DOM e rodam num TestBed sobre o fake; a suíte e2e do repositório verifica o mesmo contrato de DOM (MAP_TEST_SELECTORS de ng-mapcn/testing, que eles usam, e o estado ARIA do marcador) com o MapLibre real no Chromium. É um entry point separado porque importa @angular/cdk/testing, uma peer dependency opcional do ng-mapcn: instale @angular/cdk para usá-lo. Todo harness tem um predicado estático with(filters). O NgMapControlsHarness usa o :has() do CSS. Os rótulos dos botões são traduzíveis, então o NgMapControlsHarness encontra os botões pela estrutura, não pelo aria-label.",
  "isLoading() (loader overlay shown), getMarkers(filter?), getPopups(filter?), getControls(filter?). Markers, popups and controls are rendered inside the map container, so they are found from here.":
    "isLoading() (sobreposição de carregamento visível), getMarkers(filter?), getPopups(filter?), getControls(filter?). Marcadores, popups e controles são renderizados dentro do contêiner do mapa, então são encontrados a partir daqui.",
  "getText(), getAriaLabel(), click(), hover(), mouseAway(), focus(), pressEnter(), hasPopup(), isPopupOpen(). Filters: { text, label }. hasPopup() is true when the marker has an ng-marker-popup (aria-haspopup); isPopupOpen() when this marker's own popup is open (aria-expanded), whatever other popups are open. For a marker whose content has its own button or link (no aria-expanded on the marker), isPopupOpen() reads the aria-expanded of the first such control, which the app mirrors with [attr.aria-expanded]=\"info.isOpen()\" (<ng-marker-popup #info>); it throws when that control has none: use NgMapHarness.getPopups().":
    "getText(), getAriaLabel(), click(), hover(), mouseAway(), focus(), pressEnter(), hasPopup(), isPopupOpen(). Filtros: { text, label }. hasPopup() é true quando o marcador tem um ng-marker-popup (aria-haspopup); isPopupOpen() quando o popup do próprio marcador está aberto (aria-expanded), sejam quais forem os outros popups abertos. Para um marcador cujo conteúdo tem um botão ou link próprio (sem aria-expanded no marcador), isPopupOpen() lê o aria-expanded do primeiro desses controles, que a aplicação espelha com [attr.aria-expanded]=\"info.isOpen()\" (<ng-marker-popup #info>); lança erro quando esse controle não tem um: use NgMapHarness.getPopups().",
  "getText(), isTooltip(), hasCloseButton(), close() (throws without a close button), pressEscape() (throws for a tooltip). Filter: { text }. A closed popup is not in the DOM, so it is not found.":
    "getText(), isTooltip(), hasCloseButton(), close() (lança erro sem botão de fechar), pressEscape() (lança erro para um tooltip). Filtro: { text }. Um popup fechado não está no DOM, então não é encontrado.",
  "zoomIn(), zoomOut(), resetNorth(), locate(), isLocating(), toggleFullscreen(), isFullscreen(). Each action throws when its button is hidden (showZoom, showCompass, showLocate, showFullscreen).":
    "zoomIn(), zoomOut(), resetNorth(), locate(), isLocating(), toggleFullscreen(), isFullscreen(). Cada ação lança erro quando o botão dela está oculto (showZoom, showCompass, showLocate, showFullscreen).",
};
