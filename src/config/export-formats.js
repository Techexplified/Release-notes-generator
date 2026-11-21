/**
 * Export format configurations for Release Notes Generator.
 * Formats: Markdown (.md), HTML (.html), Plain Text (.txt)
 */

export const EXPORT_FORMATS = [
  {
    id: 'md',
    label: 'Markdown (.md)',
    description: 'Best for docs, wikis and GitHub.',
    ext: 'md',
    mime: 'text/markdown;charset=utf-8',
    icon: 'fileMarkdown'
  },
  {
    id: 'html',
    label: 'HTML (.html)',
    description: 'Share as a formatted web page.',
    ext: 'html',
    mime: 'text/html;charset=utf-8',
    icon: 'fileHtml'
  },
  {
    id: 'txt',
    label: 'Plain Text (.txt)',
    description: 'A simple, clean text format.',
    ext: 'txt',
    mime: 'text/plain;charset=utf-8',
    icon: 'fileText'
  }
];

export const DEFAULT_FORMAT_ID = 'md';

/**
 * Retrieves format configuration by format ID.
 * @param {string} id
 * @returns {Object}
 */
export function getFormatById(id) {
  return EXPORT_FORMATS.find((f) => f.id === id) || EXPORT_FORMATS[0];
}
