import { SchematicsException } from '@angular-devkit/schematics';

/**
 * Normalizes the `--path` option to a workspace-relative POSIX path, and rejects values that would
 * escape the workspace or break the generated `@use` line (absolute paths, `..`, quotes, newlines).
 */
export function normalizeTargetPath(path: string): string {
  const normalized = path.trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
  if (!normalized) {
    throw new SchematicsException('The --path option must not be empty.');
  }
  if (/^([a-zA-Z]:)?\//.test(normalized)) {
    throw new SchematicsException(
      `The --path option must be relative to the workspace root, got "${path}".`,
    );
  }
  if (normalized.split('/').includes('..')) {
    throw new SchematicsException(`The --path option must not contain "..", got "${path}".`);
  }
  if (/['"`;\r\n]/.test(normalized)) {
    throw new SchematicsException(`The --path option contains invalid characters: "${path}".`);
  }
  return normalized;
}

/** Joins workspace-relative POSIX path segments, dropping empty ones. */
export function joinPath(...parts: string[]): string {
  return parts
    .flatMap((p) => p.split('/'))
    .filter((p) => p && p !== '.')
    .join('/');
}

/** Relative POSIX path from directory `from` to `to` (both workspace-relative, no `..`). */
export function relativePath(from: string, to: string): string {
  const a = joinPath(from).split('/').filter(Boolean);
  const b = joinPath(to).split('/').filter(Boolean);
  let common = 0;
  while (common < a.length && common < b.length && a[common] === b[common]) common++;
  const up = a.slice(common).map(() => '..');
  const rel = [...up, ...b.slice(common)].join('/');
  return rel.startsWith('..') ? rel : `./${rel}`;
}

/** Directory part of a workspace-relative POSIX path (`''` at the root). */
export function dirnamePath(path: string): string {
  const i = path.lastIndexOf('/');
  return i === -1 ? '' : path.slice(0, i);
}
