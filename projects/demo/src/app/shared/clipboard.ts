import { DestroyRef, inject, type Signal, signal } from '@angular/core';

export interface CopyToClipboard {
  /** True for `resetMs` after a successful copy (drives the check icon and "Copied" label). */
  readonly copied: Signal<boolean>;
  /** Copies `text`; resolves to false when the browser refuses (insecure context, no permission). */
  copy(text: string): Promise<boolean>;
}

/**
 * Copy-button state for the component it is called in (injection context): handles a refused
 * clipboard instead of leaving an unhandled rejection, and clears its reset timer on destroy.
 */
export function injectCopyToClipboard(resetMs = 2000): CopyToClipboard {
  const copied = signal(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  inject(DestroyRef).onDestroy(() => clearTimeout(timer));

  return {
    copied: copied.asReadonly(),
    async copy(text: string): Promise<boolean> {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        return false;
      }
      copied.set(true);
      clearTimeout(timer);
      timer = setTimeout(() => copied.set(false), resetMs);
      return true;
    },
  };
}
