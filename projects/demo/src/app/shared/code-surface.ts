import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import type { ClassValue } from 'clsx';

import type { CodeLang } from '@/shared/highlighter';
import { mergeClasses } from '@/shared/utils/merge-classes';

/**
 * mapcn `CodeSurface`: the `bg-code` panel a highlighted snippet sits on.
 *
 * Highlighting runs in the browser only (the Shiki chunk is lazy). Until it
 * lands — and on the server — the same `pre.shiki > code > span.line` markup
 * is rendered uncoloured, so line numbers and height never shift.
 */
@Component({
  selector: 'app-code-surface',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
  template: `<div [innerHTML]="html()"></div>`,
})
export class CodeSurfaceComponent {
  readonly code = input.required<string>();
  /** Defaults to a guess based on the snippet (see `detectLang`). */
  readonly lang = input<CodeLang>();
  readonly class = input<ClassValue>('');

  private readonly sanitizer = inject(DomSanitizer);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  /** Shiki output, kept with the code it was made for. */
  private readonly highlighted = signal<{ code: string; lang?: CodeLang; html: SafeHtml } | null>(
    null,
  );

  protected readonly classes = computed(() =>
    mergeClasses('bg-code no-scrollbar block py-4 pr-4 text-sm', this.class()),
  );

  /**
   * Highlighted only while it matches the current code: a changed snippet shows uncoloured at once
   * instead of the previous highlight, and a late result for an older snippet is never shown.
   */
  protected readonly html = computed(() => {
    const highlighted = this.highlighted();
    const code = this.code();
    return highlighted?.code === code && highlighted.lang === this.lang()
      ? highlighted.html
      : plainHtml(code);
  });

  constructor() {
    effect(() => {
      const code = this.code();
      const lang = this.lang();
      if (!this.isBrowser) return;

      void (async () => {
        const { detectLang, highlight } = await import('@/shared/highlighter');
        const html = await highlight(code, lang ?? detectLang(code));
        // Shiki emits inline `style` attributes, which Angular's sanitizer would strip. Not every
        // snippet is static: the playground builds its snippet from user input. That stays safe
        // because Shiki HTML-escapes all token text and only adds its own <pre>/<span> markup, so
        // never pass anything but Shiki's output here.
        this.highlighted.set({ code, lang, html: this.sanitizer.bypassSecurityTrustHtml(html) });
      })();
    });
  }
}

function plainHtml(code: string): string {
  const lines = code
    .split('\n')
    .map((line) => `<span class="line">${escapeHtml(line)}</span>`)
    .join('\n');
  return `<pre class="shiki"><code>${lines}</code></pre>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
