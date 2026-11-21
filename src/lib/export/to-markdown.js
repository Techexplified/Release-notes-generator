/**
 * Converts a sanitized release notes DOM tree into valid CommonMark Markdown.
 *
 * Rules:
 * - h1: "# ", h2: "## ", h3: "### ". Band emoji remains in heading text.
 * - p.doc-meta: italic *text*. Other paragraphs plain, blank lines between blocks.
 * - ul: "- ", ol: "1. ", "2. " etc. Nested lists indented by parent marker width.
 * - Cards with item-desc: description on next line indented to align with bullet, preceded by 2 spaces.
 * - strong/b => **x**, em/i => *x*, a => [text](href) with ( and ) percent-encoded, br => two trailing spaces + \n.
 * - Escapes Markdown-significant characters in text nodes.
 * - Collapses 3+ blank lines into 2; ends with exactly one newline; uses \n.
 */

function escapeMarkdownText(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/</g, '\\<')
    .replace(/>/g, '\\>')
    .replace(/^([#+\-]|(?:\d+\.))(?=\s)/, '\\$1');
}

function serializeInlines(node) {
  if (!node) return '';
  let out = '';

  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      out += escapeMarkdownText(child.textContent);
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const tag = child.tagName.toLowerCase();

      // Skip block elements or sub-lists when serializing inline text
      if (tag === 'ul' || tag === 'ol' || child.classList.contains('item-desc')) {
        continue;
      }

      if (tag === 'strong' || tag === 'b') {
        const inner = serializeInlines(child).trim();
        if (inner) out += `**${inner}**`;
      } else if (tag === 'em' || tag === 'i') {
        const inner = serializeInlines(child).trim();
        if (inner) out += `*${inner}*`;
      } else if (tag === 'a') {
        const linkText = serializeInlines(child).trim() || 'Link';
        const rawHref = child.getAttribute('href') || child.href || '';
        const safeHref = rawHref.replace(/\(/g, '%28').replace(/\)/g, '%29');
        out += `[${linkText}](${safeHref})`;
      } else if (tag === 'br') {
        out += '  \n';
      } else {
        // e.g. span, span.band-icon
        out += serializeInlines(child);
      }
    }
  }

  return out;
}

function serializeList(listNode, indent = '') {
  const isOrdered = listNode.tagName.toLowerCase() === 'ol';
  const lines = [];
  const listItems = Array.from(listNode.children).filter((c) => c.tagName && c.tagName.toLowerCase() === 'li');

  listItems.forEach((li, index) => {
    const marker = isOrdered ? `${index + 1}. ` : '- ';
    const nextIndent = indent + ' '.repeat(marker.length);

    // Inline content of this <li> (excluding sub-items and item-desc)
    const inlineContent = serializeInlines(li).trim();
    let itemStr = `${indent}${marker}${inlineContent}`;

    // Optional card description
    const descEl = li.querySelector(':scope > .item-desc');
    if (descEl) {
      const descText = serializeInlines(descEl).trim();
      if (descText) {
        // Hard line break preceded by 2 spaces, indented under bullet
        itemStr += `  \n${nextIndent}${descText}`;
      }
    }

    // Optional nested sub-lists
    const subLists = Array.from(li.children).filter((c) => {
      const tag = c.tagName && c.tagName.toLowerCase();
      return tag === 'ul' || tag === 'ol';
    });

    if (subLists.length > 0) {
      const subListOutput = subLists.map((subList) => serializeList(subList, nextIndent)).join('\n');
      itemStr += `\n${subListOutput}`;
    }

    lines.push(itemStr);
  });

  return lines.join('\n');
}

/**
 * Converts a DOM container element to CommonMark Markdown string.
 * @param {Element} root
 * @returns {string}
 */
export function toMarkdown(root) {
  if (!root) return '';

  const blocks = [];

  Array.from(root.children).forEach((node) => {
    const tag = node.tagName.toLowerCase();

    if (tag === 'h1') {
      const text = serializeInlines(node).trim();
      if (text) blocks.push(`# ${text}`);
    } else if (tag === 'h2') {
      const text = serializeInlines(node).trim();
      if (text) blocks.push(`## ${text}`);
    } else if (tag === 'h3') {
      const text = serializeInlines(node).trim();
      if (text) blocks.push(`### ${text}`);
    } else if (tag === 'p') {
      const text = serializeInlines(node).trim();
      if (text) {
        if (node.classList.contains('doc-meta')) {
          blocks.push(`*${text}*`);
        } else {
          blocks.push(text);
        }
      }
    } else if (tag === 'ul' || tag === 'ol') {
      const listStr = serializeList(node, '');
      if (listStr) blocks.push(listStr);
    } else if (tag === 'div' && node.classList.contains('item-desc')) {
      const text = serializeInlines(node).trim();
      if (text) blocks.push(text);
    }
  });

  let markdown = blocks.join('\n\n');

  // Collapse 3 or more blank lines into 2 blank lines (max 2 consecutive newlines)
  markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();

  // Ensure file ends with exactly one newline
  return markdown ? `${markdown}\n` : '\n';
}
