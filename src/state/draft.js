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
 *   updatedAt: string (ISO timestamp)
 * }
 *
 * NOTE on Trello Storage:
 * Trello storage is limited per scope+visibility (4096 characters for card, about 8192 for board,
 * summed across all keys), so we store card IDs only rather than complete card payloads.
 * In step 2, selectedCardIds is deleted on every save so only a single copy of the IDs is stored.
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
 * @param {Object} t - Trello Power-Up client instance
 * @param {Object} draft - Draft object adhering to DRAFT CONTRACT
 * @returns {Promise<void>}
 */
export async function saveDraft(t, draft) {
  const payload = {
    listId: draft.listId || '',
    listName: draft.listName || '',
    filterId: draft.filterId || 'last14',
    updatedAt: new Date().toISOString()
  };

  // Only include selectedCardIds if explicitly provided as an array
  // (In Step 2, selectedCardIds is omitted to maintain a single copy of card IDs)
  if (Array.isArray(draft.selectedCardIds)) {
    payload.selectedCardIds = draft.selectedCardIds;
  }

  if (draft.release && typeof draft.release === 'object') {
    payload.release = draft.release;
  }

  if (draft.categories && typeof draft.categories === 'object') {
    payload.categories = draft.categories;
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
