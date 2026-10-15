import angularHtml from '@shikijs/langs/angular-html';
import angularTs from '@shikijs/langs/angular-ts';
import bash from '@shikijs/langs/bash';
import githubDark from '@shikijs/themes/github-dark';
import githubLight from '@shikijs/themes/github-light-high-contrast';
import { createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

export type CodeLang = 'angular-ts' | 'angular-html' | 'bash';

/**
 * Fine-grained Shiki bundle: only the languages and themes this site uses, on
 * the JavaScript regex engine (no Oniguruma WASM). This module is only ever
 * reached through a dynamic `import()` in `CodeBlockComponent`, so it lands in
 * a lazy chunk instead of the initial bundle.
 */
let instance: Promise<HighlighterCore> | undefined;

export function highlight(code: string, lang: CodeLang): Promise<string> {
  instance ??= createHighlighterCore({
    themes: [githubLight, githubDark],
    langs: [angularTs, angularHtml, bash],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  });

  return instance.then((highlighter) =>
    highlighter.codeToHtml(code, {
      lang,
      // Dual theme: emits CSS variables instead of a fixed color, so the site's
      // dark/light toggle recolors the code with no re-highlight.
      themes: { light: 'github-light-high-contrast', dark: 'github-dark' },
      defaultColor: false,
    }),
  );
}

/** Language guess for blocks that don't declare one. */
export function detectLang(code: string): CodeLang {
  const first = code.trimStart();
  if (first.startsWith('<')) return 'angular-html';
  if (/^(npm|npx|ng|yarn|pnpm|\$)\s/.test(first)) return 'bash';
  return 'angular-ts';
}
