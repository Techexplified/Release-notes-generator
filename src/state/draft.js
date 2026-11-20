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
 *   updatedAt: string (ISO timestamp)
 * }
 *
 * NOTE on Trello Storage:
 * Trello storage is limited per scope+visibility (4096 characters for card, about 8192 for board,
 * summed across all keys), so we store card IDs only rather than complete card payloads.
 * In step 2, selectedCardIds is deleted on every save so only a single copy of the IDs is stored.
 * In step 3, preview options are saved here while the full rendered document is stored in doc-store.js.
 * // TODO: move the draft to our own database keyed by board and member when the backend exists.
 */

export const DRAFT_KEY = 'releaseDraft';
export const DRAFT_SCOPE = 'board';
export const DRAFT_VISIBILITY = 'private';

/**
 * Loads the saved draft from Trello board storage (with fallback to localStorage for local dev/preview).
 * @param {Object} t - Trello Power-Up client instance
 * @returns {Promise<Object | null>}
 */
export async function loadDraft(t) {
  try {
    if (t && typeof t.get === 'function') {
      const data = await t.get(DRAFT_SCOPE, DRAFT_VISIBILITY, DRAFT_KEY);
      if (data) return data;
    }
  } catch (error) {
    console.warn('Unable to read draft from Trello storage (possibly running outside Trello iframe), falling back to localStorage:', error);
  }

  // Fallback for local development and direct browser preview
  try {
    const local = localStorage.getItem(DRAFT_KEY);
    return local ? JSON.parse(local) : null;
  } catch {
    return null;
  }
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
  let existing = null;
  try {
    existing = await loadDraft(t);
  } catch {
    // ignore
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

  try {
    if (t && typeof t.set === 'function') {
      await t.set(DRAFT_SCOPE, DRAFT_VISIBILITY, DRAFT_KEY, payload);
    }
  } catch (error) {
    console.warn('Unable to write draft to Trello storage (possibly running outside Trello iframe), saving to localStorage:', error);
  }

  // Always keep localStorage in sync for smooth local testing
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch (e) {
    console.error('Failed to write to localStorage:', e);
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
  } catch (error) {
    console.warn('Unable to clear Trello storage:', error);
  }

  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}
