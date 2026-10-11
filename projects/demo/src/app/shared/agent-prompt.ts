import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideCopy } from '@ng-icons/lucide';

import { ZardButtonComponent } from '@/shared/components/button';
import { SITE_URL } from '@/shared/seo/site';

/** Prompt an AI coding agent can follow to install ng-mapcn (mapcn `mapInstallAgentPrompt`). */
export const MAP_INSTALL_AGENT_PROMPT = `Read the ng-mapcn agent instructions at ${SITE_URL}/llms.txt, then install ng-mapcn in this Angular project. Run ng add ng-mapcn, which copies the map components into the app, installs maplibre-gl and registers its CSS. Then add a basic example that imports MapComponent and MapControlsComponent and renders <ng-map> with <ng-map-controls /> inside a sized container. Use the default tiled basemap for maps that need streets, labels, or geographic context. If the user wants a blank/data-only map, such as countries or country borders, use <ng-map [blank]="true"> with <ng-map-geojson> and either a user-provided GeoJSON URL/object or a world countries GeoJSON source. Preserve the existing Tailwind CSS setup. If ng add fails, install it as a package instead with npm install ng-mapcn maplibre-gl and follow ${SITE_URL}/llms-full.txt.`;

/** mapcn `AgentPrompt`: copies an install prompt for coding agents. */
@Component({
  selector: 'app-agent-prompt',
  standalone: true,
  imports: [NgIcon, ZardButtonComponent],
  viewProviders: [provideIcons({ lucideCheck, lucideCopy })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      z-button
      zType="ghost"
      zSize="xs"
      type="button"
      aria-live="polite"
      class="text-muted-foreground hover:text-foreground h-7 px-2.5!"
      (click)="copy()"
    >
      <ng-icon [name]="copied() ? 'lucideCheck' : 'lucideCopy'" size="12" />
      {{ copied() ? 'Copied — paste into your agent' : 'Copy prompt for your agent' }}
    </button>
  `,
})
export class AgentPromptComponent {
  protected readonly copied = signal(false);

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(MAP_INSTALL_AGENT_PROMPT);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2500);
    } catch (error) {
      console.error('Failed to copy prompt:', error);
    }
  }
}
