import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideInfo } from '@ng-icons/lucide';

import { BLOCKS } from '@/blocks/registry';
import { FooterComponent } from '@/layout/footer';
import { PageHeaderImports } from '@/shared/page-header';

import { BlockDisplayComponent } from './block-display';

/** mapcn `/blocks`: the gallery of ready-made map blocks. */
@Component({
  selector: 'app-blocks',
  standalone: true,
  imports: [NgIcon, PageHeaderImports, FooterComponent, BlockDisplayComponent],
  viewProviders: [provideIcons({ lucideInfo })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header align="left" size="sm">
      <app-page-header-heading>Blocks</app-page-header-heading>
      <app-page-header-description>
        Pre-built, ready-to-use map blocks. Browse, preview, and copy them into your app.
      </app-page-header-description>
    </app-page-header>

    <section
      id="blocks"
      class="animate-fade-up animate-stagger container scroll-mt-20 space-y-20"
      style="--stagger: 3.5"
    >
      <!-- Where the UI comes from: blocks mix ng-mapcn with a component kit. -->
      <div
        class="bg-surface text-foreground/80 [&_strong]:text-foreground flex gap-3 rounded-lg px-5 py-4 text-[15px] leading-relaxed [&_strong]:font-medium"
        role="note"
      >
        <ng-icon name="lucideInfo" size="18" class="text-muted-foreground mt-0.5 shrink-0" />
        <div class="space-y-2">
          <p>
            <strong>The UI in these blocks comes from zard/ui.</strong>
            Cards, badges, buttons, inputs, sidebars and charts are
            <a
              href="https://zardui.com"
              target="_blank"
              rel="noopener noreferrer"
              class="text-foreground font-medium underline underline-offset-4"
              >zard/ui</a
            >
            components - the Angular port of shadcn/ui, and the kit this site is built with. They
            are not part of ng-mapcn: every
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm"
              >ng-map-*</code
            >
            element is ng-mapcn, everything around it is zard/ui and Tailwind.
          </p>
          <p>
            Each block lists the zard/ui components it uses, and its install button copies the
            matching
            <code class="bg-muted relative rounded-md px-1.5 py-0.5 font-mono text-sm"
              >npx zard-cli@latest add ...</code
            >
            command. Then copy the files from the Code tab into your app.
          </p>
        </div>
      </div>

      @for (block of blocks; track block.name) {
        <app-block-display [block]="block" />
      }
    </section>

    <app-footer />
  `,
})
export class BlocksComponent {
  protected readonly blocks = BLOCKS;
}
