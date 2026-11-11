import { Injectable, signal } from '@angular/core';

export const PACKAGE_MANAGERS = [
  { manager: 'pnpm', exec: 'pnpm', dlx: 'pnpm dlx', add: 'pnpm add' },
  { manager: 'npm', exec: 'npx', dlx: 'npx', add: 'npm install' },
  { manager: 'yarn', exec: 'yarn', dlx: 'yarn dlx', add: 'yarn add' },
  { manager: 'bun', exec: 'bunx', dlx: 'bunx', add: 'bun add' },
] as const;

export type PackageManager = (typeof PACKAGE_MANAGERS)[number]['manager'];

const STORAGE_KEY = 'ng-mapcn:package-manager';
const isManager = (value: unknown): value is PackageManager =>
  PACKAGE_MANAGERS.some((entry) => entry.manager === value);

/**
 * The package manager picked on any install command: one choice for the whole site (like
 * mapcn/shadcn), remembered across pages and visits in localStorage.
 */
@Injectable({ providedIn: 'root' })
export class PackageManagerService {
  private readonly selected = signal<PackageManager>(PACKAGE_MANAGERS[0].manager);
  private restored = false;
  readonly current = this.selected.asReadonly();

  select(manager: PackageManager): void {
    this.selected.set(manager);
    try {
      localStorage.setItem(STORAGE_KEY, manager);
    } catch {
      // Storage disabled (private mode, SSR): the choice lasts for this page only.
    }
  }

  /**
   * Applies the saved choice once. Call it after the first render (afterNextRender), so the
   * prerendered HTML (pnpm) hydrates before it changes.
   */
  restore(): void {
    if (this.restored) return;
    this.restored = true;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (isManager(saved)) this.selected.set(saved);
    } catch {
      // No storage: keep the default.
    }
  }
}
