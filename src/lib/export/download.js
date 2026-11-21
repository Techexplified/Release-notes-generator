import { DOWNLOAD_STRATEGY } from '../../config/export-settings.js';

/**
 * Triggers a file download using either client-side Blob or serverless POST fallback.
 * Both paths are executed synchronously from the user's click handler.
 *
 * @param {Object} params
 * @param {string} params.filename - Sanitized destination filename
 * @param {string} params.mime - MIME type with charset
 * @param {string} params.content - File text content
 * @param {string} params.format - Format identifier ('md' | 'html' | 'txt')
 */
export function downloadFile({ filename, mime, content, format = 'txt' }) {
  if (DOWNLOAD_STRATEGY === 'server') {
    // Strategy: Serverless POST fallback (for restrictive iframe sandboxes)
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/export';
    form.target = '_blank';
    form.style.display = 'none';

    const fields = {
      format,
      filename,
      content
    };

    for (const [key, val] of Object.entries(fields)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = val;
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
    setTimeout(() => {
      form.remove();
    }, 100);
    return;
  }

  // Strategy: Client-side Blob download
  const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  a.style.display = 'none';

  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1000);
}
