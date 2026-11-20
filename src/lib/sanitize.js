/**
 * HTML Sanitizer using DOMParser and strict element/attribute allowlists.
 * Used on paste events and when restoring saved editor HTML.
 */

const ALLOWED_TAGS = new Set([
  'h1', 'h2', 'h3', 'p', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'a', 'br', 'div', 'span'
]);

const ALLOWED_CLASSES = new Set([
  'doc-title',
  'doc-meta',
  'band',
  'band-feature',
  'band-improvement',
  'band-bugfix',
  'band-icon',
  'item-desc',
  'card-link',
  'sub-items'
]);

function isAllowedHref(href) {
  if (!href) return false;
  const clean = href.trim().toLowerCase();
  return clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('mailto:');
}

/**
 * Sanitizes an HTML string against an allowlist of tags, classes, and safe URLs.
 * Forces target="_blank" and rel="noopener noreferrer" on all links.
 *
 * @param {string} rawHtml
 * @returns {string}
 */
export function sanitizeHtml(rawHtml) {
  if (!rawHtml || typeof rawHtml !== 'string') return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${rawHtml}</body>`, 'text/html');

  // Strip dangerous tags and their content completely
  doc.querySelectorAll('script, style, iframe, object, embed, noscript, meta, link').forEach((el) => el.remove());

  function cleanNode(node) {
    if (node.nodeType === Node.TEXT_NODE) return;

    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();

      if (!ALLOWED_TAGS.has(tagName)) {
        // Unwrap non-allowed tags by hoisting their children
        const parent = node.parentNode;
        if (parent) {
          while (node.firstChild) {
            cleanNode(node.firstChild);
            parent.insertBefore(node.firstChild, node);
          }
          parent.removeChild(node);
        }
        return;
      }

      // Filter attributes
      const attrs = Array.from(node.attributes);
      for (const attr of attrs) {
        const name = attr.name.toLowerCase();
        if (name === 'class') {
          const classes = attr.value.split(/\s+/).filter((c) => ALLOWED_CLASSES.has(c));
          if (classes.length > 0) {
            node.setAttribute('class', classes.join(' '));
          } else {
            node.removeAttribute('class');
          }
        } else if (name === 'data-category') {
          // Allow data-category on elements
        } else if (tagName === 'a' && name === 'href') {
          if (!isAllowedHref(attr.value)) {
            node.removeAttribute('href');
          }
        } else {
          // Remove all event handlers, inline styles, and unauthorized attributes
          node.removeAttribute(attr.name);
        }
      }

      // Enforce secure link behavior
      if (tagName === 'a') {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }

      // Recurse over child nodes
      Array.from(node.childNodes).forEach(cleanNode);
    }
  }

  Array.from(doc.body.childNodes).forEach(cleanNode);
  return doc.body.innerHTML;
}
