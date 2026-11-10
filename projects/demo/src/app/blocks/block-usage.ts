import { installItemsFor } from '@/shared/install-items';

import { type BlockMeta, zardInstallCommand } from './registry';

/**
 * Commands that bring a block's dependencies into an app set up with `npx ng-mapcn init`: the
 * ng-mapcn items its files import or render, then the zard/ui components its UI uses.
 */
export function blockInstallCommands(block: BlockMeta, sources: Record<string, string>): string[] {
  const code = block.files.map((file) => sources[file.path] ?? '').join('\n');
  const items = installItemsFor(code);
  const zard = zardInstallCommand(block);
  return [
    items.length ? `npx ng-mapcn@latest add ${items.join(' ')}` : 'npx ng-mapcn@latest init',
    ...(zard ? [zard] : []),
  ];
}

/**
 * Copy-ready usage of a block once its files are in the app: the import of its entry component
 * and the element to render. Read from the entry file's own source (first file of the block),
 * so it can never drift from the code that ships.
 */
export function blockUsage(block: BlockMeta, sources: Record<string, string>): string | null {
  const entry = block.files[0]?.path;
  const source = entry ? sources[entry] : undefined;
  if (!entry || !source) return null;

  const selector = /selector:\s*'([^']+)'/.exec(source)?.[1];
  const className = /export class (\w+)/.exec(source)?.[1];
  if (!selector || !className) return null;

  return `import { Component } from '@angular/core';

import { ${className} } from './${entry.replace(/\.ts$/, '')}';

@Component({
  selector: 'app-page',
  standalone: true,
  imports: [${className}],
  template: \`<${selector} />\`,
})
export class PageComponent {}`;
}
