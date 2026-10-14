/** Splits a space-separated class string into unique tokens, dropping the protected ones. */
export function classTokens(value: string | null | undefined, protectedTokens: string[]): string[] {
  const tokens = (value ?? '').split(/\s+/).filter((t) => t && !protectedTokens.includes(t));
  return Array.from(new Set(tokens));
}

/**
 * Applies a `className` input to an imperatively created element: removes the classes of the
 * previous value and adds the new ones, never touching the built-in `protectedTokens`. Returns the
 * tokens now applied — pass them back as `previous` on the next call.
 */
export function applyClassName(
  el: Element,
  value: string | null | undefined,
  previous: string[],
  protectedTokens: string[],
): string[] {
  const next = classTokens(value, protectedTokens);
  for (const t of previous) if (!next.includes(t)) el.classList.remove(t);
  for (const t of next) el.classList.add(t);
  return next;
}
