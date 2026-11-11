import { REGISTRY_ITEMS, type RegistryItemDoc } from '../pages/docs/registry-items.generated';

const IMPORT_FROM_NG_MAPCN =
  /import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*['"]ng-mapcn(?:\/draw)?['"]/g;

/** Names a snippet imports from `ng-mapcn` or `ng-mapcn/draw` (`type` modifiers and aliases dropped). */
export function importedNames(code: string): string[] {
  const names: string[] = [];
  for (const [, list] of code.matchAll(IMPORT_FROM_NG_MAPCN)) {
    for (const part of list.split(',')) {
      const name = part
        .trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)[0]
        .trim();
      if (name) names.push(name);
    }
  }
  return names;
}

/**
 * Whether `code` uses `selector` as an element (`<ng-map-scale ` / `<ng-map-scale/>`), which
 * catches template fragments that have no imports.
 */
function usesTag(code: string, selector: string): boolean {
  return new RegExp(`<${selector}(?=[\\s/>])`).test(code);
}

/**
 * Registry items to `ng-mapcn add` for a docs snippet: the items that export what it imports or
 * whose elements its template uses, minus `core` (copied by `init`) and minus items another
 * selected item already brings. Registry order, so the command is stable.
 */
export function installItemsFor(
  code: string,
  items: readonly RegistryItemDoc[] = REGISTRY_ITEMS,
): string[] {
  const names = new Set(importedNames(code));
  const selected = items.filter(
    (item) =>
      item.name !== 'core' &&
      (item.exports.some((name) => names.has(name)) ||
        item.selectors.some((selector) => usesTag(code, selector))),
  );
  const brought = new Set(selected.flatMap((item) => item.dependsOn));
  return selected.filter((item) => !brought.has(item.name)).map((item) => item.name);
}
