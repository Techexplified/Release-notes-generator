import templatesCss from '../../styles/templates.css?inline';

/**
 * Builds a complete standalone HTML document string from sanitized release notes nodes.
 *
 * Requirements:
 * - document.implementation.createHTMLDocument(title)
 * - <html lang="en">, <meta charset="utf-8">, <meta name="viewport" content="width=device-width, initial-scale=1">
 * - <meta name="generator" content="Release Notes Generator">
 * - <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">
 * - <title> set with textContent to release title
 * - Inline CSS in one <style> tag with tokens, container, and templatesCss
 * - <main class="tpl-{templateId}"> containing appended parsed nodes (no innerHTML with unsanitized text)
 * - No scripts of any kind; links keep target="_blank" rel="noopener noreferrer"
 * - Serialized with '<!doctype html>\n' + doc.documentElement.outerHTML
 *
 * @param {Object} params
 * @param {Element} params.root - DOM container element with sanitized release notes
 * @param {string} params.templateId - Active template ID ('customer', 'technical', 'executive')
 * @param {Object} params.release - Release details { title: string, version?: string, date?: string }
 * @returns {string} Standalone HTML document string
 */
export function toHtml({ root, templateId = 'customer', release = {} }) {
  const docTitle = (release.title || 'Release Notes').trim();

  // Create clean HTML document
  const doc = document.implementation.createHTMLDocument(docTitle);
  doc.documentElement.setAttribute('lang', 'en');

  // Head configuration
  const head = doc.head;

  // Clear any default elements in head
  head.innerHTML = '';

  const metaCharset = doc.createElement('meta');
  metaCharset.setAttribute('charset', 'utf-8');
  head.appendChild(metaCharset);

  const metaViewport = doc.createElement('meta');
  metaViewport.setAttribute('name', 'viewport');
  metaViewport.setAttribute('content', 'width=device-width, initial-scale=1');
  head.appendChild(metaViewport);

  const metaGenerator = doc.createElement('meta');
  metaGenerator.setAttribute('name', 'generator');
  metaGenerator.setAttribute('content', 'Release Notes Generator');
  head.appendChild(metaGenerator);

  const metaCsp = doc.createElement('meta');
  metaCsp.setAttribute('http-equiv', 'Content-Security-Policy');
  metaCsp.setAttribute('content', "default-src 'none'; style-src 'unsafe-inline'; img-src data:;");
  head.appendChild(metaCsp);

  const titleEl = doc.createElement('title');
  titleEl.textContent = docTitle;
  head.appendChild(titleEl);

  // Inlined styles including tokens, container, and templatesCss
  const styleEl = doc.createElement('style');
  styleEl.textContent = `
    :root {
      --color-primary: #0c66e4;
      --color-primary-hover: #0055cc;
      --color-primary-light: #f0f7ff;
      --color-text: #172b4d;
      --color-text-subtle: #44546f;
      --color-text-muted: #626f86;
      --color-border: #dfe1e6;
      --color-divider: #ebedf0;
      --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      background-color: #ffffff;
      color: var(--color-text);
      font-family: var(--font-family);
      color-scheme: light;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      line-height: 1.5;
    }

    .release-notes-container {
      max-width: 720px;
      margin: 0 auto;
      padding: 36px 24px 48px 24px;
    }

    ${templatesCss || ''}
  `;
  head.appendChild(styleEl);

  // Body container
  const body = doc.body;
  body.innerHTML = '';

  const main = doc.createElement('main');
  main.className = `tpl-${templateId} release-notes-container`;

  // Append cloned sanitized nodes
  if (root) {
    Array.from(root.childNodes).forEach((child) => {
      main.appendChild(child.cloneNode(true));
    });
  }

  body.appendChild(main);

  return '<!doctype html>\n' + doc.documentElement.outerHTML;
}
