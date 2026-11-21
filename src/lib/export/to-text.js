/**
 * Converts a sanitized release notes DOM tree into clean Plain Text format.
 *
 * Rules:
 * - Heading lines as they are (keeps emoji), blank line after each block and before each section.
 * - Bullets "- ", nested bullets indented two spaces ("  - "), ordered lists keep numbers.
 * - Descriptions go on the next line indented under the bullet.
 * - Links become "text (url)" (or just url if text equals url).
 * - No formatting marks (** or *). Whitespace collapsed inside lines.
 * - \n line endings, file ends with one newline.
 */

function serializeTextInlines(node) {
  if (!node) return '';
  let out = '';

  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      out += child.textContent;
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const tag = child.tagName.toLowerCase();

      // Skip block elements or sub-lists when serializing inline text
      if (tag === 'ul' || tag === 'ol' || child.classList.contains('item-desc')) {
        continue;
      }

      if (tag === 'a') {
        const linkText = serializeTextInlines(child).trim();
        const href = child.getAttribute('href') || child.href || '';
        if (!href || linkText === href) {
          out += href || linkText;
        } else if (!linkText) {
          out += href;
        } else {
          out += `${linkText} (${href})`;
        }
      } else if (tag === 'br') {
        out += '\n';
      } else {
        out += serializeTextInlines(child);
      }
    }
  }

  // Collapse multiple inline spaces into a single space
  return out.replace(/[ \t]+/g, ' ');
}

function serializeTextList(listNode, indent = '') {
  const isOrdered = listNode.tagName.toLowerCase() === 'ol';
  const lines = [];
  const listItems = Array.from(listNode.children).filter((c) => c.tagName && c.tagName.toLowerCase() === 'li');

  listItems.forEach((li, index) => {
    const marker = isOrdered ? `${index + 1}. ` : '- ';
    const nextIndent = indent + '  ';

    // Inline content of this <li>
    const inlineContent = serializeTextInlines(li).trim();
    let itemStr = `${indent}${marker}${inlineContent}`;

    // Optional card description
    const descEl = li.querySelector(':scope > .item-desc');
    if (descEl) {
      const descText = serializeTextInlines(descEl).trim();
      if (descText) {
        itemStr += `\n${nextIndent}${descText}`;
      }
    }

    // Optional nested sub-lists
    const subLists = Array.from(li.children).filter((c) => {
      const tag = c.tagName && c.tagName.toLowerCase();
      return tag === 'ul' || tag === 'ol';
    });

    if (subLists.length > 0) {
      const subListOutput = subLists.map((subList) => serializeTextList(subList, nextIndent)).join('\n');
      itemStr += `\n${subListOutput}`;
    }

    lines.push(itemStr);
  });

  return lines.join('\n');
}

/**
 * Converts a DOM container element to Plain Text string.
 * @param {Element} root
 * @returns {string}
 */
export function toText(root) {
  if (!root) return '';

  const blocks = [];

  Array.from(root.children).forEach((node) => {
    const tag = node.tagName.toLowerCase();

    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      const text = serializeTextInlines(node).trim();
      if (text) blocks.push(text);
    } else if (tag === 'p') {
      const text = serializeTextInlines(node).trim();
      if (text) blocks.push(text);
    } else if (tag === 'ul' || tag === 'ol') {
      const listStr = serializeTextList(node, '');
      if (listStr) blocks.push(listStr);
    } else if (tag === 'div' && node.classList.contains('item-desc')) {
      const text = serializeTextInlines(node).trim();
      if (text) blocks.push(text);
    }
  });

  let text = blocks.join('\n\n');

  // Collapse 3 or more blank lines into 2 blank lines
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  // Ensure file ends with exactly one newline
  return text ? `${text}\n` : '\n';
}
