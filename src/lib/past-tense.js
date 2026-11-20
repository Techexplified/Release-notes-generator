// TODO: replace this stub rewrite with an AI call through a serverless function.
// Contract for later: input { cards: [{ id, name, desc, category }], templateId, tone }, output { items: [{ cardId, text }] }.

const VERB_MAP = {
  add: 'Added',
  update: 'Updated',
  improve: 'Improved',
  fix: 'Fixed',
  refactor: 'Refactored',
  remove: 'Removed',
  implement: 'Implemented',
  create: 'Created',
  introduce: 'Introduced',
  enable: 'Enabled',
  optimize: 'Optimized',
  upgrade: 'Upgraded',
  reduce: 'Reduced',
  support: 'Supported',
  redesign: 'Redesigned',
  migrate: 'Migrated',
  rename: 'Renamed',
  replace: 'Replaced',
  resolve: 'Resolved',
  handle: 'Handled'
};

/**
 * Rewrites a title to past tense based on its leading verb.
 * Ensures the first letter is uppercase and the text ends with a single period.
 *
 * @param {string} title
 * @returns {string}
 */
export function toPastTense(title) {
  if (!title || typeof title !== 'string') return '';
  const trimmed = title.trim().replace(/[.,;:!?]+$/, '');
  if (!trimmed) return '';

  const match = trimmed.match(/^([A-Za-z]+)([\s\S]*)$/);
  let transformed = trimmed;

  if (match) {
    const firstWord = match[1].toLowerCase();
    const rest = match[2];
    if (VERB_MAP[firstWord]) {
      transformed = VERB_MAP[firstWord] + rest;
    } else {
      transformed = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    }
  } else {
    transformed = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  return transformed + '.';
}
