import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleCheck, lucideCircleDashed } from '@ng-icons/lucide';

import { ZardBadgeComponent, type ZardBadgeTypeVariants } from '@/shared/components/badge';
import { LanguageService } from '@/shared/i18n/language.service';

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
import { periodPt, ROADMAP_PT } from './roadmap.data.pt';

const STATUS: Record<
  RoadmapStatus,
  { label: string; labelPt: string; type: ZardBadgeTypeVariants }
> = {
  completed: { label: 'Completed', labelPt: 'Concluído', type: 'default' },
  ongoing: { label: 'Ongoing', labelPt: 'Em andamento', type: 'secondary' },
  planned: { label: 'Planned', labelPt: 'Planejado', type: 'outline' },
};

/** The milestone texts in the current language (structure and flags from the English data). */
function localize(milestone: RoadmapMilestone, pt: boolean): RoadmapMilestone {
  const tr = pt ? ROADMAP_PT[milestone.id] : undefined;
  if (!tr) return milestone;
  return {
    ...milestone,
    title: tr.title,
    description: tr.description,
    period: milestone.period && periodPt(milestone.period),
    goals: tr.goals,
    deliverables: milestone.deliverables.map((d, i) => ({ ...d, label: tr.deliverables[i] })),
  };
}

/** One milestone: status, progress, goals and the deliverables checklist. */
@Component({
  selector: 'app-roadmap-card',
  standalone: true,
  imports: [NgIcon, ZardBadgeComponent],
  viewProviders: [provideIcons({ lucideCircleCheck, lucideCircleDashed })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @let item = view();
    @let pt = i18n.isPt();
    <article [attr.id]="item.id" class="bg-card scroll-m-24 space-y-4 rounded-lg border p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <z-badge [zType]="status().type">{{ pt ? status().labelPt : status().label }}</z-badge>
        @if (item.period) {
          <span class="text-muted-foreground text-xs">{{ item.period }}</span>
        }
      </div>

      <div class="space-y-2">
        <div class="flex items-baseline justify-between gap-4">
          <h3 class="text-foreground text-base font-semibold">{{ item.title }}</h3>
          <span class="text-muted-foreground shrink-0 text-sm tabular-nums">
            {{ item.continuous ? (pt ? 'Contínuo' : 'Continuous') : progress().percent + '%' }}
          </span>
        </div>
        @if (!item.continuous) {
          <div
            class="bg-muted h-1.5 overflow-hidden rounded-full"
            role="progressbar"
            [attr.aria-label]="(pt ? 'Progresso de ' : '') + item.title + (pt ? '' : ' progress')"
            aria-valuemin="0"
            aria-valuemax="100"
            [attr.aria-valuenow]="progress().percent"
          >
            <div class="bg-primary h-full rounded-full" [style.width.%]="progress().percent"></div>
          </div>
        }
        <p class="text-muted-foreground text-sm leading-6">{{ item.description }}</p>
      </div>

      <ul class="flex flex-wrap items-center gap-1.5 [&>li]:m-0" [attr.aria-label]="pt ? 'Metas' : 'Goals'">
        @for (goal of item.goals; track goal) {
          <li class="text-muted-foreground rounded-md border px-2 py-0.5 text-xs">{{ goal }}</li>
        }
      </ul>

      <div class="space-y-2">
        <h4 class="text-foreground text-sm font-medium">
          {{ pt ? 'Entregas' : 'Deliverables' }} ({{ progress().done }}/{{ progress().total }})
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
                <span class="sr-only">{{
                  deliverable.done ? (pt ? 'Feito: ' : 'Done: ') : pt ? 'A fazer: ' : 'To do: '
                }}</span>
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

  protected readonly i18n = inject(LanguageService);
  protected readonly view = computed(() => localize(this.milestone(), this.i18n.isPt()));
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
      titlePt="Roadmap"
      descriptionPt="Para onde o ng-mapcn vai a seguir, e o que já foi lançado."
    >
      <app-docs-section>
        @if (i18n.isPt()) {
          <p>
            O roadmap leva a uma 22.0.0 estável. No caminho, a linha beta ganha novos componentes, busca e
            rotas, integração com Angular forms, dados em tempo real e ferramentas melhores para pessoas e
            assistentes de IA. Quando tudo isso tiver saído, a API é congelada e a 22.0.0 é lançada. O que
            já foi lançado está no fim da página.
          </p>
        } @else {
          <p>
            The roadmap leads to a stable 22.0.0. On the way, the beta line gains new components,
            search and routing, Angular forms integration, real-time data and better tooling for
            people and AI assistants. When all of it has shipped, the API is frozen and 22.0.0 is
            released. What already shipped is at the end of the page.
          </p>
        }
      </app-docs-section>

      <app-docs-section title="Stable Release" titlePt="Versão estável">
        <app-roadmap-card [milestone]="stable" />
      </app-docs-section>

      <app-docs-section title="What's Next" titlePt="O que vem a seguir">
        <div class="space-y-4">
          @for (milestone of next; track milestone.id) {
            <app-roadmap-card [milestone]="milestone" />
          }
        </div>
      </app-docs-section>

      <app-docs-section title="Help Shape What's Next" titlePt="Ajude a definir o que vem a seguir">
        @if (i18n.isPt()) {
          <p>
            O roadmap segue o que as pessoas constroem com o ng-mapcn. Sentiu falta de um componente ou de
            um block?
            <a [href]="featureRequestUrl" target="_blank" rel="noopener noreferrer" [class]="link"
              >Abra um pedido de funcionalidade</a
            >
            (cite o equivalente no mapcn, se houver), ou pegue um item planejado e mande um pull request;
            veja o
            <a [href]="contributingUrl" target="_blank" rel="noopener noreferrer" [class]="link"
              >CONTRIBUTING.md</a
            >
            para começar.
          </p>
        } @else {
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
        }
      </app-docs-section>

      <app-docs-section title="Shipped" titlePt="Lançado">
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
  protected readonly i18n = inject(LanguageService);
  /** mapcn `DocsLink`. */
  protected readonly link = 'text-foreground font-medium underline underline-offset-4';

  protected readonly stable = stableMilestone;
  protected readonly shipped = shippedMilestones;
  protected readonly next = nextMilestones;

  protected readonly featureRequestUrl = `${GITHUB_URL}/issues/new?template=feature_request.yml`;
  protected readonly contributingUrl = `${GITHUB_URL}/blob/main/CONTRIBUTING.md`;
}
