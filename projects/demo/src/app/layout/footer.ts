import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { GITHUB_URL } from '@/shared/site-navigation';

import { LogoComponent } from './logo';

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

/** mapcn `Footer` (rendered by the pages that show it, like mapcn's home). */
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, LogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <footer class="bg-muted/30 mt-24 border-t md:mt-40">
      <div class="container py-12 md:py-16">
        <div class="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div class="col-span-2 md:col-span-2">
            <app-logo class="w-fit" />
            <p class="text-muted-foreground mt-2 max-w-xs text-sm leading-relaxed">
              Free &amp; open-source, ready-to-use, customizable map components for Angular. An
              Angular port of
              <a
                href="https://mapcn.dev"
                target="_blank"
                rel="noopener noreferrer"
                class="hover:text-foreground underline underline-offset-4 transition-colors"
                >mapcn</a
              >.
            </p>
            <div class="mt-4 flex items-center gap-4">
              <a
                [href]="githubUrl"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                class="text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg viewBox="0 0 1024 1024" fill="currentColor" class="size-4" aria-hidden="true">
                  <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z"
                    transform="scale(64)"
                  />
                </svg>
              </a>
            </div>
          </div>

          @for (column of columns; track column.title) {
            <div>
              <h3 class="mb-3 text-sm font-semibold">{{ column.title }}</h3>
              <ul class="space-y-2.5">
                @for (link of column.links; track link.href) {
                  <li>
                    @if (link.external) {
                      <a
                        [href]="link.href"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-muted-foreground hover:text-foreground text-sm transition-colors"
                        >{{ link.label }}</a
                      >
                    } @else {
                      <a
                        [routerLink]="link.href"
                        class="text-muted-foreground hover:text-foreground text-sm transition-colors"
                        >{{ link.label }}</a
                      >
                    }
                  </li>
                }
              </ul>
            </div>
          }
        </div>

        <div class="mt-12 border-t pt-6">
          <p class="text-muted-foreground text-xs">
            © {{ year }} ng-mapcn. Released under the
            <a
              [href]="githubUrl + '/blob/main/LICENSE'"
              target="_blank"
              rel="noopener noreferrer"
              class="hover:text-foreground underline underline-offset-4 transition-colors"
              >MIT License</a
            >.
          </p>
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent {
  protected readonly githubUrl = GITHUB_URL;
  protected readonly year = new Date().getFullYear();

  protected readonly columns: { title: string; links: FooterLink[] }[] = [
    {
      title: 'Product',
      links: [
        { label: 'Documentation', href: '/docs' },
        { label: 'Components', href: '/docs/components/map' },
        { label: 'Blocks', href: '/blocks' },
        { label: 'Credits', href: '/credits' },
      ],
    },
    {
      title: 'Community',
      links: [
        { label: 'GitHub', href: GITHUB_URL, external: true },
        { label: 'Issues', href: `${GITHUB_URL}/issues`, external: true },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'MapLibre GL', href: 'https://maplibre.org/', external: true },
        { label: 'mapcn', href: 'https://mapcn.dev/', external: true },
        { label: 'Zard UI', href: 'https://zardui.com/', external: true },
        { label: 'Tailwind CSS', href: 'https://tailwindcss.com/', external: true },
      ],
    },
  ];
}
