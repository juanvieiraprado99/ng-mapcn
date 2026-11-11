import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InstallCommandComponent } from './install-command';
import { PackageManagerService } from './package-manager.service';

@Component({
  standalone: true,
  imports: [InstallCommandComponent],
  template: `
    <app-install-command id="ng-add" />
    <app-install-command id="ng-add-args" args="--skip-install" />
    <app-install-command id="packages" packages="ng-mapcn maplibre-gl" />
    <app-install-command id="cli" cli="init" />
    <app-install-command id="cli-add" cli="add marker route" />
  `,
})
class HostComponent {}

async function render() {
  const fixture = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  return fixture;
}

function commands(host: HTMLElement, id: string): string[] {
  const root = host.querySelector(`#${id}`)!;
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
  return tabs.map((tab) => {
    tab.click();
    TestBed.tick();
    return root.querySelector('code')!.textContent!.trim();
  });
}

const radios = (host: HTMLElement, id: string) =>
  Array.from(host.querySelectorAll<HTMLButtonElement>(`#${id} [role="radio"]`));

describe('InstallCommandComponent', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('is a named radio group with one tab stop, on the selected manager', async () => {
    const fixture = await render();
    const root = fixture.nativeElement as HTMLElement;
    const group = root.querySelector('#cli [role="radiogroup"]')!;
    expect(group.getAttribute('aria-label')).toBe('Package manager');
    expect(radios(root, 'cli').map((r) => r.getAttribute('aria-checked'))).toEqual([
      'true',
      'false',
      'false',
      'false',
    ]);
    expect(radios(root, 'cli').map((r) => r.getAttribute('tabindex'))).toEqual([
      '0',
      '-1',
      '-1',
      '-1',
    ]);
  });

  it('moves the selection with the arrow keys, Home and End, on every command', async () => {
    const fixture = await render();
    const root = fixture.nativeElement as HTMLElement;
    // Keys go to the focused radio: the checked one (roving tabindex).
    const press = (key: string) => {
      const checked = root.querySelector<HTMLElement>('#cli [role="radio"][aria-checked="true"]')!;
      checked.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      TestBed.tick();
    };
    const code = (id: string) => root.querySelector(`#${id} code`)!.textContent!.trim();

    press('ArrowRight');
    expect(code('cli')).toBe('npx ng-mapcn@latest init');
    // One choice for the whole page.
    expect(code('packages')).toBe('npm install ng-mapcn maplibre-gl');
    press('End');
    expect(code('cli')).toBe('bunx ng-mapcn@latest init');
    press('ArrowRight');
    expect(code('cli')).toBe('pnpm dlx ng-mapcn@latest init');
    press('ArrowLeft');
    press('Home');
    expect(code('cli')).toBe('pnpm dlx ng-mapcn@latest init');
  });

  it('remembers the choice across visits, applied after the first render', async () => {
    TestBed.inject(PackageManagerService).select('yarn');
    expect(localStorage.getItem('ng-mapcn:package-manager')).toBe('yarn');

    TestBed.resetTestingModule();
    const fixture = await render();
    TestBed.tick();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('#cli code')!.textContent!.trim(),
    ).toBe('yarn dlx ng-mapcn@latest init');
  });

  it('ignores a saved value that is not a known manager', () => {
    localStorage.setItem('ng-mapcn:package-manager', 'gradle');
    const service = TestBed.inject(PackageManagerService);
    service.restore();
    expect(service.current()).toBe('pnpm');
  });

  it('a refused or missing clipboard neither throws nor shows "Copied"', async () => {
    // jsdom has no navigator.clipboard, like an insecure (http) context: writeText cannot run.
    expect(navigator.clipboard).toBeUndefined();
    const fixture = await render();
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '#cli button[aria-label="Copy command"]',
    )!;
    button.click();
    await fixture.whenStable();
    expect(button.getAttribute('aria-label')).toBe('Copy command');
  });

  it('runs ng add through every package manager', async () => {
    const fixture = await render();
    expect(commands(fixture.nativeElement, 'ng-add')).toEqual([
      'pnpm ng add ng-mapcn',
      'npx ng add ng-mapcn',
      'yarn ng add ng-mapcn',
      'bunx ng add ng-mapcn',
    ]);
  });

  it('appends the ng add arguments', async () => {
    const fixture = await render();
    expect(commands(fixture.nativeElement, 'ng-add-args')[1]).toBe(
      'npx ng add ng-mapcn --skip-install',
    );
  });

  it('installs the packages directly with each manager', async () => {
    const fixture = await render();
    expect(commands(fixture.nativeElement, 'packages')).toEqual([
      'pnpm add ng-mapcn maplibre-gl',
      'npm install ng-mapcn maplibre-gl',
      'yarn add ng-mapcn maplibre-gl',
      'bun add ng-mapcn maplibre-gl',
    ]);
  });

  it('renders the CLI command per package manager', async () => {
    const fixture = await render();
    expect(commands(fixture.nativeElement, 'cli')).toEqual([
      'pnpm dlx ng-mapcn@latest init',
      'npx ng-mapcn@latest init',
      'yarn dlx ng-mapcn@latest init',
      'bunx ng-mapcn@latest init',
    ]);
    expect(commands(fixture.nativeElement, 'cli-add')[1]).toBe(
      'npx ng-mapcn@latest add marker route',
    );
  });
});
