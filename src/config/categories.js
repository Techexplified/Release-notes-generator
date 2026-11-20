// Category definitions with aliases, chip styling, and step 2 configuration
export const CATEGORIES = [
  {
    id: 'feature',
    label: 'Feature',
    pluralLabel: 'Features',
    icon: 'rocket',
    rowIcon: {
      bg: '#F3E8FF', // Light purple
      fg: '#6B21A8'  // Dark purple
    },
    aliases: ['feature', 'features', 'new feature', 'feat', 'new'],
    chip: {
      bg: '#F3E8FF', // Light purple
      fg: '#6B21A8', // Dark purple text
      border: '#E9D5FF'
    }
  },
  {
    id: 'improvement',
    label: 'Improvement',
    pluralLabel: 'Improvements',
    icon: 'trendUp',
    rowIcon: {
      bg: '#DCFCE7', // Light green
      fg: '#15803D'  // Dark green
    },
    aliases: ['improvement', 'improvements', 'enhancement', 'enhancements', 'improve', 'update', 'perf', 'performance', 'refactor', 'optimization'],
    chip: {
      bg: '#DCFCE7', // Light green
      fg: '#15803D', // Dark green text
      border: '#BBF7D0'
    }
  },
  {
    id: 'bugfix',
    label: 'Bug Fix',
    pluralLabel: 'Bug Fixes',
    icon: 'bug',
    rowIcon: {
      bg: '#FFE4E6', // Light red / pink
      fg: '#BE123C'  // Dark red
    },
    aliases: ['bug', 'bug fix', 'bugfix', 'bug fixes', 'fix', 'fixes', 'defect', 'issue', 'hotfix', 'patch'],
    chip: {
      bg: '#FFE4E6', // Light red / pink
      fg: '#BE123C', // Dark red text
      border: '#FECDD3'
    }
  },
  {
    id: 'uncategorized',
    label: 'Uncategorized',
    pluralLabel: 'Unassigned',
    icon: null,
    rowIcon: {
      bg: '#F1F2F4', // Neutral grey
      fg: '#626F86'  // Slate grey
    },
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
 * Evaluates in priority order:
 * 1. Card label names (exact alias match or substring match)
 * 2. Card label colors (red/pink -> bugfix, green -> improvement, purple/blue -> feature)
 * 3. Card title / name patterns (conventional commit prefixes or semantic keywords)
 * 4. Fallback to 'uncategorized' (Unassigned)
 *
 * @param {Object} card - Card object with optional labels array and name
 * @returns {Object} Category object from CATEGORIES
 */
export function categorize(card) {
  const uncategorized = CATEGORIES.find(c => c.id === 'uncategorized');
  const featureCat = CATEGORIES.find(c => c.id === 'feature');
  const improvementCat = CATEGORIES.find(c => c.id === 'improvement');
  const bugfixCat = CATEGORIES.find(c => c.id === 'bugfix');

  if (!card) return uncategorized;

  // 1. Check card labels by name
  if (Array.isArray(card.labels) && card.labels.length > 0) {
    const labelNames = card.labels
      .map(lbl => (lbl && typeof lbl.name === 'string' ? lbl.name.trim().toLowerCase() : ''))
      .filter(Boolean);

    // Exact alias check
    for (const category of [bugfixCat, improvementCat, featureCat]) {
      if (!category || !Array.isArray(category.aliases)) continue;
      for (const alias of category.aliases) {
        if (labelNames.includes(alias.toLowerCase())) {
          return category;
        }
      }
    }

    // Substring match in label name (e.g. "type: bug", "frontend-fix", "feature-request")
    for (const lbl of labelNames) {
      if (lbl.includes('bug') || lbl.includes('fix') || lbl.includes('defect') || lbl.includes('issue')) {
        return bugfixCat;
      }
      if (lbl.includes('improv') || lbl.includes('enhanc') || lbl.includes('optimiz') || lbl.includes('perf')) {
        return improvementCat;
      }
      if (lbl.includes('feat') || lbl.includes('new')) {
        return featureCat;
      }
    }

    // 2. Check label colors if names are uninformative or blank
    for (const lbl of card.labels) {
      const color = (lbl && typeof lbl.color === 'string' ? lbl.color.toLowerCase() : '');
      if (['red', 'pink', 'red_dark', 'red_light'].includes(color)) {
        return bugfixCat;
      }
      if (['green', 'lime', 'green_dark', 'green_light'].includes(color)) {
        return improvementCat;
      }
      if (['purple', 'blue', 'sky', 'purple_dark', 'purple_light'].includes(color)) {
        return featureCat;
      }
    }
  }

  // 3. Check card name for conventional commit prefixes and semantic keywords
  const title = (card.name || '').trim().toLowerCase();
  if (title) {
    // Bug fix indicators
    if (
      title.startsWith('fix:') ||
      title.startsWith('fix(') ||
      title.startsWith('bug:') ||
      title.startsWith('hotfix:') ||
      /\b(fix|fixed|bug|bugs|error|errors|crash|crashes|defect|defects|broken|failure|resolve|patch)\b/i.test(title)
    ) {
      return bugfixCat;
    }

    // Improvement indicators
    if (
      title.startsWith('perf:') ||
      title.startsWith('refactor:') ||
      title.startsWith('improve:') ||
      title.startsWith('update:') ||
      title.startsWith('chore:') ||
      /\b(improve|improved|improvement|update|updated|optimize|optimized|speed|perf|refactor|upgrade|clean|polish|tweak)\b/i.test(title)
    ) {
      return improvementCat;
    }

    // Feature indicators
    if (
      title.startsWith('feat:') ||
      title.startsWith('feat(') ||
      title.startsWith('feature:') ||
      title.startsWith('add:') ||
      /\b(add|added|new|feature|features|support|create|created|implement|implemented|introduce|enable)\b/i.test(title)
    ) {
      return featureCat;
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
