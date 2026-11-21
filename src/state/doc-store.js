/**
 * Document store managing edited release notes in sessionStorage with in-memory fallback.
 *
 * NOTE on Storage:
 * Trello t.set storage is limited to ~8192 characters per scope, which formatted release notes
 * documents can exceed. The edited document is stored locally in sessionStorage and
 * // TODO: move to our own database keyed by board and member when the backend exists.
 */

const memoryStore = new Map();

/**
 * Derives a board identifier from Trello Power-Up context or fallback.
 * @param {Object} t - Trello Power-Up client
 * @returns {string}
 */
function getBoardKey(t) {
  try {
    if (t && typeof t.getContext === 'function') {
      const ctx = t.getContext();
      if (ctx && ctx.board) return ctx.board;
    }
  } catch {
    // fallback
  }
  return 'default';
}

/**
 * Builds the storage key for this board.
 */
function getStorageKey(boardId) {
  return `releaseDoc:${boardId}`;
}

/**
 * Loads the stored release document.
 * @param {Object} t - Trello Power-Up client
 * @returns {{ html: string, signature: string, templateId: string, include: Object, baseline: string } | null}
 */
export function loadDoc(t) {
  const boardId = getBoardKey(t);
  const key = getStorageKey(boardId);

  try {
    const raw = sessionStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore sessionStorage errors
  }

  // Resilient fallback: check releaseDoc:default or any stored releaseDoc
  try {
    const defaultRaw = sessionStorage.getItem('releaseDoc:default');
    if (defaultRaw) return JSON.parse(defaultRaw);

    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith('releaseDoc:')) {
        const val = sessionStorage.getItem(k);
        if (val) return JSON.parse(val);
      }
    }
  } catch {
    // ignore
  }

  return memoryStore.get(key) || memoryStore.get('releaseDoc:default') || null;
}

/**
 * Saves the release document.
 * @param {Object} t - Trello Power-Up client
 * @param {{ html: string, signature: string, templateId: string, include: Object, baseline: string }} docData
 */
export function saveDoc(t, docData) {
  const boardId = getBoardKey(t);
  const key = getStorageKey(boardId);

  try {
    const serialized = JSON.stringify(docData);
    sessionStorage.setItem(key, serialized);
    sessionStorage.setItem('releaseDoc:default', serialized);
  } catch {
    // ignore sessionStorage quota/disabled errors
  }

  memoryStore.set(key, docData);
  memoryStore.set('releaseDoc:default', docData);
}

/**
 * Clears the stored document for this board.
 * @param {Object} t - Trello Power-Up client
 */
export function clearDoc(t) {
  const boardId = getBoardKey(t);
  const key = getStorageKey(boardId);

  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }

  memoryStore.delete(key);
}
