/**
 * Copies text content to the user's clipboard.
 * Tries the modern Navigator Clipboard API first, with a hidden textarea execCommand fallback.
 *
 * @param {string} text - Plain text string to copy
 * @returns {Promise<boolean>} True if successfully copied, false otherwise
 */
export async function copyText(text) {
  if (typeof text !== 'string') {
    text = String(text || '');
  }

  // 1. Modern Navigator Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback to execCommand below
    }
  }

  // 2. Hidden textarea execCommand fallback
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    const successful = document.execCommand('copy');
    textarea.remove();

    return Boolean(successful);
  } catch {
    return false;
  }
}
