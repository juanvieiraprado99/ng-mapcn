import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleCheck, lucideCircleDashed } from '@ng-icons/lucide';

import { ZardBadgeComponent, type ZardBadgeTypeVariants } from '@/shared/components/badge';

import { DocsImports } from '../../shared/docs';
import { GITHUB_URL } from '../../shared/site-navigation';
import {
  milestoneProgress,
  nextMilestones,
  type RoadmapMilestone,
  type RoadmapStatus,
  shippedMilestones,
  stableMilestone,
} from './roadmap.data';

const STATUS: Record<RoadmapStatus, { label: string; type: ZardBadgeTypeVariants }> = {
  completed: { label: 'Completed', type: 'default' },
  ongoing: { label: 'Ongoing', type: 'secondary' },
  planned: { label: 'Planned', type: 'outline' },
};

/** One milestone: status, progress, goals and the deliverables checklist. */
@Component({
  selector: 'app-roadmap-card',
  standalone: true,
  imports: [NgIcon, ZardBadgeComponent],
  viewProviders: [provideIcons({ lucideCircleCheck, lucideCircleDashed })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @let item = milestone();
    <article [attr.id]="item.id" class="bg-card scroll-m-24 space-y-4 rounded-lg border p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <z-badge [zType]="status().type">{{ status().label }}</z-badge>
        @if (item.period) {
          <span class="text-muted-foreground text-xs">{{ item.period }}</span>
        }
      </div>

      <div class="space-y-2">
        <div class="flex items-baseline justify-between gap-4">
          <h3 class="text-foreground text-base font-semibold">{{ item.title }}</h3>
          <span class="text-muted-foreground shrink-0 text-sm tabular-nums">
            {{ item.continuous ? 'Continuous' : progress().percent + '%' }}
          </span>
        </div>
        @if (!item.continuous) {
          <div
            class="bg-muted h-1.5 overflow-hidden rounded-full"
            role="progressbar"
            [attr.aria-label]="item.title + ' progress'"
            aria-valuemin="0"
            aria-valuemax="100"
            [attr.aria-valuenow]="progress().percent"
          >
            <div class="bg-primary h-full rounded-full" [style.width.%]="progress().percent"></div>
          </div>
        }
        <p class="text-muted-foreground text-sm leading-6">{{ item.description }}</p>
      </div>

      <ul class="flex flex-wrap items-center gap-1.5 [&>li]:m-0" aria-label="Goals">
        @for (goal of item.goals; track goal) {
          <li class="text-muted-foreground rounded-md border px-2 py-0.5 text-xs">{{ goal }}</li>
        }
      </ul>

      <div class="space-y-2">
        <h4 class="text-foreground text-sm font-medium">
          Deliverables ({{ progress().done }}/{{ progress().total }})
        </h4>
        <ul class="space-y-1.5">
          @for (deliverable of item.deliverables; track deliverable.label) {
            <li
              class="flex items-start gap-2 text-sm"
              [class.text-foreground]="deliverable.done"
              [class.text-muted-foreground]="!deliverable.done"
            >
              <ng-icon
                [name]="deliverable.done ? 'lucideCircleCheck' : 'lucideCircleDashed'"
                size="16"
                aria-hidden="true"
                class="mt-0.5 shrink-0"
              />
              <span>
                <span class="sr-only">{{ deliverable.done ? 'Done: ' : 'To do: ' }}</span>
                {{ deliverable.label }}
              </span>
            </li>
          }
        </ul>
      </div>
    </article>
  `,
})
export class RoadmapCardComponent {
  readonly milestone = input.required<RoadmapMilestone>();

  protected readonly status = computed(() => STATUS[this.milestone().status]);
  protected readonly progress = computed(() => milestoneProgress(this.milestone()));
}

/** zardui-style roadmap: the stable release first, then what comes next, then what shipped. */
@Component({
  selector: 'app-roadmap',
  standalone: true,
  imports: [DocsImports, RoadmapCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-docs-page
      title="Roadmap"
      description="Where ng-mapcn is heading next, and what has shipped so far."
    >
      <app-docs-section>
        <p>
          The roadmap leads to a stable 22.0.0. On the way, the beta line gains new components,
          search and routing, Angular forms integration, real-time data and better tooling for
          people and AI assistants. When all of it has shipped, the API is frozen and 22.0.0 is
          released. What already shipped is at the end of the page.
        </p>
      </app-docs-section>

      <app-docs-section title="Stable Release">
        <app-roadmap-card [milestone]="stable" />
      </app-docs-section>

      <app-docs-section title="What's Next">
        <div class="space-y-4">
          @for (milestone of next; track milestone.id) {
            <app-roadmap-card [milestone]="milestone" />
          }
        </div>
      </app-docs-section>

      <app-docs-section title="Help Shape What's Next">
        <p>
          The roadmap follows what people build with ng-mapcn. Missing a component or a block?
          <a [href]="featureRequestUrl" target="_blank" rel="noopener noreferrer" [class]="link"
            >Open a feature request</a
          >
          (mention the mapcn equivalent if there is one), or pick a planned item and send a pull
          request; see
          <a [href]="contributingUrl" target="_blank" rel="noopener noreferrer" [class]="link"
            >CONTRIBUTING.md</a
          >
          to get started.
        </p>
      </app-docs-section>

      <app-docs-section title="Shipped">
        <div class="space-y-4">
          @for (milestone of shipped; track milestone.id) {
            <app-roadmap-card [milestone]="milestone" />
          }
        </div>
      </app-docs-section>
    </app-docs-page>
  `,
})
export class RoadmapComponent {
  /** mapcn `DocsLink`. */
  protected readonly link = 'text-foreground font-medium underline underline-offset-4';

  protected readonly stable = stableMilestone;
  protected readonly shipped = shippedMilestones;
  protected readonly next = nextMilestones;

  protected readonly featureRequestUrl = `${GITHUB_URL}/issues/new?template=feature_request.yml`;
  protected readonly contributingUrl = `${GITHUB_URL}/blob/main/CONTRIBUTING.md`;
}
