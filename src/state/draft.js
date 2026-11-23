/**
 * Draft state management for Release Notes Generator wizard.
 *
 * Scope: 'board', Visibility: 'private'
 * Key: 'releaseDraft'
 *
 * DRAFT CONTRACT:
 * {
 *   listId: string,
 *   listName: string,
 *   filterId: string,
 *   selectedCardIds?: string[],                                          // written by step 1 on Next; deleted in step 2
 *   release?: { title: string, version: string, date: 'YYYY-MM-DD' },    // local calendar date, no timezone conversion
 *   categories?: {                                                      // card ids per category, in display order
 *     feature: string[],
 *     improvement: string[],
 *     bugfix: string[],
 *     uncategorized: string[]
 *   },
 *   preview?: {                                                         // Step 3 preview configuration
 *     templateId: string,
 *     include: {
 *       descriptions: boolean,
 *       links: boolean,
 *       date: boolean,
 *       version: boolean
 *     }
 *   },
 *   export?: {                                                          // Step 4 export configuration
 *     format: 'md' | 'html' | 'txt'
 *   },
 *   updatedAt: string (ISO timestamp)
 * }
 *
 * NOTE on Trello Storage:
 * Trello storage is limited per scope+visibility (4096 characters for card, about 8192 for board,
 * summed across all keys), so we store card IDs only rather than complete card payloads.
 * In step 2, selectedCardIds is deleted on every save so only a single copy of the IDs is stored.
 * In step 3, preview options are saved here while the full rendered document is stored in doc-store.js.
 * In step 4, the user's last chosen export format is saved under export.format.
 * // TODO: move the draft to our own database keyed by board and member when the backend exists.
 */

export const DRAFT_KEY = 'releaseDraft';
export const DRAFT_SCOPE = 'board';
export const DRAFT_VISIBILITY = 'private';
const TRELLO_READ_TIMEOUT_MS = 1500;

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Storage read timed out')), timeoutMs))
  ]);
}

/**
 * Loads the saved draft from Trello board storage (with fallback to sessionStorage and localStorage).
 * Evaluates all available storage tiers and prioritizes the draft with active card selections.
 *
 * @param {Object} t - Trello Power-Up client instance
 * @returns {Promise<Object | null>}
 */
export async function loadDraft(t) {
  let trelloData = null;
  let sessionData = null;
  let localData = null;

  // 1. SessionStorage (fastest within current modal session)
  try {
    const session = sessionStorage.getItem(DRAFT_KEY);
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed && typeof parsed === 'object') {
        sessionData = parsed;
      }
    }
  } catch {
    // ignore
  }

  // 2. LocalStorage (offline / dev preview)
  try {
    const local = localStorage.getItem(DRAFT_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed && typeof parsed === 'object') {
        localData = parsed;
      }
    }
  } catch {
    // ignore
  }

  // 3. Trello board storage
  // Session/local storage are synchronously updated on every save. Avoid a
  // slow iframe storage round trip when a current browser copy is available.
  if (!sessionData && !localData) {
    try {
      if (t && typeof t.get === 'function') {
        const data = await withTimeout(t.get(DRAFT_SCOPE, DRAFT_VISIBILITY, DRAFT_KEY), TRELLO_READ_TIMEOUT_MS);
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          trelloData = data;
        }
      }
    } catch {
      // ignore Trello storage read error
    }
  }

  const candidates = [sessionData, trelloData, localData].filter(Boolean);
  if (candidates.length === 0) return null;

  // Prioritize candidate with active card selections (selectedCardIds or categories)
  const hasCards = (d) => {
    if (Array.isArray(d.selectedCardIds) && d.selectedCardIds.length > 0) return true;
    if (d.categories && typeof d.categories === 'object') {
      return Object.values(d.categories).some((arr) => Array.isArray(arr) && arr.length > 0);
    }
    return false;
  };

  candidates.sort((a, b) => {
    const aHas = hasCards(a);
    const bHas = hasCards(b);
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;

    const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return timeB - timeA;
  });

  return candidates[0];
}

/**
 * Saves the wizard draft to Trello board storage.
 * Merges updates into existing draft so unknown/existing keys (release, categories, preview) are never dropped.
 *
 * @param {Object} t - Trello Power-Up client instance
 * @param {Object} draftUpdates - Draft updates adhering to DRAFT CONTRACT
 * @returns {Promise<void>}
 */
export async function saveDraft(t, draftUpdates = {}) {
  // Read existing synchronously from session or local storage first to avoid blocking on Trello bridge
  let existing = null;
  try {
    const s = sessionStorage.getItem(DRAFT_KEY);
    if (s) existing = JSON.parse(s);
  } catch {
    // ignore
  }
  if (!existing) {
    try {
      const l = localStorage.getItem(DRAFT_KEY);
      if (l) existing = JSON.parse(l);
    } catch {
      // ignore
    }
  }

  const payload = {
    ...(existing || {}),
    ...draftUpdates,
    updatedAt: new Date().toISOString()
  };

  // If draftUpdates explicitly sets keys to undefined, remove them from payload
  for (const key of Object.keys(draftUpdates)) {
    if (draftUpdates[key] === undefined) {
      delete payload[key];
    }
  }

  // When categories are updated in Step 2 without selectedCardIds, delete selectedCardIds to save quota
  if (draftUpdates.categories && !('selectedCardIds' in draftUpdates)) {
    delete payload.selectedCardIds;
  }

  // Synchronous session and local storage updates happen immediately
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }

  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }

  try {
    if (t && typeof t.set === 'function') {
      await t.set(DRAFT_SCOPE, DRAFT_VISIBILITY, DRAFT_KEY, payload);
    }
  } catch {
    // fallback to local storage only
  }
}

/**
 * Clears any existing draft from Trello storage and localStorage.
 * @param {Object} t - Trello Power-Up client instance
 * @returns {Promise<void>}
 */
export async function clearDraft(t) {
  try {
    if (t && typeof t.set === 'function') {
      await t.set(DRAFT_SCOPE, DRAFT_VISIBILITY, DRAFT_KEY, undefined);
    }
  } catch {
    // ignore
  }

  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}
