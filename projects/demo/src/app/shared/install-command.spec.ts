import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { InstallCommandComponent } from './install-command';

@Component({
  standalone: true,
  imports: [InstallCommandComponent],
  template: `
    <app-install-command id="ng-add" />
    <app-install-command id="ng-add-args" args="--draw" />
    <app-install-command id="packages" packages="ng-mapcn maplibre-gl" />
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
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  return tabs.map((tab) => {
    tab.click();
    TestBed.tick();
    return root.querySelector('code')!.textContent!.trim();
  });
}

describe('InstallCommandComponent', () => {
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
    expect(commands(fixture.nativeElement, 'ng-add-args')[1]).toBe('npx ng add ng-mapcn --draw');
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
});
