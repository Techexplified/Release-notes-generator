import { APP_KEY, APP_NAME, APP_AUTHOR } from '../config.js';

/**
 * Checks if the current window is running inside an authentic Trello iframe modal.
 * Trello passes its secret and context in window.location.hash.
 */
export function isTrelloIframe() {
  if (typeof window === 'undefined') return false;
  return window.self !== window.top && Boolean(window.location.hash && window.location.hash.length > 1);
}

/**
 * Initializes the Trello iframe client if inside a valid Trello iframe with hash context.
 * If running standalone or without a secret hash, returns null to use fallback mode.
 */
export function initTrelloIframe() {
  if (!isTrelloIframe() || !window.TrelloPowerUp) {
    return null;
  }
  try {
    return window.TrelloPowerUp.iframe({
      appKey: APP_KEY,
      appName: APP_NAME,
      appAuthor: APP_AUTHOR
    });
  } catch {
    return null;
  }
}

/**
 * Navigates to a step page while preserving Trello's search query and hash (secret & context).
 */
export function navigateTo(targetPath) {
  const query = window.location.search || '';
  const hash = window.location.hash || '';
  window.location.href = targetPath + query + hash;
}
