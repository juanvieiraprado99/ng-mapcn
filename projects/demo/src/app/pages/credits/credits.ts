import { ChangeDetectionStrategy, Component } from '@angular/core';

import { FooterComponent } from '@/layout/footer';
import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { cardVariants } from '@/shared/components/card';
import { PageHeaderImports } from '@/shared/page-header';

interface Credit {
  readonly name: string;
  readonly role: string;
  readonly description: string;
  readonly url: string;
  readonly docsUrl?: string;
}

@Component({
  selector: 'app-credits',
  standalone: true,
  imports: [ZardBadgeComponent, ZardButtonComponent, PageHeaderImports, FooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header align="left" size="sm">
      <app-page-header-heading>Credits</app-page-header-heading>
      <app-page-header-description>
        ng-mapcn stands on the shoulders of these projects.
      </app-page-header-description>
    </app-page-header>

    <section class="animate-fade-up animate-stagger container max-w-6xl" style="--stagger: 3.5">
      <div class="grid gap-5 sm:grid-cols-2">
        @for (credit of credits; track credit.name) {
          <div [class]="card">
            <div class="flex h-full flex-col gap-3 px-4">
              <div class="flex items-center gap-2">
                <span class="font-semibold">{{ credit.name }}</span>
                <z-badge zType="secondary">{{ credit.role }}</z-badge>
              </div>
              <p class="text-muted-foreground flex-1 text-sm leading-relaxed">
                {{ credit.description }}
              </p>
              <div class="flex items-center gap-2 pt-1">
                <a
                  z-button
                  zType="outline"
                  zSize="sm"
                  [href]="credit.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  >Visit site</a
                >
                @if (credit.docsUrl) {
                  <a
                    z-button
                    zType="ghost"
                    zSize="sm"
                    [href]="credit.docsUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    >Docs</a
                  >
                }
              </div>
            </div>
          </div>
        }
      </div>
    </section>

    <app-footer />
  `,
})
export class CreditsComponent {
  protected readonly card = cardVariants();

  readonly credits: readonly Credit[] = [
    {
      name: 'mapcn',
      role: 'Inspiration',
      description:
        'The React + MapLibre GL library ng-mapcn is an Angular port of. Its composable API and shadcn-style copy-paste distribution are the blueprint for this library.',
      url: 'https://www.mapcn.dev',
      docsUrl: 'https://www.mapcn.dev/docs',
    },
    {
      name: 'Zard UI',
      role: 'UI kit',
      description:
        'Angular component library used to build this demo and documentation site — buttons, cards, badges, tables and tabs are all Zard components.',
      url: 'https://zardui.com',
      docsUrl: 'https://zardui.com/docs/installation',
    },
    {
      name: 'MapLibre GL JS',
      role: 'Engine',
      description:
        'The open-source rendering engine every ng-mapcn component drives under the hood.',
      url: 'https://maplibre.org',
    },
    {
      name: 'Carto',
      role: 'Basemaps',
      description: 'The free light and dark basemaps used by default — no API key required.',
      url: 'https://carto.com',
    },
  ];
}
