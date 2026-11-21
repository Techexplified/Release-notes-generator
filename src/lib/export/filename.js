/**
 * Generates an OS-safe and web-friendly filename for release notes exports.
 * Avoids Windows reserved names and standardizes character sets.
 *
 * Example: product-update-v2.3.0.md
 *
 * @param {Object} release - Release details { title: string, version?: string, date?: string }
 * @param {string} ext - File extension (e.g. 'md', 'html', 'txt')
 * @returns {string} Sanitized filename
 */

const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

function slugifyTitle(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
}

function slugifyVersion(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
    .replace(/-+$/, '');
}

export function makeFilename(release, ext) {
  const title = release?.title ? String(release.title) : '';
  const version = release?.version ? String(release.version) : '';

  let titleSlug = slugifyTitle(title);
  if (!titleSlug) {
    titleSlug = 'release-notes';
  }

  const versionSlug = slugifyVersion(version);
  let baseName = versionSlug ? `${titleSlug}-${versionSlug}` : titleSlug;

  // Protect against Windows reserved filenames
  if (WINDOWS_RESERVED.test(baseName)) {
    baseName = `release-${baseName}`;
  }

  const cleanExt = (ext || 'txt').replace(/^\./, '').toLowerCase();
  return `${baseName}.${cleanExt}`;
}
