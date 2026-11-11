import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SchematicsException } from '@angular-devkit/schematics';

import type { Registry } from './types';

export interface Resolution {
  items: string[];
  files: string[];
  dependencies: Record<string, string>;
}

/** Trims, lowercases and strips a leading `map-` (so `Map-Route` and `route` are the same item). */
export function normalizeItemName(raw: string): string {
  return raw.trim().toLowerCase().replace(/^map-/, '');
}

/** Reads the generated `registry.json` that sits next to the compiled `registry/` folder. */
export function readRegistry(): Registry {
  return JSON.parse(readFileSync(join(__dirname, '..', 'registry.json'), 'utf8')) as Registry;
}

/**
 * Resolves the requested items (comma-joined entries allowed) to their dependency closure, in
 * dependency order with `core` first, plus the de-duplicated files and merged npm dependencies.
 * `all` selects every item except the opt-in `draw` (unless it is requested explicitly).
 */
export function resolve(
  registry: Registry,
  names: string[],
  opts: { all?: boolean } = {},
): Resolution {
  const requested = names
    .flatMap((n) => n.split(','))
    .map(normalizeItemName)
    .filter(Boolean);

  const unknown = requested.filter((n) => !registry.items[n]);
  if (unknown.length) {
    const available = Object.keys(registry.items).sort().join(', ');
    throw new SchematicsException(
      `Unknown component(s): ${[...new Set(unknown)].join(', ')}. Available: ${available}`,
    );
  }

  const roots = ['core', ...requested];
  if (opts.all) {
    roots.push(...Object.keys(registry.items).filter((n) => n !== 'draw'));
  }

  const items: string[] = [];
  const visit = (name: string, stack: string[]): void => {
    if (items.includes(name) || stack.includes(name)) return;
    const item = registry.items[name];
    if (!item) {
      throw new SchematicsException(
        `Registry item "${stack[stack.length - 1]}" depends on unknown "${name}".`,
      );
    }
    for (const dep of item.registryDependencies) visit(dep, [...stack, name]);
    items.push(name);
  };
  for (const root of roots) visit(root, []);

  const files = [...new Set(items.flatMap((n) => registry.items[n].files))];
  const dependencies: Record<string, string> = {};
  for (const n of items) Object.assign(dependencies, registry.items[n].dependencies);

  return { items, files, dependencies };
}
