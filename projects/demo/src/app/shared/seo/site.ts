import { GITHUB_URL } from '@/shared/site-navigation';

/**
 * Site-wide SEO constants. `SITE_URL` is the production origin: canonical
 * URLs, `og:url`, `og:image` and JSON-LD must be absolute.
 */
export const SITE_URL = 'https://ng-mapcn.vercel.app';
export const SITE_NAME = 'ng-mapcn';
export const SITE_TITLE = 'ng-mapcn - Beautiful maps, made simple for Angular';
export const SITE_DESCRIPTION =
  'Beautiful, ready-to-use map components for Angular. Built on MapLibre GL, styled with Tailwind CSS, and installed with ng add — markers, popups, routes, clusters and more.';
export const SITE_AUTHOR = 'Juan Prado';
export const SITE_AUTHOR_URL = 'https://github.com/juanvieiraprado99';
export const SITE_REPO = GITHUB_URL;
export const SITE_OG_IMAGE = `${SITE_URL}/og-image.png`;
export const SITE_LOGO = `${SITE_URL}/icon-512x512.svg`;

export const SITE_KEYWORDS = [
  'ng-mapcn',
  'Angular map',
  'Angular map components',
  'Angular MapLibre',
  'MapLibre GL Angular',
  'Angular maps library',
  'mapcn Angular',
  'shadcn maps Angular',
  'Tailwind CSS map',
  'interactive maps Angular',
];
