// Decides which npm dist-tags a release should get.
// Usage: node scripts/npm-dist-tags.mjs <version>  (prints lines for $GITHUB_OUTPUT)
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PACKAGE = 'ng-mapcn';

const isPrerelease = (version) => version.includes('-');
const major = (version) => version.split('.')[0];

/**
 * Stable versions publish to `latest`. Prereleases publish to `beta`, and also move `latest`
 * while no stable version of the same major exists yet.
 *
 * @param {string} version
 * @param {string[]} publishedVersions
 * @returns {{ publishTag: 'beta' | 'latest'; alsoLatest: boolean }}
 */
export function distTags(version, publishedVersions) {
  if (!isPrerelease(version)) {
    return { publishTag: 'latest', alsoLatest: false };
  }
  const hasStableOfSameMajor = publishedVersions.some(
    (v) => !isPrerelease(v) && major(v) === major(version),
  );
  return { publishTag: 'beta', alsoLatest: !hasStableOfSameMajor };
}

/**
 * Parses `npm view <pkg> versions --json` output (an array, or a bare string for one version).
 *
 * @param {string} out
 * @returns {string[]}
 */
export function parseVersions(out) {
  const parsed = JSON.parse(out);
  return Array.isArray(parsed) ? parsed : [parsed];
}

// A failed lookup must fail the release: treating it as "nothing published" would move
// `latest` onto a prerelease. Only a 404 (package never published) means no versions.
function fetchPublishedVersions() {
  try {
    const out = execFileSync('npm', ['view', PACKAGE, 'versions', '--json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });
    return parseVersions(out);
  } catch (error) {
    if (`${error?.stderr ?? ''}${error?.stdout ?? ''}`.includes('E404')) {
      return [];
    }
    throw error;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const version = process.argv[2];
  if (!version) {
    console.error('Usage: node scripts/npm-dist-tags.mjs <version>');
    process.exit(1);
  }
  const { publishTag, alsoLatest } = distTags(version, fetchPublishedVersions());
  console.log(`publish_tag=${publishTag}`);
  console.log(`also_latest=${alsoLatest}`);
}
