import { STUB_LISTS, STUB_CARDS } from './stub-data.js';

// Simulated latency to make loading states, skeletons, and transitions visible during preview
const SIMULATED_LATENCY_MS = 300;

/**
 * Note on completedAt:
 * Trello has no completion timestamp (only dueComplete).
 * The real definition is an open decision; leading option is the date the card entered the source list
 * (REST actions, updateCard with listAfter). // TODO decide.
 */

/**
 * Fetches lists on the current board along with their open card counts.
 *
 * Contract:
 * @param {Object} t - Trello Power-Up client instance
 * @returns {Promise<Array<{ id: string, name: string, cardCount: number }>>}
 */
export async function getLists(t) {
  // TODO: Replace with real Trello Power-Up call:
  // t.lists('id', 'name') combined with t.cards('id', 'idList', 'closed') to count open cards per list.
  return new Promise((resolve) => {
    setTimeout(() => {
      const listsWithCount = STUB_LISTS.map((list) => {
        const count = STUB_CARDS.filter((card) => card.idList === list.id).length;
        return {
          id: list.id,
          name: list.name,
          cardCount: count
        };
      });
      resolve(listsWithCount);
    }, SIMULATED_LATENCY_MS);
  });
}

/**
 * Fetches open cards belonging to the specified list.
 *
 * Contract:
 * @param {Object} t - Trello Power-Up client instance
 * @param {string} listId - Trello list ID
 * @returns {Promise<Array<{ id: string, name: string, url: string, idList: string, labels: Array<{ id: string, name: string, color: string }>, completedAt: string, due: string|null }>>}
 */
export async function getCardsForList(t, listId) {
  // TODO: Replace with real Trello Power-Up call:
  // t.cards('id', 'name', 'url', 'idList', 'labels', 'dateLastActivity') filtering for open cards only.
  return new Promise((resolve) => {
    setTimeout(() => {
      const cards = STUB_CARDS.filter((card) => card.idList === listId);
      resolve(cards);
    }, SIMULATED_LATENCY_MS);
  });
}

