import { sanitizeHtml } from '../sanitize.js';
import { getFormatById } from '../../config/export-formats.js';
import { makeFilename } from './filename.js';
import { toMarkdown } from './to-markdown.js';
import { toText } from './to-text.js';
import { toHtml } from './to-html.js';

/**
 * Builds export data for the requested format.
 *
 * @param {Object} params
 * @param {string} params.format - Format ID ('md' | 'html' | 'txt')
 * @param {string} params.html - Sanitized or raw HTML string from doc-store
 * @param {string} params.templateId - Active template ID ('customer' | 'technical' | 'executive')
 * @param {Object} params.release - Release details { title: string, version?: string, date?: string }
 * @returns {{ filename: string, mime: string, content: string }}
 */
export function buildExport({ format = 'md', html = '', templateId = 'customer', release = {} }) {
  const formatDef = getFormatById(format);
  const sanitized = sanitizeHtml(html || '');

  // Parse into DOM tree for conversion
  const parser = new DOMParser();
  const parsedDoc = parser.parseFromString(`<body>${sanitized}</body>`, 'text/html');
  const root = parsedDoc.body;

  let content = '';

  if (format === 'md') {
    content = toMarkdown(root);
  } else if (format === 'html') {
    content = toHtml({ root, templateId, release });
  } else if (format === 'txt') {
    content = toText(root);
  } else {
    content = toText(root);
  }

  const filename = makeFilename(release, formatDef.ext);

  return {
    filename,
    mime: formatDef.mime,
    content
  };
}
