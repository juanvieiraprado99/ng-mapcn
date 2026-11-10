/**
 * Where `npx ng-mapcn init` copies the components by default, as the import alias it maps in
 * tsconfig (`ng-mapcn.json` → `alias`). The docs show every example with it, as shadcn shows
 * `@/components/ui/...` and Zard UI `@/shared/components/...`.
 */
export const COPY_PASTE_ALIAS = '@/shared/components/map';

const NG_MAPCN_IMPORT = /(from\s+|import\s+)(['"])ng-mapcn(\/draw)?\2/g;

/**
 * Rewrites the imports of the `ng-mapcn` package in a docs snippet to the copy-paste alias:
 * `'ng-mapcn'` → `'@/shared/components/map'`, `'ng-mapcn/draw'` → `'@/shared/components/map/draw'`.
 * Other entry points (`ng-mapcn/testing*`, styles) only exist in the npm package and stay as they are.
 */
export function toCopyPasteImports(code: string): string {
  return code.replace(
    NG_MAPCN_IMPORT,
    (_match, keyword: string, quote: string, draw: string | undefined) =>
      `${keyword}${quote}${COPY_PASTE_ALIAS}${draw ?? ''}${quote}`,
  );
}
