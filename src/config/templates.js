/**
 * Template configurations for Release Notes Generator.
 * Supports: 'customer', 'technical', 'executive'
 */

function buildMetaLine(ctx, dateStr) {
  const parts = [];
  if (ctx.include.version && ctx.version) {
    parts.push(ctx.version);
  }
  if (ctx.include.date && dateStr) {
    parts.push(dateStr);
  }
  return parts.join(' · ');
}

export const TEMPLATES = [
  {
    id: 'customer',
    name: 'Customer-Friendly Changelog',
    description: 'A simple, non-technical format suitable for customers and end users.',
    cssClass: 'tpl-customer',
    fonts: {
      body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      meta: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    },
    sectionLabels: {
      feature: '✨ New Features',
      improvement: '📈 What’s Improved',
      bugfix: '🔧 Bug Fixes'
    },
    sectionEmoji: {
      feature: '✨',
      improvement: '📈',
      bugfix: '🔧'
    },
    bands: true,
    rewrite: 'pastTense',
    linkLabel: 'View card',
    headingText(ctx) {
      const title = (ctx.releaseTitle || '').trim() || 'Release notes';
      return `📣 ${title}`;
    },
    metaText(ctx) {
      const dateText = ctx.dateFormatted ? `Released on ${ctx.dateFormatted}` : '';
      return buildMetaLine(ctx, dateText);
    },
    introText() {
      return 'We’re excited to share the latest updates that make the app faster, smoother and more reliable.';
    }
  },
  {
    id: 'technical',
    name: 'Technical Changelog',
    description: 'A concise, developer-oriented format that follows common changelog conventions.',
    cssClass: 'tpl-technical',
    fonts: {
      body: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
      meta: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace'
    },
    sectionLabels: {
      feature: 'Added',
      improvement: 'Changed',
      bugfix: 'Fixed'
    },
    sectionEmoji: {
      feature: '',
      improvement: '',
      bugfix: ''
    },
    bands: false,
    rewrite: 'verbatim',
    linkLabel: 'card',
    headingText(ctx) {
      return (ctx.releaseTitle || '').trim() || 'Release notes';
    },
    metaText(ctx) {
      const dateText = ctx.dateISO || '';
      return buildMetaLine(ctx, dateText);
    },
    introText() {
      return '';
    }
  },
  {
    id: 'executive',
    name: 'Executive Summary',
    description: 'A short, formal overview with highlights, suited to stakeholders and internal updates.',
    cssClass: 'tpl-executive',
    fonts: {
      heading: 'Georgia, "Iowan Old Style", "Palatino Linotype", "Times New Roman", serif',
      body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    },
    sectionLabels: {
      feature: 'New capabilities',
      improvement: 'Enhancements',
      bugfix: 'Resolved issues'
    },
    sectionEmoji: {
      feature: '',
      improvement: '',
      bugfix: ''
    },
    bands: false,
    rewrite: 'pastTense',
    linkLabel: 'Details',
    headingText(ctx) {
      return (ctx.releaseTitle || '').trim() || 'Release notes';
    },
    metaText(ctx) {
      const dateText = ctx.dateFormatted || '';
      return buildMetaLine(ctx, dateText);
    },
    introText(ctx) {
      const parts = [];
      const featCount = ctx.counts.feature || 0;
      const impCount = ctx.counts.improvement || 0;
      const fixCount = ctx.counts.bugfix || 0;

      if (featCount > 0) {
        parts.push(featCount === 1 ? '1 new capability' : `${featCount} new capabilities`);
      }
      if (impCount > 0) {
        parts.push(impCount === 1 ? '1 enhancement' : `${impCount} enhancements`);
      }
      if (fixCount > 0) {
        parts.push(fixCount === 1 ? '1 resolved issue' : `${fixCount} resolved issues`);
      }

      if (parts.length === 0) {
        return 'This release includes various updates.';
      }
      if (parts.length === 1) {
        return `This release includes ${parts[0]}.`;
      }
      if (parts.length === 2) {
        return `This release includes ${parts[0]} and ${parts[1]}.`;
      }
      return `This release includes ${parts[0]}, ${parts[1]} and ${parts[2]}.`;
    }
  }
];

export const DEFAULT_TEMPLATE_ID = 'customer';

/**
 * Returns a template configuration by its ID.
 * @param {string} id
 * @returns {Object}
 */
export function getTemplateById(id) {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
}
