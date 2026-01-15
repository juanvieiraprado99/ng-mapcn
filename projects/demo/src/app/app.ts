import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeService } from 'ng-mapcn';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = 'ng-mapcn Demo';
  private readonly themeService = inject(ThemeService);

  // Expose theme signal for template
  readonly currentTheme = this.themeService.theme;

  readonly examples = [
    { path: '/basic', label: 'Basic Map', description: 'Mapa básico com controles de zoom' },
    { path: '/markers', label: 'Markers', description: 'Mapa com marcadores' },
    { path: '/routes', label: 'Routes', description: 'Mapa com rotas/paths' },
    {
      path: '/routes-planning',
      label: 'Routes Planning',
      description: 'Mapa com rotas/paths com tempo de percurso e distância',
    },
    { path: '/controls', label: 'All Controls', description: 'Mapa com todos os controles' },
    { path: '/dark-theme', label: 'Dark Theme', description: 'Mapa com tema escuro' },
    { path: '/custom-style', label: 'Custom Style', description: 'Mapa com estilo customizado' },
    { path: '/flyto-globe', label: 'Fly To Globe', description: 'Mapa em modo globo com Fly To para Mairinque, SP' },
    { path: '/tooltips', label: 'Tooltips', description: 'Mapa demonstrando tooltips customizados em markers' },
    { path: '/flyto-markers', label: 'Fly To Markers', description: 'Clique em markers para fazer fly to até sua localização' },
  ];

  /**
   * Toggle between light and dark theme
   */
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
