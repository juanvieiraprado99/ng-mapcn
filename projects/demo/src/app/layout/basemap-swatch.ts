import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { BasemapId } from '@/shared/basemap.service';

interface Palette {
  land: string;
  water: string;
  park: string;
  road: string;
  major: string;
  casing: string;
}

/**
 * Each provider's own colors (light, dark), sampled from its styles. OSM only
 * serves light raster tiles, so it keeps its palette in dark mode — as the
 * real map does.
 */
const PALETTES: Record<BasemapId, readonly [Palette, Palette]> = {
  carto: [
    {
      land: '#fafaf8',
      water: '#d4dadc',
      park: '#e9ede4',
      road: '#ffffff',
      major: '#ffffff',
      casing: '#e0e0e0',
    },
    {
      land: '#161616',
      water: '#2e3a42',
      park: '#1c241c',
      road: '#3a3a3a',
      major: '#5c5c5c',
      casing: '#0c0c0c',
    },
  ],
  openfreemap: [
    {
      land: '#f2f3f0',
      water: '#c2c8ca',
      park: '#e3e8de',
      road: '#ffffff',
      major: '#ffffff',
      casing: '#d9d9d9',
    },
    {
      land: '#17181c',
      water: '#24384a',
      park: '#1d281d',
      road: '#3a3d44',
      major: '#5d6170',
      casing: '#0e0f12',
    },
  ],
  osm: [
    {
      land: '#f2efe9',
      water: '#aad3df',
      park: '#c8facc',
      road: '#ffffff',
      major: '#fcd6a4',
      casing: '#d6c9b6',
    },
    {
      land: '#f2efe9',
      water: '#aad3df',
      park: '#c8facc',
      road: '#ffffff',
      major: '#fcd6a4',
      casing: '#d6c9b6',
    },
  ],
  maptiler: [
    {
      land: '#f8f4f0',
      water: '#9ec7ef',
      park: '#d4e6c3',
      road: '#ffffff',
      major: '#ffd37f',
      casing: '#e2d6c8',
    },
    {
      land: '#1f242b',
      water: '#14324d',
      park: '#21332a',
      road: '#3a4250',
      major: '#9a7238',
      casing: '#12161b',
    },
  ],
  stadia: [
    {
      land: '#f4f4f1',
      water: '#b6d0e0',
      park: '#dbe7d4',
      road: '#ffffff',
      major: '#f2e3c6',
      casing: '#e1e1dc',
    },
    {
      land: '#2a2c31',
      water: '#16181b',
      park: '#2c3a30',
      road: '#44474d',
      major: '#62666d',
      casing: '#1c1e21',
    },
  ],
};

/**
 * A tiny illustrated map in a provider's colors — no tiles are fetched, so the
 * picker costs nothing and works for keyed providers before a key is set.
 * Colors are CSS variables switched by the `dark` class, so the server render
 * and the first client render always agree.
 */
@Component({
  selector: 'app-basemap-swatch',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block overflow-hidden ring-1 ring-foreground/10 ring-inset',
    '[style]': 'vars()',
  },
  template: `
    <svg
      viewBox="0 0 96 64"
      preserveAspectRatio="xMidYMid slice"
      class="block size-full"
      aria-hidden="true"
    >
      <rect width="96" height="64" class="fill-(--l-land) dark:fill-(--d-land)" />
      <path
        d="M60 0h36v64H78c-4-8-12-10-14-18s6-14 2-22S58 8 60 0Z"
        class="fill-(--l-water) dark:fill-(--d-water)"
      />
      <path d="M8 40l14-4 6 12-10 8-12-4Z" class="fill-(--l-park) dark:fill-(--d-park)" />
      <ellipse cx="40" cy="14" rx="7" ry="4" class="fill-(--l-water) dark:fill-(--d-water)" />
      <g fill="none" stroke-linecap="round">
        <g stroke-width="1.6" class="stroke-(--l-road) dark:stroke-(--d-road)">
          <path d="M0 22h58M0 54h70M30 0v64M48 24v40M12 0v34" />
          <path d="M38 30l20 10" />
        </g>
        <path
          d="M-2 46C18 40 30 30 42 30s20-8 28-30"
          stroke-width="5"
          class="stroke-(--l-casing) dark:stroke-(--d-casing)"
        />
        <path
          d="M-2 46C18 40 30 30 42 30s20-8 28-30"
          stroke-width="3"
          class="stroke-(--l-major) dark:stroke-(--d-major)"
        />
      </g>
    </svg>
  `,
})
export class BasemapSwatchComponent {
  readonly provider = input.required<BasemapId>();

  protected readonly vars = computed(() => {
    const [light, dark] = PALETTES[this.provider()];
    return (Object.keys(light) as (keyof Palette)[])
      .map((key) => `--l-${key}:${light[key]};--d-${key}:${dark[key]}`)
      .join(';');
  });
}
