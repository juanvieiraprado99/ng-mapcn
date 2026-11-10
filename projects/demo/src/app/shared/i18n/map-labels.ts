import { computed, inject, type Signal } from '@angular/core';
import type { MapLabels } from 'ng-mapcn';

import { LanguageService } from './language.service';

/** pt-BR text of every label ng-mapcn renders (buttons, aria names, loader). */
export const PT_MAP_LABELS: MapLabels = {
  zoomIn: 'Aproximar',
  zoomOut: 'Afastar',
  resetNorth: 'Apontar para o norte',
  locate: 'Minha localização',
  fullscreen: 'Alternar tela cheia',
  loading: 'Carregando mapa',
  closePopup: 'Fechar popup',
  popup: 'Popup do mapa',
  marker: 'Marcador do mapa',
  scale: 'Escala do mapa',
  legend: 'Legenda do mapa',
  showLegend: 'Mostrar legenda',
  hideLegend: 'Ocultar legenda',
  mapStyle: 'Estilo do mapa',
  play: 'Reproduzir',
  pause: 'Pausar',
  playbackProgress: 'Progresso da reprodução',
  playbackSpeed: 'Velocidade da reprodução',
  minimap: 'Mapa de visão geral',
  showMinimap: 'Mostrar mapa de visão geral',
  hideMinimap: 'Ocultar mapa de visão geral',
};

/**
 * `provideMapLabels(siteMapLabels)`: every map on the site follows the language toggle.
 * English keeps the library defaults (`undefined`).
 */
export function siteMapLabels(): Signal<Partial<MapLabels> | undefined> {
  const i18n = inject(LanguageService);
  return computed(() => (i18n.isPt() ? PT_MAP_LABELS : undefined));
}
