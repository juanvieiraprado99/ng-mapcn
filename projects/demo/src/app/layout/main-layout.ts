import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header';

/** mapcn `(main)/layout.tsx`: the site header above every page except block views. */
@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bg-background relative flex min-h-screen flex-col' },
  template: `
    <app-header />
    <main class="flex flex-1 flex-col">
      <router-outlet />
    </main>
  `,
})
export class MainLayoutComponent {}
