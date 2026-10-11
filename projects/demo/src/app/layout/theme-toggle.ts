import { afterNextRender, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMoon, lucideSun } from '@ng-icons/lucide';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardSkeletonComponent } from '@/shared/components/skeleton';
import { ThemeService } from '@/shared/theme.service';

/**
 * mapcn `ThemeToggle`. The server cannot know the visitor's theme, so — like
 * mapcn — a skeleton stands in until the first client render; that also keeps
 * hydration from seeing a different icon than the server rendered.
 */
@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [NgIcon, ZardButtonComponent, ZardSkeletonComponent],
  viewProviders: [provideIcons({ lucideMoon, lucideSun })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (mounted()) {
      <button
        z-button
        zType="ghost"
        zSize="icon-sm"
        type="button"
        aria-label="Toggle theme"
        (click)="theme.toggleTheme()"
      >
        <ng-icon [name]="theme.theme() === 'dark' ? 'lucideMoon' : 'lucideSun'" size="16" />
      </button>
    } @else {
      <z-skeleton class="block size-8" />
    }
  `,
})
export class ThemeToggleComponent {
  protected readonly theme = inject(ThemeService);
  protected readonly mounted = signal(false);

  constructor() {
    afterNextRender(() => this.mounted.set(true));
  }
}
