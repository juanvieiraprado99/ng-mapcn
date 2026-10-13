import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRight } from '@ng-icons/lucide';

import { BrandMarkComponent } from '@/layout/brand-mark';
import { FooterComponent } from '@/layout/footer';
import { AgentPromptComponent } from '@/shared/agent-prompt';
import { ZardButtonComponent } from '@/shared/components/button';
import { PageHeaderImports } from '@/shared/page-header';
import { GITHUB_URL } from '@/shared/site-navigation';

import { AnalyticsExampleComponent } from './examples/analytics-example';
import { ArcExampleComponent } from './examples/arc-example';
import { DeliveryExampleComponent } from './examples/delivery-example';
import { EvChargingExampleComponent } from './examples/ev-charging-example';
import { FlytoExampleComponent } from './examples/flyto-example';
import { TrailExampleComponent } from './examples/trail-example';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterLink,
    NgIcon,
    ZardButtonComponent,
    BrandMarkComponent,
    PageHeaderImports,
    AgentPromptComponent,
    FooterComponent,
    AnalyticsExampleComponent,
    TrailExampleComponent,
    ArcExampleComponent,
    EvChargingExampleComponent,
    FlytoExampleComponent,
    DeliveryExampleComponent,
  ],
  viewProviders: [provideIcons({ lucideArrowRight })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header>
      <a
        [href]="releasesUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="animate-fade-up animate-stagger bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-xs font-medium transition-colors"
        style="--stagger: 0"
      >
        <app-brand-mark class="size-5" />
        Now on MapLibre GL v6
        <ng-icon name="lucideArrowRight" size="12" aria-hidden="true" />
      </a>
      <app-page-header-heading>Beautiful maps, made simple</app-page-header-heading>
      <app-page-header-description>
        Ready to use, customizable map components for Angular.
        <br class="hidden sm:block" />
        Built on MapLibre. Styled with Tailwind.
      </app-page-header-description>
      <app-page-actions class="mt-5 flex-col gap-4">
        <div class="flex flex-wrap items-center justify-center gap-3">
          <a z-button routerLink="/docs" class="min-w-36 justify-center">Get Started</a>
          <a
            z-button
            zType="outline"
            routerLink="/docs/components/map"
            class="min-w-36 justify-center"
            >View Components</a
          >
        </div>
        <app-agent-prompt />
      </app-page-actions>
    </app-page-header>

    <!-- Each example boots its own WebGL map. Deferring on viewport keeps the
         maplibre-gl chunk (and six map instances) out of the initial load. -->
    <section
      class="animate-fade-up animate-stagger container-wide"
      style="--stagger: 4.5"
      aria-labelledby="examples-heading"
    >
      <h2 id="examples-heading" class="sr-only">Angular map examples built with ng-mapcn</h2>
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        @defer (on viewport) {
          <app-analytics-example />
        } @placeholder {
          <div [class]="widePlaceholder"></div>
        }

        @defer (on viewport) {
          <app-trail-example />
        } @placeholder {
          <div [class]="squarePlaceholder"></div>
        }

        @defer (on viewport) {
          <app-arc-example />
        } @placeholder {
          <div [class]="squarePlaceholder"></div>
        }

        @defer (on viewport) {
          <app-ev-charging-example />
        } @placeholder {
          <div [class]="squarePlaceholder"></div>
        }

        @defer (on viewport) {
          <app-flyto-example />
        } @placeholder {
          <div [class]="squarePlaceholder"></div>
        }

        @defer (on viewport) {
          <app-delivery-example />
        } @placeholder {
          <div [class]="widePlaceholder"></div>
        }
      </div>
    </section>

    <app-footer />
  `,
})
export class HomeComponent {
  protected readonly releasesUrl = `${GITHUB_URL}/releases`;

  // Same grid footprint as the cards they stand in for, so nothing shifts when
  // the real example loads.
  private readonly placeholderBase = 'bg-card border-border/50 rounded-xl border shadow-sm';
  readonly squarePlaceholder = `${this.placeholderBase} aspect-square`;
  readonly widePlaceholder = `${this.placeholderBase} aspect-square sm:col-span-2 sm:aspect-video lg:aspect-auto`;
}
