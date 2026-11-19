// Category definitions with aliases and chip styling
export const CATEGORIES = [
  {
    id: 'feature',
    label: 'Feature',
    aliases: ['feature', 'features', 'new feature'],
    chip: {
      bg: '#F3E8FF', // Light purple
      fg: '#6B21A8', // Dark purple text
      border: '#E9D5FF'
    }
  },
  {
    id: 'improvement',
    label: 'Improvement',
    aliases: ['improvement', 'enhancement', 'improve'],
    chip: {
      bg: '#DCFCE7', // Light green
      fg: '#15803D', // Dark green text
      border: '#BBF7D0'
    }
  },
  {
    id: 'bugfix',
    label: 'Bug Fix',
    aliases: ['bug', 'bug fix', 'bugfix', 'fix'],
    chip: {
      bg: '#FFE4E6', // Light red / pink
      fg: '#BE123C', // Dark red text
      border: '#FECDD3'
    }
  },
  {
    id: 'uncategorized',
    label: 'Uncategorized',
    aliases: [],
    chip: {
      bg: '#F1F2F4', // Neutral grey
      fg: '#626F86', // Slate text
      border: '#E2E8F0'
    }
  }
];

/**
 * Returns the matching category for a card.
 * Checks card labels against category aliases (case-insensitive, trimmed) in array order.
 * Returns the first matched category object, or the 'uncategorized' category object if no match.
 *
 * @param {Object} card - Card object with optional labels array [{ id, name, color }]
 * @returns {Object} Category object from CATEGORIES
 */
export function categorize(card) {
  const uncategorized = CATEGORIES.find(c => c.id === 'uncategorized');

  if (!card || !Array.isArray(card.labels) || card.labels.length === 0) {
    return uncategorized;
  }

  const labelNames = card.labels
    .map(label => (label && typeof label.name === 'string' ? label.name.trim().toLowerCase() : ''))
    .filter(Boolean);

  for (const category of CATEGORIES) {
    if (category.id === 'uncategorized' || !Array.isArray(category.aliases)) continue;
    for (const alias of category.aliases) {
      if (labelNames.includes(alias.trim().toLowerCase())) {
        return category;
      }
    }
  }

  return uncategorized;
}

/**
 * Helper to retrieve a category by its ID.
 * @param {string} id
 * @returns {Object}
 */
export function getCategoryById(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES.find(c => c.id === 'uncategorized');
}

