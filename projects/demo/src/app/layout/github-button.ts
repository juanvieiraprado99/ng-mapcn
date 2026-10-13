import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';

import { ZardButtonComponent } from '@/shared/components/button';
import { GITHUB_REPO, GITHUB_URL } from '@/shared/site-navigation';

const CACHE_KEY = 'ng-mapcn:github-stars';
const CACHE_TTL_MS = 60 * 60 * 1000;
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

/**
 * Link to the GitHub repository with its star count. The count is fetched in
 * the browser only (the site is prerendered) and cached per session, since the
 * unauthenticated GitHub API allows 60 requests an hour per IP. On any failure
 * the button simply stays icon-only.
 */
@Component({
  selector: 'app-github-button',
  standalone: true,
  imports: [ZardButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      z-button
      zType="ghost"
      zSize="sm"
      [href]="url"
      target="_blank"
      rel="noopener noreferrer"
      [attr.aria-label]="label()"
    >
      <svg viewBox="0 0 1024 1024" fill="currentColor" class="size-4" aria-hidden="true">
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z"
          transform="scale(64)"
        />
      </svg>
      @if (starsText(); as text) {
        <span
          class="animate-in fade-in-0 text-muted-foreground text-xs tabular-nums duration-300"
          aria-hidden="true"
          >{{ text }}</span
        >
      }
    </a>
  `,
})
export class GithubButtonComponent {
  protected readonly url = GITHUB_URL;
  private readonly stars = signal<number | null>(null);

  protected readonly starsText = computed(() => {
    const stars = this.stars();
    return stars === null ? null : compact.format(stars).toLowerCase();
  });
  protected readonly label = computed(() => {
    const stars = this.stars();
    return stars === null ? 'GitHub repository' : `GitHub repository, ${stars} stars`;
  });

  constructor() {
    afterNextRender(() => void this.load());
  }

  private async load(): Promise<void> {
    const cached = readCache();
    if (cached !== null) {
      this.stars.set(cached);
      return;
    }
    try {
      const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
        headers: { Accept: 'application/vnd.github+json' },
      });
      if (!response.ok) return;
      const { stargazers_count: count } = (await response.json()) as { stargazers_count?: unknown };
      if (typeof count !== 'number') return;
      this.stars.set(count);
      writeCache(count);
    } catch {
      // Offline or rate-limited: keep the icon-only button.
    }
  }
}

function readCache(): number | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { count, at } = JSON.parse(raw) as { count: unknown; at: number };
    return typeof count === 'number' && Date.now() - at < CACHE_TTL_MS ? count : null;
  } catch {
    return null;
  }
}

function writeCache(count: number): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ count, at: Date.now() }));
  } catch {
    // Storage blocked: the next page load just fetches again.
  }
}
